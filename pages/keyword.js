// 📁 저장 위치: D:\banjang-blog\banjang-blog\pages\keyword.js
// ✅ 기존 keyword.js 파일을 이 파일로 교체하세요

import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function KeywordPage() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [seasonKeywords, setSeasonKeywords] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSeasonKeywords(getSeasonKeywords());
  }, []);

  const handleSearch = async (kw) => {
    const searchWord = kw || keyword;
    if (!searchWord.trim()) {
      setError('키워드를 입력해주세요');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/naver-keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: searchWord.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '오류 발생');
      setResult(data);
      setActiveTab('overview');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('복사되었습니다! ✅');
  };

  const getScoreBarStyle = (score) => {
    const width = (score / 4) * 100;
    const color = score <= 1 ? '#22c55e' : score <= 2 ? '#eab308' : score <= 3 ? '#f97316' : '#ef4444';
    return { width: `${width}%`, backgroundColor: color };
  };

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>키워드 분석 | 반장-노리야놀자</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif; background: #f0f4ff; min-height: 100vh; }
        .wrap { max-width: 900px; margin: 0 auto; padding: 24px 16px 60px; }

        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; padding: 32px; color: white; text-align: center; margin-bottom: 24px; box-shadow: 0 8px 32px rgba(102,126,234,0.3); }
        .header h1 { font-size: 26px; font-weight: 800; margin-bottom: 6px; }
        .header p { font-size: 14px; opacity: 0.85; }

        .search-box { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); margin-bottom: 24px; }
        .search-row { display: flex; gap: 12px; }
        .search-input { flex: 1; border: 2px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; font-size: 16px; outline: none; transition: border-color 0.2s; font-family: inherit; }
        .search-input:focus { border-color: #667eea; }
        .search-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 12px; padding: 14px 28px; font-size: 16px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: opacity 0.2s; font-family: inherit; }
        .search-btn:hover { opacity: 0.9; }
        .search-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .season-box { margin-top: 16px; }
        .season-label { font-size: 13px; color: #64748b; margin-bottom: 8px; font-weight: 600; }
        .season-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .season-tag { background: #f0f4ff; color: #667eea; border: 1px solid #c7d2fe; border-radius: 20px; padding: 6px 14px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .season-tag:hover { background: #667eea; color: white; }

        .error { background: #fee2e2; color: #dc2626; border-radius: 12px; padding: 14px 18px; margin-bottom: 16px; font-size: 14px; }
        .loading { text-align: center; padding: 48px; color: #667eea; font-size: 16px; font-weight: 600; }
        .loading-spinner { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .tab { background: white; border: 2px solid #e2e8f0; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; color: #64748b; font-family: inherit; }
        .tab.active { background: #667eea; border-color: #667eea; color: white; }

        .card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); margin-bottom: 16px; }
        .card-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 16px; }

        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
        .stat-item { background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; }
        .stat-num { font-size: 22px; font-weight: 800; color: #1e293b; }
        .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }

        .competition-bar-wrap { background: #e2e8f0; border-radius: 8px; height: 12px; margin: 12px 0; overflow: hidden; }
        .competition-bar { height: 100%; border-radius: 8px; transition: width 0.8s ease; }
        .competition-badge { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 700; color: white; margin-bottom: 8px; }

        .keyword-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .keyword-tag { background: #f0f4ff; color: #4f46e5; border: 1px solid #c7d2fe; border-radius: 20px; padding: 8px 16px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
        .keyword-tag:hover { background: #4f46e5; color: white; }

        .title-list { display: flex; flex-direction: column; gap: 10px; }
        .title-item { background: #f8fafc; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .title-text { font-size: 14px; color: #1e293b; line-height: 1.5; flex: 1; }
        .copy-btn { background: #667eea; color: white; border: none; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; white-space: nowrap; font-family: inherit; }
        .copy-btn:hover { background: #4f46e5; }

        .blog-list { display: flex; flex-direction: column; gap: 12px; }
        .blog-item { background: #f8fafc; border-radius: 12px; padding: 16px; border-left: 4px solid #667eea; }
        .blog-item-title { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
        .blog-item-title a { color: #4f46e5; text-decoration: none; }
        .blog-item-title a:hover { text-decoration: underline; }
        .blog-item-desc { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 8px; }
        .blog-item-meta { font-size: 12px; color: #94a3b8; }

        .news-list { display: flex; flex-direction: column; gap: 10px; }
        .news-item { background: #f8fafc; border-radius: 10px; padding: 14px; }
        .news-title a { font-size: 14px; color: #4f46e5; text-decoration: none; font-weight: 600; }
        .news-title a:hover { text-decoration: underline; }
        .news-date { font-size: 12px; color: #94a3b8; margin-top: 4px; }

        .back-btn { display: inline-flex; align-items: center; gap: 6px; color: #667eea; font-size: 14px; font-weight: 600; cursor: pointer; margin-bottom: 16px; background: none; border: none; font-family: inherit; }
        .back-btn:hover { text-decoration: underline; }

        .empty { color: #94a3b8; font-size: 14px; }

        @media (max-width: 600px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .search-row { flex-direction: column; }
        }
      `}</style>

      <div className="wrap">
        <div className="header">
          <h1>🔍 네이버 키워드 분석기</h1>
          <p>반장-노리야놀자 블로그 SEO 최적화 도구</p>
        </div>

        <div className="search-box">
          <div className="search-row">
            <input
              className="search-input"
              type="text"
              placeholder="키워드를 입력하세요 (예: 어린이집 운동회)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="search-btn" onClick={() => handleSearch()} disabled={loading}>
              {loading ? '분석중...' : '🔍 분석하기'}
            </button>
          </div>

          {!result && seasonKeywords.length > 0 && (
            <div className="season-box">
              <div className="season-label">📅 이번 달 추천 키워드</div>
              <div className="season-tags">
                {seasonKeywords.map((kw) => (
                  <span key={kw} className="season-tag" onClick={() => { setKeyword(kw); handleSearch(kw); }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <div className="error">❌ {error}</div>}

        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            네이버에서 데이터를 가져오는 중입니다...
          </div>
        )}

        {result && (
          <>
            <button className="back-btn" onClick={() => { setResult(null); setKeyword(''); }}>
              ← 새 키워드 분석하기
            </button>

            <div className="tabs">
              {[
                { id: 'overview', label: '📊 개요' },
                { id: 'keywords', label: '🏷️ 연관 키워드' },
                { id: 'titles', label: '✍️ 제목 추천' },
                { id: 'blogs', label: '🔎 경쟁 블로그' },
                { id: 'news', label: '📰 최신 뉴스' },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <>
                <div className="card">
                  <div className="card-title">📊 분석 결과 — {result.keyword}</div>
                  <div className="stat-grid">
                    <div className="stat-item">
                      <div className="stat-num">{result.blogCount.toLocaleString()}</div>
                      <div className="stat-label">블로그 포스팅 수</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-num">{result.webTotal.toLocaleString()}</div>
                      <div className="stat-label">전체 웹문서 수</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-num">{result.relatedKeywords.length}</div>
                      <div className="stat-label">연관 키워드 수</div>
                    </div>
                  </div>

                  <div className="card-title">⚡ 경쟁도</div>
                  <div className="competition-badge" style={{ backgroundColor: result.competition.color }}>
                    {result.competition.level}
                  </div>
                  <div className="competition-bar-wrap">
                    <div className="competition-bar" style={getScoreBarStyle(result.competition.score)}></div>
                  </div>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>{result.competition.desc}</p>
                </div>

                {result.seasonKeywords.length > 0 && (
                  <div className="card">
                    <div className="card-title">📅 이번 달 시즌 키워드</div>
                    <div className="keyword-tags">
                      {result.seasonKeywords.map(kw => (
                        <span key={kw} className="keyword-tag" onClick={() => { setKeyword(kw); handleSearch(kw); }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'keywords' && (
              <div className="card">
                <div className="card-title">🏷️ 연관 키워드 (클릭하면 바로 분석!)</div>
                <div className="keyword-tags">
                  {result.relatedKeywords.map(kw => (
                    <span key={kw} className="keyword-tag" onClick={() => { setKeyword(kw); handleSearch(kw); }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'titles' && (
              <div className="card">
                <div className="card-title">✍️ 블로그 제목 추천 (복사 버튼 클릭!)</div>
                <div className="title-list">
                  {result.titleSuggestions.map((title, i) => (
                    <div key={i} className="title-item">
                      <span className="title-text">📌 {title}</span>
                      <button className="copy-btn" onClick={() => copyToClipboard(title)}>복사</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'blogs' && (
              <div className="card">
                <div className="card-title">🔎 상위 경쟁 블로그</div>
                <div className="blog-list">
                  {result.topBlogs.map((blog, i) => (
                    <div key={i} className="blog-item">
                      <div className="blog-item-title">
                        <a href={blog.link} target="_blank" rel="noopener noreferrer">
                          {i + 1}. {blog.title}
                        </a>
                      </div>
                      <div className="blog-item-desc">{blog.description}</div>
                      <div className="blog-item-meta">✍️ {blog.bloggerName} | 📅 {blog.postDate}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'news' && (
              <div className="card">
                <div className="card-title">📰 최신 뉴스</div>
                <div className="news-list">
                  {result.recentNews.length > 0
                    ? result.recentNews.map((news, i) => (
                        <div key={i} className="news-item">
                          <div className="news-title">
                            <a href={news.link} target="_blank" rel="noopener noreferrer">{news.title}</a>
                          </div>
                          <div className="news-date">📅 {news.pubDate}</div>
                        </div>
                      ))
                    : <p className="empty">관련 뉴스가 없습니다</p>
                  }
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

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
