// scripts/ingest-funeral-public.mjs
// FUNERAL-PUBLIC-DATA-INGEST-01B-IMPLEMENT
//   보건복지부_전국 장례식장 조회 공공데이터 수집 → 정규화 → 검증.
//   ★ DB 접속 코드 없음. Supabase import 없음. 적재(--load)는 별도 승인 축.
//
// 사용법 (PowerShell, D:\commercial-blog 에서)
//   node scripts/ingest-funeral-public.mjs --fetch  --data-date=2026-04-01
//   node scripts/ingest-funeral-public.mjs --verify
//
// 산출물: scripts/out/funeral_public/
//   funeral_public_raw_YYYYMMDD_pN.xml   원본 XML (페이지별, 무가공 보존)
//   funeral_public_normalized.json       정규화 배열 + 메타
//
// 의존성: fast-xml-parser (수집 스크립트 전용)
//   npm i fast-xml-parser

import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

// ───────────────────────────────────────────────────────────
// 상수
// ───────────────────────────────────────────────────────────
const API_URL =
  "https://apis.data.go.kr/1352000/ODMS_DATA_04_1/callData04_1Api";
const OUT_DIR = path.join("scripts", "out", "funeral_public");
const NORMALIZED_PATH = path.join(OUT_DIR, "funeral_public_normalized.json");

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;      // 안전장치. totalCount 급증 시 폭주 방지
const PAGE_DELAY_MS = 300;

// 이상치 경고 임계 — 원본 오기 탐지용. reject 아님.
const OUTLIER = { parking: 2000, halls: 100, mortuary: 500 };

// ───────────────────────────────────────────────────────────
// 유틸
// ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function die(msg) {
  console.error(`\n[FAIL] ${msg}\n`);
  process.exit(1);
}

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

