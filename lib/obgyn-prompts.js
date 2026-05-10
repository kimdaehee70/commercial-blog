// ============================================================
// obgyn-prompts.js — 산부인과 프롬프트 빌더 v1.0
// neuro/derma 동일 형식: SYSTEM_PROMPT / buildPrompt / getImageAlts
// ⚠️ clinic/neuro/ortho 등 절대 참조 금지
// ⚠️ 매뉴얼 PART 3-2: 글자수·구조·강제 수치·금지 규칙 준수
// ============================================================

import { OBGYN_TREATMENTS, DIRECTION, TRACK_MAP } from './obgyn-data';
import { OBGYN_FLOW } from './obgyn-playConfig';

// ── 진료별 세부 키워드 ────────────────────────────────────
const DETAIL_KEYWORDS = {
  uterine_fibroid:        ['자궁근종 크기', '복강경 근종절제', '하이푸', '생리과다', '근종 재발'],
  ovarian_cyst:           ['CA-125', '기능성 낭종', '난소 비틀림', '복강경', '낭종 소실'],
  cervical_cancer:        ['팹 도말', 'HPV 고위험군', '질확대경', 'ASCUS', '자궁경부 조직검사'],
  menstrual_disorder:     ['FSH·LH', '프로락틴', '다낭성 난소', '무배란', '프로게스테론'],
  fertility:              ['AMH 수치', '나팔관 조영술', '배란 확인', '인공수정', 'IVF'],
  prenatal:               ['NT 초음파', '심박 확인', '엽산', '기형아 검사', '임신 8주'],
  vaginitis:              ['칸디다', '세균성 질염', '트리코모나스', '분비물 검사', '재발 질염'],
  menopause:              ['FSH 수치', '에스트로겐', 'HRT', '안면홍조', '골밀도'],
  contraception:          ['미레나', '구리 루프', '경구피임약', '삽입 통증', '사후피임약'],
  endometriosis:          ['CA-125', '초콜릿 낭종', '디에노게스트', '복강경 확진', '자궁내막증 임신'],
  hpv_vaccine:            ['가다실9', '서바릭스', '3회 스케줄', '국가지원', 'HPV 유형'],
  breast_us:              ['BIRADS', '유방 낭종', '섬유선종', '유방조영술', '조직검사'],
  pcos:                   ['LH/FSH 비율', '안드로겐', '배란유도', '인슐린 저항성', 'PCOS 임신'],
  vulvar:                 ['콘딜로마', '외음부 습진', '소음순 비대', 'HPV 연관', '레이저 치료'],
  cervical_dysplasia:     ['CIN 단계', 'LEEP 시술', '질확대경 조직검사', '이형성증 재발', 'HPV 추적'],
  prenatal_late:          ['정밀초음파', '쿼드 검사', '임신성 당뇨', 'NST', '36주 검진'],
  delivery:               ['자연분만', '제왕절개', '무통분만', '입원 일정', '산후 회복'],
  dysmenorrhea:           ['자궁선근증', '미레나', '디에노게스트', 'MRI 진단', '자궁동맥색전술'],
  urinary_incontinence:   ['요역동학', '케겔', '바이오피드백', 'TOT', 'TVT'],
  female_cancer_screening:['CA-125', '자궁경부 + HPV', '유방 초음파', '여성암 가족력', '추적 주기'],
  pelvic_us:              ['질초음파', '복부초음파', '자궁내막 두께', '난소 추적', '근종 추적'],
  premature_menopause:    ['AMH 수치', 'FSH 검사', '난소 나이', '가임력 보존', 'HRT'],
};

