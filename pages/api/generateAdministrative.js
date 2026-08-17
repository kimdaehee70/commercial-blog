// ============================================================
// pages/api/generateAdministrative.js — 행정사(administrative) V2 엔진
// [세션46][SPINE7-ADMIN] 6섹션 → 7섹션 Spine 전면 교체.
// [세션46][3AXIS] application / appeal / document — deadline·criteria·process 축 분기 + 해시태그 분기.
// [세션46][APPROVAL-CAP] 승인·인가·인용·구제 결과 약속 문장 드롭.
//   ★ 오탐 방지: "취소처분/취소소송/등록취소" 등 제도명·처분명은 보존. 결과 술어만 차단.
// [세션46][TITLE-SUFFIX] resolveTitleSuffix + titleSuffixOn req.body 수신 — 선제 배선(세션44 legal 누락 대응).
// [세션46][STORE-IN-BODY] buildOfficeClosing 상호 라인 제거. 전화·상담정보만. (PHILOSOPHY 원칙1)
// engineBootstrap 무수정 — register("administrative", handleAdministrative) 기존 유지.
// FORBIDDEN SoT = administrative-prompts.js (무변경) / 22업무 SoT = administrative-data.js (무변경)
// playConfig 무수정 (DEAD 보존). FLOW는 v2-data 소유.
// ============================================================

import OpenAI from "openai";
import { ADMIN_TREATMENTS } from "../../lib/administrative-data";
import { FORBIDDEN } from "../../lib/administrative-prompts";
import {
  getAdminAxis,
  ADMIN_FLOW_V2,
  ADMIN_PHOTO_ALT_V2,
  AXIS_TAG,
} from "../../lib/administrative-v2-data.js";
import {
  buildSystemPromptV2,
  buildUserPromptV2,
  getImageAltsV2,
  AI_CLICHE,
  ADMIN_APPROVAL_BAN,
} from "../../lib/administrative-v2-prompts.js";
// [세션47][PRO-VISIT] 전문직 방문정보 공통 모듈. locationBlock 재사용(내부 호출) — 위치블록 직접 호출 제거.
import { insertProVisitInfo, PRO_PHOTO_POOL } from "../../lib/proVisitBlock.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── [APPROVAL-CAP] 결과 약속 문장 드롭 ─────────────────────
//   ★ [CAP-OVERREACH 대응] 재료 원문의 정상 서술을 죽이지 않도록 대상 한정.
//   보존해야 할 정상 표현 예:
//     "처분이 취소되는지가 심리 대상입니다"        ← 심리 대상 서술
//     "면허취소 처분에 대한 행정심판"              ← 처분명(고유명사)
//     "등록증이 교부됩니다"                        ← 절차 종결 사실(결과 약속 아님)
//   차단해야 할 결과 약속:
//     "요건을 충족하면 승인됩니다"
//     "서류만 갖추면 등록이 완료됩니다"
//     "행정심판을 청구하면 구제받을 수 있습니다"
const APPROVAL_PATTERNS = [
  // 조건부 결과 약속 (…하면 / …충족하면 / …갖추면 + 결과 술어)
  /[^.\n]*(충족하[면시]|갖추[면시]|제출하[면시]|신청하[면시]|청구하[면시])[^.\n]*(승인됩니다|인가됩니다|허가됩니다|인용됩니다|구제받을 수 있습니다|통과됩니다|완료됩니다)[^.\n]*[.!]/g,
  // [세션46-2] 조건부 결과 약속 — "충족되었다고 판단되는 경우 …교부된다/발급된다" 계열
  //   ★ 실측 누출: "모든 요건이 충족되었다고 판단되는 경우, 여행업 등록증이 교부된다."
  /[^.\n]*(충족(되었다고|된다고|되면)|판단되는 경우|인정되는 경우)[^.\n]*(교부[됩된]|발급[됩된]|승인[됩된]|등록[됩된]|인증[됩된])[^.\n]*[.!다]/g,
  // 단정 결과 약속
  /[^.\n]*(반드시|무조건|틀림없이|100%|확실히)[^.\n]*(승인|인가|허가|인용|통과|구제|취소)[^.\n]*[.!]/g,
  // 결과 보장 술어 (문제없이/무리없이 계열)
  /[^.\n]*(문제없이|무리 ?없이|어렵지 않게)[^.\n]*(처리됩니다|승인됩니다|등록됩니다|통과됩니다)[^.\n]*[.!]/g,
  // "받을 수 있습니다" 결과형 (구제·인용·감경)
  /[^.\n]*(구제|인용|감경|승인)[^.\n]{0,10}(받을 수 있습니다|받게 됩니다|가능합니다)[.!]/g,
  // [세션46-2] 등록·인증의 효과 단정
  //   ★ 실측 누출: "법적 지위를 확보할 수 있다." / "자격을 얻게 된다." / "법적 인정을 받고"
  /[^.\n]*(법적 (지위|인정|자격|효력))[^.\n]*(확보|받[게을고는]|얻[게을는])[^.\n]*[.!다]/g,
  /[^.\n]*(자격|지위)[을를] (얻게 됩니다|얻게 된다|확보할 수 있습니다|확보할 수 있다)[.!]/g,
];

