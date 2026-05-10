// lib/extractPattern.js
// 90점 이상 글에서 패턴 추출 → patternDB에 저장
// v2 — 구조/디테일 중심, 문장 최소화, 힌트 제거
//
// 올바른 비율:
//   구조    40% — 흐름만 (1~2개)
//   디테일  40% — 운영 방식 (최소 5개)
//   문장    20% — 최대 2개만

import OpenAI from "openai";
import fs   from "fs";
import path from "path";

// mergePatterns — patternDB.js 의존 제거, 직접 JSON 파일 저장
function mergePatterns(extracted, keyword) {
  try {
    const dbPath = path.join(process.cwd(), "data", "patterns_clinic.json");
    let db = { structures: [], details: [], sentences: [], totalSaved: 0 };
    if (fs.existsSync(dbPath)) {
      try { db = JSON.parse(fs.readFileSync(dbPath, "utf-8")); } catch (_) {}
    }
    // 중복 없이 병합
    const merge = (arr, items) => {
      const set = new Set(arr);
      (items || []).forEach(i => set.add(i));
      return [...set];
    };
    db.structures = merge(db.structures || [], extracted.structures);
    db.details    = merge(db.details    || [], extracted.details);
    db.sentences  = merge(db.sentences  || [], extracted.sentences);
    db.totalSaved = (db.totalSaved || 0) + 1;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
    return db;
  } catch (e) {
    console.error("[mergePatterns] 저장 오류:", e.message);
    return { totalSaved: 0 };
  }
}

export async function extractAndSavePattern(blogText, diagResult, keyword = "") {
  if (!blogText || blogText.trim().length < 100) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `아래 블로그 글은 네이버 SEO 진단 90점 이상을 받은 글이다.
이 글에서 "복제 안 되는 운영 패턴"만 추출하라.

핵심 원칙:
- 문장 표현 ❌ — 글이 굳어진다
- 도입/마무리 힌트 ❌ — GPT가 그대로 복붙한다
- 흐름 구조 + 운영 디테일만 ✅

【분석할 글】
${blogText.slice(0, 3000)}

【추출 기준】
structures (무조건 1개):
  - 글 전체 흐름만 (예: 입장→코너묘사→에피소드→운영설명→마무리)
  - 내용 없이 순서만

details (최소 5개, 많을수록 좋음):
  - 실제 운영 방식 (예: 화폐 5장 배분)
  - 공간 구성 (예: 코너 4개 분리)
  - 인원 배치 (예: 교사 2명 배치)
  - 동선 (예: 입구→출구 일방통행)
  - 참여 구조 (예: 동시 10명 대기 없음)
  - 역할 방식 (예: 판매원↔손님 교체)
  - 소품/도구 (예: 장바구니 + 종이화폐)

sentences (최대 2개만 — 많으면 글 굳어짐):
  - 아이 행동 패턴 딱 2개만
  - 표현 아닌 장면 묘사 방식으로

【출력 — JSON만, 다른 텍스트 없음】
{
  "structures": ["흐름 1개"],
  "details": ["디테일1", "디테일2", "디테일3", "디테일4", "디테일5"],
  "sentences": ["장면패턴1", "장면패턴2"],
  "openings": [],
  "closings": [],
  "keywords": []
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 파싱 실패");

    const extracted = JSON.parse(jsonMatch[0]);

    // 비율 강제 보정
    if (extracted.sentences?.length > 2) extracted.sentences = extracted.sentences.slice(0, 2);
    if (!extracted.details)  extracted.details  = [];
    // 힌트 항목 항상 비움
    extracted.openings  = [];
    extracted.closings  = [];
    extracted.keywords  = [];

    const db = mergePatterns(extracted, keyword);
    console.log(`[extractPattern v2] 구조:${extracted.structures?.length} 디테일:${extracted.details?.length} 문장:${extracted.sentences?.length} / 누적:${db.totalSaved}회`);
    return extracted;

  } catch (e) {
    console.error("[extractPattern] 오류:", e.message);
    return null;
  }
}
