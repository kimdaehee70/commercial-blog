// pages/api/generateShaman.js
// AI-POST 무속 상담 엔진 V1 — 생성 파이프라인
//
// 순서 (고정):
//   프롬프트 빌드 → GPT 생성 → FORBIDDEN 검사 → (적발 시 1회 재생성)
//   → 최종 FORBIDDEN 재검사 → NOTICE 삽입 → 반환
//
// NOTICE는 반드시 검사 통과 후에만 붙인다. 먼저 붙이면 고지문까지 금지어 검사 대상이 된다.

import {
  SHAMAN_SPECIALTIES,
  SHAMAN_SITUATIONS,
  SHAMAN_MENUS,
  SHAMAN_META,
  situationsBySpecialty,
  getSpecialty,
  getSituation,
  getPhotoCount,
  resolveEntry,
  requiresCaseInput,
  resolveShamanTitle,
} from "../../lib/shaman-data";
// ※ INDUSTRY_CONFIG(index.js)가 플랫폼 SoT. 엔진 측 playConfig export는 두지 않는다.

import {
  buildShamanPrompt,
  checkForbidden,
  forbiddenRetryHint,
  finalizeShamanPost,
  validateCaseInput,
  CASE_GATE_MESSAGE,
} from "../../lib/shaman-prompts";

/* ═════════════════════════════════════════════
   1. 모델 호출
   ═════════════════════════════════════════════ */
const MODEL = process.env.SHAMAN_MODEL || "gpt-4o";