// .env.local 에서 키 1개만 읽는다 (dotenv 미도입).
function readEnvLocal(key) {
  const p = ".env.local";
  if (!fs.existsSync(p)) die(`.env.local 없음 (cwd=${process.cwd()})`);
  const line = fs
    .readFileSync(p, "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${key}=`));
  if (!line) die(`.env.local 에 ${key} 없음`);
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

function ymd(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

// ───────────────────────────────────────────────────────────
// 정규화 규칙 (01B 설계 확정분)
// ───────────────────────────────────────────────────────────
const txt = (v) => (v === null || v === undefined ? "" : String(v).trim());

// 연속 공백 1칸 축약 (name 전용)
const squash = (v) => txt(v).replace(/\s+/g, " ");

// 숫자 → "N대" / "N실" / "N구".
//   0 · NaN · 빈값 → null  (0을 출력하면 "주차 0대"가 본문에 박제된다)
function numUnit(v, unit) {
  const s = txt(v);
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${Math.trunc(n)}${unit}`;
}

const nullIfEmpty = (v) => {
  const s = txt(v);
  return s ? s : null;
};

function normalizeItem(it) {
  const ctpv = txt(it.ctpv);
  const name = squash(it.fcltNm);

  // 필수키 결측 → reject
  if (!ctpv || !name) {
    return { ok: false, reason: !ctpv ? "ctpv_missing" : "name_missing", raw: it };
  }

  return {
    ok: true,
    row: {
      ctpv,
      sigungu: txt(it.sigungu),           // 스키마 NOT NULL DEFAULT '' 계약과 일치
      name,
      address: nullIfEmpty(it.addr),
      parking: numUnit(it.tpkct, "대"),
      halls: numUnit(it.mtaCnt, "실"),
      mortuary: numUnit(it.ehrCnt, "구"),
    },
  };
}

// ───────────────────────────────────────────────────────────
// FETCH
// ───────────────────────────────────────────────────────────
async function runFetch() {
  const dataDate = arg("data-date");
  if (!dataDate || !/^\d{4}-\d{2}-\d{2}$/.test(dataDate)) {
    die("--data-date=YYYY-MM-DD 필수 (원본 기준일). 기본값 없음.");
  }

  const key = readEnvLocal("DATA_GO_KR_KEY");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
    parseTagValue: false,   // 전부 문자열로 받는다. 숫자 변환은 정규화에서만.
  });

  const stamp = ymd();
  const items = [];
  let expectedTotal = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url =
      `${API_URL}?serviceKey=${key}` +
      `&pageNo=${page}&numOfRows=${PAGE_SIZE}`;

    const res = await fetch(url);
    if (!res.ok) die(`HTTP ${res.status} (page ${page})`);
    const xml = await res.text();

    // 원본 무가공 보존 — 정규화 실패 시 재호출 없이 재작업
    fs.writeFileSync(
      path.join(OUT_DIR, `funeral_public_raw_${stamp}_p${page}.xml`),
      xml,
      "utf8"
    );

    const doc = parser.parse(xml);
    const body = doc?.response?.body;
    const header = doc?.response?.header;

    if (header?.resultCode && String(header.resultCode) !== "00") {
      die(`API resultCode=${header.resultCode} msg=${header.resultMsg} (page ${page})`);
    }
    if (!body) die(`응답 body 없음 (page ${page})`);

    const total = Number(body.totalCount);
    if (!Number.isFinite(total)) die(`totalCount 파싱 실패 (page ${page})`);

    if (expectedTotal === null) {
      expectedTotal = total;                       // ★ 하드코딩 없음. 첫 페이지 값이 기준.
      console.log(`expected totalCount: ${expectedTotal}`);
    } else if (total !== expectedTotal) {
      die(
        `수집 중 totalCount 변동: ${expectedTotal} → ${total} (page ${page}). ` +
        `원본이 갱신 중일 수 있음. 전량 재수집 필요.`
      );
    }

    // 단일 item 시 객체로 오는 공공API 공통 함정 방어
    let pageItems = body?.items?.item ?? [];
    if (!Array.isArray(pageItems)) pageItems = pageItems ? [pageItems] : [];

    console.log(`  page ${page}: ${pageItems.length} items`);
    items.push(...pageItems);

    if (items.length >= expectedTotal) break;
    if (pageItems.length === 0) {
      die(`page ${page} 빈 응답인데 누적 ${items.length} < ${expectedTotal}`);
    }
    if (page === MAX_PAGES) {
      die(`MAX_PAGES(${MAX_PAGES}) 도달. 누적 ${items.length} < ${expectedTotal}`);
    }
    await sleep(PAGE_DELAY_MS);
  }

  // 정규화
  const rows = [];
  const rejects = [];
  for (const it of items) {
    const r = normalizeItem(it);
    if (r.ok) rows.push(r.row);
    else rejects.push({ reason: r.reason, raw: r.raw });
  }

  const payload = {
    meta: {
      source: API_URL,
      data_date: dataDate,
      synced_at: new Date().toISOString(),
      expected_total: expectedTotal,
      collected: items.length,
      normalized: rows.length,
      rejected: rejects.length,
    },
    rejects,
    rows,
  };

  fs.writeFileSync(NORMALIZED_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`\nsaved: ${NORMALIZED_PATH}`);
  console.log(`  collected ${items.length} / normalized ${rows.length} / rejected ${rejects.length}`);
  console.log(`\n다음: node scripts/ingest-funeral-public.mjs --verify`);
}

// ───────────────────────────────────────────────────────────
// VERIFY — 적재 전 필수 게이트
// ───────────────────────────────────────────────────────────
function runVerify() {
  if (!fs.existsSync(NORMALIZED_PATH)) die(`${NORMALIZED_PATH} 없음. --fetch 먼저.`);
  const { meta, rows, rejects } = JSON.parse(fs.readFileSync(NORMALIZED_PATH, "utf8"));

  const fails = [];
  const line = (s) => console.log(s);

  line("═══════════════════════════════════════════════");
  line(" FUNERAL-PUBLIC-DATA-INGEST-01B — VERIFY REPORT");
  line("═══════════════════════════════════════════════");
  line(` data_date : ${meta.data_date}`);
  line(` synced_at : ${meta.synced_at}`);
  line("");

  // 1. 건수
  line(`[1] expected totalCount: ${meta.expected_total} / collected: ${meta.collected}`);
  if (meta.collected !== meta.expected_total) fails.push("수집건수 != totalCount");

  // 2. reject
  line(`[2] rejected: ${rejects.length}`);
  for (const r of rejects.slice(0, 20)) {
    line(`    - ${r.reason} :: ${JSON.stringify(r.raw).slice(0, 160)}`);
  }
  if (rejects.length > 20) line(`    ... 외 ${rejects.length - 20}건`);

  // 3. 정규화 후 건수
  line(`[3] normalized: ${rows.length}  (= ${meta.collected} - ${rejects.length})`);
  if (rows.length !== meta.collected - rejects.length) fails.push("정규화 건수 불일치");

  // 4. ★ 3중키 중복 — UNIQUE(ctpv, sigungu, name)
  const bucket = new Map();
  for (const r of rows) {
    const k = `${r.ctpv}|${r.sigungu}|${r.name}`;
    bucket.set(k, (bucket.get(k) || 0) + 1);
  }
  const dups = [...bucket.entries()].filter(([, c]) => c > 1);
  line(`[4] 3중키 중복: ${dups.length}종`);
  for (const [k, c] of dups) line(`    - (${c}) ${k}`);
  if (dups.length > 0) fails.push("UNIQUE(ctpv,sigungu,name) 위반 — 적재 불가");

  // 5. 결측률
  const pct = (n) => `${((n / rows.length) * 100).toFixed(1)}%`;
  const miss = (f) => rows.filter((r) => r[f] === null || r[f] === "").length;
  line("[5] 결측률");
  for (const f of ["sigungu", "address", "parking", "halls", "mortuary"]) {
    const m = miss(f);
    line(`    ${f.padEnd(9)} ${String(m).padStart(5)} / ${rows.length}  (${pct(m)})`);
  }

  // 6. 이상치
  const numOf = (v) => (v ? Number(String(v).replace(/[^\d]/g, "")) : 0);
  line("[6] 이상치 (원본 오기 탐지 · reject 아님)");
  let outCnt = 0;
  for (const r of rows) {
    const hits = [];
    if (numOf(r.parking) > OUTLIER.parking) hits.push(`parking=${r.parking}`);
    if (numOf(r.halls) > OUTLIER.halls) hits.push(`halls=${r.halls}`);
    if (numOf(r.mortuary) > OUTLIER.mortuary) hits.push(`mortuary=${r.mortuary}`);
    if (hits.length) {
      outCnt++;
      if (outCnt <= 20) line(`    - ${r.ctpv} ${r.sigungu} ${r.name} :: ${hits.join(", ")}`);
    }
  }
  line(`    총 ${outCnt}건`);

  line("");
  line("═══════════════════════════════════════════════");
  if (fails.length === 0) {
    line(" RESULT: PASS — 적재 승인 요청 가능");
  } else {
    line(" RESULT: FAIL");
    for (const f of fails) line(`   · ${f}`);
  }
  line("═══════════════════════════════════════════════");
  if (fails.length) process.exitCode = 1;
}

// ───────────────────────────────────────────────────────────
// LOAD — service_role upsert. 01C DDL 승인·실행 후에만 사용.
//   대상 DB는 .env.local 의 NEXT_PUBLIC_SUPABASE_URL 이 가리키는 곳.
//   (DB_ENV_RULES: 작업 DB = vuuqtrzcfjbywlxqskoi 단일)
// ───────────────────────────────────────────────────────────
const LOAD_BATCH = 300;

async function runLoad() {
  if (!fs.existsSync(NORMALIZED_PATH)) die(`${NORMALIZED_PATH} 없음. --fetch 먼저.`);
  const { meta, rows } = JSON.parse(fs.readFileSync(NORMALIZED_PATH, "utf8"));

  // 적재 전 최소 재검증 — verify 를 건너뛴 실수 방지
  if (rows.length !== meta.expected_total - meta.rejected) {
    die(`정규화 건수 불일치. --verify 를 먼저 통과시킬 것.`);
  }
  const seen = new Set();
  for (const r of rows) {
    const k = `${r.ctpv}|${r.sigungu}|${r.name}`;
    if (seen.has(k)) die(`3중키 중복 발견: ${k}. 적재 중단.`);
    seen.add(k);
  }

  const url = readEnvLocal("NEXT_PUBLIC_SUPABASE_URL");
  const svc = readEnvLocal("SUPABASE_SERVICE_ROLE_KEY");
  if (!svc.startsWith("sb_secret_")) {
    die(`SUPABASE_SERVICE_ROLE_KEY 형식 이상(sb_secret_ 아님). DB_ENV_RULES 확인.`);
  }
  console.log(`target: ${url}`);

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, svc, { auth: { persistSession: false } });

  const payload = rows.map((r) => ({
    ...r,
    data_date: meta.data_date,
    synced_at: meta.synced_at,
  }));

  let done = 0;
  for (let i = 0; i < payload.length; i += LOAD_BATCH) {
    const chunk = payload.slice(i, i + LOAD_BATCH);
    const { error } = await db
      .from("funeral_halls_public")
      .upsert(chunk, { onConflict: "ctpv,sigungu,name" });
    if (error) die(`upsert 실패 (offset ${i}): ${error.message}`);
    done += chunk.length;
    console.log(`  upserted ${done} / ${payload.length}`);
  }

  const { count, error: cErr } = await db
    .from("funeral_halls_public")
    .select("*", { count: "exact", head: true });
  if (cErr) die(`count 조회 실패: ${cErr.message}`);

  console.log("");
  console.log(`sent: ${payload.length} / db row count: ${count}`);
  console.log(count === payload.length ? "RESULT: PASS" : "RESULT: FAIL — 건수 불일치");
  if (count !== payload.length) process.exitCode = 1;
}

// ───────────────────────────────────────────────────────────
if (hasFlag("fetch")) await runFetch();
else if (hasFlag("verify")) runVerify();
else if (hasFlag("load")) await runLoad();
else {
  console.log("usage:");
  console.log("  node scripts/ingest-funeral-public.mjs --fetch --data-date=YYYY-MM-DD");
  console.log("  node scripts/ingest-funeral-public.mjs --verify");
  console.log("  node scripts/ingest-funeral-public.mjs --load");
}
