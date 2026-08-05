// ============================================================
// generateGastro.js — 소화기내과 전용 블로그 생성기 v3.0.3
// ⚠️ clinic/dental/pediatrics 등 타 업종 데이터 절대 참조 금지
//
// v3.0.3 변경 (2026.05) — semi-migration to commonPhotoBox:
//   ① stripMarkdownForNaver 헤더 변환만 공통 모듈(_stripMarkdownForNaver) 위임
//   ② GASTRO_PHOTO_POOL / buildGastroPhotoPlaceholder 무변경 (3줄 인라인 형식 보존)
//   ③ 박스 placeholder 변환은 gastro 전용 후처리로 분리 (visual identity 보존)
//   ④ 박스 변환 → 헤더 변환 순서 유지 (gastro 특수성 / 다른 업종과 반대 순서)
//   ⑤ fallback `|| [이미지: alt]` 유지 (gastro 전용)
//   ⑥ ABSORB / whitelist / cleanGastro / PATCH A·B 무변경
//   ⑦ dental v3.6.7 / ent v3.6.4 semi-migration 패턴 + gastro 특수성 보존
//
// v3.0.2 변경 (2026.05) — PATCH A 의미 보정 롤백 + B 화이트리스트 확장:
//   - PATCH A: "검색해 보니," 강제 삽입 제거 → 단순 공백 1칸 분리
//     사유: 의미 보완은 후처리가 아닌 재작성에 가까움 / 문맥 중복 위험
//   - PATCH B: 화이트리스트 확장 — 소화기내과/점/곳/거/것/때문/덕분/시기/부분/단계
//   ※ 이상 freeze — 추가 보정은 다음 세션에서 누적 데이터 5건+ 후 재검토
//
// v3.0.1 변경 (2026.05) — 잔존 fossil 미세패치:
//   - PATCH A: 따옴표 직후 subKw 결합 fossil 제거
//     ex) "강남 소화기내과"염증성... → "강남 소화기내과"로 검색해 보니, 염증성...
//   - PATCH B: 명사 충돌형 fossil 제거
//     ex) 염증성...(궤양성)이 병이 → 이 병이 (의미 보존, 반복 방지)
//   ※ PATCH C (ALT→CRP 카테고리 분기) 보류 — contamination 위험
//
// v3.0 변경 (2026.05) — ortho v3.7.5 패턴 이식:
//   - GASTRO_PHOTO_POOL 5종 (검사/상담/시술/치료/일상)
//   - buildGastroPhotoPlaceholder — 박스 placeholder 생성
//   - stripMarkdownForNaver 박스 변환 1줄 추가
//   - calcGastroCharCount — 박스 제외 글자수
//   - 동적 whitelist (GASTRO_TREATMENTS.map 참조)
//   - ABSORB_RULES — 부위 기반 흡수 6규칙 + fallback
//   - Phase A 후처리 (BB-1/6/7 + 치료명 중복 + GG-1)
//   - assembled 후처리 (region + subKw 패치)
//
// v2.3 변경 (2026.05) — 미세 자연화:
//   - 규칙 1 강화: "${subKw}이/가 + 명사" 패턴 자체 금지
//     (주어/소유격 의도 무관하게 패턴 자체 차단)
//     → "과민성대장증후군이 소화기내과" 같은 잔여 케이스 차단
//   - 규칙 4 신규: 따옴표 직후 키워드 직접 결합 금지
//     → '"저FODMAP"과민성대장증후군' 같은 케이스 차단
//   - few-shot 예시: 실제 깨진 케이스를 ✗/✓ 쌍으로 학습
//
// v2.2 변경 (2026.05) — systemPrompt 핵심 3대 규칙 재구성
// v2.1.2 변경 — regex 대폭 정리 (V2-4 케이스 C, V2-8 비활성화)
// v2.0~2.1.1 — 14개 패턴 비활성화, 받침 판별 안전 교정
//
// 핵심 품질 보증:
//   1. 정보 블럭 강제 삽입 — reason 섹션 조립 후 무조건 주입
//   2. 검사 수치 강제 삽입 — consult 섹션에 수치 없으면 주입
//   3. 받침 판별 기반 조사 안전 교정 — 정상 문장 보존
//   4. 키워드 반복 자동 제어 — 3회 초과 → "이 증상" 치환
//   5. systemPrompt 4대 핵심 규칙 — GPT 생성 단계에서 차단
// ============================================================
import { GASTRO_TREATMENTS }               from "../../lib/gastro-data";
import { buildGastroPrompt }               from "../../lib/gastro-prompts";
import { GASTRO_FLOW_ENGINE }              from "../../lib/gastro-playConfig";
import {
  openai, calcCharCount, removeDuplicateSentences,
  stripInlineImages, restoreKeyword, diagnosePost,
  generateSection, autoSave,
} from "./generateUtils";

// ★ v2.0 — 과별 침투 차단 + 안전 단어 제거 모듈
import { getCrossBlocks } from "../../lib/industryBlocks";
import { safeRemoveWords } from "../../lib/safeRemove";

// ★ v3.0.3 — semi-migration: stripMarkdownForNaver 헤더 변환만 공통 모듈 위임
import { stripMarkdownForNaver as _stripMarkdownForNaver } from "../../lib/commonPhotoBox";

// ★ v2.0 — 과별 침투 차단 (lib/industryBlocks.js)
//   다른 과 정체성 키워드 자동 차단 (한 곳 수정 = 16개 파일 동시 적용)
//   ⚠️ 위 GASTRO_FORBIDDEN의 하드코딩된 타과 키워드와 중복되어도 무해 (Set 효과)
const GASTRO_CROSS_BLOCK = getCrossBlocks("gastro");

// ── 소화기내과 전용 금지 키워드 ──────────────────────────
const GASTRO_FORBIDDEN = [
  // 타 업종 침투 방지
  "쌍꺼풀", "눈매교정", "실리프팅", "울쎄라", "써마지",
  "피코레이저", "레이저토닝", "지방흡입", "코성형", "성형외과",
  "임플란트", "라미네이트", "스케일링", "투명교정",
  "전립선", "포경수술", "비뇨기",
  "소아과", "어린이집",
  // AI 투
  "결론적으로", "따라서", "이와 같이", "정리하면", "앞서 언급한",
  "해당 질환", "이 방법",
  // ⚠️ "이 치료가/를/는"은 빈 문자열로 제거하면 조사 깨짐 발생
  //    예: "이 치료를 통해" → " 통해" / "이 치료의 필요" → 문장 와해
  //    → 본문 정규화 블록(forEach 직후)에서 안전 보정 처리
  // 광고성 (기존)
  "중요합니다", "확인하세요", "추천드립니다", "최고의", "검증된 의료진",
  "드디어 결심하고", "결국 선택하게 되었어요", "마음이 편안해졌어요",
  // ★ 광고톤 강화 (v1.1) — 사용자 피드백 반영
  "최신식 장비", "최신 장비", "최첨단 장비",
  "친절한 상담", "친절하다는 후기", "친절하다는 이야기",
  "신뢰가 갔어요", "믿음이 갔어요",
  "꼼꼼한 진료 덕분에", "전문가의 조언 덕분에",
  "혼자 검색만 하지 말고", "건강은 미루지 않는 게 최선",
  "정말 추천드려요", "꼭 가보세요",
];