// ──────────────────────────────────────────────────────────
// SYSTEM_PROMPT — neuro/derma와 동일 톤
// 매뉴얼 PART 3-2: 글자수 / 키워드 / 구조 / 강제 수치 / 금지
// ──────────────────────────────────────────────────────────
export const SYSTEM_PROMPT = [
  '당신은 한국의 산부인과를 다녀온 30~40대 여성 블로거입니다.',
  '실제 본인 경험을 바탕으로 신뢰감 있는 후기 글을 1인칭으로 씁니다.',
  '',
  '[톤·말투]',
  '- 카카오톡으로 친구에게 이야기하듯 자연스럽게',
  '- "~했어요 / ~더라고요 / ~었거든요" 회고형 어미 위주',
  '- 진단명·시술명은 1~2회 정도만 언급 — 반복은 부자연스러움',
  '',
  '[필수 포함 요소]',
  '- 직장·가족·일상 맥락 1개 (출퇴근 / 회식 / 임신 준비 / 자녀 / 부모님 등)',
  '- 원장님 말 직접 인용 1회 — "~ 이라고 하시더라고요" 형태',
  '- 수치 필수: 검사 결과(크기·수치) / 회차 / 경과 기간',
  '- 증상 변화는 실생활 표현으로 — "회식 자리에서 한결 편해졌어요" 수준',
  '',
  '[구조 — 6섹션 고정]',
  '고민 → 병원 탐색 → 검진 → 치료 결정 → 치료 후 변화 → 마무리',
  '치료 후 변화 섹션은 ### 1주 / ### 1개월 / ### 3개월 형식으로 시간 단계 표시',
  '',
  '[글자수]',
  '- 전체 2000~2200자 권장 (밀도 우선, 길이 강박 X)',
  '- 진료명 5회 이상 / 지역+산부인과 3회 이상 자연스럽게',
  '',
  '[금지 표현]',
  '- AI 냄새: "특히/또한/무엇보다" 연속 / "삶이 달라졌어요" / "새로운 삶"',
  '- 단정형: "100%/완치/확실히/완벽하게"',
  '- 추천 어투: "강력 추천 / 무조건 추천 / 적극 추천"',
  '- 가격 직접 노출: "10만원/회당 OO만원" 절대 금지 — "비용은 상담 시 안내받았다"',
  '- 정신건강 위험 표현: "우울·죽고 싶다" → "걱정이 됐다 / 신경이 쓰였다"',
  '- 의료광고 위반: "효과 보장 / 1위 / 최고" 절대 금지',
  '',
  '[산부인과 특수 주의사항 — 매우 중요]',
  '- 여성 1인칭 시점 절대 유지 — "남편이/와이프가/와이프 대신" 금지',
  '- 임신·출산 진료는 본인 경험 기준으로 작성 (대리 후기 X)',
  '- 진료실에서 옷을 벗는 등 민감 묘사는 한 줄로 간결하게',
  '- HPV 양성 / 이형성증 등 진단명은 차분하게 — 공포 조장 X',
  '- 임신·태아 관련 표현은 의학적 사실만 — "확정·보장" 금지',
  '- 결혼·미혼 등 사적 정보 불필요한 노출 자제',
].join('\n');

// ──────────────────────────────────────────────────────────
// buildPrompt — 섹션별 user prompt
//   sectionKey, region, treatmentId, treatmentName, activeKeyword, fullKeyword, writtenSections
// ──────────────────────────────────────────────────────────
export function buildPrompt({
  sectionKey,
  region,
  treatmentId,
  treatmentName,
  activeKeyword,
  fullKeyword,
  writtenSections,
  track,           // v1.2: { key, action, bannedActions, resultDescription }
}) {
  const treatment = OBGYN_TREATMENTS.find(t => t.id === treatmentId) || {};
  const dir = DIRECTION[treatmentId] || {};
  const detailKws = DETAIL_KEYWORDS[treatmentId] || [];
  const sectionMeta = OBGYN_FLOW.find(s => s.key === sectionKey) || {};

  const ctx = {
    region,
    treatmentName,
    activeKeyword,
    fullKeyword,
    treatment,
    dir,
    detailKws,
    sectionMeta,
    writtenSections,
    track: track || null,
  };

  switch (sectionKey) {
    case 'concern':  return buildConcern(ctx);
    case 'search':   return buildSearch(ctx);
    case 'consult':  return buildConsult(ctx);
    case 'decision': return buildDecision(ctx);
    case 'progress': return buildProgress(ctx);
    case 'closing':  return buildClosing(ctx);
    default:
      throw new Error('[obgyn-prompts] 알 수 없는 섹션: ' + sectionKey);
  }
}

// ── concern ────────────────────────────────────────────────
function buildConcern(c) {
  const { region, treatmentName, activeKeyword, fullKeyword, treatment, dir, detailKws, sectionMeta } = c;
  const pains = treatment.pains || [];
  const painLines = pains.slice(0, 2).map((p, i) => `  ${i+1}. ${p}`).join('\n');
  const kwHint = detailKws.length
    ? `\n- 세부 키워드 1~2개 자연스럽게 녹일 것: ${detailKws.slice(0, 3).join(' / ')}`
    : '';
  const hookLine = dir.hook ? `\n- 후킹 예시: "${dir.hook}"` : '';
  const concernLine = dir.concern ? `\n- 글 방향: ${dir.concern}` : '';

  return [
    `## 고민 — ${region} ${treatmentName} 후기 첫 번째 섹션`,
    '',
    '아래 조건을 지키며 1인칭 회고형으로 자연스럽게 작성해주세요.',
    '',
    '[주제] 증상·검진 결과 발견 → 산부인과 진료를 알아보게 된 계기',
    '[조건]',
    `- 첫 두 문장은 짧고 강하게 — 일상 속 구체 장면 1개로 시작${hookLine}`,
    concernLine,
    '- 아래 고민 중 1~2개를 녹여낼 것:',
    painLines,
    kwHint,
    `- 진료명("${treatmentName}")을 직접 조사 연결 금지 → 증상·결과 표현으로 풀 것`,
    `  ❌ "${treatmentName}이 발견됐어요" → ✅ "초음파에서 자궁에 뭔가 보인다는 말을 들었어요"`,
    `- 활성 키워드 "${activeKeyword}"를 1회 자연스럽게 녹일 것`,
    `- 분량: ${sectionMeta.minLength || 200}~${sectionMeta.maxLength || 320}자`,
  ].filter(Boolean).join('\n');
}

