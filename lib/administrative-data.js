// ============================================================
// lib/administrative-data.js — 행정사(administrative) 데이터
// 정보형(institutional 1인칭). 후기·성공사례 금지. 결과보장 금지.
// titlePatterns는 data.js 소유(SOP). generator는 소비만.
// 7개 메뉴 / 첫 관측 3개: F4거소증·E7취업비자·전문건설업등록
// ============================================================

// ── META ───────────────────────────────────────
export const ADMIN_META = {
  id: "administrative",
  label: "행정사",
  speaker: "○○행정사사무소",      // 기관형 1인칭 화자
  speakerVerb: "안내드립니다",
};

// ── CATS (메뉴 = 카테고리) ──────────────────────
export const ADMIN_CATS = [
  { id: "immigration", name: "출입국·비자",  priority: 5 },
  { id: "license",     name: "인허가",       priority: 5 },
  { id: "certify",     name: "기업인증",     priority: 4 },
  { id: "appeal",      name: "행정심판",     priority: 4 },
  { id: "notice",      name: "내용증명",     priority: 3 },
  { id: "nonprofit",   name: "비영리법인",   priority: 3 },
  { id: "civil",       name: "사실증명·민원", priority: 3 },
];

// ── 제목 패턴 (지역 + 업무). {region} 치환 ──────
// 고특이성 토큰만 사용 (오염 차단). "인허가/민원" 같은 저특이성 단독 금지.
const T = {
  // MENU1 출입국·비자
  f4_resident:  ["{region} F4비자 거소증 준비서류", "{region} F4 거소증 신청절차", "{region} F4비자 거소신고 안내"],
  e7_work:      ["{region} E7비자 신청절차", "{region} E7 취업비자 준비서류", "{region} E7비자 변경 안내"],
  stay_extend:  ["{region} 체류기간 연장 준비서류", "{region} 체류연장 신청절차"],
  permanent:    ["{region} 영주권 신청 요건", "{region} 영주권 준비서류 안내"],
  // MENU2 인허가
  construction: ["{region} 전문건설업 등록 요건", "{region} 전문건설업 등록 준비서류", "{region} 건설업 등록 절차", "{region} 전문건설업 등록기준"],
  jobagency:    ["{region} 직업소개소 등록 요건", "{region} 유료직업소개소 등록 절차"],
  travelbiz:    ["{region} 여행업 등록 요건", "{region} 국내여행업 등록 절차"],
  sharedkitchen:["{region} 공유주방 등록 절차", "{region} 공유주방 영업신고 안내"],
  // MENU3 기업인증
  women_biz:    ["{region} 여성기업 인증 절차", "{region} 여성기업 확인 준비서류"],
  mainbiz:      ["{region} 메인비즈 인증 절차", "{region} 경영혁신형 중소기업 인증 안내"],
  innobiz:      ["{region} 이노비즈 인증 절차", "{region} 기술혁신형 중소기업 인증 안내"],
  // MENU4 행정심판
  suspension:   ["{region} 영업정지 행정심판 진행방법", "{region} 영업정지 처분 대응절차"],
  schoolviolence:["{region} 학교폭력 행정심판 절차", "{region} 학교폭력 처분 대응방법"],
  discipline:   ["{region} 징계처분 행정심판 절차", "{region} 행정처분 불복 진행방법"],
  driverlicense:["{region} 음주운전 면허취소 구제 절차", "{region} 운전면허 취소 행정심판 방법", "{region} 면허정지 구제 행정심판 안내"],
  // MENU5 내용증명
  unpaid:       ["{region} 미수금 내용증명 작성방법", "{region} 미수금 내용증명 안내"],
  termination:  ["{region} 계약해지 내용증명 작성절차", "{region} 계약해지 통보 내용증명"],
  damages:      ["{region} 손해배상 내용증명 작성안내"],
  // MENU6 비영리법인
  incorporated: ["{region} 사단법인 설립절차", "{region} 사단법인 설립 준비서류"],
  foundation:   ["{region} 재단법인 설립절차", "{region} 재단법인 설립 요건"],
  association:  ["{region} 협회설립 절차 안내", "{region} 협회 설립 준비서류"],
  // MENU7 사실증명·민원
  factcert:     ["{region} 사실확인서 작성안내", "{region} 사실증명 서류 발급절차"],
  govdoc:       ["{region} 행정기관 제출서류 안내", "{region} 각종 민원서류 준비안내"],
};