// ── 진료별 정보 블럭 (강제 삽입) ────────────────────────
const GASTRO_INFO_BLOCKS = {
  '위내시경': {
    title: '수면 vs 비수면 위내시경, 어떻게 다른가요?',
    items: [
      '비수면: 검사 중 의식 있음, 검사 후 즉시 귀가 가능, 비용 저렴',
      '수면: 프로포폴 or 미다졸람 사용, 검사 후 30분 회복 필요, 운전 금지',
    ],
    warning: '조직검사를 했다면 결과 나오기까지 1주일 음주·진통제 복용 주의',
  },
  '대장내시경': {
    title: '대장내시경 장 준비, 이게 제일 힘들어요',
    items: [
      '전날 저녁: 저잔사 식이(흰밥·두부·계란·흰살 생선만), 씨 있는 과일·채소 금지',
      '당일: 2L 장 세척액 1~2시간 내 복용, 변이 노란 물처럼 나오면 준비 완료',
    ],
    warning: '당뇨·고혈압약 복용자는 반드시 내과 사전 안내 필수 — 복용 중단 기준 다름',
  },
  '역류성 식도염': {
    title: '역류성 식도염 vs 위염, 어떻게 구별하나요?',
    items: [
      '역류성 식도염: 신물·쓴물이 목까지 올라옴, 누울 때 악화, 흉통 동반 가능',
      '위염: 식후 더부룩함·명치 통증 중심, 역류감 적음',
    ],
    warning: '가슴 통증이 심하면 심장 문제와 감별 필요 — 심전도 검사 권장',
  },
  '헬리코박터 제균치료': {
    title: '헬리코박터 제균 실패하면 어떻게 되나요?',
    items: [
      '1차 제균(80% 성공): PPI + 클래리스로마이신 + 아목시실린 7~14일',
      '2차 제균(90% 성공): 비스무트 4제 요법 or 레보플록사신 병용',
    ],
    warning: '제균 중 임의 중단 금지 — 내성균 발생으로 2차 치료 어려워짐',
  },
  '위궤양·십이지장궤양': {
    title: '위궤양 vs 십이지장궤양, 통증 양상이 달라요',
    items: [
      '위궤양: 식후 30분~1시간 통증, 먹으면 악화되는 경향',
      '십이지장궤양: 공복 통증, 식사 후 일시적 완화, 야간 통증',
    ],
    warning: '검은 변(흑색변)·토혈 시 즉시 응급실 — 출혈성 궤양 가능성',
  },
  '과민성대장증후군': {
    title: 'IBS vs 염증성 장질환, 어떻게 구별하나요?',
    items: [
      'IBS: 대장내시경·혈액검사 정상, 스트레스·특정 음식과 연관',
      '염증성 장질환: 혈변·체중 감소·발열 동반, 내시경에서 염증 병변 확인',
    ],
    warning: '혈변·야간 설사·체중 감소 동반 시 IBS가 아닐 수 있음 — 내시경 필수',
  },
  '염증성 장질환(크론병·궤양성 대장염)': {
    title: '크론병 vs 궤양성 대장염, 어떻게 다른가요?',
    items: [
      '궤양성 대장염: 대장만, 연속적 병변, 혈변 주 증상, 5-ASA 1차 치료',
      '크론병: 입~항문 어디든, 건너뛰는 병변, 복통·설사·체중 감소, 더 복잡한 치료',
    ],
    warning: '복통·혈변과 함께 체중이 한 달에 3kg 이상 빠지면 즉시 내과 방문',
  },
  '지방간': {
    title: '지방간 등급, 어느 정도면 치료가 필요한가요?',
    items: [
      '경도(1단계): 간세포 5~33% 지방 침착, 식이·운동으로 개선 가능',
      '중등도(2단계)/고도(3단계): 적극적인 체중 감량 + 6개월마다 추적 초음파',
    ],
    warning: 'ALT 수치 80 이상 or 3개월 이상 지속 상승 시 정밀검사 권장',
  },
  '바이러스 간염(B형·C형)': {
    title: 'B형 간염 vs C형 간염, 치료가 어떻게 다른가요?',
    items: [
      'B형: 완치는 어렵지만 항바이러스제로 바이러스 억제 가능, 평생 추적 필요',
      'C형: DAA 8~12주 치료로 95% 이상 완치 가능, 치료 후 추적만',
    ],
    warning: 'B형 간염 보유자: ALT 정상이어도 6개월마다 AFP·초음파 필수',
  },
  '간경변': {
    title: '간경변 Child-Pugh 등급, 어떻게 구분하나요?',
    items: [
      'A등급(5~6점): 비교적 안정, 외래 관리 가능',
      'B등급(7~9점)/C등급(10~15점): 합병증 위험 증가, 이식 고려',
    ],
    warning: '갑자기 황달이 생기거나 배가 많이 불러오면 즉시 내과 방문',
  },
  '담석·담낭염': {
    title: '담석, 수술 꼭 해야 하나요?',
    items: [
      '무증상 담석: 경과 관찰 가능 (단, 3cm 이상·담낭 용종 동반 시 수술 고려)',
      '증상성 담석/급성 담낭염: 복강경 담낭 절제술 권장',
    ],
    warning: '우상복부 통증에 38도 이상 발열·황달이 동반되면 즉시 응급실',
  },
  '췌장염': {
    title: '급성 췌장염 vs 만성 췌장염, 어떻게 다른가요?',
    items: [
      '급성: 갑작스러운 극심한 복통, 입원 금식 수액 치료, 대부분 회복',
      '만성: 반복 염증으로 췌장 기능 저하, 완전 금주 + 저지방 식이 필수',
    ],
    warning: '아밀라아제·리파아제 수치 정상 상한의 3배 이상이면 급성 췌장염 진단 기준',
  },
  '기능성 소화불량': {
    title: '기능성 소화불량 vs 위염, 내시경으로도 구별 안 되나요?',
    items: [
      '위염: 내시경에서 발적·미란 등 점막 이상 소견 확인',
      '기능성 소화불량: 내시경 정상 — 위 운동 기능 이상·과민성이 원인',
    ],
    warning: '6개월 이상 증상 지속 or 체중 감소·혈변 동반 시 재내시경 필요',
  },
  '대장 용종': {
    title: '대장 용종, 얼마나 위험한가요?',
    items: [
      '증식성 용종: 암으로 진행 위험 낮음, 5년 후 추적',
      '선종성 용종: 암 전구 병변 — 크기·개수에 따라 1~3년 후 추적 필수',
    ],
    warning: '용종 제거 후 3일간 딱딱한 음식·운동·음주 금지 — 출혈 위험',
  },
  '복부 초음파': {
    title: '복부 초음파 vs CT, 어떤 검사가 더 낫나요?',
    items: [
      '복부 초음파: 방사선 없음, 간·담낭·신장 기본 선별에 적합, 비용 저렴',
      'CT: 방사선 있음, 췌장·혈관·장 등 더 정밀한 평가, 조영제 알레르기 확인 필요',
    ],
    warning: '검사 전 4~6시간 금식 필수 — 담낭이 수축되면 담석 발견률 낮아짐',
  },
  // ★ v1.4 — gastro-data.js v1.1 신규 7개 진료
  '수면내시경': {
    title: '수면내시경 vs 일반내시경, 어떻게 다른가요?',
    items: [
      '수면(무통): 프로포폴·미다졸람 진정, 검사 중 통증·구역 없음, 회복 30분~1시간 필요',
      '일반: 진정제 없음, 검사 후 즉시 귀가 가능, 비용 저렴하나 구역·통증 있음',
    ],
    warning: '수면내시경 당일 운전·중요 결정 금지 — 진정 효과 4~6시간 지속',
  },
  '위암 검진': {
    title: '국가 암검진 vs 정밀 위암 검진, 어떻게 다른가요?',
    items: [
      '국가 암검진: 40세 이상 2년 주기, 위내시경 기본, 비용 무료~저렴',
      '정밀 위암 검진: 가족력·고위험군 대상 매년, 조직검사·헬리코박터 동시 평가',
    ],
    warning: '직계가족 위암력 있으면 일반 권장(40세)보다 5~10년 빨리 시작',
  },
  '대장암 검진': {
    title: '분변잠혈검사 vs 대장내시경, 어떻게 시작하나요?',
    items: [
      '분변잠혈: 매년 권장, 비침습·간편, 양성 시 대장내시경 필수',
      '대장내시경: 5~10년 주기(정상 시), 용종 발견·제거 동시 가능, 가족력 시 30~40대부터',
    ],
    warning: '50세 이상 또는 직계가족 대장암력 있으면 분변잠혈 + 내시경 둘 다 권장',
  },
  '치질·치핵치료': {
    title: '치질 보존 치료 vs 수술, 언제 결정하나요?',
    items: [
      '1~2단계: 좌욕·연고·약물로 호전 가능, 식이·생활 교정 병행',
      '3~4단계: 결찰술·경화요법 등 비수술 치료 또는 수술 의뢰',
    ],
    warning: '항문 출혈이 1주 이상 지속되면 단순 치질이 아닌 다른 질환 감별 필요',
  },
  '만성변비치료': {
    title: '시판 변비약 vs 처방 약물, 무엇이 다른가요?',
    items: [
      '시판 자극성 하제: 단기 효과, 장기 복용 시 의존성·내성 발생',
      '처방 락툴로오즈·삼투성 하제: 의존성 적음, 식이·운동 교정과 병행',
    ],
    warning: '주 3회 미만 + 체중감소·복통 동반 시 대장 정밀 검사 필수',
  },
  '장상피화생': {
    title: '장상피화생, 위암으로 진행하나요?',
    items: [
      '위암 전구 단계로 분류, 그러나 진행 속도 느리고 적극적 관리로 예방 가능',
      '헬리코박터 제균 + 추적 내시경 1~2년 주기 + 짠 음식·훈제식품 제한',
    ],
    warning: '위암 가족력 동반 시 추적 주기를 1년으로 단축 권장',
  },
  '위·식도 정맥류': {
    title: '정맥류 결찰술 vs 약물 예방, 어떻게 결정하나요?',
    items: [
      '결찰술: 출혈 이력 있거나 큰 정맥류, 2~4주 간격 반복 시술',
      '베타차단제 약물: 출혈 이력 없는 중간 크기 정맥류 1차 예방',
    ],
    warning: '토혈·흑색변 발생 시 즉시 응급실 — 정맥류 출혈은 사망률 높음',
  },
};

// ── 진료별 기본 검사 수치 (AI가 수치 안 쓸 경우 강제 삽입) ──
const GASTRO_EXAM_VALUES = {
  '위내시경':              ['위 전정부 발적 소견', 'HP 양성', '조직검사 1곳 시행'],
  '대장내시경':            ['S결장 5mm 폴립 발견', '용종 제거(차가운 올가미)', '조직검사 1개 채취'],
  '역류성 식도염':         ['위식도 역류 LA grade A', 'pH 모니터링 생략', 'PPI 4주 처방'],
  '헬리코박터 제균치료':   ['요소호기검사 양성(UBT +)', '1차 제균 3제 요법 14일', '제균 후 4주 뒤 재검 예정'],
  '위궤양·십이지장궤양':   ['전정부 1cm 궤양 확인', 'HP 동반 양성', 'PPI 8주 처방'],
  '과민성대장증후군':       ['대장내시경 정상', 'CRP 0.3 mg/L(정상)', 'Rome IV 기준 충족'],
  '염증성 장질환(크론병·궤양성 대장염)': ['S결장 연속적 발적·미란 소견', 'CRP 4.2 mg/L 상승', 'ESR 38 mm/hr'],
  '지방간':                ['복부 초음파 지방간 grade 2', 'ALT 78 IU/L', 'GGT 112 IU/L'],
  '바이러스 간염(B형·C형)': ['HBV DNA 2.3×10⁴ IU/mL', 'ALT 56 IU/L', 'HBeAg 양성'],
  '간경변':                ['Child-Pugh A등급(6점)', 'AFP 8.2 ng/mL', '복부 초음파 간 에코 증가'],
  '담석·담낭염':           ['담낭 결석 1.5cm', '담낭벽 두께 4mm', '복부 초음파 확진'],
  '췌장염':                ['혈중 리파아제 820 U/L(정상 3배)', '아밀라아제 540 U/L', 'CT에서 췌장 부종'],
  '기능성 소화불량':        ['위내시경 정상 소견', 'HP 음성', '위 배출 지연 확인'],
  '대장 용종':             ['S결장 7mm 선종성 용종', '차가운 올가미 절제', '조직검사 1개 채취'],
  '복부 초음파':           ['간 에코 증가(지방간 grade 1)', '담낭 용종 4mm', '신장 이상 없음'],
  // ★ v1.4 — gastro-data.js v1.1 신규 7개 진료
  '수면내시경':            ['프로포폴 60mg 정주', '검사 중 의식·통증 없음', '회복실 40분 후 귀가'],
  '위암 검진':             ['위내시경 정상 소견', 'HP 음성', '조직검사 1곳(전정부) 시행'],
  '대장암 검진':           ['분변잠혈검사 음성', '대장내시경 S결장 5mm 용종 1개', '조직검사 결과 선종성'],
  '치질·치핵치료':         ['항문경 검사 2단계 내치핵', '결찰술 1회 시행', '재출혈 없음'],
  '만성변비치료':          ['주 1회 배변 → 주 5회로 호전', '락툴로오즈 15mL 1일 2회', '대장내시경 정상'],
  '장상피화생':            ['위 전정부 광범위 장상피화생', 'HP 양성 → 1차 제균 완료', '추적 1년 권장'],
  '위·식도 정맥류':        ['식도 정맥류 F2 등급', '결찰술 1차 시행(밴드 6개)', 'Child-Pugh B등급'],
};

// ── 정보 블럭 강제 삽입 ──────────────────────────────────
function insertGastroInfoBlock(text, treatmentName) {
  const block = GASTRO_INFO_BLOCKS[treatmentName];
  if (!block) return text;
  if (text.includes(block.title) || /vs|어떻게 다른|어떻게 구별/.test(text)) return text;
  const blockText = `\n\n**${block.title}**\n${block.items.map(i => `- ${i}`).join('\n')}\n\n> ⚠️ ${block.warning}`;
  return text.trimEnd() + blockText;
}

// ── 검사 수치 강제 삽입 ──────────────────────────────────
function injectGastroExamValue(text, treatmentName) {
  const values = GASTRO_EXAM_VALUES[treatmentName];
  if (!values) return text;
  if (/\d+(\.\d+)?\s*(IU\/L|mg\/L|cm|mm|ng\/mL|U\/L|점|%|배)/.test(text)) return text;
  const examNote = `\n\n(검사 결과: ${values[0]}, ${values[1] || ''})`;
  if (text.includes('[이미지:')) return text.replace(/(\[이미지:[^\]]+\])/, examNote + '\n\n$1');
  return text + examNote;
}