// ── search ────────────────────────────────────────────────
function buildSearch(c) {
  const { region, treatmentName, fullKeyword, detailKws, sectionMeta } = c;
  const searchKw = detailKws[0] || (treatmentName + ' 증상');

  return [
    `## 병원 탐색 — ${region} 산부인과 후기 두 번째 섹션`,
    '',
    '[주제] 산부인과를 어떻게 알아봤는지 — 검색·맘카페·지인 추천 등',
    '[조건]',
    '- 실제 검색 경로 묘사 (네이버 검색 / 맘카페 / 지인 추천)',
    `- 검색어 자연스럽게 노출: "${region} 산부인과", "${searchKw}", "${region} 산부인과 후기"`,
    `- ${region} 지역명 반드시 포함`,
    '- 2~3곳 비교했다는 흐름 (이름은 쓰지 않고 "근처 다른 병원/큰 병원" 정도로)',
    '- "후기 많아서" 금지 → 여의사 비율 / 접근성 / 장비 / 진료 깊이 / 대기 짧음 등 구체 기준',
    `- 완전체 키워드 "${fullKeyword}"가 1회 등장하도록`,
    `- 분량: ${sectionMeta.minLength || 200}~${sectionMeta.maxLength || 320}자`,
  ].join('\n');
}

// ── consult ────────────────────────────────────────────────
function buildConsult(c) {
  const { region, treatmentName, treatment, dir, detailKws, sectionMeta, track } = c;
  const opNotes = treatment.operationNotes || '';
  const compareWith = treatment.compareWith || '경과 관찰';
  const numHint = pickConsultNumberHint(treatment.id);

  const trackBlock = track ? [
    '',
    '🔒 [트랙 잠금 — 검사 후 결정 방향]',
    `- 검사 결과 + 의사 설명 → "${track.action}" 방향이 자연스럽게 도출되도록`,
    '- 이 섹션에서는 결정 단정 금지 — "치료 결정" 섹션에서 명시',
    '- 검사 결과에 어울리는 단계만 간단히 안내받은 흐름',
  ].join('\n') : '';

  return [
    `## 검진 — ${region} 산부인과 진료·검사 과정`,
    '',
    '[주제] 실제 진료실에서 받은 검사·문진·상담 — 가장 디테일하게',
    '[조건]',
    `- 검사 순서를 구체적으로: ${opNotes}`,
    `- 검사 결과 수치 또는 소견 1개 이상 구체적으로 — ${numHint}`,
    '- 환자 질문 1~2개 대화체:',
    `  예) "선생님, 이게 ${compareWith} 수준일 가능성도 있을까요?"`,
    '       "수술까지 꼭 가야 하는 단계인가요?"',
    '- 원장님 말 직접 인용 1회 필수 — "~ 라고 하시더라고요"',
    '- 검사 단계와 결과 → 어떤 판단으로 이어졌는지 인과 흐름 명시',
    detailKws.length ? `- 세부 키워드 1~2개: ${detailKws.slice(0, 3).join(' / ')}` : '',
    trackBlock,
    `- 분량: ${sectionMeta.minLength || 320}~${sectionMeta.maxLength || 460}자`,
  ].filter(Boolean).join('\n');
}

