// pages/guide/clinic-blog-marketing.js
// ─────────────────────────────────────────────────────────────
// [AI-POST-OFFICIAL-SEARCH-PAGE-01] AI-POST 공식 검색자산 1호. 치과.
//
// 이 파일의 정의: "AI-POST 자체가 소유·발행하는 공식 검색 페이지"다.
//   고객 pSEO(/p/[storeId])와 SoT·역할·검색의도가 전부 다르다.
//
// ▸ 고객 pSEO 가 아니다.
//   store_profiles · subscriptions · publish_history · eligibility 어디에도
//   종속되지 않는다. 자사 계정을 가짜 고객으로 넣는 방식을 명시적으로 기각한 결과다.
//   (sitemap.xml.js 의 EXCLUDED_STORE_IDS = [1] 는 그대로 유지된다.)
//
// ▸ 검색의도 계층이 다르다.
//   고객 pSEO = 지역·업체·서비스 탐색축 ("강남구 장례식장").
//   이 페이지  = 문제해결 탐색축 ("치과 블로그가 왜 검색에 안 걸리나").
//   PSEO-SEARCH-ASSET-SEPARATION-01 의 역할 분리 원칙을 공식 자산에도 적용한다.
//
// ▸ 3역할을 동시에 진다(선장 판정).
//   ① AI-POST 실제 홍보  ② 자연수집·색인 실증 표본 C  ③ 고객에게 보여줄 실제 샘플
//   테스트 페이지가 아니다. 영구 자산으로 취급한다.
//
// ▸ 정적 렌더다.
//   getServerSideProps · 클라이언트 fetch · StoreContext 의존 전부 없다.
//   빌드 시점 프리렌더되어 크롤러가 받는 HTML 에 본문이 그대로 들어간다.
//   pages/index.js 는 CSR 앱이라 서버 HTML 에 본문이 없다. 이 페이지는 반대여야 한다.
//
// ▸ 문장 규칙(PHILOSOPHY 상속).
//   상단노출 보장 · 1위 보장 · 확인되지 않은 순위/성과 수치 · 가짜 후기 ·
//   가짜 고객 사례 = 전부 금지. 광고형 어휘를 쓰면 우리 QC 기준을 우리가 어긴다.
//   §"우리가 말할 수 있는 것"은 확인된 것 / 아직 검증 중을 2단으로 분리한다.
//
// ▸ 공통 Layout 이 없다(_app.js = StoreProvider 1개).
//   Header/Footer 를 페이지 내 인라인으로 둔다. 재사용처가 1곳뿐인데 컴포넌트를
//   만들면 다음 축에서 정리 대상이 된다.
//
// ▸ CTA 목적지 주의.
//   robots.txt 가 /signup · /login 을 Disallow 한다. 따라서 CTA 는 "/" 로 보낸다.
//   "/" 우측 패널이 비로그인 시 인라인 LoginCard 라서 그대로 가입 진입점이 된다.
//   차단 경로로 링크를 쏘아 GSC 에 "robots.txt 차단" 경고를 만들지 않는다.
//
// DDL · migration · RPC · 인덱스 · 신규 env = 전부 0.
// 기존 A·B URL / canonical / 고객 pSEO 로직 무접촉.
// ─────────────────────────────────────────────────────────────

import Head from 'next/head';

const CANONICAL = 'https://ai-post.ai/guide/clinic-blog-marketing';

const TITLE = '치과 블로그, 검색에 걸리는 글은 무엇이 다른가 | AI-POST';

const DESCRIPTION =
  '치과 블로그를 매일 써도 검색에 걸리지 않는 이유, 그리고 환자가 실제로 검색하는 ' +
  '글의 조건. AI-POST가 치과 글을 만들고 채점하고 발행 후 검색 성과를 관측하는 방식.';

// 광고형 / 행동형 대조. 치과 실제 문장으로만 채운다.
//   왼쪽은 의료광고 규제와 검색 양쪽에서 불리한 문장, 오른쪽은 검색한 사람이
//   다음 행동을 하기 직전에 필요한 문장이다.
const SENTENCE_PAIRS = [
  {
    ad: '강남 최고의 임플란트 치과',
    act: '임플란트 상담 날 CT부터 찍는 이유',
  },
  {
    ad: '최신 장비 완비',
    act: '구강스캐너로 본을 뜨면 구역질이 덜한 이유',
  },
  {
    ad: '친절하고 꼼꼼한 상담',
    act: '첫 내원 30분 동안 무엇을 묻고 무엇을 확인하는가',
  },
  {
    ad: '통증 없는 신경치료',
    act: '신경치료 다음 날 아픈 게 정상인 경우와 아닌 경우',
  },
];

