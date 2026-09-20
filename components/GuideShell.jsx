// components/GuideShell.jsx
// ─────────────────────────────────────────────────────────────
// [AI-POST-OWNED-SEARCH-CONTENT-01] 공식 검색자산 공용 셸.
//
// ▸ 적용 범위: 이 축에서 신규 생성한 /guide/* 10페이지 전용.
//   pages/guide/clinic-blog-marketing.js 는 무접촉이다(선장 판정).
//   기존 1호는 자기 완결 파일로 그대로 둔다. 이 셸은 그 파일을 대체하지 않는다.
//
// ▸ 왜 컴포넌트로 뺐나.
//   1호 시점의 판단은 "재사용처가 1곳뿐인데 컴포넌트를 만들면 다음 축에서 정리 대상"이었다.
//   이번 축에서 재사용처가 10곳이 됐다. CSS 180행을 10벌 복제하면 문구 규칙 한 줄을
//   고칠 때 10곳을 고쳐야 한다. 누락이 생기는 구조를 먼저 막는다.
//
// ▸ 정적 렌더 유지.
//   getServerSideProps · 클라이언트 fetch · StoreContext 의존 0.
//   빌드 시점 프리렌더 → 크롤러가 받는 HTML 에 본문이 그대로 들어간다.
//
// ▸ CTA 목적지 고정.
//   robots.txt 가 /signup · /login 을 Disallow 한다. CTA 는 "/" 와 "/plans" 만 쓴다.
//   차단 경로로 링크를 쏘면 GSC 에 "robots.txt 차단" 경고가 쌓인다.
//
// ▸ 문장 규칙(PHILOSOPHY 상속).
//   상단노출 보장 · 1위 보장 · 확인되지 않은 순위/성과 수치 · 가짜 후기 ·
//   가짜 고객 사례 = 전부 금지.
//
// DDL · migration · RPC · 인덱스 · 신규 env = 전부 0.
// 기존 pSEO(/p/*) · sitemap 판정 규칙 · 엔진 · 결제 무접촉.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';

export const GUIDE_CSS = `
  :root {
    --ink:    #241c33;
    --ink-2:  #5d5570;
    --paper:  #ffffff;
    --panel:  #f6f4f9;
    --rule:   #e3dee9;
    --accent: #7b1fa2;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    font-family: 'Noto Sans KR', system-ui, sans-serif;
    background: var(--paper);
    color: var(--ink);
    line-height: 1.85;
    word-break: keep-all;
  }
  a { color: var(--accent); }
  a:focus-visible, .cta:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  .wrap { max-width: 680px; margin: 0 auto; padding: 0 24px; }

  .masthead {
    border-bottom: 1px solid var(--rule);
    padding: 20px 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .masthead a { color: var(--ink); text-decoration: none; }

  .hero { padding: 76px 0 8px; }
  .hero h1 {
    font-size: 40px;
    font-weight: 900;
    line-height: 1.35;
    letter-spacing: -0.035em;
  }
  .hero p {
    margin-top: 22px;
    font-size: 18px;
    color: var(--ink-2);
    line-height: 1.8;
  }

  section { padding: 52px 0 0; }
  h2 {
    font-size: 24px;
    font-weight: 800;
    line-height: 1.45;
    letter-spacing: -0.03em;
    margin-bottom: 18px;
  }
  h3 {
    font-size: 17px;
    font-weight: 700;
    margin: 26px 0 6px;
    letter-spacing: -0.02em;
  }
  p { font-size: 16.5px; }
  p + p { margin-top: 14px; }

  .quiet { color: var(--ink-2); }
  .note { margin-top: 18px; color: var(--ink-2); font-size: 16px; }

  .marks {
    list-style: none;
    margin-top: 18px;
    border-left: 2px solid var(--rule);
  }
  .marks li { padding: 4px 0 4px 18px; font-size: 16.5px; }

  .steps { list-style: none; margin-top: 18px; counter-reset: s; }
  .steps li {
    counter-increment: s;
    position: relative;
    padding: 0 0 14px 34px;
    font-size: 16.5px;
  }
  .steps li::before {
    content: counter(s);
    position: absolute;
    left: 0; top: 4px;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: var(--panel);
    color: var(--accent);
    font-size: 12.5px;
    font-weight: 800;
    line-height: 22px;
    text-align: center;
  }

  .pairs { margin-top: 22px; border-top: 1px solid var(--rule); }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 16px 0;
    border-bottom: 1px solid var(--rule);
  }
  .pair span { font-size: 15.5px; line-height: 1.7; }
  .pair .ad { color: var(--ink-2); text-decoration: line-through; text-decoration-thickness: 1px; }
  .pair .act { font-weight: 500; }
  .pair-head { font-size: 13.5px; font-weight: 700; color: var(--ink-2); }

  .panel {
    margin-top: 20px;
    background: var(--panel);
    border-radius: 10px;
    padding: 26px 24px;
  }
  .panel + .panel { margin-top: 12px; }
  .panel h3 { margin-top: 0; }
  .panel ul { list-style: none; margin-top: 10px; }
  .panel li { position: relative; padding-left: 15px; font-size: 16px; }
  .panel li::before {
    content: '';
    position: absolute;
    left: 0; top: 13px;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--accent);
  }
  .panel.pending li::before { background: var(--rule); }

  .cta-row { margin-top: 22px; display: flex; flex-wrap: wrap; gap: 12px; }
  .cta {
    display: inline-block;
    padding: 14px 26px;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    text-decoration: none;
  }
  .cta.secondary {
    background: transparent;
    color: var(--accent);
    border: 1px solid var(--rule);
  }

  .more { margin-top: 30px; font-size: 15px; color: var(--ink-2); }
  .more a { text-decoration: none; }
  .more span { margin: 0 8px; color: var(--rule); }

  footer {
    margin-top: 72px;
    border-top: 1px solid var(--rule);
    padding: 26px 0 56px;
    font-size: 14px;
    color: var(--ink-2);
  }

  @media (max-width: 560px) {
    .hero { padding-top: 48px; }
    .hero h1 { font-size: 29px; }
    .hero p { font-size: 16.5px; }
    h2 { font-size: 21px; }
    .pair { grid-template-columns: 1fr; gap: 6px; }
    .pair .ad { font-size: 14.5px; }
  }
`;