function pickConsultNumberHint(id) {
  const map = {
    uterine_fibroid:        '근종 3.2cm 확인 / 내막 두께 12mm',
    ovarian_cyst:           'CA-125 18 U/mL / 낭종 4.5cm',
    cervical_cancer:        'HPV 16번형 양성 / ASCUS 소견',
    menstrual_disorder:     'FSH 12.3 / LH 8.2 / 프로락틴 18',
    fertility:              'AMH 0.8 ng/mL / FSH 9.4',
    prenatal:               '임신 8주 / 심박 158 bpm',
    vaginitis:              '칸디다 균 검출 / 분비물 pH 4.2',
    menopause:              'FSH 42 / E2 18',
    contraception:          '자궁 길이 7.2cm / 미레나 5년',
    endometriosis:          'CA-125 78 / 초콜릿 낭종 3cm',
    hpv_vaccine:            '가다실 9가 1차 / 6개월 후 2차',
    breast_us:              'BIRADS 3 / 멍울 1.2cm',
    pcos:                   'LH/FSH 비율 2.5 / AMH 6.8',
    vulvar:                 '콘딜로마 0.5cm / HPV 11번 양성',
    cervical_dysplasia:     'CIN2 진단 / HPV 16번 양성',
    prenatal_late:          '임신 22주 / 추정체중 480g',
    delivery:               '임신 38주 / 자궁경부 2cm 개대',
    dysmenorrhea:           '자궁선근증 두께 18mm / VAS 8점',
    urinary_incontinence:   '요역동학 압력 80 / 케겔 1일 30회',
    female_cancer_screening:'CA-125 14 / 유방 BIRADS 2',
    pelvic_us:              '자궁 6.3cm / 내막 8mm',
    premature_menopause:    'AMH 0.3 / FSH 28',
  };
  return map[id] || '검사 결과 수치 1개 (예: 호르몬 수치 / 크기 mm·cm / 점수 등)';
}

// ── decision ───────────────────────────────────────────────
function buildDecision(c) {
  const { region, treatmentName, activeKeyword, fullKeyword, treatment, sectionMeta, track } = c;
  const compareWith = treatment.compareWith || '경과 관찰';

  // v1.2: 트랙별 강제 행위
  const trackBlock = track ? [
    '',
    '🔒 [트랙 잠금 — 절대 위반 금지]',
    `- 이 글의 결정 행위는 오직: "${track.action}"`,
    `- 다른 시술·약물 절대 등장 금지: ${(track.bannedActions || []).join(' / ') || '(없음)'}`,
    '- 결정 흐름은 "여러 옵션 비교 → 이 트랙 선택" 한 방향만',
    '- "둘 다 받아봤다" / "하다가 다른 걸로" 식의 혼합 결정 금지',
  ].join('\n') : '';

  return [
    `## 치료 결정 — ${region} 산부인과 ${treatmentName}을(를) 선택한 이유`,
    '',
    '[주제] 비교·고민 → 결정에 이른 과정',
    '[조건]',
    `- "${compareWith}"와 비교한 흐름이 보이도록`,
    '- "후기가 많아서 / 유명해서" 금지 → 검사 결과·의사 설명·생활 영향 기반',
    `- ${region} 산부인과를 선택한 구체 이유 1~2가지 (장비 / 추적 시스템 / 여의사 / 거리 / 상담 깊이 등)`,
    `- 활성 키워드 "${activeKeyword}" 자연스럽게 반복 (단, 같은 단어 두 번 연속 금지)`,
    `- 완전체 키워드 "${fullKeyword}" 1회 등장`,
    '- 결정 흐름 중복 금지 — "선택 이유"는 이 섹션에서만 정리',
    trackBlock,
    `- 분량: ${sectionMeta.minLength || 250}~${sectionMeta.maxLength || 360}자`,
  ].filter(Boolean).join('\n');
}

// ── progress ───────────────────────────────────────────────
function buildProgress(c) {
  const { region, treatmentName, treatment, detailKws, sectionMeta, track } = c;
  const opNotes = treatment.operationNotes || '';

  // v1.2: 트랙 기반 시간 헤더 + 시술명 잠금
  const tlHint = track ? pickTimelineByTrack(track.key) : pickTimelineHint(treatment.id);

  const trackBlock = track ? [
    '',
    '🔒 [트랙 잠금 — 절대 위반 금지]',
    `- 이 글의 행위는 오직: "${track.action}"`,
    `- 변화 흐름: ${track.resultDescription}`,
    `- 절대 등장 금지 단어: ${(track.bannedActions || []).join(' / ') || '(없음)'}`,
    '- 다른 시술명·약물명을 새로 도입하지 말 것',
    '- 결정 섹션에서 선택한 행위만 일관되게 추적',
  ].join('\n') : '';

  return [
    `## 치료 후 변화 — ${region} ${treatmentName} 진행 후 경과`,
    '',
    '[주제] 시간대별 변화 — ### 헤더 형식 고정',
    '[조건]',
    '- 다음 시간대 헤더를 정확히 사용 (### 으로 시작):',
    tlHint.headers.map(h => `  ${h}`).join('\n'),
    '- 각 시간대마다 구체적 변화 1~2개 — 수치 or 일상 묘사',
    `- 참고 정보: ${opNotes}`,
    '- 약물·시술 반응 / 부작용 / 일상 복귀 시점 구체적으로',
    detailKws.length ? `- 세부 키워드 1~2개: ${detailKws.slice(2, 5).join(' / ')}` : '',
    `- 진료명("${treatmentName}") 직접 조사 연결 금지`,
    trackBlock,
    `- 분량: ${sectionMeta.minLength || 320}~${sectionMeta.maxLength || 460}자`,
  ].filter(Boolean).join('\n');
}