// ── TREATMENTS (업무 단위) ───────────────────────
//   id / name(=kw) / cat / titlePatterns / summary(절차요지, 정보형)
export const ADMIN_TREATMENTS = [
  // ── MENU1 출입국·비자 ★★★★★ ──
  { id: "f4_resident",  name: "F4비자 거소증",  cat: "immigration", titlePatterns: T.f4_resident,
    summary: "재외동포(F4) 자격 국내거소신고 및 거소증 발급 절차 안내" },
  { id: "e7_work",      name: "E7 취업비자",    cat: "immigration", titlePatterns: T.e7_work,
    summary: "특정활동(E7) 취업비자 발급·변경 요건 및 제출서류 안내" },
  { id: "stay_extend",  name: "체류연장",       cat: "immigration", titlePatterns: T.stay_extend,
    summary: "체류기간 연장허가 신청 요건 및 준비서류 안내" },
  { id: "permanent",    name: "영주권",         cat: "immigration", titlePatterns: T.permanent,
    summary: "영주(F5) 자격 신청 요건 및 제출서류 안내" },
  // ── MENU2 인허가 ★★★★★ ──
  { id: "construction", name: "전문건설업 등록", cat: "license", titlePatterns: T.construction,
    summary: "전문건설업 등록기준(기술자·자본금·시설) 및 등록 절차 안내" },
  { id: "jobagency",    name: "직업소개소 등록", cat: "license", titlePatterns: T.jobagency,
    summary: "유료직업소개소 등록 요건 및 신고 절차 안내" },
  { id: "travelbiz",    name: "여행업 등록",     cat: "license", titlePatterns: T.travelbiz,
    summary: "여행업(국내·국외·일반) 등록 자본금 요건 및 절차 안내" },
  { id: "sharedkitchen",name: "공유주방 등록",   cat: "license", titlePatterns: T.sharedkitchen,
    summary: "공유주방 영업신고 요건 및 위생기준 절차 안내" },
  // ── MENU3 기업인증 ★★★★ ──
  { id: "women_biz",    name: "여성기업 인증",   cat: "certify", titlePatterns: T.women_biz,
    summary: "여성기업 확인 신청 요건 및 제출서류 안내" },
  { id: "mainbiz",      name: "메인비즈 인증",   cat: "certify", titlePatterns: T.mainbiz,
    summary: "경영혁신형 중소기업(메인비즈) 인증 평가 및 절차 안내" },
  { id: "innobiz",      name: "이노비즈 인증",   cat: "certify", titlePatterns: T.innobiz,
    summary: "기술혁신형 중소기업(이노비즈) 인증 평가 및 절차 안내" },
  // ── MENU4 행정심판 ★★★★ ──
  { id: "suspension",   name: "영업정지 행정심판", cat: "appeal", titlePatterns: T.suspension,
    summary: "영업정지 처분에 대한 행정심판 청구 요건 및 절차 안내" },
  { id: "schoolviolence",name: "학교폭력 행정심판", cat: "appeal", titlePatterns: T.schoolviolence,
    summary: "학교폭력 조치에 대한 행정심판 청구 절차 안내" },
  { id: "discipline",   name: "징계처분 행정심판", cat: "appeal", titlePatterns: T.discipline,
    summary: "행정처분·징계에 대한 불복 행정심판 절차 안내" },
  { id: "driverlicense", name: "운전면허 행정심판", cat: "appeal", titlePatterns: T.driverlicense,
    summary: "음주운전 면허취소·면허정지 처분에 대한 행정심판 구제 절차 안내" },
  // ── MENU5 내용증명 ★★★ ──
  { id: "unpaid",       name: "미수금 내용증명", cat: "notice", titlePatterns: T.unpaid,
    summary: "미수금 청구 내용증명 작성 및 발송 절차 안내" },
  { id: "termination",  name: "계약해지 내용증명", cat: "notice", titlePatterns: T.termination,
    summary: "계약해지 통보 내용증명 작성 요령 및 절차 안내" },
  { id: "damages",      name: "손해배상 내용증명", cat: "notice", titlePatterns: T.damages,
    summary: "손해배상 청구 내용증명 작성 및 발송 절차 안내" },
  // ── MENU6 비영리법인 ★★★ ──
  { id: "incorporated", name: "사단법인 설립",   cat: "nonprofit", titlePatterns: T.incorporated,
    summary: "비영리 사단법인 설립허가 신청 요건 및 절차 안내" },
  { id: "foundation",   name: "재단법인 설립",   cat: "nonprofit", titlePatterns: T.foundation,
    summary: "비영리 재단법인 설립허가 요건 및 출연재산 절차 안내" },
  { id: "association",  name: "협회설립",        cat: "nonprofit", titlePatterns: T.association,
    summary: "협회(비영리단체) 설립 요건 및 절차 안내" },
  // ── MENU7 사실증명·민원 ★★★ ──
  { id: "factcert",     name: "사실확인서",      cat: "civil", titlePatterns: T.factcert,
    summary: "사실확인서·사실증명 서류 작성 및 발급 절차 안내" },
  { id: "govdoc",       name: "행정기관 제출서류", cat: "civil", titlePatterns: T.govdoc,
    summary: "각종 민원·행정기관 제출서류 준비 및 신청 절차 안내" },
];

export default {
  ADMIN_META,
  ADMIN_CATS,
  ADMIN_TREATMENTS,
};
