// 📁 저장 위치: D:\banjang-blog\banjang-blog\components\GuideAccordion.jsx
// 우측 패널 하단에 통합되는 가이드 아코디언
// 처음/숙련 사용자 모두 도움이 되는 발행 가이드 + Q&A

import { useState } from "react";

// ── 가이드 콘텐츠 ─────────────────────────────────────────────
const GUIDE_SECTIONS = [
  {
    id: "first",
    icon: "🌱",
    title: "처음이세요?",
    sub: "5분이면 준비 끝",
    content: [
      { h: "✅ 발행 전 준비", lines: [
        "1. 네이버 블로그 만들기 (네이버 회원이면 자동)",
        "2. 카테고리 추가하기 (예: 후기 / 비용 / 일상)",
        "3. 프로필 사진과 닉네임 넣기",
      ]},
      { h: "✅ 글 발행하는 순서", lines: [
        "① 위쪽 [📋 전체 복사] 누르기",
        "② 네이버 블로그 → 글쓰기 들어가기",
        "③ 본문 칸에 붙여넣기 (Ctrl+V)",
        "④ [📷 사진N] 자리에 본인 사진 끌어다 놓기",
        "⑤ 발행 누르기",
      ]},
    ]
  },
  {
    id: "method",
    icon: "📘",
    title: "발행 방법",
    sub: "언제 어떻게 올릴까요",
    content: [
      { h: "✅ 언제 올리면 좋아요?", lines: [
        "• 오전 10~11시",
        "• 오후 2~4시",
        "• 평일에 올리세요 (주말은 사람들이 잘 안 봅니다)",
      ]},
      { h: "✅ 사진 넣는 순서", lines: [
        "① 본인 사진 폴더 열기",
        "② 글 안에 [📷 사진N] 표시 찾기",
        "③ 그 자리에 사진을 끌어다 놓기",
        "④ 가장 잘 나온 사진 1장은 '대표 사진'으로 지정",
      ]},
      { h: "✅ 태그·카테고리 설정", lines: [
        "• 태그: 5~7개 넣기",
        "  예: #강남임플란트 #임플란트후기 #강남치과",
        "• 카테고리: 미리 만들어둔 것 중에 고르기",
        "• 공개 설정: 꼭 '전체공개'로",
      ]},
    ]
  },
  {
    id: "strategy",
    icon: "🛡️",
    title: "안전 발행 가이드",
    sub: "꾸준히 천천히 운영하는 방법",
    content: [
      { h: "✅ 처음에는 1개부터", lines: [
        "• 처음에는 1개만 발행해보세요",
        "• 익숙해지면 비슷한 주제로 추가 작성",
        "• 천천히 운영하는 방식을 추천합니다",
      ]},
      { h: "✅ 추천 발행량", lines: [
        "• 처음에는 하루 1개 추천",
        "• 익숙해지면 하루 2~3개까지 가능",
        "• 한 번에 많이 올리지 마세요",
      ]},
      { h: "✅ 안전 운영 팁", lines: [
        "• 같은 키워드 반복 발행은 피해주세요",
        "• 비슷한 제목을 연속으로 쓰지 마세요",
        "• 사진은 매번 다른 사진으로",
        "• 본문도 조금씩 다르게 작성",
      ]},
      { h: "✅ 사진 추천", lines: [
        "• 사진 5장 이상 넣기",
        "• 첫 사진은 가장 깔끔한 사진으로",
        "• 직접 찍은 사진 추천",
        "• AI로 만든 사진도 사용 가능합니다",
      ]},
      { h: "✅ 글 길이 추천", lines: [
        "• 본문 2,000자 정도 추천",
      ]},
      { h: "💡 받은 글을 더 활용하는 법", lines: [
        "• 제목을 살짝 바꿔서 발행",
        "  예: \"후기\" → \"솔직 후기\" / \"받고 느낀점\"",
        "",
        "• 사진을 추가하거나 다른 사진으로 교체",
        "",
        "• 본인 경험 한두 줄 추가",
        "  예: 가격 / 대기 시간 / 위치 안내",
        "",
        "• 처음·마지막 문장 살짝 수정",
      ]},
    ]
  },
  {
    id: "photo_editor",
    icon: "📷",
    title: "사진편집기 사용법",
    sub: "발행 전 사진 준비 가이드",
    content: [
      { h: "✅ 왜 사진을 정리하나요?", lines: [
        "발행 전에 사진을 미리 다듬어두면",
        "글쓰기와 발행이 5분 안에 끝납니다.",
        "",
        "사진편집기는 4가지를 한 번에 처리합니다:",
        "  ① 압축 (용량 줄이기)",
        "  ② 리사이즈 (1200px 통일)",
        "  ③ 워터마크 (병원명·번호 삽입)",
        "  ④ 폴더 정리 (자동 분류)",
      ]},
      { h: "✅ 왜 압축하나요?", lines: [
        "• 블로그 로딩 속도가 빨라집니다",
        "  → 방문자 이탈률 감소",
        "• 모바일에서도 빠르게 열립니다",
        "• 네이버는 무거운 사진을 자동으로 압축하는데",
        "  미리 압축하면 화질이 더 잘 유지됩니다",
      ]},
      { h: "✅ 왜 1200px로 리사이즈?", lines: [
        "• 네이버 블로그 본문 폭에 맞는 사이즈",
        "• 너무 크면 잘리고, 너무 작으면 흐릿함",
        "• 1200px이 가장 깔끔하게 보입니다",
        "• 자동 적용 — 신경 안 써도 됩니다",
      ]},
      { h: "✅ 왜 폴더 나누나요?", lines: [
        "발행할 때 사진 찾는 시간이 0초가 됩니다.",
        "",
        "추천 구조:",
        "  📁 강남눈성형/",
        "    📁 상담실 / 수술전후 / 회복실",
        "    📁 후기인터뷰 / 의료진 / 시설내부",
        "",
        "• 본문 [📷 사진N] 자리에 폴더에서 바로 끌어옴",
        "• 같은 사진 반복 X → 네이버 유사문서 회피",
        "• 시리즈 발행에 유리 (1편/2편/3편 분리)",
      ]},
      { h: "✅ 왜 워터마크 쓰나요?", lines: [
        "1. 사진 도용 방지",
        "   다른 블로그·카페에서 가져가도 출처가 남음",
        "",
        "2. 병원명 자연 노출",
        "   광고 없이도 사진마다 병원 이름이 보임",
        "",
        "3. 사진 검색시 출처 유지",
        "   네이버·구글 이미지 검색에서도 워터마크 노출",
        "",
        "4. 블로그 신뢰감 상승",
        "   직접 운영하는 곳이라는 인상을 줌",
      ]},
      { h: "✅ 워터마크 업종별 추천", lines: [
        "• 통증·정형·신경 → 미니멀 라인",
        "• 성형·피부 → 세리프 럭셔리",
        "• 한의원 → 도장 스타일",
        "• 체험·유치원 → 모던 뱃지",
        "",
        "위치: 사진 우하단 / 크기: 사진의 15% 이하",
        "핵심 부분은 가리지 않기",
      ]},
    ]
  },
  {
    id: "qna",
    icon: "💬",
    title: "자주 묻는 질문",
    sub: "발행 전 가장 많이 묻는 6가지",
    content: [
      { h: "Q1. 받은 글 그대로 올려도 되나요?", lines: [
        "그대로 올려도 발행은 됩니다.",
        "다만 더 좋은 결과를 원하면:",
        "  • 제목 살짝 수정 (예: \"후기\" → \"솔직 후기\")",
        "  • 본인 경험 1~2줄 추가 (가격·대기시간·위치)",
        "  • 처음·마지막 문장 손보기",
        "→ 네이버 유사문서 회피 + 신뢰감 상승",
      ]},
      { h: "Q2. 글이 마음에 안 들면?", lines: [
        "다시 생성해보세요.",
        "또는 키워드를 더 좁혀보세요.",
        "  예: '치과' → '강남 임플란트 비용'",
        "키워드가 구체적일수록 글 방향이 명확해집니다.",
      ]},
      { h: "Q3. 사진이 없어요. 어떻게 하죠?", lines: [
        "① 직접 찍기 — 외관 / 처방전 / 영수증",
        "② AI로 사진 만들기 (가장 편합니다)",
        "③ 무료 사이트 — 픽사베이 / 언스플래시",
        "④ 캔바(Canva)로 글자 카드 만들기",
      ]},
      { h: "Q4. 며칠 만에 상단에 올라가요?", lines: [
        "• 세부 키워드(예: 강남 임플란트 비용): 1~2주",
        "• 큰 키워드(예: 임플란트): 3~6개월",
        "꾸준히 올리는 게 핵심입니다.",
      ]},
      { h: "Q5. 같은 글 여러 번 올려도 되나요?", lines: [
        "안 됩니다. 네이버가 같은 글로 인식해서",
        "검색에서 빠져버립니다.",
        "다시 올리려면 글의 70% 이상을 새로 쓰세요.",
        "(또는 다시 생성해서 다른 버전으로 받으세요)",
      ]},
      { h: "Q6. 광고처럼 보이면 안 좋나요?", lines: [
        "네. 후기처럼 자연스럽게 쓰세요.",
        "'강추합니다' 같은 광고 표현은 피하세요.",
        "(자동 생성 글에는 이미 광고 표현이 차단되어 있습니다)",
      ]},
    ]
  },
];

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function GuideAccordion() {
  const [openId, setOpenId] = useState(null);

  return (
    <div style={{ marginTop: 24, background: "#fff",
      borderTop: "1px solid #ede8f8", paddingTop: 18 }}>

      {/* 헤더 */}
      <div style={{ fontSize: 13, fontWeight: 800, color: "#7B1FA2",
        marginBottom: 14, padding: "0 4px",
        display: "flex", alignItems: "center", gap: 6 }}>
        📚 발행 가이드
        <span style={{ fontSize: 11, fontWeight: 600, color: "#999" }}>
          (필요한 항목만 펼쳐보세요)
        </span>
      </div>

      {/* 아코디언 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {GUIDE_SECTIONS.map(sec => {
          const isOpen = openId === sec.id;
          return (
            <div key={sec.id} style={{
              background: isOpen ? "#faf8ff" : "#fff",
              border: `1px solid ${isOpen ? "#d1b3e0" : "#ede8f8"}`,
              borderRadius: 10, overflow: "hidden",
              transition: "all .2s" }}>

              {/* 헤더 버튼 */}
              <button onClick={() => setOpenId(isOpen ? null : sec.id)}
                style={{ width: "100%", padding: "13px 16px",
                  background: "transparent", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                  fontFamily: "inherit", textAlign: "left" }}>
                <span style={{ fontSize: 20 }}>{sec.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.3 }}>
                    {sec.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
                    {sec.sub}
                  </div>
                </div>
                <span style={{ fontSize: 13, color: "#7B1FA2",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform .2s" }}>▶</span>
              </button>

              {/* 펼친 콘텐츠 */}
              {isOpen && (
                <div style={{ padding: "0 16px 18px 16px",
                  borderTop: "1px solid #ede8f8", marginTop: 4 }}>
                  {sec.content.map((block, bi) => (
                    <div key={bi} style={{ marginTop: 18 }}>
                      <div style={{ fontSize: 14, fontWeight: 900,
                        color: "#4A148C", marginBottom: 10, letterSpacing: -0.2 }}>
                        {block.h}
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.75,
                        color: "#444", whiteSpace: "pre-wrap" }}>
                        {block.lines.join("\n")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