const CSS = `
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

  .symptoms {
    list-style: none;
    margin-top: 18px;
    border-left: 2px solid var(--rule);
  }
  .symptoms li {
    padding: 4px 0 4px 18px;
    font-size: 16.5px;
  }

  /* 광고형 / 행동형 대조. 이 페이지에서 가장 중요한 한 곳이라 여기에만 구조를 쓴다. */
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

  .split {
    margin-top: 20px;
    background: var(--panel);
    border-radius: 10px;
    padding: 26px 24px;
  }
  .split + .split { margin-top: 12px; }
  .split h3 { margin-top: 0; }
  .split ul { list-style: none; margin-top: 10px; }
  .split li { position: relative; padding-left: 15px; font-size: 16px; }
  .split li::before {
    content: '';
    position: absolute;
    left: 0; top: 13px;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--accent);
  }
  .split.pending li::before { background: var(--rule); }

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

export default function ClinicBlogMarketing() {
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Gate ③ self canonical 1개. Gate ④ index 허용 명시. */}
        <link rel="canonical" href={CANONICAL} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:site_name" content="AI-POST" />
        <meta property="og:locale" content="ko_KR" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </Head>

      <div className="wrap">
        <header className="masthead">
          <a href="/">AI-POST</a>
        </header>

        <div className="hero">
          <h1>치과 블로그, 매일 쓰는데 왜 검색에 걸리지 않을까</h1>
          <p>
            글이 부족해서가 아닙니다. 검색하는 사람이 찾는 글과 다른 글을 쓰고 있어서입니다.
            이 페이지는 그 차이가 무엇인지, 그리고 AI-POST가 그걸 어떻게 다루는지 설명합니다.
          </p>
        </div>

        <section>
          <h2>글은 쌓이는데 전화는 오지 않는다</h2>
          <p>
            치과 블로그를 1년 운영한 원장님들이 거의 같은 말을 합니다. 발행 건수는 늘었는데
            달라진 게 없다는 겁니다. 대체로 아래 셋 중 하나입니다.
          </p>
          <ul className="symptoms">
            <li>글은 100건이 넘는데 하루 방문자가 두 자리 수를 넘지 않는다.</li>
            <li>어제 올린 임플란트 글이 &lsquo;우리 동네 + 임플란트&rsquo; 검색에 보이지 않는다.</li>
            <li>대행을 맡겼는데 어떤 글이 어떤 검색어에서 어떻게 되고 있는지 아무도 모른다.</li>
          </ul>
          <p className="quiet" style={{ marginTop: 18 }}>
            공통점은 발행량이 아니라 방향입니다. 세 경우 모두 &ldquo;누가 무엇을 검색했을 때
            이 글이 답이 되는가&rdquo;가 정해지지 않은 채 글이 쌓였습니다.
          </p>
        </section>

        <section>
          <h2>치과가 특히 어려운 세 가지 이유</h2>

          <h3>진료와 매일 발행은 양립하지 않는다</h3>
          <p>
            검색에서 살아남는 글은 한 번에 많이 쓴 글이 아니라 꾸준히 쌓인 글입니다. 그런데
            진료를 보는 원장이 매일 2,000자를 쓰는 일은 현실적으로 유지되지 않습니다. 대부분
            두세 달 만에 멈추고, 멈춘 블로그는 그때부터 천천히 밀려납니다.
          </p>

          <h3>쓸 수 있는 표현의 폭이 좁다</h3>
          <p>
            의료광고에는 규제가 있습니다. 최고·유일·완치·부작용 없는 같은 표현은 쓸 수
            없습니다. 문제는 일반적인 마케팅 문장의 기본기가 대부분 거기에 몰려 있다는
            점입니다. 그래서 규제를 지키려다 보면 소개 문구만 남은 밋밋한 글이 되고,
            글을 살리려다 보면 위험한 문장이 들어갑니다.
          </p>

          <h3>환자는 시술명을 모른 채 검색한다</h3>
          <p>
            원장은 &lsquo;구치부 실활치 근관치료&rsquo;로 생각하지만, 환자는
            &lsquo;어금니 시림 찬물&rsquo;이라고 칩니다. 검색창에 들어가는 말은 진단명이 아니라
            증상과 상황입니다. 시술명 중심으로 쓴 글은 정확하지만, 정작 그 시술이 필요한
            사람이 치는 검색어와 만나지 않습니다.
          </p>
        </section>

        <section>
          <h2>검색되는 글은 무엇이 다른가</h2>
          <p>
            기준은 하나입니다. 검색한 사람이 <strong>다음 행동을 하기 직전</strong>에 필요한
            정보인가. 예약할지 말지, 다른 곳과 비교할지, 무엇을 물어볼지를 정하는 순간에
            읽히는 문장인가입니다.
          </p>

          <div className="pairs">
            <div className="pair">
              <span className="pair-head">검색에 걸리지 않는 문장</span>
              <span className="pair-head">읽히는 문장</span>
            </div>
            {SENTENCE_PAIRS.map((p) => (
              <div className="pair" key={p.ad}>
                <span className="ad">{p.ad}</span>
                <span className="act">{p.act}</span>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 22 }}>
            왼쪽은 누가 써도 같은 문장이라 검색 결과에서 구별되지 않고, 의료광고 규제에도
            걸립니다. 오른쪽은 실제로 그 상황에 있는 사람만 궁금해하는 내용이라 끝까지
            읽힙니다. 검색엔진이 보는 신호도 결국 &lsquo;열고 나서 얼마나 머물렀는가&rsquo;쪽에
            가깝습니다.
          </p>
          <p>
            지역명과 시술명을 많이 박아 넣는 방식은 오래 못 갑니다. 같은 결합을 반복하면
            읽는 사람이 먼저 나가고, 그 다음에 순위가 따라 내려갑니다.
          </p>
        </section>

        <section>
          <h2>AI-POST가 하는 일</h2>
          <p>
            AI-POST는 범용 글쓰기 도구가 아닙니다. 업종별 데이터 위에서 동작하는 생성기입니다.
            치과의 경우 시술 종류, 환자가 실제로 겪는 경과, 내원 흐름을 데이터로 들고
            시작합니다. 그래서 &ldquo;치과 글 써줘&rdquo;가 아니라 어떤 증상, 어떤 상황,
            어떤 목적의 글인지부터 정해집니다.
          </p>
          <p>
            생성이 끝나면 글 자체를 8항목으로 채점합니다. 제목, 키워드, 중복, 구조, 해시태그,
            CTA, 마무리, 글자수입니다. 이 중 글자수와 이미지처럼 계산으로 확정되는 항목은
            서버가 직접 셉니다. AI가 매긴 값을 그대로 믿지 않습니다.
          </p>
          <p>
            발행 이후는 별도로 기록합니다. 채점은 예측이고 검색 결과는 실측이라, 두 개를 섞으면
            &ldquo;글이 약해서 밀린 것&rdquo;과 &ldquo;경쟁이 세서 밀린 것&rdquo;을 구분할 수
            없게 되기 때문입니다. 우리는 이 둘을 끝까지 따로 둡니다.
          </p>
        </section>

        <section>
          <h2>지금 말할 수 있는 것과 아직 말할 수 없는 것</h2>
          <p>
            블로그 마케팅 업계에서 가장 흔한 문장이 상단노출 보장입니다. 저희는 그 말을 쓰지
            않습니다. 검색엔진 순위를 보장할 수 있는 사업자는 없습니다. 대신 확인된 것과
            확인 중인 것을 나눠서 적습니다.
          </p>

          <div className="split">
            <h3>확인된 것</h3>
            <ul>
              <li>업종 데이터 기반 생성과 8항목 채점은 실제로 운영 중입니다.</li>
              <li>
                2026년 9월 13일 sitemap을 제출했고, 직후 Google Search Console에서 URL이
                발견된 상태로 잡히는 것을 확인했습니다.
              </li>
              <li>발행한 글의 검색 결과를 별도로 기록하는 관측 구조가 동작합니다.</li>
            </ul>
          </div>

          <div className="split pending">
            <h3>아직 검증 중</h3>
            <ul>
              <li>
                색인과 실제 검색 노출. 발견은 색인이 아니고, 색인은 노출이 아닙니다. 이 셋은
                다른 단계입니다.
              </li>
              <li>
                지금 읽고 계신 이 페이지 자체가 그 실험 대상입니다. 이 페이지가 언제 수집되고
                언제 검색에 걸리는지를 저희가 먼저 확인하고 있습니다.
              </li>
            </ul>
          </div>

          <p style={{ marginTop: 20 }} className="quiet">
            결과가 나오면 그 기록을 그대로 공개할 예정입니다. 잘 안 된 구간도 포함해서입니다.
            순위를 보장하는 것보다, 무엇을 어떻게 확인했는지 보여주는 편이 판단에 더
            도움이 된다고 봅니다.
          </p>
        </section>

        <section>
          <h2>글 하나로 확인해 보세요</h2>
          <p>
            사진과 기본 정보만 있으면 치과 글 한 편을 만들어 채점까지 볼 수 있습니다. 결제
            없이 먼저 결과물을 확인하고 판단하시면 됩니다.
          </p>
          <div className="cta-row">
            <a className="cta" href="/">
              글 만들어 보기
            </a>
            <a className="cta secondary" href="/plans">
              요금제 보기
            </a>
          </div>
        </section>

        <footer>
          AI-POST · 다원테크
          <br />
          업종별 블로그 콘텐츠 생성과 발행 후 검색 성과 관측.
        </footer>
      </div>
    </>
  );
}
