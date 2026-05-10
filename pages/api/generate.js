// ============================================================
// generate.js — 업종 라우터 (분기만 담당)
// ⚠️ 이 파일에 업종별 로직 절대 추가 금지
// ⚠️ 새 업종 추가 시: generateXxx.js 생성 후 아래 분기만 추가
// ============================================================

import handleClinic      from "./generateClinic";
import handleDental      from "./generateDental";
import handleEnt         from "./generateEnt";
import handleUrology     from "./generateUrology";
import handleOriental    from "./generateOriental";
import handleOrtho       from "./generateOrtho";
import handlePediatrics  from "./generatePediatrics";   // ← 소아청소년과 추가
import handleGastro      from "./generateGastro";         // ← 소화기내과 추가
import handleGeneral     from "./generateGeneral";        // ← 내과·가정의학과 추가
import handleObgyn      from "./generateObgyn";          // ← 산부인과 추가
import handleDerma      from "./generateDerma";          // ← 피부과 추가
import handlePain       from "./generatePain";           // ← 통증의학과 추가
import handleNeuro      from "./generateNeuro";          // ← 신경외과 추가
import handlePsy        from "./generatePsy";            // ← 정신건강의학과 추가
import handleEye        from "./generateEye";            // ← 안과 추가
import handleFamily     from "./generateFamily";         // ← 가정의학과 추가

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { program } = req.body;
  if (!program) return res.status(400).json({ error: "프로그램 정보가 없습니다." });

  // ── 업종 결정 ────────────────────────────────────────
  const industry = req.body.industry || process.env.NEXT_PUBLIC_INDUSTRY || "clinic";

  console.log(`[router] 업종: ${industry} | 시술: ${program.name}`);

  // ── 업종별 독립 핸들러로 라우팅 ─────────────────────
  try {
    if (industry === "clinic")      return handleClinic(req, res);
    if (industry === "dental")      return handleDental(req, res);
    if (industry === "ent")         return handleEnt(req, res);
    if (industry === "urology")     return handleUrology(req, res);
    if (industry === "oriental")    return handleOriental(req, res);
    if (industry === "ortho")       return handleOrtho(req, res);
    if (industry === "pediatrics")  return handlePediatrics(req, res);  // ← 추가
    if (industry === "gastro")      return handleGastro(req, res);         // ← 추가
    if (industry === "general")     return handleGeneral(req, res);        // ← 추가
    if (industry === "obgyn")       return handleObgyn(req, res);           // ← 추가
    if (industry === "derma")       return handleDerma(req, res);           // ← 추가
    if (industry === "pain")        return handlePain(req, res);            // ← 추가
    if (industry === "neuro")       return handleNeuro(req, res);           // ← 신경외과 추가
    if (industry === "psy")         return handlePsy(req, res);             // ← 정신건강의학과 추가
    if (industry === "eye")         return handleEye(req, res);             // ← 안과 추가
    if (industry === "family")      return handleFamily(req, res);          // ← 가정의학과 추가

    // 추후 업종 추가 예시:

    return res.status(400).json({ error: `지원하지 않는 업종: ${industry}` });

  } catch (err) {
    console.error(`[router] ${industry} 오류:`, err);
    return res.status(500).json({ error: err.message || "글 생성 중 오류가 발생했습니다." });
  }
}
