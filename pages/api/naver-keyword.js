// 📁 저장 위치: D:\banjang-blog\banjang-blog\pages\api\naver-keyword.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword } = req.body;

  if (!keyword) {
    return res.status(400).json({ error: '키워드를 입력해주세요' });
  }

  const CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: '네이버 API 키가 설정되지 않았습니다. .env.local 확인해주세요.' });
  }

  try {
    const headers = {
      'X-Naver-Client-Id': CLIENT_ID,
      'X-Naver-Client-Secret': CLIENT_SECRET,
    };

    // 1. 블로그 검색 (경쟁도 분석)
    const blogRes = await fetch(
      `https://openapi.naver.com/v1/search/blog?query=${encodeURIComponent(keyword)}&display=20&sort=sim`,
      { headers }
    );
    const blogData = await blogRes.json();

    // 2. 뉴스 검색 (트렌드 파악)
    const newsRes = await fetch(
      `https://openapi.naver.com/v1/search/news?query=${encodeURIComponent(keyword)}&display=5&sort=date`,
      { headers }
    );
    const newsData = await newsRes.json();

    // 3. 웹문서 검색 (전체 경쟁도)
    const webRes = await fetch(
      `https://openapi.naver.com/v1/search/webkr?query=${encodeURIComponent(keyword)}&display=1`,
      { headers }
    );
    const webData = await webRes.json();

    // 4. 연관 키워드 추출
    const relatedKeywords = extractRelatedKeywords(blogData.items || [], keyword);

    // 5. 경쟁도 분석
    const totalBlogCount = blogData.total || 0;
    const competitionLevel = getCompetitionLevel(totalBlogCount);

    // 6. 블로그 제목 추천
    const titleSuggestions = generateTitleSuggestions(keyword, relatedKeywords);

    // 7. 시즌 키워드
    const seasonKeywords = getSeasonKeywords();

    // ── 경쟁사 분석 엔진 (서버사이드 pre-analysis) ────────────
    const topBlogsRaw = (blogData.items || []).slice(0, 20).map(item => ({
      title: item.title.replace(/<[^>]*>/g, ''),
      link: item.link,
      description: item.description.replace(/<[^>]*>/g, ''),
      bloggerName: item.bloggername,
      postDate: item.postdate,
    }));

    const competitorAnalysis = analyzeCompetitors(topBlogsRaw, keyword);

    return res.status(200).json({
      keyword,
      blogCount: totalBlogCount,
      competition: competitionLevel,
      relatedKeywords,
      titleSuggestions,
      recentNews: (newsData.items || []).slice(0, 5).map(item => ({
        title: item.title.replace(/<[^>]*>/g, ''),
        link: item.link,
        pubDate: item.pubDate,
      })),
      topBlogs: topBlogsRaw,
      competitorAnalysis,   // ← 경쟁사 분석 결과 (신규)
      seasonKeywords,
      webTotal: webData.total || 0,
    });

  } catch (error) {
    console.error('네이버 API 오류:', error);
    return res.status(500).json({ error: '네이버 API 호출 중 오류가 발생했습니다' });
  }
}

// ── 경쟁사 분석 엔진 ─────────────────────────────────────────
function analyzeCompetitors(blogs, keyword) {
  if (!blogs || blogs.length === 0) return null;

  const allText = blogs.map(b => b.title + ' ' + b.description).join(' ');

  // ── 1. 블로그 유형 분류 ────────────────────────────────────
  const counts = {
    after:   blogs.filter(b => /후기|다녀왔|현장|체험했|방문/.test(b.title + b.description)).length,
    photo:   blogs.filter(b => /사진|포토|장면|모습|찍었/.test(b.title + b.description)).length,
    promo:   blogs.filter(b => /추천|소개|안내|자료|도안|정보/.test(b.title + b.description)).length,
    op:      blogs.filter(b => /방법|운영|진행|준비|계획/.test(b.title + b.description)).length,
    teach:   blogs.filter(b => /교사|선생님|원장|담임|교육/.test(b.title + b.description)).length,
    review:  blogs.filter(b => /리뷰|솔직|사용기|써봤/.test(b.title + b.description)).length,
    tip:     blogs.filter(b => /꿀팁|팁|노하우|비결|방법/.test(b.title + b.description)).length,
  };

  const types = [];
  if (counts.after  > 0) types.push(`현장후기형 ${counts.after}개`);
  if (counts.promo  > 0) types.push(`소개·홍보형 ${counts.promo}개`);
  if (counts.op     > 0) types.push(`운영설명형 ${counts.op}개`);
  if (counts.teach  > 0) types.push(`교육기관형 ${counts.teach}개`);
  if (counts.tip    > 0) types.push(`팁·노하우형 ${counts.tip}개`);
  if (types.length === 0) types.push('일반 정보형');

  // ── 2. 경쟁 블로그 공통 약점 ──────────────────────────────
  const weaknesses = [];
  const n = blogs.length;
  if (counts.photo >= n * 0.5)              weaknesses.push('사진 위주 — 글 내용 빈약');
  if (counts.teach < n * 0.25)              weaknesses.push('교사·전문가 관점 설명 부족');
  if (counts.op    < n * 0.25)              weaknesses.push('운영 방법·준비 과정 미흡');
  if (!/반응|환호|웃음|즐거|소리/.test(allText)) weaknesses.push('아이 실제 반응 묘사 없음');
  if (!/에피소드|기억|순간|장면/.test(allText))  weaknesses.push('현장 에피소드·스토리 없음');
  if (!/효과|발달|성장|교육적/.test(allText))    weaknesses.push('교육적 효과 설명 없음');
  if (!/가격|비용|문의|예약/.test(allText))      weaknesses.push('실용 정보(가격·예약) 부족');
  if (weaknesses.length === 0)              weaknesses.push('전반적으로 경쟁 강함 — 차별화 필수');

  // ── 3. 내 글이 공략해야 할 포인트 ─────────────────────────
  const attackPoints = weaknesses.map(w => {
    const map = {
      '사진 위주 — 글 내용 빈약':       '→ 글 내용 2,500자 이상 + 구체적 묘사로 차별화',
      '교사·전문가 관점 설명 부족':      '→ 교사 입장에서의 준비·진행 노하우 상세 기술',
      '운영 방법·준비 과정 미흡':        '→ 단계별 운영 방법 + 준비물 리스트 포함',
      '아이 실제 반응 묘사 없음':        '→ 아이들의 실제 반응·대화·표정을 생생하게 묘사',
      '현장 에피소드·스토리 없음':       '→ 기억에 남는 에피소드 2~3개 구체적으로 서술',
      '교육적 효과 설명 없음':           '→ 프로그램의 발달·교육적 효과 명시',
      '실용 정보(가격·예약) 부족':       '→ 문의 방법·예약 안내 포함',
      '전반적으로 경쟁 강함 — 차별화 필수': '→ 독창적 경험 + 전문성으로 차별화',
    };
    return map[w] || `→ ${w} 부분 강화`;
  });

  // ── 4. 최신 트렌드 감지 ────────────────────────────────────
  const recentBlogs = blogs.filter(b => {
    if (!b.postDate) return false;
    const d = b.postDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    return new Date(d) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90일 이내
  });

  // ── 5. 키워드 밀도 분석 ────────────────────────────────────
  const kwParts = keyword.split(/\s+/);
  const kwDensity = kwParts.map(part => {
    const cnt = (allText.match(new RegExp(part, 'g')) || []).length;
    return { keyword: part, count: cnt, density: Math.round((cnt / (allText.length / 100)) * 10) / 10 };
  });

  // ── 6. 블로거 다양성 (특정 블로거 독점 여부) ──────────────
  const bloggerNames = blogs.map(b => b.bloggerName).filter(Boolean);
  const uniqueBloggers = new Set(bloggerNames).size;
  const monopoly = uniqueBloggers < blogs.length * 0.5;

  return {
    types,
    weaknesses,
    attackPoints,
    counts,
    recentCount: recentBlogs.length,
    kwDensity,
    monopoly,
    monopolyNote: monopoly ? '특정 블로거 독점 의심 — 진입 유리' : '다양한 블로거 경쟁 중',
    analyzedAt: new Date().toISOString(),
  };
}