function capApproval(text) {
  let t = text;
  let dropped = 0;
  for (const re of APPROVAL_PATTERNS) {
    t = t.replace(re, (m) => {
      // 보존 예외: '심리 대상' / '검토 대상' / '판단' 이 같은 문장에 있으면 정상 서술로 간주
      if (/(심리 대상|검토 대상|심사 대상|판단이|달라집니다|쟁점)/.test(m)) return m;
      // [ADMIN-REGISTRATION-EFFECT-01] 등록 완료 후 법적 효과 서술 보존 (조건부 결과보장은 계속 차단)
      if (/등록(이|을)?\s*(완료|마친|마치)/.test(m) && !/(갖추|충족|제출하|신청하|청구하|요건만|서류만)/.test(m)) return m;
      dropped++;
      return "";
    });
  }
  if (dropped) console.log(`[APPROVAL-CAP][administrative] 결과약속 문장 드롭: ${dropped}`);
  return dropped ? fixOrphans(t) : t.replace(/\n{3,}/g, "\n\n");
}

// ── [세션46-2][ORPHAN-COMMA] CAP 드롭 후 남는 고아 문장부호 정리 ─────
//   ★ 실측: 문장 삭제 후 "됩니다. , 서류 준비 시" / "\n\n, 신청인은" 잔존
function fixOrphans(text) {
  let t = text;
  t = t.replace(/(^|\n)[ \t]*[,、][ \t]*/g, "$1");    // 줄머리 쉼표 (개행 보존)
  t = t.replace(/([.!?])[ \t]*[,、][ \t]*/g, "$1 ");    // "됩니다. , " → "됩니다. "
  t = t.replace(/[ \t]+([.!?,])/g, "$1");             // 부호 앞 공백 (개행 보존)
  t = t.replace(/([.!?])\1+/g, "$1");                  // 중복 마침표
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// ── [세션46-2][TERM-AXIS] 심판 전용 용어의 타 축 유입 차단 ────────────
//   ★ 실측: application 축 글에 "심리 대상" 확산 (행정등록 문맥에서 오용)
//   '심리 대상 / 재결' 은 appeal 전용. 나머지 축에서는 '검토 대상'으로 정규화.
function normalizeAxisTerms(text, axis) {
  if (axis === "appeal") return text;
  let t = text;
  t = t.replace(/심리\s*대상/g, "검토 대상");
  t = t.replace(/심리가\s*진행/g, "심사가 진행");
  // [세션46-2] 재결 치환 제거 — 조사 파손("재결을"→"결과을") + 부정문에서만 등장하므로 불필요.

  // [세션46-2][DOC-FRAME] ★ 실측: document 축(내용증명·사실확인서)에 관청 심사 프레임 유입
  //   "발송 내용의 적법성", "검토 대상이 되는 항목" — 행정청이 심사하는 절차가 아니다.
  //   ★ [CAP-OVERREACH 재발 방지] 재료 원문의 부정문("…개념이 적용되지 않습니다")을
  //     정규식이 먹어 문장을 파손한 사례가 있었다. 부정 문맥은 보존한다.
  if (axis === "document") {
    const NEGATED = /(아닙니다|아니므로|아니기 때문|없습니다|않습니다|적용되지)/;
    const safeReplace = (t2, re, to) =>
      t2.replace(re, (m, ...rest) => {
        const full = rest[rest.length - 1];
        const off = rest[rest.length - 2];
        const around = String(full).slice(Math.max(0, off - 40), off + m.length + 40);
        if (NEGATED.test(around)) return m;   // 부정 문맥 → 원문 보존
        return typeof to === "function" ? to(m) : to;
      });

    t = safeReplace(t, /(발송|문서|기재)\s*내용의\s*(명확성과\s*)?적법성/g, (m) =>
      m.replace(/(명확성과\s*)?적법성/, "명확성과 사실관계 일치 여부")
    );
    t = safeReplace(t, /적법성(을|이|과|,)?\s*(검토|심사|판단)합?니?다?/g, "사실관계와의 일치 여부를 확인합니다");
    t = safeReplace(t, /적법성이\s*심사\s*대상입니다/g, "사실관계와 일치하는지가 확인이 필요한 지점입니다");
    t = safeReplace(t, /적법성/g, "사실관계와의 일치 여부");
    t = safeReplace(t, /심사\s*대상/g, "확인이 필요한 지점");
    t = safeReplace(t, /검토\s*대상이?\s*되는\s*항목/g, "실무에서 갈리는 지점");
    // 치환으로 생긴 조사 오류 보정 ("…여부이" → "…여부가")
    t = t.replace(/일치\s*여부이(\s)/g, "일치 여부가$1");
  }
  return t;
}

// ── 금칙어 제거 (FORBIDDEN SoT + V2 추가) ──────────────────
//   [세션46-2][SPLIT-BREAK] ★ 실측 결함: split().join("") 은 문장 중간 어절을 통째로 지워
//   문장을 파손한다. "…정보를 기반으로 한 체계적인 접근이 필요합니다"
//     → "체계적인 접근" 제거 → "…정보를 기반으로 이 필요합니다" (문장 붕괴)
//   대응: 어구 단위 삭제가 아니라 '문장 단위 드롭'. 금칙어가 든 문장을 통째로 버린다.
//   단, 문장부호가 없는 짧은 라인(제목·서명 등)은 어구 삭제 유지.
const SENTENCE_DROP = [
  "체계적인 접근", "살펴보겠습니다", "결론적으로", "정리하면",
  "성공 사례", "성공사례", "고객 후기", "성공 후기", "수임 후기", "의뢰인 후기",
  "승소", "100% 해결", "확실히 해결", "반드시 통과", "무조건 승인",
  "보장합니다", "확실합니다", "강추", "강력 추천", "꼭 맡기세요",
];

function stripForbidden(text) {
  let t = text;

  // ① 문장 단위 드롭 (문장 중간 어절 제거로 인한 파손 차단)
  //    FORBIDDEN SoT 전건 흡수. 단 MODIFIER_ONLY 는 ②에서 어구 삭제.
  const MODIFIER_ONLY = ["최고의", "최고", "최상의", "완벽한", "완벽하게", "후회없는", "1위"];
  const dropWords = [...new Set([...FORBIDDEN, ...SENTENCE_DROP, ...ADMIN_APPROVAL_BAN])].filter(
    (w) => w && !MODIFIER_ONLY.includes(w)
  );
  t = t
    .split(/\n/)
    .map((line) => {
      if (!/[.!?다]/.test(line)) return line;
      const sents = line.match(/[^.!?]*[.!?]|[^.!?]+$/g) || [line];
      return sents
        .filter((s) => !dropWords.some((w) => w && s.includes(w)))
        .join("")
        .trim();
    })
    .join("\n");

  // ② 수식어 단위 삭제 (제거해도 문장이 성립하는 것만)
  for (const w of MODIFIER_ONLY) t = t.split(w).join("");

  // ③ 줄머리 AI 상투어
  for (const w of AI_CLICHE) {
    t = t.replace(new RegExp(`(^|\\n)\\s*${w}[,\\s]*`, "g"), "$1");
  }

  return fixOrphans(t);
}

// ── 후처리 기본 ────────────────────────────────────────
function cleanText(text) {
  let t = text;
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/([가-힣])  +/g, "$1 ");
  return t.trim();
}