// 트랙별 시간 헤더 (트랙이 정해진 경우 우선 사용)
function pickTimelineByTrack(trackKey) {
  const map = {
    observe:           { headers: ['### 진단 직후', '### 3개월 추적', '### 6개월 추적'] },
    screening:         { headers: ['### 검진 직후', '### 결과 상담', '### 다음 추적'] },
    pregnancy:         { headers: ['### 검진 당일', '### 다음 검진', '### 다음 단계'] },
    vaccine:           { headers: ['### 1차 접종', '### 2개월 후 2차', '### 6개월 후 3차'] },
    medication:        { headers: ['### 약물 시작 1주', '### 1개월', '### 3개월'] },
    procedure:         { headers: ['### 1주', '### 1개월', '### 3개월'] },
    procedure_laparo:  { headers: ['### 수술 후 1주', '### 1개월', '### 3개월'] },
    procedure_hifu:    { headers: ['### 시술 후 1주', '### 1개월', '### 3개월'] },
    procedure_natural: { headers: ['### 분만 직후', '### 입원 2~3일', '### 산후 6주'] },
    procedure_csection:{ headers: ['### 수술 직후', '### 입원 5~7일', '### 산후 6주'] },
  };
  return map[trackKey] || { headers: ['### 1주', '### 1개월', '### 3개월'] };
}

function pickTimelineHint(id) {
  // 진료별 자연스러운 시간 단위 — 출산/시술/약물에 따라 다름
  const operative = ['uterine_fibroid', 'ovarian_cyst', 'endometriosis', 'cervical_dysplasia',
                     'urinary_incontinence', 'dysmenorrhea', 'delivery'];
  const tracking  = ['cervical_cancer', 'female_cancer_screening', 'pelvic_us',
                     'breast_us', 'pcos', 'menstrual_disorder'];
  const longterm  = ['menopause', 'premature_menopause', 'fertility', 'hpv_vaccine'];
  const pregnancy = ['prenatal', 'prenatal_late'];

  if (operative.includes(id)) {
    return { headers: ['### 1주', '### 1개월', '### 3개월'] };
  }
  if (tracking.includes(id)) {
    return { headers: ['### 1주', '### 1개월', '### 6개월 추적'] };
  }
  if (longterm.includes(id)) {
    return { headers: ['### 1개월', '### 3개월', '### 6개월'] };
  }
  if (pregnancy.includes(id)) {
    return { headers: ['### 1주', '### 다음 검진', '### 다음 단계'] };
  }
  return { headers: ['### 1주', '### 1개월', '### 3개월'] };
}

// ── closing ────────────────────────────────────────────────
function buildClosing(c) {
  const { region, treatmentName, activeKeyword, fullKeyword, treatment, sectionMeta, track } = c;
  const recs = (treatment.recommend || []).slice(0, 2)
    .map((r, i) => `  ${i+1}. ${r}`).join('\n');

  const trackBlock = track ? [
    '',
    `🔒 이 글에서 받은 행위는 "${track.action}" 한 가지뿐 — 정리 글에서도 다른 시술·약물 도입 금지`,
  ].join('\n') : '';

  return [
    `## 마무리 — ${region} 산부인과 ${treatmentName}을(를) 고민하는 분께`,
    '',
    '[주제] 비슷한 상황의 여성에게 전하는 정리 글',
    '[조건]',
    '- 치료 전후 변화를 한 문장으로 담담하게 정리',
    '- 추천 대상 1~2개 자연스럽게 언급:',
    recs,
    '- "혼자 걱정만 하지 말고 가까운 산부인과에서 한 번 확인해보시길" 정도로 마무리',
    `- 활성 키워드 "${activeKeyword}" 1회 / 완전체 "${fullKeyword}" 1회 자연스럽게`,
    '- "강력 추천 / 무조건" 금지 / 권유는 부드럽게',
    trackBlock,
    `- 분량: ${sectionMeta.minLength || 180}~${sectionMeta.maxLength || 260}자`,
  ].filter(Boolean).join('\n');
}

// ──────────────────────────────────────────────────────────
// getImageAlts — SEO ALT + 사진 가이드 분리 (B안 v1.2)
//   - alt:   네이버 SEO용 짧은 ALT 텍스트 (본문 [이미지: ...] 박스에 들어감)
//   - guide: 사용자가 어떤 사진을 넣을지 알 수 있는 구체 가이드
//   섹션별 + 트랙별 + 진료별 분기 — 추상적 묘사 제거
// ──────────────────────────────────────────────────────────