// 블록 렌더러.
//   k: p | h3 | marks | steps | panel | pairs | note
function Block({ b, i }) {
  if (b.k === 'p') return <p>{b.t}</p>;
  if (b.k === 'h3') return <h3>{b.t}</h3>;
  if (b.k === 'note') return <p className="note">{b.t}</p>;

  if (b.k === 'marks') {
    return (
      <ul className="marks">
        {b.items.map((it, n) => (
          <li key={n}>{it}</li>
        ))}
      </ul>
    );
  }

  if (b.k === 'steps') {
    return (
      <ol className="steps">
        {b.items.map((it, n) => (
          <li key={n}>{it}</li>
        ))}
      </ol>
    );
  }

  if (b.k === 'panel') {
    return (
      <div className={b.pending ? 'panel pending' : 'panel'}>
        {b.t ? <h3>{b.t}</h3> : null}
        <ul>
          {b.items.map((it, n) => (
            <li key={n}>{it}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (b.k === 'pairs') {
    return (
      <div className="pairs">
        <div className="pair">
          <span className="pair-head">{b.headLeft}</span>
          <span className="pair-head">{b.headRight}</span>
        </div>
        {b.items.map((p, n) => (
          <div className="pair" key={n}>
            <span className="ad">{p.a}</span>
            <span className="act">{p.b}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export default function GuideShell({
  title,
  description,
  canonical,
  h1,
  lead,
  sections = [],
  ctaTitle = 'AI-POST로 직접 만들어 보세요',
  ctaText =
    '사업장 기본 정보만 있으면 블로그 글 한 편을 바로 만들어 볼 수 있습니다. ' +
    '결제 없이 결과물을 먼저 확인하고 판단하시면 됩니다.',
  related = [],
}) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content="AI-POST" />
        <meta property="og:locale" content="ko_KR" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: GUIDE_CSS }} />
      </Head>

      <div className="wrap">
        <header className="masthead">
          <a href="/">AI-POST</a>
        </header>

        <div className="hero">
          <h1>{h1}</h1>
          <p>{lead}</p>
        </div>

        {sections.map((s, i) => (
          <section key={i}>
            <h2>{s.h2}</h2>
            {s.blocks.map((b, n) => (
              <Block b={b} i={n} key={n} />
            ))}
          </section>
        ))}

        <section>
          <h2>{ctaTitle}</h2>
          <p>{ctaText}</p>
          <div className="cta-row">
            <a className="cta" href="/">
              AI-POST 시작하기
            </a>
            <a className="cta secondary" href="/plans">
              요금제 보기
            </a>
          </div>

          {related.length ? (
            <div className="more">
              {related.map((r, n) => (
                <span key={r.href} style={{ margin: 0 }}>
                  {n > 0 ? <span>·</span> : null}
                  <a href={r.href}>{r.label}</a>
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <footer>
          AI-POST · 다원테크
          <br />
          업종별 블로그 콘텐츠를 더 쉽고 꾸준하게
        </footer>
      </div>
    </>
  );
}