function stripMidHashtags(text) {
  return text.replace(/(^|\s)#[^\s#]+/g, "$1").trim();
}

function removeDupParagraphs(text) {
  const paras = text.split(/\n{2,}/);
  const seen = new Set();
  const out = [];
  for (const p of paras) {
    const norm = p.replace(/\s+/g, "").replace(/[0-9.]/g, "").slice(0, 40);
    if (norm.length > 10 && seen.has(norm)) continue;
    if (norm.length > 10) seen.add(norm);
    out.push(p);
  }
  return out.join("\n\n");
}

// ── 사진 placeholder (3슬롯) ──────────────────────────
const ADMIN_PHOTO_POOL = {
  "상담 안내":     "상담실 내부 사진",
  "준비서류 안내": "준비 서류 예시 사진",
  "사무소 안내":   "사무소 외관 / 약도 사진",
};

function applyPhotoBoxes(text) {
  let t = text.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, alt) => {
    const key = String(alt || "").trim();
        // [세션47][PRO-VISIT] 공통 6슬롯 fallback.
    const photo = ADMIN_PHOTO_POOL[key] || (PRO_PHOTO_POOL[key] && PRO_PHOTO_POOL[key].photos[0]) || ADMIN_PHOTO_POOL["사무소 안내"];
    return `\n📷 사진: ${photo} (업로드 후 이 줄 삭제)\n`;
  });
  return t.replace(/\n{3,}/g, "\n\n");
}