// 진료별 사진 가이드 — 검진/치료 단계별 구체 장면
const PHOTO_GUIDES_BY_TREATMENT = {
  // 부인종양·낭종 계열
  uterine_fibroid: {
    consult: '초음파 모니터 화면 / 진료실 내부 (얼굴·신상 가림)',
    decision_observe: '받은 검사 결과지·소견서 (개인정보 가림) / 메모장에 적은 추적 일정',
    decision_procedure: '입원 안내문·수술 동의서 / 병실 침대',
    progress1: '집에서 쉬는 모습 (커피잔·이불 등 일상 소품) / 약 봉투',
    progress2: '재방문 진료실 / 초음파 추적 결과지',
    progress3: '안정기 일상 — 외출·운동·회식 등 평범한 컷',
  },
  ovarian_cyst: {
    consult: '복부 초음파 검사실 / 모니터 화면',
    decision_observe: '낭종 크기 적힌 소견서 / 추적 일정 메모',
    decision_procedure: '복강경 수술 안내문 / 입원 가방',
    progress1: '회복 중인 일상 (이불·물병) / 진통제 봉투',
    progress2: '추적 초음파 결과지 / 진료실',
    progress3: '복귀한 일상 — 사무실·산책 등',
  },
  cervical_cancer: {
    consult: '진료실 내부 / 검사실 분위기 (얼굴 가림)',
    decision_observe: 'HPV·팹 결과지 (개인정보 가림) / 추적 안내문',
    decision_procedure: 'LEEP·원추절제 안내문 / 수술 동의서',
    progress1: '집에서 회복 중인 모습 / 패드·생리대',
    progress2: '추적 검사실 / 결과 안내 메모',
    progress3: '정기검진 알림 캘린더 / 일상 컷',
  },
  cervical_dysplasia: {
    consult: '질확대경 검사실 / 모니터 화면 (얼굴 가림)',
    decision_observe: 'CIN 단계 적힌 결과지 / 추적 일정표',
    decision_procedure: 'LEEP 시술 안내문 / 회복실',
    progress1: '집에서 휴식 / 진통제',
    progress2: '추적 검사 결과지',
    progress3: '정기 검진 캘린더',
  },
  endometriosis: {
    consult: '복부 초음파 / 진료실 내부',
    decision_observe: '진통제·호르몬제 처방전 / 메모',
    decision_procedure: '복강경 수술 안내문',
    progress1: '집에서 회복 / 핫팩·진통제',
    progress2: '재방문 진료실 / 추적 검사',
    progress3: '복귀한 일상 — 운동·외출 컷',
  },
  // 검사·검진 계열
  female_cancer_screening: {
    consult: '접수창구·문진표 / 검사실 입구',
    decision_observe: '검진 일정표 / 결과 안내 봉투',
    decision_procedure: '추가 검사 안내문',
    progress1: '결과지 받은 날 / 일상 컷',
    progress2: '재검 안내 메모',
    progress3: '다음 검진 캘린더',
  },
  pelvic_us: {
    consult: '초음파 검사실 / 모니터 화면',
    decision_observe: '결과 소견서 / 다음 일정 메모',
    decision_procedure: '추가 검사 안내문',
    progress1: '결과 본 날 / 메모장',
    progress2: '재방문 진료실',
    progress3: '정기 추적 캘린더',
  },
  breast_us: {
    consult: '유방 초음파 검사실 / 모니터',
    decision_observe: 'BIRADS 결과지 / 추적 일정',
    decision_procedure: '조직검사 안내문',
    progress1: '결과 받은 날 / 메모',
    progress2: '재검 진료실',
    progress3: '연 1회 정기검진 알림',
  },
  // 호르몬·생리 계열
  menstrual_disorder: {
    consult: '진료실 내부 / 호르몬 검사 안내문',
    decision_observe: '생리 주기 기록 앱 화면 / 메모장',
    decision_medication: '처방전·약 봉투 / 복용 캘린더',
    progress1: '복용 시작한 약 / 메모',
    progress2: '추적 호르몬 검사지',
    progress3: '안정된 주기 기록',
  },
  dysmenorrhea: {
    consult: '진료실 / 초음파 검사실',
    decision_medication: '진통제·호르몬제 처방전 / 미레나 안내문',
    decision_procedure: '시술 안내문 / 입원 가방',
    progress1: '핫팩·진통제 / 집에서 쉬는 모습',
    progress2: '추적 진료실',
    progress3: '편해진 생리주기 기록 앱',
  },
  pcos: {
    consult: '진료실 / 호르몬 검사 안내문',
    decision_observe: '생활습관 기록 노트 / 운동복',
    decision_medication: '메트포르민·배란유도제 처방전',
    progress1: '복용 캘린더 / 식단 사진',
    progress2: '추적 검사 결과지',
    progress3: '안정된 일상 — 운동·식단',
  },
  menopause: {
    consult: '진료실 / 호르몬 검사 안내문',
    decision_observe: '생활습관 가이드 / 운동복',
    decision_medication: 'HRT 처방전 / 약 봉투',
    progress1: '복용 시작 / 메모장',
    progress2: '추적 호르몬 결과',
    progress3: '안정된 일상 — 수면·운동',
  },
  premature_menopause: {
    consult: 'AMH·FSH 검사 안내문 / 진료실',
    decision_observe: '가임력 보존 상담 메모',
    decision_medication: 'HRT 처방전',
    progress1: '복용 시작 / 결과지',
    progress2: '추적 검사 결과',
    progress3: '정기 추적 캘린더',
  },
  // 임신·출산 계열
  fertility: {
    consult: 'AMH 검사 안내문 / 진료실',
    decision_observe: '배란 추적 앱 / 메모',
    decision_medication: '배란유도제 처방전 / 주사 안내',
    decision_procedure: '인공수정·IVF 안내문',
    progress1: '복용·주사 캘린더',
    progress2: '추적 초음파 결과',
    progress3: '임신 확인 또는 다음 차수 일정',
  },
  prenatal: {
    consult: 'NT 초음파 / 진료실',
    decision_observe: '임신 주수 기록 / 산모 수첩',
    decision_medication: '엽산·철분제 봉투',
    progress1: '산모 수첩 / 초음파 사진 (얼굴 가림)',
    progress2: '기형아 검사 결과지',
    progress3: '안정기 일상 — 산책·태교',
  },
  prenatal_late: {
    consult: '정밀초음파 검사실',
    decision_observe: '임신 주수별 일정표 / NST 안내',
    decision_medication: '철분제·임당 검사 안내',
    progress1: '산모 수첩 / 초음파 사진 (얼굴 가림)',
    progress2: '36주 검진 결과',
    progress3: '출산 준비 — 가방·아기용품',
  },
  delivery: {
    consult: '분만 상담실 / 입원 안내문',
    decision_observe: '출산 계획서 / 산모 수첩',
    decision_procedure: '제왕절개 안내문 / 입원 가방',
    progress1: '병실 / 산후조리 — 미역국·물병',
    progress2: '신생아 발자국·이름표 (얼굴 가림)',
    progress3: '산후조리원·집 회복 일상',
  },
  // 감염·외음부
  vaginitis: {
    consult: '진료실 / 검사 안내문',
    decision_medication: '항생제·연고 처방전',
    progress1: '약 봉투 / 일상 회복',
    progress2: '재방문 결과지',
    progress3: '재발 없는 일상',
  },
  vulvar: {
    consult: '진료실 / 검사실',
    decision_observe: '추적 안내문 / 메모',
    decision_medication: '연고·항바이러스제 처방전',
    decision_procedure: '레이저 시술 안내문',
    progress1: '회복 중 일상 / 약',
    progress2: '재방문 진료실',
    progress3: '안정된 일상 컷',
  },
  // 피임·예방
  contraception: {
    consult: '진료실 / 피임법 비교 안내문',
    decision_medication: '경구피임약 처방전 / 사후피임약 안내',
    decision_procedure: '미레나·구리루프 시술 안내문',
    progress1: '복용 캘린더 / 시술 후 메모',
    progress2: '추적 진료실',
    progress3: '안정된 일상 — 정기 점검',
  },
  hpv_vaccine: {
    consult: '예방접종실 / 백신 안내문',
    decision_medication: '접종 일정표 / 가다실9 안내',
    progress1: '1차 접종 후 메모 / 캘린더',
    progress2: '2차 접종 / 영수증·접종 카드',
    progress3: '3차 완료 — 접종 완료 카드',
  },
  // 비뇨·골반저
  urinary_incontinence: {
    consult: '요역동학 검사실 / 진료실',
    decision_observe: '케겔 운동 가이드 / 메모',
    decision_medication: '약 처방전',
    decision_procedure: 'TOT·TVT 시술 안내문',
    progress1: '운동 기록 / 약 봉투',
    progress2: '추적 진료실',
    progress3: '편해진 일상 — 외출·운동',
  },
};