// ── 소화기내과 전용 제목 생성 ────────────────────────────
function buildGastroTitle(treatmentName, region, seoData, blogTypeId) {
  if (seoData?.titlePatterns?.length) {
    const raw = seoData.titlePatterns[Math.floor(Math.random() * seoData.titlePatterns.length)];
    return raw.replace(/\{region\}/g, region);
  }
  if (blogTypeId === 'compare') {
    const cw = seoData?.compareWith || '다른 방법';
    return `${region} ${treatmentName} vs ${cw} 비교｜소화기내과 상담 후 선택한 이유`;
  }
  if (blogTypeId === 'consult') {
    return `${region} 소화기내과 ${treatmentName} 상담 후기｜처음 가기 전 알았으면 좋았을 것들`;
  }
  const defaults = [
    `${region} 소화기내과 ${treatmentName} 후기｜검사부터 결과까지 솔직하게`,
    `${treatmentName} 걱정했는데｜${region} 소화기내과에서 들은 이야기`,
    `${region} ${treatmentName}｜미루다 결국 내과 간 이야기`,
    `${treatmentName} 처음 받은 날｜${region} 소화기내과 실제 후기`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ============================================================
// ★ v1.5 — 제목 타입 감지 (제목-본문 동기화의 출발점)
// ============================================================
// 제목 안의 키워드로 글의 톤을 결정한다. 본문 강제 / CTA 강도 / 정보블록 사용 여부가 여기서 갈린다.
//
// 타입 정의:
//   - review  (후기형): "후기", "솔직", "받아본", "다녀온" → 환자 1인칭 경험 중심
//   - compare (비교형): "vs", "비교", "차이", "둘 다 받아본" → 비교 분석 + 정보 1개
//   - decision(결정형): "결심", "고민하다", "미루다", "선택한 이유" → 판단 과정 중심
//   - info    (정보형): "안내", "정리", "비용", "주기", "방법" → 정보 톤 (현재는 거의 차단됨)
//   - default        : 매칭 안 되면 후기형으로 fallback
function detectTitleType(title) {
  const t = String(title || '');
  // 정보형 (현재는 차단되었으나 안전장치)
  if (/(비용\s*[·,]?\s*예약|가격\s*안내|주기\s*안내|절차\s*안내|단계별\s*정리|응급처치)/.test(t)) {
    return 'info';
  }
  // 비교형
  if (/\bvs\b|비교(해|한|해봤)|차이|둘\s*다\s*받아|어떻게\s*다른|어떻게\s*시작/.test(t)) {
    return 'compare';
  }
  // 결정형
  if (/(결심|고민하다|미루다|선택한\s*이유|결정한|결심한|망설이다|두려워서\s*미루)/.test(t)) {
    return 'decision';
  }
  // 후기형 (가장 일반)
  if (/(후기|솔직|받아본|다녀온|기록|경험담|이야기|알게\s*된)/.test(t)) {
    return 'review';
  }
  // 매칭 실패 시 후기형 fallback
  return 'review';
}

// ── 타입별 본문 가이드 (시스템 프롬프트 추가 주입용) ──
function getTypeGuide(type, treatmentName) {
  switch (type) {
    case 'review':
      return `\n[제목 타입: 후기형] 환자 1인칭 경험 중심으로 작성. 검사·치료·생활 변화 디테일 강함. CTA는 마무리에 1회만 약하게.`;
    case 'compare':
      return `\n[제목 타입: 비교형] ${treatmentName}와 비교 대상의 실제 경험 차이 중심. 정보 블럭 1개 자연스럽게 활용. CTA 거의 없이 정보 전달 + 1인칭 판단으로 마무리.`;
    case 'decision':
      return `\n[제목 타입: 결정형] 결심하기까지의 망설임·고민·판단 과정에 분량 집중. 검사 결과보다 "왜 결정했는지" 중심. CTA는 같은 고민을 가진 사람에게 담담하게 1회.`;
    case 'info':
      return `\n[제목 타입: 정보형] 정보 전달 톤이지만 1인칭은 유지. 비용·절차·주기 정보를 본인 경험과 함께 서술. 후기 톤 강제 금지. CTA 없음.`;
    default:
      return '';
  }
}

// ── 소화기내과 해시태그 ──────────────────────────────────
function buildGastroHashtags(treatmentName, region) {
  const kw = treatmentName.replace(/\s|\(|\)|·/g, '');
  return [
    `#${region}소화기내과`, `#${kw}후기`, `#소화기내과`,
    `#${kw}`, `#${region}${kw}`, `#위내시경`,
    `#소화기건강`, `#내과후기`, `#${region}내과`,
  ].slice(0, 10).join(' ');
}

// ── 소화기내과 본문 정제 ─────────────────────────────────
function cleanGastroText(text, treatmentName) {
  let result = text;

  // 금지 키워드 제거 — 🛡️ v2.0 safeRemoveWords + CROSS_BLOCK
  //   - 부분 매칭 방지 (한글 단어 경계 검증)
  //   - 조사 포함 패턴 함께 제거
  //   - 제거 직후 공백 자동 normalize
  //   ⚠️ 이전 forEach replace는 "시술하는" → " 하는" 사고 유발
  const removeList = [...GASTRO_FORBIDDEN, ...GASTRO_CROSS_BLOCK];
  result = safeRemoveWords(result, removeList);

  // ─────────────────────────────────────────────────────
  // [본문 정규화] FORBIDDEN 목록에서 제거된 "이 치료가/를/는" 보정
  //   - 본문에 GPT가 직접 출력한 "이 치료를 통해" 같은 표현은 자연스럽게 둠
  //   - 단, 조사 깨짐 패턴(아래 참조)만 안전하게 보정
  //   ⚠️ 이 블록 제거 금지 — FORBIDDEN_BASE에서 조사어 빠진 이유와 짝
  // ─────────────────────────────────────────────────────
  {
    const tnEscEarly = treatmentName ? treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
    result = result
      // "이 치료은" (잘못된 조사) → "이 치료는"
      .replace(/이\s*치료은/g, "이 치료는")
      // 단독 " 통해" (앞에 공백, 문장 시작) — "이 치료를" 또는 비슷한 주어가 사라진 경우 복구
      .replace(/(^|[.!?]\s+)통해\s+/gm, "$1이 치료를 통해 ")
      // "이 치료의 필요/진행/시작/결정/중요" — 잘못된 조사
      .replace(/이\s*치료의\s+(필요|진행|시작|결정|중요)합니다/g, "이 치료가 $1합니다")
      .replace(/이\s*치료의\s+(필요|진행|시작|결정|중요)해요/g,   "이 치료가 $1해요")
      // 이중 "통해 통해"
      .replace(/통해\s+통해/g, "통해")
      // ── 톤 약화 (병원 안전 표현으로) ──
      .replace(/추천드리고 싶어요/g,  "고려해볼 수 있어요")
      .replace(/추천드립니다/g,        "고려해볼 수 있어요")
      .replace(/적극 추천/g,           "괜찮은 선택")
      .replace(/강력 추천/g,           "괜찮은 선택")
      .replace(/적절하게 짧아서/g,     "짧아서")
      .replace(/적절하게 길어서/g,     "여유 있게")
      // 두 문장 합쳐진 어색한 패턴
      .replace(/고려해보는 것도\s+덕분에/g, "고려해볼 수 있어요. 덕분에")
      .replace(/고려하는 것도\s+덕분에/g,   "고려해볼 수 있어요. 덕분에");
    // {치료명}이 과정/단계 패턴 (treatmentName 있을 때만)
    if (tnEscEarly) {
      result = result.replace(
        new RegExp(`${tnEscEarly}이\\s+(과정|단계|시간|결과|이후|이전)`, "g"),
        `${treatmentName}의 $1`
      );
    }
  }

  // ─────────────────────────────────────────────
  // ★ v2.0 — 14개 패턴 비활성화 (정상 문장 파괴 주범)
  //   기존 규칙이 GPT의 자연스러운 문장에서 키워드를 잘라내며
  //   "대장내시경와", "대장내시경이 소화기내과", "안전하다"대장내시경는" 같은
  //   파편을 만들어내고 있어 전면 비활성화.
  //   조사 오류는 아래 [받침 판별 기반 안전 교정]에서만 처리.
  // ─────────────────────────────────────────────

  // [받침 판별 기반 안전 교정] — 받침 잘못된 조사만 교정
  if (treatmentName && treatmentName.length > 1) {
    const lastChar = treatmentName[treatmentName.length - 1];
    const code = lastChar.charCodeAt(0);
    const hasJongseong = (code >= 0xAC00 && code <= 0xD7A3) && (code - 0xAC00) % 28 !== 0;
    const tn = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 받침 없으면 "이/은/을/과/으로" 잘못 → "가/는/를/와/로"로 교정
    // 받침 있으면 "가/는/를/와/로" 잘못 → "이/은/을/과/으로"로 교정
    try {
      if (hasJongseong) {
        result = result
          .replace(new RegExp(`(${tn})가(?=[\\s가-힣])`, 'g'), '$1이')
          .replace(new RegExp(`(${tn})는(?=[\\s가-힣])`, 'g'), '$1은')
          .replace(new RegExp(`(${tn})를(?=[\\s가-힣])`, 'g'), '$1을')
          .replace(new RegExp(`(${tn})와(?=[\\s가-힣])`, 'g'), '$1과')
          .replace(new RegExp(`(${tn})로(?=[\\s가-힣])`, 'g'), '$1으로');
      } else {
        result = result
          .replace(new RegExp(`(${tn})이(?=[\\s가-힣])`, 'g'), '$1가')
          .replace(new RegExp(`(${tn})은(?=[\\s가-힣])`, 'g'), '$1는')
          .replace(new RegExp(`(${tn})을(?=[\\s가-힣])`, 'g'), '$1를')
          .replace(new RegExp(`(${tn})과(?=[\\s가-힣])`, 'g'), '$1와')
          .replace(new RegExp(`(${tn})으로(?=[\\s가-힣])`, 'g'), '$1로');
      }
    } catch(e) {}
  }

  // 조사 오류 교정
  result = result
    .replace(/위내시경를/g, '위내시경을')
    .replace(/대장내시경를/g, '대장내시경을')
    .replace(/초음파를/g, '초음파를')
    .replace(/제균치료를/g, '제균치료를');

  // 동일 키워드 3회 초과 반복 방지
  if (treatmentName && treatmentName.length > 1) {
    const tnRaw = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = result.match(new RegExp(tnRaw, 'g')) || [];
    if (matches.length > 3) {
      let count = 0;
      result = result.replace(new RegExp(tnRaw, 'g'), (m) => {
        count++;
        return count > 3 ? '이 증상' : m;
      });
    }
  }

  // 문장 끊김 패턴 교정 (검증 버그 #2)
  result = result
    .replace(/\u201c|\u201d|\u2018|\u2019/g, '"')  // 유니코드 따옴표 → 일반 따옴표
    .replace(/([\uAC00-\uD7A3])\s*"\s*\n/g, '$1 이라고 하셨어요\n')
    .replace(/([\uAC00-\uD7A3])\s*"\s*$/gm, '$1 이라고 하셨어요')
    .replace(/하는 것이\s*"\s*\n/g, '하는 것이 중요하다고 하셨어요\n')
    .replace(/하는 것이\s*"\s*$/gm, '하는 것이 중요하다고 하셨어요');


  // AI 투 표현 제거
  result = result
    .replace(/드디어 결심하고/g, '결국')
    .replace(/결국 선택하게 되었어요/g, '선택했어요')
    .replace(/마음이 편안해졌어요/g, '안심이 됐어요')
    .replace(/믿음이 갔어요/g, '믿음직스러웠어요')
    .replace(/친절하고 전문적이셔서/g, '꼼꼼하게 봐주셔서');

  // 진료명+조사 추가 교정 (광범위 fallback) — v2.0 비활성화
  // 사유: "이 ~을 " 식의 매칭이 정상 문장의 일부를 통째로 삭제함
  // if (treatmentName && treatmentName.length > 1) {
  //   const tnFallback = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  //   try {
  //     result = result.replace(new RegExp(tnFallback + '이\\s+(\\S+에\\s+대해)', 'g'), '이 $1');
  //     result = result.replace(new RegExp(tnFallback + '이\\s+(\\S+을\\s+)', 'g'), '$1');
  //   } catch(e) {}
  // }

  // 공백 오류
  result = result
    .replace(/를  /g, '를 ')
    .replace(/을  /g, '을 ')
    .replace(/받고나면/g, '받고 나면');

  // ─────────────────────────────────────────────
  // ★ v1.1 추가 후처리 — 광고톤 / CTA 강도 / 추천 반복
  // ─────────────────────────────────────────────

  // ① 광고톤 표현 자동 치환 (FORBIDDEN으로 잡지 못하는 변형 패턴)
  result = result
    .replace(/최신식\s*장비(?:와|를|가|는|도)?/g, '진료실')
    .replace(/최신\s*장비(?:와|를|가|는|도)?/g, '진료실')
    .replace(/최첨단\s*장비/g, '검사 장비')
    .replace(/친절한\s*상담/g, '차분한 설명')
    .replace(/친절하다는\s*(후기|이야기|평)/g, '설명을 잘 해준다는 $1')
    .replace(/신뢰가\s*갔어요/g, '판단이 섰어요')
    .replace(/믿음이\s*갔어요/g, '판단이 섰어요')
    .replace(/꼼꼼한\s*진료\s*덕분에/g, '검사 결과를 자세히 설명해줘서')
    .replace(/전문가의\s*조언\s*덕분에/g, '의사 설명을 듣고')
    .replace(/이렇게\s*꼼꼼한\s*진료\s*덕분에\s*안심할\s*수\s*있었어요\.?/g, '검사 결과를 직접 보면서 설명을 들으니 판단이 섰어요.');

  // ② CTA 강도 다운
  result = result
    .replace(/꼭\s*상담받아\s*보시길\s*추천(해요|드려요|드립니다)/g, '한 번 검사받아보는 것도 방법이에요')
    .replace(/꼭\s*가보세요/g, '한 번 들러보는 것도 좋아요')
    .replace(/정말\s*추천(해요|드려요|드립니다)/g, '고려해볼 만해요')
    .replace(/혼자\s*검색만\s*하지\s*말고[,\s]*/g, '')
    .replace(/건강은\s*미루지\s*않는\s*게\s*최선이니까요!?/g, '')
    .replace(/건강은\s*미루지\s*않는\s*게\s*최선[이에요\.]*/g, '');

  // ③ 진료명+조사 직접 연결 — v2.0 비활성화
  // 사유: "진료명이 병원" 패턴이 자연 문장 ("이 진료를 받기 위해 병원을 찾았어요")
  // 의 일부를 잘라내며 깨짐 발생
  // if (treatmentName && treatmentName.length > 1) {
  //   const tn2 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  //   try {
  //     result = result.replace(new RegExp(tn2 + '\\s*이\\s+(병원|의원|치료|환자|소견|진단)', 'g'), '$1');
  //     result = result.replace(new RegExp(tn2 + '\\s*을\\s+(검사|진단|소견)', 'g'), '$1을');
  //   } catch(e) {}
  // }

  // ④ 추천/권유 반복 카운트 (전체 본문 기준 3회 초과 시 자연 표현으로 치환)
  const recPattern = /(추천(해요|드려요|드립니다)|권해요|권합니다|권장해요)/g;
  const recMatches = result.match(recPattern) || [];
  if (recMatches.length > 3) {
    let recCount = 0;
    result = result.replace(recPattern, (m) => {
      recCount++;
      if (recCount <= 2) return m;
      // 3번째부터는 자연 표현으로 치환
      const alt = ['고려해볼 만해요', '도움이 될 수 있어요', '한 번 알아볼 만해요'];
      return alt[(recCount - 3) % alt.length];
    });
  }

  // ─────────────────────────────────────────────
  // ★ v1.2 잔존 감점 4종 차단 — 사용자 89~91점 피드백 반영
  // ─────────────────────────────────────────────

  // ⑤ 키워드 따옴표 삽입 오류 — v2.0 비활성화
  // 사유: '"강남 소화기내과"에서' 강제 변환이 GPT의 자연스러운 검색어 강조를
  //   '"강남 소화기내과" 만성변비치료에서' 같은 깨진 문장으로 만듦
  // result = result
  //   .replace(/"([가-힣]+\s*[가-힣]+(?:내과|병원|의원))"\s*([가-힣])/g, '"$1"에서 $2')
  //   .replace(/"([^"]{2,15})"([가-힣]{2,})/g, '"$1" $2');

  // ⑥ 동일 단어 즉시 반복 — `대장 용종이 용종이` / `담석이 담석이` 같은 패턴
  //    한글 명사 + 조사 패턴이 연속 2회 반복되는 경우 1회로 압축
  result = result.replace(/([가-힣]{2,5})(이|가|을|를|은|는|의)\s+\1\2/g, '$1$2');
  // 명사 단독 즉시 반복 (`용종 용종` / `담석 담석`)
  result = result.replace(/([가-힣]{2,5})\s+\1(?=[\s가-힣])/g, '$1');

  // ⑦ "안녕하세요" 본문 중간 재등장 차단 — 첫 등장만 보존
  let greetingFound = false;
  result = result.replace(/안녕하세요[,!.\s]*/g, (m) => {
    if (!greetingFound) {
      greetingFound = true;
      return m;
    }
    return '';
  });
  // 마무리 섹션에 "안녕하세요" 있으면 무조건 제거 (본문 중간 재등장 패턴)
  result = result.replace(/\n\s*안녕하세요[,!.\s]*/g, '\n');

  // ⑧ 의료진 용어 / 갑작스런 전문용어 톤다운
  result = result
    .replace(/EMR\s*같은\s*복잡한\s*절차\s*없이/g, '간단한 시술로')
    .replace(/EMR\s*(같은|같이)/g, '내시경 절제 같은')
    .replace(/EMR을\s+받/g, '내시경 용종 절제를 받')
    .replace(/EMR로\s+제거/g, '내시경으로 제거')
    // 단독 EMR — 풀어쓰기
    .replace(/(?<![A-Za-z])EMR(?![A-Za-z])/g, '내시경 점막 절제')
    // 기타 갑작스런 전문용어
    .replace(/복잡한\s*절차\s*없이/g, '간단한 방식으로');

  // ⑨ 후반 CTA 추가 약화 — recPattern으로 잡지 못한 변형
  result = result
    .replace(/상담\s*받아보세요\.?/g, '상담받아보는 것도 방법이에요.')
    .replace(/확인해보시길\s*(권해요|권합니다|바라요|바랍니다)\.?/g, '확인해보는 것도 좋아요.')
    .replace(/한\s*번\s*확인해보시길\s*권해요\.?/g, '한 번 확인해보는 것도 좋아요.')
    .replace(/꼭\s*상담받아보세요\.?/g, '상담을 한 번 받아봐도 좋아요.');

  // ─────────────────────────────────────────────
  // ★ v1.3 — 84~87점 회귀 차단 (사용자 피드백 5종)
  // ─────────────────────────────────────────────

  // ⑩ 키워드 따옴표 삽입 버그 보강 — v2.0 비활성화
  // 사유: GPT의 자연스러운 검색어 강조('"강남 소화기내과"')를 보고
  //   '"강남 소화기내과" 만성변비치료에서' 처럼 진료명을 강제 삽입하여
  //   오히려 새 깨짐 생성. 따옴표 처리는 모두 OFF.
  // result = result
  //   .replace(/"([^"]{2,20})"\s+([가-힣](?:[가-힣\s]{0,14}[가-힣])?)에서\s*검색\S*/g,
  //            '"$1"로 검색하다가 $2 후기도 찾아봤어요')
  //   .replace(/"([^"]{2,15})"\s+([가-힣]{2,10})(에서|에|로|와|과)\s/g, '"$1"와 "$2"$3 ')
  //   ;
  const quoteCount = (result.match(/"/g) || []).length;
  if (quoteCount > 10) {
    // 마지막 등장 따옴표부터 제거 (앞쪽 검색 표현 보존)
    let removed = 0;
    const targetRemove = Math.floor((quoteCount - 10) / 2) * 2;
    result = result.split('').reverse().join('').replace(/"/g, (m) => {
      if (removed < targetRemove) { removed++; return ''; }
      return m;
    }).split('').reverse().join('');
  }

  // ⑪ 진료명+조사 패턴 — v2.0 비활성화 (정상 문장 파괴)
  // if (treatmentName && treatmentName.length > 1) {
  //   const tn3 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  //   const extraPatterns = [
  //     [`${tn3}\\s*이\\s+(약|치료|환자|케이스|증상|진단|상담|복용|복약)`, '$1'],
  //     [`${tn3}\\s*을\\s+(복용|시작|지속|유지)`, '약을 $1'],
  //     [`${tn3}\\s*이\\s+(에\\s*대해|에\\s*관해)`, '이$1'],
  //     [`${tn3}\\s*이\\s+찾아보`, '이 치료를 찾아보'],
  //   ];
  //   extraPatterns.forEach(([pat, rep]) => {
  //     try { result = result.replace(new RegExp(pat, 'g'), rep); } catch(e) {}
  //   });
  // }

  // ⑫ CTA 변형 누적 차단 — v1.1의 약한 표현이 누적된 케이스
  //    "검사받아보는 것도 방법" / "도움이 될 수 있어요" / "고려해볼 만해요" 등
  //    본문 통틀어 2회 초과 시 후반 등장분 자동 삭제
  const softCtaPattern = /([\s가-힣]*?)(검사받아보는\s*것도\s*방법이에요|상담받아보는\s*것도\s*방법이에요|확인해보는\s*것도\s*좋아요|상담을\s*한\s*번\s*받아봐도\s*좋아요|고려해볼\s*만해요|도움이\s*될\s*수\s*있어요|한\s*번\s*알아볼\s*만해요|도움이\s*될\s*거예요)\.?/g;
  const softMatches = result.match(softCtaPattern) || [];
  if (softMatches.length > 2) {
    let softCount = 0;
    result = result.replace(softCtaPattern, (m) => {
      softCount++;
      if (softCount <= 2) return m;
      // 3번째부터 문장 자체 삭제 (자연스럽게)
      return '';
    });
  }

  // ⑬ 의사 작위적 감정 묘사 차단 — `원장님이 기뻐하시더라고요` 등
  result = result
    .replace(/원장님이?\s*기뻐하(시|면서)?[더라고시는요\s]*[\.\,\s]*/g, '')
    .replace(/(원장님|의사\s*선생님)이?\s*만족(스러운|해)\s*표정/g, '')
    .replace(/(원장님|의사\s*선생님)이?\s*안도(하|의)/g, '')
    .replace(/(원장님|의사\s*선생님)이?\s*뿌듯해\s*하(시|는)/g, '')
    .replace(/(원장님|의사\s*선생님)이?\s*감동(하|받)/g, '');

  // ⑭ 정보글 톤 차단 — "~에 대해 찾아보면서 알게 된 건" 패턴 (정보 블럭 강요)
  //    이 패턴이 나오면 그 뒤 의학 설명이 따라오므로 도입 자체를 약화
  result = result
    .replace(/이\s*치료에\s*대해\s*찾아보면서\s*알게\s*된\s*건[데요,\s]*/g, '')
    .replace(/[가-힣\s]+에\s*대해\s*찾아보면서\s*알게\s*된\s*건[데요,\s]*/g, '');

  // ─────────────────────────────────────────────
  // ★ v1.6 — 88~90점 잔존 5종 차단 (사용자 피드백)
  // ─────────────────────────────────────────────

  // ⑮ 키워드 삽입 버그 보강 — v2.0 비활성화
  // 사유: v1.3 ⑩과 동일 패턴. GPT의 자연스러운 따옴표 강조를
  //   강제 변환하면서 새 깨짐 생성.
  // result = result
  //   .replace(/"([^"]{2,20})"\s+([가-힣]{2,15})에서\s+\2(와|과)\s*"([^"]{2,20})"/g,
  //            '"$1"와 "$4"를 함께 찾아봤어요. $2')
  //   .replace(/"([^"]{2,20})"\s+([가-힣]{2,15})에서\s+\2(?=[\s가-힣])/g,
  //            '"$1"로 검색하면서 $2');

  // ⑯ 진료명+조사 만능 보강 — v2.0 비활성화
  // 사유: 정상 문장 ("이 병원의 꼼꼼한 설명") 일부를 매칭하여 단어 누락 발생
  // if (treatmentName && treatmentName.length > 1) {
  //   const tn4 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  //   try {
  //     result = result.replace(new RegExp(tn4 + '\\s*이\\s+(병원|의원|원장님|선생님)\\s*의', 'g'), '이 $1의');
  //     result = result.replace(new RegExp(tn4 + '\\s*이\\s+(병원|의원)\\s*에서', 'g'), '이 $1에서');
  //     result = result.replace(new RegExp(tn4 + '\\s*을\\s+(시작하|결정하|받기로|진행하)', 'g'), '치료를 $1');
  //     result = result.replace(new RegExp(tn4 + '\\s*이\\s+(꼼꼼|친절|신속|정확)', 'g'), '$1');
  //   } catch(e) {}
  // }

  // ⑰ "여러분도 ~하세요" / "건강 챙기세요" — 명령형 마무리 차단
  //    GPT가 자체 출력하는 강한 CTA 패턴
  result = result
    // "여러분도 ~하세요" 형태 (느낌표 포함)
    .replace(/여러분도\s+(?:꾸준한\s*관리로\s+)?건강\s*챙기세요[!.]?/g, '')
    .replace(/여러분도\s+[가-힣\s]{2,15}하세요[!.]?/g, '')
    .replace(/여러분도\s+[가-힣\s]{2,15}바래요[!.]?/g, '')
    .replace(/여러분도\s+[가-힣\s]{2,15}바라요[!.]?/g, '')
    // "건강 챙기시길 바래요/바라요" 단독
    .replace(/건강\s*챙기시길\s*바[래라]요[!.]?/g, '')
    // "정기적인 검진과 ~로 건강 챙기시길" 도입형
    .replace(/(정기적인?\s*검진|정기\s*검진)[과와\s]*[가-힣\s]+으?로\s*건강\s*챙기[시는]?[길게]?\s*바[래라]요[!.]?/g, '');

  // ⑱ 병원 praise 보강 — "반갑게 맞아주" / "친절하게 안내" 같은 작위적 친절 묘사
  result = result
    // "원장님이 반갑게 맞아주시면서" → "원장님이 진료를 시작하시면서"
    .replace(/(원장님|의사\s*선생님|간호사님?)이?\s*(반갑게|환하게|밝게)\s*맞아주시면서/g, '$1이 진료를 시작하시면서')
    // "원장님이 반갑게 맞아주셨어요" → 삭제 (다음 문장으로 자연 연결)
    .replace(/(원장님|의사\s*선생님|간호사님?)이?\s*(반갑게|환하게|밝게)\s*맞아주(셨어요|시더라고요|시는데)[\.\,\s]*/g, '')
    // 일반 케이스
    .replace(/(원장님|의사\s*선생님|간호사님?)이?\s*(반갑게|환하게|밝게)\s*맞아주(시|면서|는)?[\.\,\s]*/g, '$1이 ')
    .replace(/(원장님|의사\s*선생님)이?\s*(친절하게|상냥하게)\s*(안내|설명|응대)/g, '$1이 $3')
    .replace(/(원장님|의사\s*선생님)이?\s*다정하(게|시)/g, '');

  // ⑲ 일반 키워드 3회 초과 반복 차단 — "위암 전구 단계" 같은 비-진료명 키워드
  //    진료명만 카운트하던 v1.0 로직 보강. 자주 반복되는 의학 용어 5개 추적
  const REPEAT_GUARD_KEYWORDS = [
    '위암 전구 단계', '위암전구단계',
    '추적 내시경', '추적내시경',
    '제균 치료', '제균치료',
    '발적 소견',
    '경과 관찰', '경과관찰',
  ];
  REPEAT_GUARD_KEYWORDS.forEach(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'g');
    const matches = result.match(re) || [];
    if (matches.length > 2) {
      let cnt = 0;
      result = result.replace(re, (m) => {
        cnt++;
        // 첫 2회만 보존, 3번째부터 대명사/축약 표현으로 치환
        if (cnt <= 2) return m;
        if (kw.includes('전구 단계') || kw.includes('전구단계')) return '이 단계';
        if (kw.includes('추적')) return '정기 검사';
        if (kw.includes('제균')) return '치료';
        if (kw.includes('발적')) return '소견';
        if (kw.includes('경과')) return '추적';
        return '';
      });
    }
  });

  // ─────────────────────────────────────────────
  // ★ v1.7 — 진료명+조사 만능 보강 (B+A 통합)
  // 시스템 프롬프트로 90% 차단 + 후처리로 잔존 10% 정리
  // ─────────────────────────────────────────────
  // ─────────────────────────────────────────────
  // ★ v2.0 — 진료명+조사 만능 보강 (Pattern A~H) 통째 비활성화
  // 사유: Pattern G("있는 + 진료명이 + 명사" → 명사만 남김) 가
  //   "청담에 있는 대장내시경이 소화기내과를" → "청담에 있는 소화기내과를"
  //   처럼 정상 문장의 진료명을 통째로 삭제. Pattern A~F 도 동일 문제.
  //   조사 오류는 위쪽 [받침 판별 기반 안전 교정]에서만 처리.
  // ─────────────────────────────────────────────
  /*
  if (treatmentName && treatmentName.length > 1) {
    const tn5 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const PLACE_NOUNS = '병원|의원|소화기내과|내과|클리닉|센터|진료실|검사실|회복실';
    try {
      result = result.replace(new RegExp(`${tn5}\\s*(이|가)\\s+(${PLACE_NOUNS})`, 'g'), '이 $2');
    } catch(e) {}
    const MEDICAL_NOUNS = '용종|선종|결과|소견|판독|증상|진단|결과|수치|결과지|보고서|영상|사진|이력|기록';
    try {
      result = result.replace(new RegExp(`${tn5}\\s*(이|가)\\s+(${MEDICAL_NOUNS})`, 'g'), '$2');
    } catch(e) {}
    const ABSTRACT_NOUNS = '말|말씀|설명|이야기|얘기|대화|상담';
    try {
      result = result.replace(new RegExp(`${tn5}\\s*(이|가)\\s+(${ABSTRACT_NOUNS})에\\s*[.,]?\\s*`, 'g'), '원장님 $2에 ');
      result = result.replace(new RegExp(`${tn5}\\s*(이|가)\\s+(${ABSTRACT_NOUNS})에\\s+`, 'g'), '원장님 $2에 ');
    } catch(e) {}
    const ADJECTIVES = '꼼꼼|친절|신속|정확|신중|상세|자세|편안|편리';
    try {
      result = result.replace(new RegExp(`${tn5}\\s*(이|가)\\s+(${ADJECTIVES})`, 'g'), '$2');
    } catch(e) {}
    const ABSTRACT_VERBS = '시작|결정|받기로|진행|선택|결심';
    try {
      result = result.replace(new RegExp(`${tn5}\\s*을\\s+(${ABSTRACT_VERBS})하`, 'g'), '치료를 $1하');
      result = result.replace(new RegExp(`${tn5}\\s*를\\s+(${ABSTRACT_VERBS})하`, 'g'), '치료를 $1하');
    } catch(e) {}
    const QUALITY_NOUNS = '꼼꼼한|친절한|정확한|상세한|편안한';
    try {
      result = result.replace(new RegExp(`${tn5}\\s*의\\s+(${QUALITY_NOUNS})`, 'g'), '이 진료의 $1');
    } catch(e) {}
    try {
      result = result.replace(new RegExp(`있는\\s+${tn5}\\s*(이|가)\\s+([가-힣]{2,10})`, 'g'), '있는 $2');
    } catch(e) {}
    try {
      result = result.replace(new RegExp(`(["\u201c\u201d])([^"\u201c\u201d]+)\\1\\s*(라고|이라고|하고)?\\s*${tn5}\\s*(이|가)\\s+`, 'g'), '$1$2$1라고 원장님이 ');
    } catch(e) {}
  }
  */

  // ㉑ 인용문 + 빈 마침표 잔재 정리 — `"~"이 말에 .` 패턴
  result = result
    .replace(/이?\s*말에\s*\.\s*/g, '말씀에 ')
    .replace(/(?:이|가)?\s*말씀에\s*\.\s*/g, '말씀에 ')
    .replace(/\s*\.\s*\s*/g, '. '); // 마침표 사이 공백 정리

  // ㉒ "1인칭 다짐 중복" — 같은 의미 다짐 2회 등장 시 후반 제거
  //   "식이 관리도 계속할 생각이에요. ... 저도 꾸준히 건강 관리에 힘쓰려고 해요."
  const COMMITMENT_PATTERNS = [
    /저도?\s*꾸준히\s*[가-힣\s]{2,15}(?:하|힘쓰)려고\s*해요\.?/g,
    /[가-힣\s]{2,15}(?:관리|노력|실천)[을를]?\s*계속할\s*(?:생각|예정)이에요\.?/g,
    /앞으로[도는]?\s*[가-힣\s]{2,15}하려고\s*해요\.?/g,
  ];
  COMMITMENT_PATTERNS.forEach(re => {
    const matches = result.match(re) || [];
    if (matches.length >= 2) {
      let cnt = 0;
      result = result.replace(re, (m) => {
        cnt++;
        return cnt === 1 ? m : '';
      });
    }
  });

  // ─────────────────────────────────────────────
  // ★ v2.0 — 사용자 피드백 5종 강화 처리
  // ─────────────────────────────────────────────

  // [V2-1] "수면 증상" 표현 오류 → "수면내시경"
  result = result
    .replace(/수면\s+(증상이?\s*있다는|이라는|이라고)/g, '수면내시경 $1')
    .replace(/수면\s+증상/g, '수면내시경')
    .replace(/수면\s+(받았|받기|받을|받아)/g, '수면내시경을 $1');

  // [V2-2] "섬세한 관리 덕분인지" 등 GPT 감성 표현 통째 삭제
  const aiSentences = [
    /[^.!?\n]*섬세한\s*관리\s*덕분[인지에은\s]*[^.!?\n]*[.!?]/g,
    /[^.!?\n]*믿음이\s*가는\s*분위기[^.!?\n]*[.!?]/g,
    /[^.!?\n]*따뜻한\s*분위기[^.!?\n]*[.!?]/g,
    /[^.!?\n]*마음이\s*편안해졌[^.!?\n]*[.!?]/g,
  ];
  for (const re of aiSentences) result = result.replace(re, '');

  // [V2-3] 후반 약한 CTA 표현 잔존 — 본문 통틀어 1회만 보존
  // v2.1.1: 변형 패턴 추가 (방문해보셔도 / 도움이 될 수 / 좋을 것 같아요)
  const weakCtaRe = /(상담해보는\s*것도\s*좋아요|상담해보는\s*것도\s*좋(을\s*것\s*같아요|아요)?|고려해볼\s*만(해요|하다)?|방법이에요|방문해보(셔도|시는\s*것도)\s*좋(을\s*것\s*같아요|아요)?|도움이\s*될\s*수\s*있)\.?/g;
  const weakMatches = result.match(weakCtaRe) || [];
  if (weakMatches.length > 1) {
    let wcCount = 0;
    result = result.replace(weakCtaRe, (m) => {
      wcCount++;
      return wcCount === 1 ? m : '';
    });
  }

  // [V2-4] 따옴표 직후 키워드 직접 결합 분리 — v2.1.1 강화
  // 케이스 A: "조기"대장내시경 → "조기" 대장내시경
  // 케이스 B: 안전하다"대장내시경는 → 안전하다." 대장내시경은
  // 케이스 C (신규): "압구정 소화기내과"기능성 소화불량 → "압구정 소화기내과" 기능성 소화불량
  //                  닫는 따옴표 직후 한글 (키워드뿐 아니라 일반 명사도)
  if (treatmentName && treatmentName.length > 1) {
    const tn6 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      // 따옴표 + 키워드 (공백 없이 붙음) → 공백 삽입
      result = result.replace(new RegExp(`(["\u201c\u201d])(${tn6})`, 'g'), '$1 $2');
      // 한글 + 따옴표 + 키워드 → 한글 + 마침표 + 따옴표 + 공백 + 키워드
      result = result.replace(new RegExp(`([가-힣])(["\u201c\u201d])(${tn6})`, 'g'), '$1.$2 $3');
    } catch(e) {}
  }
  // 케이스 C: v2.1.2 비활성화
  // 사유: '"성수 소화기내과"과민성대장증후군' 같은 패턴을 잡으려 했으나
  //   "과"가 조사 화이트리스트에 있어 보존 → 처리 실패
  //   더 큰 문제: 정상 한글 결합('A"B' 같은 일반 케이스)을 망가뜨림
  // result = result.replace(/([가-힣])(["\u201c\u201d])([가-힣])/g, (m, a, q, b) => {
  //   if ('은는이가을를과와도만에으로'.includes(b)) return m;
  //   return `${a}${q} ${b}`;
  // });

  // [V2-5] 키워드 + "에서 " + 동일 키워드 패턴 정리
  // "압구정 소화기내과 대장내시경에서 대장내시경를" → "압구정 소화기내과에서 대장내시경을"
  if (treatmentName && treatmentName.length > 1) {
    const tn7 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      result = result.replace(new RegExp(`${tn7}에서\\s+${tn7}`, 'g'), `에서 ${treatmentName}`);
    } catch(e) {}
  }

  // [V2-7] "진료명 덕분에" → "치료 덕분에" 자연 표현
  // 단순 매칭이라 안전. 진료명을 주어처럼 쓴 명백한 케이스만 처리.
  if (treatmentName && treatmentName.length > 1) {
    const tn8 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      result = result.replace(new RegExp(`${tn8}\\s*덕분에`, 'g'), '치료 덕분에');
    } catch(e) {}
  }

  // [V2-8] v2.1.2 비활성화 — 너무 위험
  // 사유 1: 진료명에 지역명/접두어가 결합되면("성수 + 과민성대장증후군") 지역명 손상
  //   → "성대장증후군" 같은 변형 글자 발생
  // 사유 2: GPT가 진료명을 주어로 쓰는 빈도가 낮음. 잡는 이득 < 잃는 위험
  // 사유 3: 진료명+조사 패턴 처리는 v2.0의 [받침 판별 안전 교정]만으로 충분
  // 잔여 패턴은 프롬프트에서 차단:
  //   - "진료명을 주어로 쓰지 마라"
  //   - "지역명+진료명 직접 결합 금지"
  /*
  if (treatmentName && treatmentName.length > 1) {
    const tn9 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      result = result
        .replace(new RegExp(`${tn9}\\s*(이|가)\\s+(검사|진료|진단|치료|상담|수치|결과|소견)`, 'g'), '이 $2');
      result = result
        .replace(new RegExp(`${tn9}\\s*(이|가)\\s+(병원|의원|소화기내과|내과|클리닉|센터)`, 'g'), '$2');
      result = result
        .replace(new RegExp(`${tn9}\\s*(이|가)\\s+(변화|효과|도움|방법|경험|개선|호전)`, 'g'), '치료가 $2');
      result = result
        .replace(new RegExp(`${tn9}\\s*(이|가)\\s+(권해|권하|돕|돕고|도와)`, 'g'), '치료가 $2');
    } catch(e) {}
  }
  */

  // [V2-9] 후반 약한 CTA 추가 차단
  // "도움이 될 수 있을 것 같아요" / "다짐을 하게 됐어요" 등
  result = result
    .replace(/도움이\s*될\s*수\s*있을\s*것\s*같아요\.?/g, '도움이 됐어요.')
    .replace(/[가-힣\s]{2,15}\s*다짐을?\s*하게\s*됐어요\.?/g, '')
    .replace(/긍정적인\s*변화를\s*경험하고\s*나니[,\s]*/g, '');

  // [V2-6] 공백 정리 마무리
  result = result
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.!?])/g, '$1')
    .replace(/\.{2,}/g, '.');

  // ─────────────────────────────────────────────────────
  // ★ v3.0 Phase A 후처리 (ortho v3.7.5 패턴 이식)
  //   BB-1 키워드 절단 복원 / BB-6 토큰 절단 / BB-7 부유 '이'
  //   치료형·검사형 중복 / GG-1 fossil 회피어
  // ─────────────────────────────────────────────────────
  if (treatmentName && treatmentName.length > 1) {
    const tnE = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // BB-7: "치료명 + 이 + 치료/검사 + 조사" → "치료명 + 조사"
    try {
      result = result.replace(
        new RegExp(`${tnE}\\s+이\\s+(치료|검사|진료|시술)(을|를|은|는|이|가|의|에|에서|로|으로)`, 'g'),
        `${treatmentName}$2`
      );
    } catch(e) {}

    // 치료형 중복: "치료명 치료 + 조사" → "치료명 + 조사" (치료명이 "치료"로 끝날 때만)
    if (/치료$/.test(treatmentName)) {
      try {
        result = result.replace(
          new RegExp(`${tnE}\\s+치료(을|를|은|는|이|가|의|에|로|으로)`, 'g'),
          `${treatmentName}$1`
        );
      } catch(e) {}
    }

    // 검사형 중복: "치료명 검사 + 조사" 의미 충돌 차단 (치료명이 "검사"로 끝날 때만)
    if (/검사$/.test(treatmentName)) {
      try {
        result = result.replace(
          new RegExp(`${tnE}\\s+검사(을|를|은|는|이|가|의)`, 'g'),
          `${treatmentName}$1`
        );
      } catch(e) {}
    }
  }

  // GG-1: fossil 회피어 (해당/이번 + 치료/시술/방법 → 이 + 동일)
  result = result
    .replace(/해당\s+(치료|시술|방법|검사|진료)/g, '이 $1')
    .replace(/이번\s+(치료|시술|방법|검사|진료)/g, '이 $1');

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