// ── [3AXIS] 축별 해시태그 (TAG-DUP 방지) ────────────────
function buildHashtags(region, kw, axis) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  const toks = AXIS_TAG[axis] || AXIS_TAG.application;
  const raw = [
    `${rg}${k}`,
    `${k}행정사`,
    `${rg}행정사`,
    ...toks.map((t) => (k.endsWith(t) ? `${k}` : `${k}${t}`)), // #등록등록 방지
    `${rg}행정사사무소`,
  ];
  const seen = new Set();
  const tags = [];
  for (const r of raw) {
    const v = r.replace(/\s+/g, "");
    if (!v || seen.has(v)) continue;
    seen.add(v);
    tags.push(`#${v}`);
  }
  return "\n\n" + tags.join(" ");
}

// ── 사무소 도입 / 마무리 ───────────────────────────────
function buildOfficeIntro(storeName) {
  const office = (storeName || "").trim() || "{행정사사무소명}";
  return `안녕하세요. ${office}에서 안내드립니다.`;
}

// [STORE-IN-BODY] 상호 라인 제거. 전화·상담정보만.
function buildOfficeClosing(phone, consultInfo) {
  const lines = [];
  if ((phone || "").trim()) lines.push(`상담 전화 ${phone.trim()}`);
  if ((consultInfo || "").trim()) lines.push(consultInfo.trim());
  return lines.length ? "\n" + lines.join("\n") : "";
}

// ── [TITLE-SUFFIX] 제목 끝 업체명 표시 ──────────────────
function resolveTitleSuffix(titleSuffixOn, storeName) {
  const on = titleSuffixOn === true || titleSuffixOn === "true" || titleSuffixOn === 1;
  const name = (storeName || "").trim();
  if (!on || !name) return "";
  return ` | ${name}`;
}

function buildTitle(region, treatment, suffix) {
  const patterns = treatment.titlePatterns || [];
  const pick =
    patterns[Math.floor(Math.random() * patterns.length)] ||
    `{region} ${treatment.name} 안내`;
  let title = pick.replace(/\{region\}/g, region).trim();
  title = title.replace(/(행정사).*(행정사)/, "$1");
  return (title + (suffix || "")).trim();
}