// 트랙별 진행 단계 가이드 — observe / medication / procedure 트랙 구분
const PROGRESS_GUIDES_BY_TRACK = {
  observe: {
    progress1: '추적 일정 메모 / 생활관리 — 운동·식단·기록 앱',
    progress2: '재방문 진료실 / 추적 검사 결과지 (개인정보 가림)',
    progress3: '안정된 일상 — 정기 추적 캘린더, 평범한 외출 컷',
  },
  medication: {
    progress1: '약 봉투·복용 캘린더 / 첫 복용 메모',
    progress2: '추적 검사 결과지 / 약 효과 메모',
    progress3: '안정된 복용 루틴 — 일상 속 약통',
  },
  procedure: {
    progress1: '집에서 회복 — 진통제·이불·핫팩 등 회복 소품',
    progress2: '재방문 진료실 / 회복 추적 결과지',
    progress3: '복귀한 일상 — 사무실·운동·외출 평범한 컷',
  },
  vaccine: {
    progress1: '1차 접종 후 메모 / 다음 일정 캘린더',
    progress2: '2차 접종 — 접종 카드·영수증',
    progress3: '3차 완료 — 접종 완료 카드',
  },
  pregnancy: {
    progress1: '산모 수첩 / 초음파 사진 (얼굴 가림)',
    progress2: '주수별 검진 결과 / 일상 변화',
    progress3: '안정기 — 태교·산책·출산 준비',
  },
};