async function callOpenAI({ system, user }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.85,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`[shaman] model error ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  return (json.choices?.[0]?.message?.content || "").trim();
}

/* ═════════════════════════════════════════════
   2. 제목 / 본문 분리
   프롬프트가 첫 줄에 제목을 쓰게 지시함
   ═════════════════════════════════════════════ */
//
// ★ 세션102 — 첫 줄을 무조건 제목으로 잘라내던 로직 제거.
//   모델이 제목 줄을 빼면 본문 첫 문장이 제목이 되고, 그 문장은 본문에서도 사라졌다.
//   이제: 첫 줄을 후보로만 보고 → 검증 → 실패하면 패턴에서 제목을 만들고 첫 줄은 본문에 되돌린다.
function splitTitle(raw, titleCtx = {}) {
  const lines = String(raw).split("\n");
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;

  const cand = (lines[i] || "")
    .replace(/^#+\s*/, "")
    .replace(/^제목\s*[:：]\s*/, "")
    .replace(/^["'\[]|["'\]]$/g, "")
    .trim();

  const rest = lines.slice(i + 1).join("\n").trim();
  const bodyFirst = (rest.split(/(?<=[.?!])\s|\n/)[0] || "").trim();

  const r = resolveShamanTitle(cand, { ...titleCtx, bodyFirst });

  // 모델 제목이 통과 → 첫 줄은 제목이었다. 본문에서 제외.
  // 실패 → 첫 줄은 본문 문장이었다. 본문 앞에 되돌린다.
  const body = r.source === "model"
    ? (rest || String(raw).trim())
    : [cand, rest].filter(Boolean).join("\n\n").trim();

  return { title: r.title, body: body || String(raw).trim(), titleSource: r.source, titleFails: r.fails };
}

/* ═════════════════════════════════════════════
   3. 핵심 생성 함수
   ═════════════════════════════════════════════ */
export async function generateShaman(opts = {}) {
  // 플랫폼 경로: treatmentId 1개만 넘어온다 → resolveEntry로 A/B 판정.
  // 직접 호출 경로(테스트·V2): menu/situationId/specialtyId 명시 가능.
  if (opts.treatmentId && !opts.menu) {
    const r = resolveEntry(opts.treatmentId);
    if (!r) return { ok: false, code: "UNKNOWN_TREATMENT", message: `알 수 없는 항목: ${opts.treatmentId}` };
    opts = { ...opts, ...r };
  }

  const {
    menu = "situation",
    situationId = null,
    specialtyId = null,
    region = "",
    caseInput = null,
    visitInfo = null,
    storeFields = null,
    maxRetry = 1,                 // FORBIDDEN 적발 시 재생성 횟수
    _callModel,                   // 테스트 주입용
  } = opts;

  const call = _callModel || callOpenAI;

  /* ── 4-1. 입력 검증 ── */
  const menuDef = SHAMAN_MENUS.find((m) => m.id === menu);
  if (!menuDef) return { ok: false, code: "UNKNOWN_MENU", message: `알 수 없는 메뉴: ${menu}` };
  // V1 미개방 엔진(Engine C) 차단 — 입력 폼 UI 준비 후 hidden 해제.
  if (menuDef.hidden && !opts.allowHidden) {
    return { ok: false, code: "MENU_NOT_AVAILABLE", message: "아직 제공되지 않는 기능입니다." };
  }

  if (menuDef.axis === "specialty" && !getSpecialty(specialtyId)) {
    return { ok: false, code: "SPECIALTY_REQUIRED", message: "전문 분야를 선택해주세요." };
  }
  if (menuDef.axis === "situation" && !getSituation(situationId)) {
    return { ok: false, code: "SITUATION_REQUIRED", message: "상황을 선택해주세요." };
  }

  /* ── 4-2. Engine C 실입력 게이트 ── */
  if (requiresCaseInput(menu)) {
    const v = validateCaseInput(caseInput || {});
    if (!v.ok) {
      return {
        ok: false,
        code: "CASE_INPUT_REQUIRED",
        message: CASE_GATE_MESSAGE,
        missing: v.missing,
        tooShort: v.tooShort,
      };
    }
  }

  /* ── 4-3. 프롬프트 빌드 ── */
  let prompt;
  try {
    prompt = buildShamanPrompt({ menu, situationId, specialtyId, region, caseInput });
  } catch (e) {
    if (e.code === "CASE_INPUT_REQUIRED") {
      return { ok: false, code: "CASE_INPUT_REQUIRED", message: CASE_GATE_MESSAGE, ...e.detail };
    }
    return { ok: false, code: "PROMPT_BUILD_FAILED", message: e.message };
  }

  const noticeCtx = {
    situationId: menuDef.axis === "situation" ? situationId : null,
    specialtyId: menuDef.axis === "specialty" ? specialtyId : prompt.meta.specId,
    region,                                  // 후단 📍 블록에 사용 (본문 주소 금지)
    visitInfo: opts.visitInfo || null,       // visit_info 객체
    storeFields: opts.storeFields || null,   // req.body 평면 필드(전화·영업시간·주차·교통)
  };

  /* ── 4-4. 생성 → 검사 → 재생성 ── */
  const attempts = [];
  let userPrompt = prompt.user;

  for (let n = 0; n <= maxRetry; n++) {
    const raw = await call({ system: prompt.system, user: userPrompt });
    const { title, body, titleSource, titleFails } = splitTitle(raw, {
      axis: prompt.meta.axis,
      situationId: prompt.meta.situationId || situationId,
      specialtyId: menuDef.axis === "specialty" ? specialtyId : null,
      specId: prompt.meta.specId,
    });

    // 검사 + (통과 시에만) NOTICE 삽입 — 순서 고정
    const fin = finalizeShamanPost(body, noticeCtx);
    attempts.push({ n, pass: fin.ok, hits: fin.hits || [], chars: body.replace(/\n/g, "").length });

    if (fin.ok) {
      const chars = fin.text.replace(/\n/g, "").length;
      return {
        ok: true,
        title,
        body: fin.text,
        meta: {
          ...prompt.meta,
          menu,
          region,
          chars,
          charCount: chars,            // ORBIT 관측 — 글자수 ↔ 순위·체류시간 상관분석용
          charTarget: SHAMAN_META.charTarget,
          charInRange: chars >= SHAMAN_META.charTarget[0] && chars <= SHAMAN_META.charTarget[1],
          photoCount: getPhotoCount(prompt.meta.specId),
          photoMarkers: (fin.text.match(/📷/g) || []).length,
          retried: n,
          titleSource,                 // model | pattern | fallback — 관측용
          titleFails: titleFails || [],
          model: MODEL,
        },
        attempts,
      };
    }

    // 마지막 시도였으면 폐기
    if (n === maxRetry) {
      return {
        ok: false,
        code: "FORBIDDEN_FINAL",
        message: "생성 결과에 사용할 수 없는 표현이 반복되어 글을 폐기했습니다. 다시 시도해주세요.",
        hits: fin.hits,
        attempts,
      };
    }

    // 재생성 — 원 프롬프트 말미에 적발 내역 첨부
    userPrompt = prompt.user + forbiddenRetryHint(fin.hits);
  }
}

/* ═════════════════════════════════════════════
   4. API 핸들러
   pages/api/generate-shaman.js 에서 re-export 하거나 그대로 사용
   ═════════════════════════════════════════════ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const b = req.body || {};
  const { program = {}, menu, situationId, specialtyId, caseInput } = b;

  // ── 플랫폼 계약 ──
  // generate.js(라우터)는 handle(req,res)로 그대로 넘긴다.
  // 선택된 메뉴는 req.body.program.name(메뉴 라벨)에 담긴다 — treatmentId 아님.
  // resolveEntry가 id·메뉴명 양쪽을 해석하므로 라벨을 그대로 전달한다.
  const treatmentId = b.treatmentId || program.name || null;
  const region = b.region || b.address || "";

  // 방문정보 — 라우터가 방문형 업종이면 이미 비워둔 상태로 도착한다(stripVisitFieldsIfNoStore).
  // 무속은 매장형이므로 값이 그대로 온다. 없는 항목은 후단 블록에서 자동 생략된다.
  const visitInfo = b.visit_info || null;
  const storeFields = b;

  try {
    // NOTE: quota 차감 · 로그 적재는 상위 공통 미들웨어에서 처리. 여기서 중복 처리하지 않는다.
    const out = await generateShaman({ treatmentId, menu, situationId, specialtyId, region, caseInput, visitInfo, storeFields });

    if (!out.ok) {
      const status = out.code === "FORBIDDEN_FINAL" ? 422 : 400;
      // 폐기·차단 사유는 반드시 서버 로그에 남긴다(400/422 원인 추적).
      console.warn("[shaman] reject:", out.code, JSON.stringify(out.hits || out.missing || out.message || ""));
      return res.status(status).json(out);
    }

    // 프론트 소비 키 미확정 구간 — 별칭 추가(가산만, 기존 키 무변경).
    return res.status(200).json({
      ...out,
      content: out.body,
      text: out.body,
      result: out.body,
    });
  } catch (e) {
    console.error("[shaman] generate failed:", e);
    return res.status(500).json({ ok: false, code: "GENERATE_FAILED", message: e.message });
  }
}

/* ═════════════════════════════════════════════
   5. 프론트 보조
   ═════════════════════════════════════════════ */
export function shamanSituationsFor(specId) {
  return situationsBySpecialty(specId).map((s) => ({ id: s.id, label: s.name }));
}

export { SHAMAN_SPECIALTIES, SHAMAN_SITUATIONS, SHAMAN_MENUS, CASE_GATE_MESSAGE };