// ============================================================
export default async function handleAdministrative(req, res) {
  try {
    const {
      program,
      userRegion,
      region: regionFallback,
      storeName: bodyStoreName,
      phone: bodyPhone,
      consultInfo: bodyConsultInfo,
      titleSuffixOn,                                    // [TITLE-SUFFIX]
      address, map_guide, transit, building_desc, parking_info,
      visit_info: bodyVisitInfo, // [세션47][PRO-VISIT] 방문상담 SoT // [PATCH-07]
    } = req.body;

    const _locStore = { address, map_guide, transit, building_desc, parking_info };
    // [세션47][PRO-VISIT] 방문상담 SoT — store_profiles.visit_info (JSONB). index.js 세션37 배선으로 이미 전달 중.
    //   신규 스키마 0. 빈 객체면 🗓 방문상담 안내 블록 미생성(부작용 0).
    const _visitInfo = (bodyVisitInfo && typeof bodyVisitInfo === "object") ? bodyVisitInfo : {};

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();
    const storeName = (bodyStoreName || "").trim();
    const phone = (bodyPhone || "").trim();
    const consultInfo = (bodyConsultInfo || "").trim();

    const treatment =
      ADMIN_TREATMENTS.find((t) => t.id === program?.id) ||
      ADMIN_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `행정사 업무 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const axis = getAdminAxis(treatment.id);
    const systemPrompt = buildSystemPromptV2(region, treatment);

    // ── 7섹션 순차 생성 ──
    const sections = [];
    for (const sec of ADMIN_FLOW_V2) {
      const userPrompt = buildUserPromptV2(region, treatment, sec.key);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.75,
      });

      let body = completion.choices[0]?.message?.content || "";
      body = stripMidHashtags(body);
      body = body.replace(/!?\[[^\]]*\]/g, "").trim();
      body = body.replace(/(^|\n)\s*(운영자|행정사)\s*(\n|$)/g, "\n").trim();

      // 재인사 제거 (intro 외)
      if (sec.key !== "intro") {
        body = body
          .replace(/(^|\n)\s*안녕[하십]+[^\n]*?(안내|안내드립니다|안내해\s*드립니다)[^\n]*\.?\s*(\n|$)/g, "\n")
          .trim();
      }

      // [APPROVAL-CAP] criteria 중심. 전 섹션 적용(결과 약속은 어디서든 나올 수 있음).
      body = capApproval(body);
      // [세션46-2][TERM-AXIS] 심판 전용 용어 유입 차단 (appeal 외)
      body = normalizeAxisTerms(body, axis);

      // closing 재요약 차단
      if (sec.key === "closing") {
        const cutH = body.search(/(^|\n)\s*(제도\s*개요|준비\s*서류|진행\s*절차|요건|기한)\s*(\n|:|를|은|이)/);
        if (cutH > 60) body = body.slice(0, cutH).trim();
        if (/\n\s*\d+\.\s/.test(body)) {
          body = body.split(/\n{2,}/).slice(0, 1).join("\n\n").trim();
        }
      }

      // 사진 3슬롯
      if (ADMIN_PHOTO_ALT_V2[sec.key]) {
        body += "\n\n[이미지: " + ADMIN_PHOTO_ALT_V2[sec.key] + "]";
      }

      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = capApproval(content);              // 조립 후 2차 (문장 경계 재확인)
    content = normalizeAxisTerms(content, axis); // [TERM-AXIS] 2차
    content = fixOrphans(content);               // [ORPHAN-COMMA] 금칙어 split 잔존 부호 정리
    content = removeDupParagraphs(content);

    // placeholder 잔존 처리
    {
      const ph = /(○+|\{행정사사무소명\})\s*행정사사무소|\{행정사사무소명\}/g;
      // [ADMIN-STORENAME-LEAK-01] storeName 치환 제거 — 항상 삭제
      content = content.replace(
            /(^|\n)[^\n]*(○+행정사사무소|\{행정사사무소명\})[^\n]*안내[^\n]*\.?\s*(\n|$)/g,
            "\n"
          );
    }

    // [ADMIN-STORENAME-LEAK-01] 도입 인사말 주입 제거
    content = applyPhotoBoxes(content);
    content = content.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();

    // 끝 서명 닉네임 제거
    content = content
      .replace(/\n\s*([가-힣A-Za-z]{1,6})\s*$/g, (m, w) =>
        /(행정사|사무소|법인|드림|올림)/.test(w) ? m : "\n"
      )
      .trimEnd();

    // [STORE-IN-BODY] 전화·상담정보만
    // [세션47][PRO-VISIT] buildOfficeClosing 호출 제거 — 상담정보 SoT를 proVisitBlock으로 일원화.
    //   ⚠ 실측: index.js 페이로드에 phone/consultInfo 키가 존재하지 않는다 → 이 블록은 항상 빈값(미출력)이었다.
    //     즉 기능 제거가 아니라 사문화 코드 정리. 출력 변화 0. buildOfficeClosing 정의는 롤백 대비 보존(미호출).

    // [3AXIS] 해시태그
    content += buildHashtags(region, kw, axis);
    content = content.replace(/\n{3,}/g, "\n\n").trim();

    // [PATCH-07] 위치블록 후단
    // [세션47][PRO-VISIT] 방문정보 공통 삽입 — [📷외관 → 📍찾아오시는 길 → 📷입구 → 🗓방문상담 → 📷상담실·대표실·주차장·약도]
    //   ⚠ locationBlock은 insertProVisitInfo 내부에서 호출된다(2회 삽입 방지 · 위치 SoT 단일).
    content = insertProVisitInfo(content, _locStore, _visitInfo);
    // [세션47] 신규 삽입된 [이미지: …] 6슬롯을 placeholder로 변환. 이미 변환된 박스는 패턴 불일치로 무영향(멱등).
    content = applyPhotoBoxes(content);

    // [TITLE-SUFFIX]
    const suffix = resolveTitleSuffix(titleSuffixOn, storeName);
    const title = buildTitle(region, treatment, suffix);
    const imageAlts = getImageAltsV2();

    // ── QC ──
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const kwCount = (content.match(new RegExp(esc(kw), "g")) || []).length;
    const fullKw = `${region} ${kw}`;
    const fullCount = (content.match(new RegExp(esc(fullKw), "g")) || []).length;
    console.log(`[QC][administrative][${axis}] 키워드(${kw}): ${kwCount}`);
    console.log(`[QC][administrative][${axis}] 복합키워드(${fullKw}): ${fullCount}`);
    console.log(`[QC][administrative][${axis}] 글자수: ${content.length}`);

    return res.status(200).json({
      title,
      text: content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "administrative",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      axis,
      seoScore: null,
    });
  } catch (err) {
    console.error("[administrative] 오류:", err);
    return res.status(500).json({ error: err.message || "행정사 글 생성 오류" });
  }
}