// 연관 키워드 추출
function extractRelatedKeywords(blogItems, mainKeyword) {
  const eventTypes = [
    '운동회', '졸업식', '입학식', '생일파티', '돌잔치', '야유회',
    '체험학습', '현장학습', '소풍', '발표회', '학예회', '축제',
    '워크샵', '단체사진', '가족사진', '행사사진',
    '어린이집', '유치원', '초등학교',
    '기업행사', '송년회', '신년회', '회사행사',
  ];

  const found = new Set();
  const titleText = blogItems.map(item => item.title + item.description).join(' ');

  eventTypes.forEach(kw => {
    if (titleText.includes(kw) && kw !== mainKeyword) {
      found.add(kw);
    }
  });

  const defaultRelated = [
    `${mainKeyword} 촬영`,
    `${mainKeyword} 사진`,
    `${mainKeyword} 전문`,
    `${mainKeyword} 업체`,
    `${mainKeyword} 추천`,
  ];

  return [...defaultRelated, ...Array.from(found)].slice(0, 10);
}

// 경쟁도 레벨
function getCompetitionLevel(count) {
  if (count < 10000) return { level: '낮음', color: '#22c55e', desc: '상위 노출 쉬움 👍', score: 1 };
  if (count < 50000) return { level: '보통', color: '#eab308', desc: '노력하면 상위 가능 💪', score: 2 };
  if (count < 200000) return { level: '높음', color: '#f97316', desc: '전략적 접근 필요 🧠', score: 3 };
  return { level: '매우 높음', color: '#ef4444', desc: '틈새 키워드 공략 추천 ⚠️', score: 4 };
}

// 제목 추천 생성
function generateTitleSuggestions(keyword, relatedKeywords) {
  return [
    `${keyword} 전문 업체 | 반장-노리야놀자가 완벽하게 준비해드립니다`,
    `[${keyword}] 현장 스케치 | 소중한 순간을 영상으로 담다`,
    `${keyword} 후기 | 반장-노리야놀자와 함께한 특별한 하루`,
    `${keyword} 준비 완료! 반장-노리야놀자의 생생한 현장 이야기`,
    `올해 ${keyword} 트렌드는? 반장-노리야놀자가 알려드립니다`,
  ];
}

// 시즌별 키워드
function getSeasonKeywords() {
  const month = new Date().getMonth() + 1;
  const seasonMap = {
    1: ['신년회', '신입생환영회', '겨울행사'],
    2: ['졸업식', '졸업파티', '졸업사진'],
    3: ['입학식', '신학기행사', '봄소풍', '오리엔테이션'],
    4: ['봄소풍', '현장학습', '체험학습', '벚꽃축제'],
    5: ['어린이날행사', '가정의달행사', '운동회'],
    6: ['현장학습', '체험학습', '여름준비'],
    7: ['여름캠프', '방학행사', '워터파크'],
    8: ['여름방학행사', '캠프', '단합대회'],
    9: ['운동회', '가을소풍', '추석행사'],
    10: ['가을소풍', '핼러윈파티', '체육대회'],
    11: ['발표회', '학예회', '연말준비'],
    12: ['송년회', '크리스마스파티', '졸업준비'],
  };
  return seasonMap[month] || [];
}