// 트랙 → 가이드 그룹 매핑 (decision 단계 가이드 키)
function getDecisionGuideKey(track) {
  if (!track) return 'observe';
  const action = (track.action || '').toLowerCase();
  if (action.includes('수술') || action.includes('시술') || action.includes('절제') || action.includes('하이푸') || action.includes('제왕') || action.includes('분만')) return 'procedure';
  if (action.includes('복용') || action.includes('약') || action.includes('주사') || action.includes('hrt')) return 'medication';
  if (action.includes('접종') || action.includes('백신')) return 'medication';
  return 'observe';
}

// 트랙 → progress 가이드 그룹 매핑
function getProgressGuideKey(track, treatmentId) {
  if (treatmentId === 'hpv_vaccine') return 'vaccine';
  if (treatmentId === 'prenatal' || treatmentId === 'prenatal_late' || treatmentId === 'delivery') return 'pregnancy';
  if (!track) return 'observe';
  const action = (track.action || '').toLowerCase();
  if (action.includes('수술') || action.includes('시술') || action.includes('절제') || action.includes('하이푸')) return 'procedure';
  if (action.includes('복용') || action.includes('약') || action.includes('주사') || action.includes('hrt')) return 'medication';
  return 'observe';
}

export function getImageAlts(treatmentName, region, activeKeyword, treatmentId, track) {
  const kw = activeKeyword || treatmentName;
  const tGuides = (treatmentId && PHOTO_GUIDES_BY_TREATMENT[treatmentId]) || {};
  const decisionKey = getDecisionGuideKey(track);
  const progressKey = getProgressGuideKey(track, treatmentId);
  const pGuides = PROGRESS_GUIDES_BY_TRACK[progressKey] || PROGRESS_GUIDES_BY_TRACK.observe;

  // decision 단계 가이드 — 진료별 트랙 분기 우선, 없으면 트랙 그룹 폴백
  const decisionGuide =
    tGuides['decision_' + decisionKey] ||
    tGuides.decision_observe ||
    '치료 안내문·동의서 / 처방전 (개인정보 가림)';

  // progress 단계 가이드 — 진료별 우선, 없으면 트랙 폴백
  const p1 = tGuides.progress1 || pGuides.progress1;
  const p2 = tGuides.progress2 || pGuides.progress2;
  const p3 = tGuides.progress3 || pGuides.progress3;

  // 공통 가이드
  const concernGuide = '집·사무실·일상 속 컷 (얼굴 가림) — 핸드폰 검색 화면, 메모장, 캘린더 등';
  const searchGuide  = '병원 검색 화면·후기 비교 메모 / 지도 앱 캡처 (개인정보 가림)';
  const consultGuide = tGuides.consult || '진료실·검사실 분위기 (얼굴·신상 가림)';
  const closingGuide = '평범한 일상 컷 — 운동·산책·외출 / 정기검진 캘린더';

  // [이미지: SEO ALT — 사진 가이드: 구체 묘사] 형태
  // SEO ALT는 짧고 키워드 중심, 사진 가이드는 사용자 안내용
  const make = (alt, guide) => `[이미지: ${alt} — 사진 가이드: ${guide}]`;

  return {
    concern:   make(`${region} ${kw} 고민`, concernGuide),
    search:    make(`${region} 산부인과 ${kw} 알아보기`, searchGuide),
    consult:   make(`${region} 산부인과 ${treatmentName} 검진`, consultGuide),
    decision:  make(`${region} 산부인과 ${treatmentName} 치료 결정`, decisionGuide),
    progress1: make(`${region} ${kw} 1주차 경과`, p1),
    progress2: make(`${region} ${kw} 1개월 추적`, p2),
    progress3: make(`${region} ${kw} 3개월 안정`, p3),
    closing:   make(`${region} 산부인과 ${treatmentName} 후기 정리`, closingGuide),
  };
}