// ── 회복 타임라인 자동 삽입 ──────────────────────────────
function insertGastroTimeline(text, treatmentName) {
  const hasTimeline = /일차|일째|주일|개월|D\+/.test(text);
  if (!hasTimeline) return text;
  const isEndoscopy   = /내시경/.test(treatmentName);
  const isLiverDisease = /간경변|간염|지방간/.test(treatmentName);
  const w1Note = isEndoscopy    ? '내시경 부위 불편감 소실, 식이 정상화'
               : isLiverDisease ? '수치 재검사, 생활 교정 유지'
               : '증상 대부분 완화, 약물 지속';
  const timeline = `\n\n**경과 요약**\n- 당일~1일차: 검사·처치 후 회복, 식이 제한\n- 1주일차: ${w1Note}\n- 1개월차: 재검사 수치 확인\n- 3개월차: 일상 완전 회복`;
  return text.trimEnd() + timeline;
}

// ── 추천 대상 맵 ─────────────────────────────────────────
const GASTRO_REC_MAP = {
  '위내시경':              ['속쓰림·소화불량이 2주 이상 지속되는 경우', '40세 이상 위암 가족력이 있는 경우'],
  '대장내시경':            ['50세 이상 대장암 스크리닝이 필요한 경우', '혈변·배변 습관 변화가 있는 경우'],
  '역류성 식도염':         ['취침 시 신물·가슴 통증이 반복되는 경우', 'PPI 약물 복용 후 재발이 반복되는 경우'],
  '헬리코박터 제균치료':   ['위내시경에서 HP 양성 판정을 받은 경우', '위궤양·위암 가족력이 있는 경우'],
  '위궤양·십이지장궤양':   ['공복 명치 통증이 반복되는 경우', '검은 변(흑색변)이 있는 경우'],
  '과민성대장증후군':       ['3개월 이상 반복되는 복통·설사·변비 패턴이 있는 경우', '대장내시경 정상인데도 증상이 계속되는 경우'],
  '염증성 장질환(크론병·궤양성 대장염)': ['혈변·점액변이 반복되는 경우', '체중 감소·발열·야간 설사가 동반되는 경우'],
  '지방간':                ['건강검진에서 지방간·ALT 상승 소견을 받은 경우', '복부 비만·당뇨가 동반된 경우'],
  '바이러스 간염(B형·C형)': ['B형 간염 보유자로 정기 검사가 필요한 경우', 'C형 간염 진단을 받고 치료를 고려하는 경우'],
  '간경변':                ['만성 간 질환으로 정기 추적이 필요한 경우', '복수·황달 등 합병증이 발생한 경우'],
  '담석·담낭염':           ['복부 초음파에서 담석 소견을 받은 경우', '식후 우상복부 통증이 반복되는 경우'],
  '췌장염':                ['음주 후 명치~등 통증이 반복되는 경우', '혈중 리파아제·아밀라아제 이상 진단을 받은 경우'],
  '기능성 소화불량':        ['식사 후 더부룩함이 3개월 이상 지속되는 경우', '위내시경 정상인데도 소화불량이 반복되는 경우'],
  '대장 용종':             ['대장내시경에서 용종 제거 이력이 있는 경우', '대장암·용종 가족력이 있는 경우'],
  '복부 초음파':           ['40대 이상 복부 장기 건강 확인이 필요한 경우', '건강검진에서 지방간·담석 소견을 받은 경우'],
  // ★ v1.4 — gastro-data.js v1.1 신규 7개 진료
  '수면내시경':            ['내시경 검사에 대한 두려움이 큰 경우', '일반 내시경에서 구역질·통증으로 검사가 어려웠던 경우'],
  '위암 검진':             ['40세 이상으로 위암 정기 검진이 필요한 경우', '위암 가족력·헬리코박터 보균자로 고위험군인 경우'],
  '대장암 검진':           ['50세 이상으로 대장암 정기 검진이 필요한 경우', '대장암 가족력으로 30~40대부터 검진이 필요한 경우'],
  '치질·치핵치료':         ['항문 출혈·통증·이물감이 1주 이상 지속되는 경우', '보존 치료(좌욕·연고)로 효과가 부족한 경우'],
  '만성변비치료':          ['주 3회 미만 배변·잔변감이 6개월 이상 지속되는 경우', '시판 변비약 의존도가 높아져 근본 치료가 필요한 경우'],
  '장상피화생':            ['위내시경에서 장상피화생 진단을 받은 경우', '헬리코박터 제균이 필요한 고위험군인 경우'],
  '위·식도 정맥류':        ['간경변 진단으로 정맥류 추적 검사가 필요한 경우', '토혈·흑색변 등 정맥류 출혈이 의심되는 경우'],
};

