// scripts/funeralSampleRunner.js
// ============================================================
// FUNERAL-SAMPLE-RUNNER-01 · V1
//   /api/generate 만 호출한다. 그 외 어떤 엔드포인트도 호출하지 않는다.
//   → DB 저장(/api/save-generated) · 발행(/api/publish) · 관측(/api/me/rank)
//     · 네이버 요청 전부 별개 경로이므로 금지 4항목이 자동 충족된다.
//
//   실행:  node scripts/funeralSampleRunner.js --count 10
//   옵션:  --count N (기본 10) / --base http://localhost:3000 / --tag 라벨
//   출력:  tmp/funeral-samples/<tag>_<timestamp>.json   (git 제외)
//
//   ★ 자동 QC 판정 0 — 원문 전량 보존만 한다. 판정은 사람이 한다.
//   ★ 세션 쿠키/토큰 복제 0 — 익명 호출. hallFacts 는 서버가
//     funeral_halls_public 에서 조회하므로(FUNERAL-PUBLIC-RUNTIME-INJECT-01)
//     hallName 문자열만 넘기면 Facts 경로가 동일하게 성립한다.
// ============================================================
const fs = require("fs");
const path = require("path");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const COUNT    = parseInt(arg("--count", "10"), 10);
const BASE     = arg("--base", "http://localhost:3000");
const TAG      = arg("--tag", "run");
const INTERVAL = 800;

const FIXTURE_PATH = path.join(__dirname, "fixture.funeral.json");
const OUT_DIR      = path.join(process.cwd(), "tmp", "funeral-samples");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const payload = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const stamp   = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(OUT_DIR, `${TAG}_${stamp}.json`);

  console.log(`[runner] base=${BASE} count=${COUNT} hall=${payload.hallName}`);

  const samples = [];
  for (let n = 1; n <= COUNT; n++) {
    const t0 = Date.now();
    let rec = { n, ok: false, status: 0, ms: 0 };
    try {
      const res = await fetch(`${BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      rec = {
        n,
        ok: res.ok,
        status: res.status,
        ms: Date.now() - t0,
        title: data.title || "",
        text: data.text || "",
        textMarkdown: data.textMarkdown || "",
        content: data.content || "",
        qc: data.qc ?? null,
        error: data.error || null,
        message: data.message || null,
      };
    } catch (e) {
      rec.ms = Date.now() - t0;
      rec.error = e && e.message ? e.message : String(e);
    }
    samples.push(rec);
    console.log(`[runner] ${n}/${COUNT} ${rec.ok ? "OK " : "FAIL"} ${rec.status} ${rec.ms}ms ${(rec.title || rec.error || "").slice(0, 50)}`);

    fs.writeFileSync(outFile, JSON.stringify({
      tag: TAG, base: BASE, count: COUNT, startedAt: stamp, payload, samples,
    }, null, 2), "utf8");

    if (n < COUNT) await sleep(INTERVAL);
  }

  const okN = samples.filter(s => s.ok).length;
  console.log(`[runner] done ${okN}/${COUNT} ok → ${outFile}`);
}

main().catch(e => { console.error("[runner] fatal:", e); process.exit(1); });