// ============================================================
// ★ v3.0 — GASTRO_PHOTO_POOL 5종 (ortho v3.7.5 패턴 이식)
// 소화기내과 맥락: 검사·상담·시술·치료·일상
// ============================================================
const GASTRO_PHOTO_POOL = {
  "검사 사진": [
    { spot: "위내시경 검사 화면 — 결과 영상",         caption: "검사 결과 영상 같이 본 자리" },
    { spot: "대장내시경 영상 판독실",                 caption: "용종 위치 확인하던 화면" },
    { spot: "복부 초음파 결과 모니터",                caption: "간·담낭 상태 보이던 화면" },
    { spot: "혈액검사 결과지",                        caption: "간수치·염증수치 확인하던 자리" },
    { spot: "검사실 입장 전 대기 베드",               caption: "검사 직전 누워 있던 자리" },
  ],
  "상담 사진": [
    { spot: "상담실 진료 데스크",                     caption: "증상 메모 펼쳐 놓고 설명 들은 자리" },
    { spot: "치료 옵션 안내 차트",                    caption: "약물치료·내시경 비교 설명 받던 화면" },
    { spot: "진료실 입구",                            caption: "처음 들어가던 순간" },
    { spot: "원장님 설명용 모형",                     caption: "위·장 구조 짚어가며 설명해주신 자리" },
    { spot: "검진 결과지 같이 본 책상",               caption: "수치 하나하나 같이 본 자리" },
  ],
  "시술 사진": [
    { spot: "내시경실 입장 전 복도",                  caption: "검사 직전 마지막으로 걸은 길" },
    { spot: "수면내시경 회복실",                      caption: "검사 마치고 깨어난 자리" },
    { spot: "처치실 진료 의자",                       caption: "주사·시술 처치 받던 자리" },
    { spot: "내시경 장비 옆 진료대",                  caption: "시술 직전 안내 받던 자리" },
    { spot: "용종 절제 직후 회복실",                  caption: "처치 마치고 안정 취하던 자리" },
  ],
  "치료 사진": [
    { spot: "처방약 받던 데스크",                     caption: "약 받던 날 — 복용법 안내" },
    { spot: "식이요법 안내 자료",                     caption: "식단 관리 안내 받던 자리" },
    { spot: "제균치료 약 패키지",                     caption: "1~2주 복용분 받던 순간" },
    { spot: "검사 결과 설명 책상",                    caption: "치료 방향 같이 정리한 자리" },
    { spot: "약 복용 일정표",                         caption: "아침·저녁 복용 일정 정리한 메모" },
  ],
  "일상 사진": [
    { spot: "회복 후 가벼운 식사",                    caption: "회복 후 첫 식사 — 죽으로 시작" },
    { spot: "동네 산책길 — 가볍게 걷던 길",           caption: "검사 다음 날 가볍게 걷던 길" },
    { spot: "평소 식단으로 복귀한 식탁",              caption: "평범한 식사 다시 시작한 자리" },
    { spot: "약 챙겨 먹던 아침 식탁",                 caption: "아침마다 약 먹던 자리" },
    { spot: "물 자주 마시던 책상 위 컵",              caption: "회복 기간 물 자주 마시던 자리" },
  ],
};

function buildGastroPhotoPlaceholder(altRaw) {
  const alt = String(altRaw || "").trim();
  const pool = GASTRO_PHOTO_POOL[alt];
  if (!pool || pool.length === 0) return null;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return `[📷 추천 사진: ${alt}]\n   • 어디서: ${pick.spot}\n   • 캡션: ${pick.caption}`;
}

// 박스 제외 글자수 계산 (placeholder는 본문 글자수에서 제외)
function calcGastroCharCount(text) {
  if (!text) return 0;
  const withoutBox = text.replace(/\[📷 추천 사진:[\s\S]*?(?=\n\n|\n[가-힣A-Z]|$)/g, "");
  return calcCharCount(withoutBox);
}

// ============================================================
// ★ v2 패치: stripMarkdownForNaver — 네이버 블로그 복사용 평문 변환
// 목적: 사용자가 글 복사 후 #/##/### 마크다운 기호를 수동 제거하지 않도록
// 네이버는 마크다운 렌더링 안 함 → 평문으로 변환 필요
// 위치: 모든 후처리 끝난 뒤 마지막 단계 (응답 직전)
// ★ v3.0 — [이미지: alt] → 박스 placeholder 변환 추가
// ============================================================
// ★ v3.0.3 patch: stripMarkdownForNaver — semi-migration
// 헤더/마크다운 변환은 공통 모듈(_stripMarkdownForNaver) 위임 (photoPool=null → 박스 변환 skip)
// 박스 placeholder 변환은 gastro 전용 후처리로 분리 (3줄 인라인 형식 보존)
// ★ gastro 특수성: 박스 변환 → 헤더 변환 순서 유지 (다른 업종과 반대)
// ★ fallback `|| [이미지: alt]` 유지 (gastro 전용)
// 목적: 사용자가 글 복사 후 #/##/### 마크다운 기호를 수동 제거하지 않도록
// 네이버는 마크다운 렌더링 안 함 → 평문으로 변환 필요
// 위치: 모든 후처리 끝난 뒤 마지막 단계 (응답 직전)
// ============================================================
function stripMarkdownForNaver(text) {
  let t = text;

  // ★ [OneClick] 이미지 마커 통일 — [이미지: alt] 표준 유지. 박스 변환 비활성.
  //    QC의 boxCount=0 / plainNoBox==plain 은 정상(로그 전용, 차단 아님).
  // (구) gastro 전용 인라인 변환 — 비활성. buildGastroPhotoPlaceholder는 롤백용 보존.

  // 헤더/마크다운 변환 공통 모듈 위임 (photoPool=null → 박스 변환 skip)
  t = _stripMarkdownForNaver(t, null);

  // 연속 빈 줄 압축 (3줄 이상 → 2줄)
  t = t.replace(/\n{3,}/g, "\n\n");

  return t;
}

// ============================================================
// 메인 핸들러
// ============================================================
export default async function handleGastro(req, res) {
  const { target, blogType, userRegion, userMemo, overrideTitle, storeId } = req.body;
  let program = req.body.program;

  let subKw       = program.name || '';
  const region     = (userRegion || '강남').trim();
  const blogTypeId = blogType?.id || 'review';
  const industry   = 'gastro'; // 절대 고정

  // ── 소화기내과 진료 검증 (v3.0 동적 whitelist — GASTRO_TREATMENTS 참조) ─
  const GASTRO_IDS   = GASTRO_TREATMENTS.map(t => t.id);
  const GASTRO_NAMES = GASTRO_TREATMENTS.map(t => t.name);

  // ★ v3.0 — 부위 흡수 규칙 (router에서 미등록 카드 들어와도 fallback 처리)
  // 소화기내과 맥락: 위/장/간/담췌/항문 5계열
  const ABSORB_RULES = [
    { match: /위염|위산|역류|식도염|속쓰림/,           targetId: 'gerd',           targetName: '역류성 식도염' },
    { match: /헬리코박터|제균|hp/i,                     targetId: 'helicobacter',   targetName: '헬리코박터 제균치료' },
    { match: /궤양|십이지장/,                            targetId: 'peptic_ulcer',   targetName: '위궤양·십이지장궤양' },
    { match: /과민성|ibs|장증후군/i,                    targetId: 'ibs',            targetName: '과민성대장증후군' },
    { match: /크론|궤양성대장염|염증성장|ibd/i,         targetId: 'ibd',            targetName: '염증성 장질환(크론병·궤양성 대장염)' },
    { match: /지방간|간수치|간기능/,                    targetId: 'fatty_liver',    targetName: '지방간' },
    { match: /b형간염|c형간염|간염|바이러스간/i,        targetId: 'hepatitis',      targetName: '바이러스 간염(B형·C형)' },
    { match: /담석|담낭|쓸개/,                           targetId: 'gallstone',      targetName: '담석·담낭염' },
    { match: /췌장|아밀라아제|리파아제/,                targetId: 'pancreatitis',   targetName: '췌장염' },
    { match: /소화불량|더부룩|기능성/,                  targetId: 'dyspepsia',      targetName: '기능성 소화불량' },
    { match: /용종|폴립/,                                targetId: 'colon_polyp',    targetName: '대장 용종' },
    { match: /치질|치핵|항문/,                           targetId: 'hemorrhoid',     targetName: '치질·치핵치료' },
    { match: /변비/,                                     targetId: 'chronic_constipation', targetName: '만성변비치료' },
  ];

  let isGastroTreatment = GASTRO_IDS.includes(program.id) || GASTRO_NAMES.includes(subKw);
  let absorbedProgram = program;
  let absorbedSubKw   = subKw;

  if (!isGastroTreatment) {
    // 부위 흡수 시도
    const probe = `${program.id || ''} ${subKw}`;
    const rule = ABSORB_RULES.find(r => r.match.test(probe));
    if (rule) {
      console.log(`[gastro] 부위 흡수: "${subKw}" → "${rule.targetName}"`);
      absorbedProgram = { ...program, id: rule.targetId, name: rule.targetName };
      absorbedSubKw   = rule.targetName;
      isGastroTreatment = true;
    } else {
      // fallback → 위내시경 (소화기내과 가장 일반)
      console.log(`[gastro] 부위 흡수 실패 → fallback: "${subKw}" → "위내시경"`);
      absorbedProgram = { ...program, id: 'gastroscopy', name: '위내시경' };
      absorbedSubKw   = '위내시경';
      isGastroTreatment = true;
    }
  }
  // 흡수 결과를 이후 로직에 반영
  program = absorbedProgram;
  subKw   = absorbedSubKw;
  console.log(`[gastro] 진료 검증 통과: ${subKw}`);

  const treatmentData = GASTRO_TREATMENTS.find(t => t.id === program.id || t.name === program.name) || GASTRO_TREATMENTS[0];
  const seoData = { ...treatmentData };
  if (seoData.keywords)      seoData.keywords      = seoData.keywords.map(k => k.replace(/\{region\}/g, region));
  if (seoData.titlePatterns) seoData.titlePatterns = seoData.titlePatterns.map(t => t.replace(/\{region\}/g, region));

  // ── ★ v1.5: 제목을 먼저 만들고 타입 감지 → systemPrompt 동기화 ──
  let title = overrideTitle || buildGastroTitle(subKw, region, seoData, blogTypeId);
  const GASTRO_TITLE_BLOCK = /쌍꺼풀|눈매|리프팅|울쎄라|필러|보톡스|성형외과|임플란트|소아과/;
  if (GASTRO_TITLE_BLOCK.test(title)) title = `${region} 소화기내과 ${subKw} 후기｜검사부터 결과까지 솔직하게`;
  if (!title.includes(subKw) && !title.includes('소화기')) title = `${region} 소화기내과 ${subKw} 후기｜처음 받아보니 이랬어요`;

  const titleType = detectTitleType(title);
  const typeGuide = getTypeGuide(titleType, subKw);
  console.log(`[gastro] 제목: "${title}" | 타입: ${titleType}`);

  // ── 시스템 프롬프트 (타입별 가이드 주입) ──
  const systemPrompt = `당신은 ${region}에 사는 성인입니다. 소화기내과 방문 경험을 1인칭 블로그 후기로 작성합니다.
업종: 소화기내과 | 진료: ${subKw} | 지역: ${region}
[제목] ${title}${typeGuide}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 가장 중요한 4가지 규칙 — 이것만 지켜도 글 품질 80% 결정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【규칙 1】 "${subKw}이/가 + 명사" 패턴 절대 금지
   ※ 주어든 소유격이든 어떤 의도든 무조건 금지
   
   ✗ "${subKw}이 소화기내과" / "${subKw}이 병원" / "${subKw}이 선택"
   ✗ "${subKw}이 저에게 맞을지" / "${subKw}이 검사" / "${subKw}이 약"
   ✗ "${subKw}이 효과" / "${subKw}이 변화" / "${subKw}이 도움"
   ✗ "${subKw}이 증상" (※ 같은 의미라도 이 패턴 자체 금지)
   
   ✓ "이 진료" / "이 검사" / "이 치료" / "그 검사"
   ✓ "${subKw} 검사를 받았어요" (단순 명사 사용은 OK)
   ✓ "${subKw} 결과 5mm 용종이..." (수식어로만 사용)
   
   👉 진료명 다음에 "이/가"가 절대 오면 안 됩니다.

【규칙 2】 같은 문장 내 "${subKw}" 2회 반복 금지
   ✗ "${subKw} 검사를 받고 ${subKw} 결과를..."
   ✓ "${subKw} 검사를 받고 결과를..."
   → 두 번째는 "이 검사" "검사 결과" "그 결과"로

【규칙 3】 인용문은 반드시 "~라고 하셨어요" 종결어로 닫기
   ✗ 원장님이 "관리가 (← 종결어 누락)
   ✓ 원장님이 "식이와 운동으로 관리가 가능합니다" 라고 하셨어요

【규칙 4】 따옴표("") 직후 반드시 공백, 키워드 직접 결합 절대 금지
   ✗ '"${region} 소화기내과"${subKw}'
   ✗ '"저FODMAP"${subKw}' (검색어 직후 키워드 붙이지 마라)
   ✗ '"안전하다"${subKw}는' (인용문 닫고 바로 키워드)
   
   ✓ '"${region} 소화기내과"로 검색해봤어요. ${subKw} 잘하는 곳을...'
   ✓ '"저FODMAP" 식이요법을 시도해봤는데, ${subKw} 증상이...'
   
   👉 따옴표 닫은 뒤엔 조사("는/이/도") 또는 공백 + 새 표현이 와야 합니다.
   👉 검색 키워드를 따옴표 안에 묶었다면, 그 뒤엔 ${subKw}을 직접 붙이지 말고 새 문장으로.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[기본 규칙]
- ~했어요, ~더라고요 블로그 구어체 | 1인칭 "저는/제가" 포함
- 검사 수치 or 구체적 소견 최소 1개 포함 (ALT·내시경 소견 등)
- 의사 말 간접 인용 1회 이상
- 성형외과·피부과·치과·비뇨기과·소아과 표현 일절 금지
- "첫째/둘째/셋째", "중요합니다", "살펴보겠습니다", "결론적으로" 금지
- 지역명("${region}")과 진료명("${subKw}")을 직접 결합하지 말 것
  ✗ "${region}${subKw}" / "${region}${subKw}는"
  ✓ "${region}에 있는 소화기내과에서 ${subKw}"
- 제목과 본문 톤 일치 필수: 제목 타입 가이드 우선`;

  // ── 섹션별 순차 생성 ─────────────────────────────────────
  const SECTIONS = GASTRO_FLOW_ENGINE.sections;
  const sectionTexts = {};
  let prevTextRaw = '';

  for (const sec of SECTIONS) {
    const richPrompt = buildGastroPrompt(sec.key, treatmentData, region);
    const prevBlock  = prevTextRaw ? `\n[이미 작성된 내용 — 반복 금지]\n${prevTextRaw}\n[끝]\n` : '';
    const userPrompt = `업종: gastro | 키워드: ${subKw} | 지역: ${region}
${prevBlock}
---
[현재 섹션: ${sec.label} (${sec.key})]
⚠️ 이 섹션만 작성. 타 업종 표현 금지. 반드시 200자 이상.
${richPrompt}`;

    let secText = await generateSection({ systemPrompt, userPrompt });
    secText = cleanGastroText(secText, subKw);
    secText = stripInlineImages(secText);
    secText = restoreKeyword(secText, subKw);

    if (calcCharCount(secText) < 100) {
      let retry = await generateSection({ systemPrompt, userPrompt: `${userPrompt}\n\n[중요] 반드시 200자 이상 실제 내용으로 작성하세요.`, temperature: 0.72 });
      retry = cleanGastroText(retry, subKw);
      retry = stripInlineImages(retry);
      retry = restoreKeyword(retry, subKw);
      if (calcCharCount(retry) > calcCharCount(secText)) secText = retry;
    }
    console.log(`[gastro] ${sec.label}: ${calcCharCount(secText)}자`);
    sectionTexts[sec.key] = secText;
    prevTextRaw += '\n' + secText;
  }

  // ── 이미지 ALT ───────────────────────────────────────────
  // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
  //   풀: 검사 / 상담 / 시술 / 처방 / 일상
  const GASTRO_ALT_POOL = ["검사 사진", "상담 사진", "시술 사진", "처방 사진", "일상 사진"];
  const _GASTRO_ALT_BY_KEY = {
    concern:  "일상 사진",
    search:   "상담 사진",
    consult:  "검사 사진",
    decision: "상담 사진",
    reason:   "상담 사진",
    progress: "시술 사진",
    result:   "처방 사진",
    closing:  "일상 사진",
  };
  const altList = SECTIONS.slice(0, 5).map(sec => {
    const label = _GASTRO_ALT_BY_KEY[sec.key] || "상담 사진";
    return `[이미지: ${label}]`;
  });

  // ── 조립 ─────────────────────────────────────────────────
  // (제목·타입은 systemPrompt 빌드 시점에 이미 결정됨 — title, titleType 변수 재사용)
  const secKeys = SECTIONS.map(s => s.key);

  // result 타임라인 삽입
  if (sectionTexts['result']) sectionTexts['result'] = insertGastroTimeline(sectionTexts['result'], subKw);

  // ★ v1.5: 정보 블럭은 비교형/정보형에만 삽입 (후기형/결정형은 정보글 톤 회피)
  if (sectionTexts['reason']) {
    if (titleType === 'compare' || titleType === 'info') {
      sectionTexts['reason'] = insertGastroInfoBlock(sectionTexts['reason'], subKw);
      console.log(`[gastro] 정보 블럭 삽입 (타입: ${titleType}): ${subKw}`);
    } else {
      console.log(`[gastro] 정보 블럭 생략 (타입: ${titleType}) — 후기/결정형 글 톤 유지`);
    }
  }

  // ★ 검사 수치 강제 삽입 (consult 섹션)
  if (sectionTexts['consult']) {
    sectionTexts['consult'] = injectGastroExamValue(sectionTexts['consult'], subKw);
    console.log(`[gastro] 수치 삽입 체크 완료: ${subKw}`);
  }

  // 마지막 섹션 추천 대상 + CTA — ★ v1.5: 타입별 강도 차별화
  const lastKey = secKeys[secKeys.length - 1];
  if (sectionTexts[lastKey]) {
    const recList = GASTRO_REC_MAP[subKw] || [];
    let recBlock = '';
    let ctaLine = '';

    if (titleType === 'review') {
      // 후기형: 추천 대상 블록 + 약한 CTA 1회
      recBlock = recList.length > 0
        ? `\n\n**이런 경우라면 한 번 진료를 고려해볼 만해요**\n${recList.map(r => `- ${r}`).join('\n')}`
        : '';
      ctaLine = '\n\n비슷한 증상이 반복된다면 동네 소화기내과에서 검사받아보는 것도 방법이에요.';
    } else if (titleType === 'compare') {
      // 비교형: 추천 대상만, CTA 없음 (정보 톤 유지)
      recBlock = recList.length > 0
        ? `\n\n**이런 경우 어떤 선택이 맞을까요**\n${recList.map(r => `- ${r}`).join('\n')}`
        : '';
      ctaLine = '';
    } else if (titleType === 'decision') {
      // 결정형: CTA 없이 결심한 사람들에게 담담하게
      recBlock = '';
      ctaLine = '\n\n같은 고민을 하고 있다면 한 번 검사 상담만 받아봐도 판단이 쉬워져요.';
    } else if (titleType === 'info') {
      // 정보형: 추천 대상 블록만, CTA 없음
      recBlock = recList.length > 0
        ? `\n\n**진료가 필요한 경우**\n${recList.map(r => `- ${r}`).join('\n')}`
        : '';
      ctaLine = '';
    }

    sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd() + recBlock + ctaLine;
    console.log(`[gastro] CTA 적용 (타입: ${titleType}) — recBlock: ${recBlock.length > 0 ? 'O' : 'X'}, CTA: ${ctaLine.length > 0 ? 'O' : 'X'}`);
  }

  let assembled = `# ${title}\n\n`;
  secKeys.forEach((key, i) => {
    const secContent = sectionTexts[key] || '';
    if (calcCharCount(secContent) < 50) return;
    assembled += secContent + '\n\n';
    if (i < SECTIONS.length - 1 && altList[i]) assembled += altList[i] + '\n\n';
  });
  assembled = assembled.replace(/\n{3,}/g, '\n\n').trim();
  assembled = removeDuplicateSentences(assembled);
  assembled += '\n\n' + buildGastroHashtags(subKw, region);

  // ★ 본문 인라인 볼드 제거 — 헤더형 **제목**(앞뒤 줄바꿈)은 보존, 문장 중간 **강조**만 제거
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
  //   v3.0 풀: 검사 / 상담 / 시술 / 치료 / 일상 (PHOTO_POOL과 동기)
  // ─────────────────────────────────────────────
  assembled = assembled.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner);
    if (/^(검사|상담|시술|치료|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
    if (/검사|내시경|위내시경|대장내시경|초음파|영상|진단|소견/i.test(s)) return "[이미지: 검사 사진]";
    if (/시술|용종|폴립|제거|레이저|절제|소작/.test(s))      return "[이미지: 시술 사진]";
    if (/처방|약물|복용|투약|약제|식이|식단/.test(s))        return "[이미지: 치료 사진]";
    if (/상담|진료|설명|차트|문진|원장|의사|병원/.test(s))   return "[이미지: 상담 사진]";
    if (/일상|회복|복귀|평소|생활|마무리/.test(s))           return "[이미지: 일상 사진]";
    return "[이미지: 상담 사진]";
  });

  // ─────────────────────────────────────────────
  // ★ v3.0 assembled 후처리 — region + subKw 패치 (ortho v3.7.5 패턴)
  //   조립 후 region 정보 필요한 조사 교정만 처리
  // ─────────────────────────────────────────────
  {
    const subEsc = subKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // PATCH ① "region + 이 치료" 복원 → "region + subKw"
    try {
      assembled = assembled.replace(
        new RegExp(`${region}\\s+이\\s+(치료|검사|진료)(?=[\\s가-힣])`, 'g'),
        `${region} ${subKw}`
      );
    } catch(e) {}
    // PATCH ② 부유 "이 치료" 잔존 정리 (문장 시작 위치만)
    assembled = assembled.replace(/(^|[.!?]\s+)이\s+치료은/gm, '$1이 치료는');

    // ─────────────────────────────────────────────────
    // ★ v3.0.2 PATCH A — 따옴표 직후 subKw 결합 fossil (단순 분리)
    //   ex) "강남 소화기내과"대장내시경... → "강남 소화기내과" 대장내시경...
    //   ⚠️ 의미 보완·조사 강제 생성 금지 — 단순 공백 1칸만 삽입
    // ─────────────────────────────────────────────────
    try {
      assembled = assembled.replace(
        new RegExp(`("[^"\\n]+")${subEsc}`, 'g'),
        `$1 ${subKw}`
      );
    } catch(e) {}

    // ─────────────────────────────────────────────────
    // ★ v3.0.2 PATCH B — 명사 충돌형 fossil 제거 (화이트리스트 확장)
    //   subKw + "이/가" + 후행명사 → "이 + 후행명사"
    //   v3.0.2: 소화기내과/점/곳/거/것/때문/덕분/시기 추가
    // ─────────────────────────────────────────────────
    try {
      assembled = assembled.replace(
        new RegExp(`${subEsc}(이|가)\\s+(소화기내과|병원|병이|병을|병의|병은|병에|증상|상태|검사|약물|치료|진료|효과|결과|이야기|과정|점|곳|거|것|때문|덕분|시기|부분|단계)`, 'g'),
        (_m, _josa, noun) => `이 ${noun}`
      );
    } catch(e) {}
  }

  const _altAll = assembled.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(검사|상담|시술|치료|일상)\s*사진\]/.test(a));
  const _boxAll = assembled.match(/\[📷 추천 사진:[^\]]+\]/g) || [];
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);
  console.log(`[QC] 박스 placeholder: ${_boxAll.length}개`);

  const charCount = calcGastroCharCount(assembled);
  const seoScore  = diagnosePost(assembled, subKw);

  // ★ QC 검증 로그
  const hasInfoBlock = /vs|어떻게 다른|어떻게 구별|어떻게 달라/.test(assembled);
  const hasExamValue = /\d+(\.\d+)?\s*(IU\/L|mg\/L|cm|mm|ng\/mL|U\/L|점|%|배)/.test(assembled);
  const repeatCount  = (assembled.match(new RegExp(subKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log(`[gastro] 완료: ${charCount}자 / SEO ${seoScore}점`);
  console.log(`[gastro] QC — 정보블럭: ${hasInfoBlock} / 수치: ${hasExamValue} / 키워드반복: ${repeatCount}회`);
  if (!hasInfoBlock) console.warn(`[gastro] ⚠️ 정보 블럭 미삽입`);
  if (!hasExamValue) console.warn(`[gastro] ⚠️ 검사 수치 미포함`);
  if (repeatCount > 5) console.warn(`[gastro] ⚠️ 키워드 ${repeatCount}회 반복`);

  await autoSave({ assembled, charCount, subKw, region, seoScore, industry, storeId });

  const imageRegex = /\[이미지:\s*([^\]]+)\]/g;
  const images = [];
  let m;
  while ((m = imageRegex.exec(assembled)) !== null) images.push({ alt: m[1].trim(), caption: '' });

  const lastLine = assembled.trimEnd().split('\n').pop() || '';
  const hashtagsArr = lastLine.startsWith('#') ? lastLine.split(/\s+/).filter(t => t.startsWith('#')) : [];

  // ★★★ v2 패치: 네이버 블로그 복사용 평문 변환 ★★★
  const assembledMarkdown = assembled;                        // 마크다운 원본 보존
  const assembledPlain    = stripMarkdownForNaver(assembled); // 네이버 복사용 평문
  const charCountPlain    = calcCharCount(assembledPlain);

  return res.status(200).json({
    success: true,
    text: assembledPlain,                // 네이버 복사용 (마크다운 제거됨)
    textMarkdown: assembledMarkdown,     // 마크다운 원본 (참고용 / 패턴 추출용)
    hashtags: hashtagsArr,
    images,
    charCount: charCountPlain,           // strip 후 글자수
    seoScore,
    validation: { passed: charCountPlain >= 2000, charCount: charCountPlain },
  });
}
