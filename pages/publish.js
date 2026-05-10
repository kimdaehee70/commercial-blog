// pages/publish.js
// 반장닷컴 내부 발행 도구 (index-lite)
// - 기존 index.js / generate.js / parser 절대 미수정
// - localStorage만 사용
// - 폼 → 생성 → 복사 → 기록

import { useState, useEffect, useMemo } from 'react';

// ────────────────────────────────────────────────────────────
// 업종 16개 + 빠른 선택 시술
// ────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { id: 'clinic',     label: '🏥 성형외과/피부과', defaultCat: '얼굴',  compareWith: '리프팅' },
  { id: 'derma',      label: '✨ 피부과(미용)',    defaultCat: '주름',  compareWith: '리프팅' },
  { id: 'dental',     label: '🦷 치과',            defaultCat: '교정',  compareWith: '일반치료' },
  { id: 'ent',        label: '👂 이비인후과',      defaultCat: '비염',  compareWith: '약물치료' },
  { id: 'urology',    label: '🧬 비뇨기과',        defaultCat: '남성',  compareWith: '약물치료' },
  { id: 'oriental',   label: '🌿 한의원',          defaultCat: '근골격', compareWith: '약물치료' },
  { id: 'ortho',      label: '🦴 정형외과',        defaultCat: '관절',  compareWith: '수술치료' },
  { id: 'pediatrics', label: '👶 소아청소년과',    defaultCat: '감염',  compareWith: '약물치료' },
  { id: 'gastro',     label: '🍽️ 소화기내과',     defaultCat: '위장',  compareWith: '약물치료' },
  { id: 'general',    label: '🩺 내과',            defaultCat: '만성',  compareWith: '약물치료' },
  { id: 'obgyn',      label: '🌸 산부인과',        defaultCat: '여성',  compareWith: '약물치료' },
  { id: 'pain',       label: '💉 통증의학과',      defaultCat: '근골격', compareWith: '수술치료' },
  { id: 'neuro',      label: '🧠 신경과',          defaultCat: '두통',  compareWith: '약물치료' },
  { id: 'psy',        label: '🧘 정신건강의학과',  defaultCat: '불안',  compareWith: '상담치료' },
  { id: 'eye',        label: '👁️ 안과',           defaultCat: '시력',  compareWith: '안경교정' },
  { id: 'family',     label: '👨‍👩‍👧 가정의학과', defaultCat: '검진',  compareWith: '약물치료' },
];

// 업종별 자주 쓰는 빠른 선택 버튼 (5~10개)
const QUICK_PICKS = {
  clinic: [
    { id: 'eyelid',   name: '쌍커풀수술', cat: '얼굴', keywords: ['쌍커풀','눈성형','매몰법'] },
    { id: 'rhino',    name: '코성형',     cat: '얼굴', keywords: ['코성형','콧대','코끝'] },
    { id: 'facelift', name: '리프팅',     cat: '얼굴', keywords: ['리프팅','실리프팅','울쎄라'] },
    { id: 'botox',    name: '보톡스',     cat: '주름', keywords: ['보톡스','사각턱','이마'] },
    { id: 'filler',   name: '필러',       cat: '주름', keywords: ['필러','팔자주름','볼륨'] },
    { id: 'lipo',     name: '지방흡입',   cat: '바디', keywords: ['지방흡입','복부','허벅지'] },
  ],
  derma: [
    { id: 'laser_pigment', name: '기미레이저',   cat: '색소', keywords: ['기미','레이저토닝','피코토닝'] },
    { id: 'acne',          name: '여드름치료',   cat: '여드름', keywords: ['여드름','압출','여드름흉터'] },
    { id: 'thermage',      name: '써마지',       cat: '주름', keywords: ['써마지','탄력','리프팅'] },
    { id: 'ulthera',       name: '울쎄라',       cat: '주름', keywords: ['울쎄라','HIFU','리프팅'] },
    { id: 'derma_botox',   name: '보톡스',       cat: '주름', keywords: ['보톡스','사각턱','이마'] },
    { id: 'derma_filler',  name: '필러',         cat: '주름', keywords: ['필러','팔자주름','볼륨'] },
    { id: 'pore',          name: '모공시술',     cat: '모공', keywords: ['모공','프락셀','LDM'] },
  ],
  dental: [
    { id: 'implant',  name: '임플란트',   cat: '보철', keywords: ['임플란트','픽스처','어금니'] },
    { id: 'ortho_d',  name: '치아교정',   cat: '교정', keywords: ['치아교정','투명교정','인비절라인'] },
    { id: 'whitening',name: '치아미백',   cat: '심미', keywords: ['치아미백','미백','자가미백'] },
    { id: 'wisdom',   name: '사랑니발치', cat: '구강외과', keywords: ['사랑니','발치','매복'] },
    { id: 'cavity',   name: '충치치료',   cat: '일반', keywords: ['충치','레진','인레이'] },
    { id: 'laminate', name: '라미네이트', cat: '심미', keywords: ['라미네이트','앞니','심미'] },
  ],
  ent: [
    { id: 'rhinitis',  name: '비염치료', cat: '비염', keywords: ['비염','알레르기','코막힘'] },
    { id: 'sinusitis', name: '축농증',   cat: '비염', keywords: ['축농증','부비동','수술'] },
    { id: 'tinnitus',  name: '이명',     cat: '귀',   keywords: ['이명','귀울림','난청'] },
    { id: 'tonsil',    name: '편도염',   cat: '목',   keywords: ['편도염','목감기','편도수술'] },
    { id: 'snoring',   name: '코골이',   cat: '수면', keywords: ['코골이','수면무호흡','코수술'] },
  ],
  urology: [
    { id: 'prostate',  name: '전립선치료', cat: '남성', keywords: ['전립선','전립선비대','PSA'] },
    { id: 'ed',        name: '발기부전',   cat: '남성', keywords: ['발기부전','ED','정력'] },
    { id: 'stone',     name: '요로결석',   cat: '비뇨', keywords: ['요로결석','체외충격파','신장결석'] },
    { id: 'cystitis',  name: '방광염',     cat: '비뇨', keywords: ['방광염','요로감염','빈뇨'] },
    { id: 'circum',    name: '포경수술',   cat: '남성', keywords: ['포경수술','성인포경','부분포경'] },
  ],
  oriental: [
    { id: 'accident', name: '교통사고치료', cat: '교통사고', keywords: ['교통사고','후유증','자보'] },
    { id: 'chuna',    name: '추나요법',     cat: '근골격', keywords: ['추나','척추','목디스크'] },
    { id: 'herb',     name: '한약처방',     cat: '내과',   keywords: ['한약','보약','체질개선'] },
    { id: 'acupunc',  name: '침치료',       cat: '근골격', keywords: ['침','침치료','전기침'] },
    { id: 'diet_h',   name: '한방다이어트', cat: '다이어트', keywords: ['한방다이어트','체중감량','한약'] },
    { id: 'bell',     name: '안면마비',     cat: '신경',   keywords: ['안면마비','구안와사','벨마비'] },
  ],
  ortho: [
    { id: 'knee',     name: '무릎통증치료',  cat: '관절', keywords: ['무릎통증','연골','퇴행성'] },
    { id: 'shoulder', name: '회전근개',      cat: '관절', keywords: ['회전근개','어깨통증','오십견'] },
    { id: 'disc',     name: '허리디스크',    cat: '척추', keywords: ['허리디스크','요추','신경통'] },
    { id: 'mt',       name: '도수치료',      cat: '재활', keywords: ['도수치료','재활','체외충격파'] },
    { id: 'ankle',    name: '발목인대',      cat: '관절', keywords: ['발목인대','염좌','발목통증'] },
    { id: 'cts',      name: '손목터널증후군',cat: '관절', keywords: ['손목터널','수근관','손저림'] },
  ],
  pediatrics: [
    { id: 'cold_p',   name: '감기치료',     cat: '감염', keywords: ['소아감기','어린이감기','콧물'] },
    { id: 'fever_p',  name: '발열',         cat: '감염', keywords: ['소아발열','고열','해열제'] },
    { id: 'vacc',     name: '예방접종',     cat: '예방', keywords: ['예방접종','독감','국가접종'] },
    { id: 'growth_p', name: '성장클리닉',   cat: '성장', keywords: ['성장클리닉','키성장','성장판'] },
    { id: 'atopy',    name: '아토피',       cat: '피부', keywords: ['아토피','소아피부','보습'] },
  ],
  gastro: [
    { id: 'gastro_endo', name: '위내시경',     cat: '검사', keywords: ['위내시경','수면내시경','위검진'] },
    { id: 'colon_endo',  name: '대장내시경',   cat: '검사', keywords: ['대장내시경','용종','대장검진'] },
    { id: 'reflux',      name: '역류성식도염', cat: '위장', keywords: ['역류성식도염','속쓰림','위산'] },
    { id: 'ibs',         name: '과민성대장',   cat: '장',   keywords: ['과민성대장','복통','설사'] },
    { id: 'helico',      name: '헬리코박터',   cat: '위장', keywords: ['헬리코박터','제균','위염'] },
  ],
  general: [
    { id: 'htn',  name: '고혈압관리',  cat: '만성', keywords: ['고혈압','혈압약','혈압관리'] },
    { id: 'dm',   name: '당뇨관리',    cat: '만성', keywords: ['당뇨','혈당','당화혈색소'] },
    { id: 'lipid',name: '고지혈증',    cat: '만성', keywords: ['고지혈증','콜레스테롤','LDL'] },
    { id: 'thy',  name: '갑상선',      cat: '내분비', keywords: ['갑상선','갑상선기능','TSH'] },
    { id: 'cold_g',name: '감기/몸살',  cat: '급성', keywords: ['감기','몸살','독감'] },
  ],
  obgyn: [
    { id: 'period',    name: '생리불순',   cat: '여성', keywords: ['생리불순','월경불순','호르몬'] },
    { id: 'menopause', name: '갱년기',     cat: '여성', keywords: ['갱년기','폐경','호르몬치료'] },
    { id: 'preg_check',name: '산전검사',   cat: '임신', keywords: ['산전검사','임신확인','초음파'] },
    { id: 'cervix',    name: '자궁경부암검진', cat: '검진', keywords: ['자궁경부암','HPV','검진'] },
    { id: 'cystitis_o',name: '질염',       cat: '여성', keywords: ['질염','세균성','칸디다'] },
  ],
  pain: [
    { id: 'epi',     name: '신경차단술',     cat: '주사', keywords: ['신경차단술','경막외','통증주사'] },
    { id: 'dn',      name: '도수치료',       cat: '근골격', keywords: ['도수치료','재활','체외충격파'] },
    { id: 'trigger', name: '트리거포인트',   cat: '주사', keywords: ['트리거포인트','TPI','근막'] },
    { id: 'neck',    name: '목디스크',       cat: '척추', keywords: ['목디스크','경추','신경통'] },
    { id: 'back_p',  name: '허리통증',       cat: '척추', keywords: ['허리통증','요통','만성요통'] },
  ],
  neuro: [
    { id: 'migraine', name: '편두통',     cat: '두통', keywords: ['편두통','두통','오라'] },
    { id: 'dizzy',    name: '어지럼증',   cat: '어지럼', keywords: ['어지럼증','이석증','전정'] },
    { id: 'parkinson',name: '파킨슨',     cat: '운동', keywords: ['파킨슨','떨림','운동장애'] },
    { id: 'epilepsy', name: '뇌전증',     cat: '발작', keywords: ['뇌전증','경련','간질'] },
    { id: 'stroke',   name: '뇌졸중후관리',cat: '재활', keywords: ['뇌졸중','재활','중풍'] },
  ],
  psy: [
    { id: 'depress', name: '우울증',   cat: '우울', keywords: ['우울증','우울감','상담'] },
    { id: 'anx',     name: '불안장애', cat: '불안', keywords: ['불안장애','공황','걱정'] },
    { id: 'panic',   name: '공황장애', cat: '불안', keywords: ['공황장애','공황발작','심계항진'] },
    { id: 'insom',   name: '불면증',   cat: '수면', keywords: ['불면증','잠못잠','수면장애'] },
    { id: 'adhd',    name: 'ADHD',     cat: '주의', keywords: ['ADHD','주의력','집중력'] },
  ],
  eye: [
    { id: 'lasik',  name: '라식',     cat: '시력', keywords: ['라식','시력교정','각막'] },
    { id: 'lasek',  name: '라섹',     cat: '시력', keywords: ['라섹','시력교정','각막'] },
    { id: 'smile',  name: '스마일라식',cat: '시력', keywords: ['스마일라식','SMILE','시력교정'] },
    { id: 'icl',    name: '렌즈삽입술', cat: '시력', keywords: ['ICL','렌즈삽입','고도근시'] },
    { id: 'dryeye', name: '안구건조증', cat: '안질환', keywords: ['안구건조','IPL','마이봄샘'] },
    { id: 'cat',    name: '백내장',   cat: '안질환', keywords: ['백내장','다초점','단초점'] },
  ],
  family: [
    { id: 'checkup', name: '건강검진', cat: '검진', keywords: ['건강검진','종합검진','국가검진'] },
    { id: 'vacc_f',  name: '예방접종', cat: '예방', keywords: ['예방접종','대상포진','독감'] },
    { id: 'obesity', name: '비만관리', cat: '관리', keywords: ['비만','체중관리','다이어트약'] },
    { id: 'smoking', name: '금연치료', cat: '관리', keywords: ['금연','금연치료','니코틴'] },
    { id: 'fatigue', name: '만성피로', cat: '관리', keywords: ['만성피로','피로','영양주사'] },
  ],
};

// ────────────────────────────────────────────────────────────
// 병원 프로필 — localStorage 다중 저장
// ────────────────────────────────────────────────────────────
const PROFILES_KEY = 'clinic_profiles';
const ACTIVE_KEY   = 'clinic_active_profile';

// 의료광고법 위반 우려 표현 — 프로필 입력 시 차단
const FORBIDDEN_WORDS = [
  '최고','최상','최저가','특가','할인','이벤트','보장','100%','완벽',
  '부작용없음','안전보장','효과보장','영구','평생','완치','치유',
  '국내유일','업계1위','전국1위','명의','명문','명품',
];

function checkForbidden(text) {
  if (!text) return null;
  for (const w of FORBIDDEN_WORDS) {
    if (text.includes(w)) return w;
  }
  return null;
}

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); } catch (e) { return []; }
}
function saveProfiles(list) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(list)); } catch (e) {}
}
function loadActiveId() {
  try { return localStorage.getItem(ACTIVE_KEY) || ''; } catch (e) { return ''; }
}
function saveActiveId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else    localStorage.removeItem(ACTIVE_KEY);
  } catch (e) {}
}

// 프로필 → 본문 끝에 자연 삽입할 정보 블록 (마크다운)
function buildInfoBlock(p) {
  if (!p) return '';
  const lines = [];
  if (p.station)     lines.push(`• ${p.station}`);
  if (p.parking)     lines.push(`• ${p.parking}`);
  if (p.hours)       lines.push(`• ${p.hours}`);
  if (p.phone)       lines.push(`• 문의 ${p.phone}`);
  if (p.note)        lines.push(`• ${p.note}`);
  if (lines.length === 0) return '';
  const head = `### 📍 ${p.name || '병원'} 안내`;
  return `\n\n${head}\n${lines.join('\n')}\n`;
}

// 프로필 → AI에게 자연 언급을 유도하는 메모 텍스트
function buildProfileMemo(p) {
  if (!p) return '';
  const facts = [];
  if (p.station)  facts.push(p.station);
  if (p.parking)  facts.push(p.parking);
  if (p.hours)    facts.push(p.hours);
  if (p.note)     facts.push(p.note);
  if (facts.length === 0) return '';
  // 본문 안에 사실 정보로 자연스럽게 1~2회 녹이라는 지시
  return `[병원 사실 정보 — 본문 중 1~2회 자연스럽게 언급. 광고 표현 금지, 사실만]\n${facts.join(' / ')}`;
}

// 본문 끝 해시태그 라인 직전에 정보 블록 삽입
// (해시태그가 없으면 본문 끝에 추가)
function injectInfoBlock(text, block) {
  if (!text || !block) return text || '';
  const lines = text.split('\n');
  // 끝에서부터 해시태그 라인(연속) 찾기
  let firstTagIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (!t) continue;
    if (/^#[^\s#]/.test(t)) { firstTagIdx = i; continue; }   // #키워드 형태
    break;
  }
  if (firstTagIdx >= 0) {
    return [...lines.slice(0, firstTagIdx), block.trim(), '', ...lines.slice(firstTagIdx)].join('\n');
  }
  return text.trimEnd() + '\n' + block;
}

// ────────────────────────────────────────────────────────────
// 유틸: program 객체 빌드
// ────────────────────────────────────────────────────────────
function buildProgram(industry, pick, customId, customName, customKeyword, customCat) {
  const ind = INDUSTRIES.find(i => i.id === industry) || INDUSTRIES[0];
  const id   = (pick?.id   || customId   || 'custom').trim();
  const name = (pick?.name || customName || '').trim();
  const cat  = (pick?.cat  || customCat  || ind.defaultCat).trim();

  const keywords = pick?.keywords && pick.keywords.length
    ? pick.keywords
    : (customKeyword ? customKeyword.split(',').map(s => s.trim()).filter(Boolean) : [name]);

  const titlePatterns = [
    `{region} ${name} 후기`,
    `{region} ${name} 솔직 후기`,
    `{region} ${name} 받고 느낀점`,
  ];

  return {
    id,
    name,
    cat,
    industry,
    titlePatterns,
    keywords,
    compareWith: ind.compareWith,
  };
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────
export default function PublishPage() {
  const [industry, setIndustry]   = useState('clinic');
  const [region, setRegion]       = useState('');
  const [pickId, setPickId]       = useState('');
  const [memo, setMemo]           = useState('');
  const [overrideTitle, setOverrideTitle] = useState('');

  // 직접 입력
  const [useCustom, setUseCustom]       = useState(false);
  const [customId, setCustomId]         = useState('');
  const [customName, setCustomName]     = useState('');
  const [customCat, setCustomCat]       = useState('');
  const [customKeyword, setCustomKeyword] = useState('');

  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory]   = useState([]);
  const [copiedKey, setCopiedKey] = useState('');

  // ── 병원 프로필 ──
  const [profiles, setProfiles]     = useState([]);
  const [activeId, setActiveId]     = useState('');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editProfile, setEditProfile]         = useState(null); // 편집 모드 시 기존 프로필
  const [profileForm, setProfileForm] = useState({
    name: '', region: '', station: '', parking: '', hours: '', phone: '', note: '',
  });

  const activeProfile = useMemo(
    () => profiles.find(p => p.id === activeId) || null,
    [profiles, activeId]
  );

  const quickPicks = useMemo(() => QUICK_PICKS[industry] || [], [industry]);

  // 업종 바뀌면 빠른선택 초기화
  useEffect(() => {
    setPickId('');
    setUseCustom(false);
  }, [industry]);

  // 기록 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem('publish_history') || '[]';
      setHistory(JSON.parse(raw));
    } catch (e) {
      setHistory([]);
    }
  }, []);

  // 프로필 로드
  useEffect(() => {
    setProfiles(loadProfiles());
    setActiveId(loadActiveId());
  }, []);

  function openNewProfile() {
    setEditProfile(null);
    setProfileForm({
      name: '', region: region.trim() || '', station: '', parking: '', hours: '', phone: '', note: '',
    });
    setShowProfileForm(true);
  }
  function openEditProfile(p) {
    setEditProfile(p);
    setProfileForm({
      name: p.name || '', region: p.region || '',
      station: p.station || '', parking: p.parking || '',
      hours: p.hours || '', phone: p.phone || '', note: p.note || '',
    });
    setShowProfileForm(true);
  }
  function cancelProfileForm() {
    setShowProfileForm(false);
    setEditProfile(null);
  }
  function submitProfileForm() {
    setErrorMsg('');
    const f = profileForm;
    if (!f.name.trim()) { setErrorMsg('병원명은 필수입니다.'); return; }

    // 광고법 차단 — 모든 필드 검사
    for (const [k, v] of Object.entries(f)) {
      const hit = checkForbidden(v);
      if (hit) {
        setErrorMsg(`광고법 위반 우려 표현 감지: "${hit}" (${k}) — 사실 정보로 바꿔주세요`);
        return;
      }
    }

    const next = [...profiles];
    if (editProfile) {
      const idx = next.findIndex(p => p.id === editProfile.id);
      if (idx >= 0) next[idx] = { ...editProfile, ...f, updatedAt: Date.now() };
    } else {
      const id = 'p_' + Date.now().toString(36);
      next.push({ id, ...f, createdAt: Date.now() });
      setActiveId(id); saveActiveId(id);
    }
    setProfiles(next); saveProfiles(next);
    setShowProfileForm(false); setEditProfile(null);
  }
  function deleteProfile(id) {
    if (!confirm('이 프로필을 삭제할까요?')) return;
    const next = profiles.filter(p => p.id !== id);
    setProfiles(next); saveProfiles(next);
    if (activeId === id) { setActiveId(''); saveActiveId(''); }
  }
  function selectProfile(id) {
    setActiveId(id); saveActiveId(id);
  }

  function saveHistory(item) {
    const next = [item, ...history].slice(0, 10);
    setHistory(next);
    try { localStorage.setItem('publish_history', JSON.stringify(next)); } catch (e) {}
  }

  function togglePublished(idx) {
    const next = history.map((h, i) => i === idx ? { ...h, published: !h.published } : h);
    setHistory(next);
    try { localStorage.setItem('publish_history', JSON.stringify(next)); } catch (e) {}
  }

  // ──────────────────────────────────────────────────────────
  // 생성 호출
  // ──────────────────────────────────────────────────────────
  async function handleGenerate() {
    setErrorMsg('');
    setResult(null);

    if (!region.trim()) { setErrorMsg('지역을 입력하세요.'); return; }

    let pick = null;
    if (!useCustom) {
      pick = quickPicks.find(p => p.id === pickId);
      if (!pick) { setErrorMsg('빠른 선택 버튼을 선택하거나 직접 입력 모드를 켜세요.'); return; }
    } else {
      if (!customName.trim()) { setErrorMsg('직접 입력: 시술명(name)을 입력하세요.'); return; }
    }

    const program = buildProgram(industry, pick, customId, customName, customKeyword, customCat);

    // 프로필 자연 언급 메모 + 사용자 메모 결합
    const profileMemo = buildProfileMemo(activeProfile);
    const combinedMemo = [memo.trim(), profileMemo].filter(Boolean).join('\n\n');

    const body = {
      target: 'clinic',                 // 상용 분기 (반장 모드 아님)
      program,
      blogType: 'normal',
      mode: 'commercial',               // ★ v2.1 — 이 페이지는 상용 발행 전용. 항상 commercial 모드로 생성.
      userRegion: region.trim(),
      userMemo: combinedMemo || undefined,
      overrideTitle: overrideTitle.trim() || undefined,
      industry,
    };

    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || '생성 실패');
      } else {
        // 본문 끝에 정보 블록 자동 삽입 (해시태그 라인 직전)
        const infoBlock = buildInfoBlock(activeProfile);
        let finalText     = data.text || '';
        let finalMarkdown = data.textMarkdown || finalText;
        if (infoBlock) {
          finalText     = injectInfoBlock(finalText,     infoBlock);
          finalMarkdown = injectInfoBlock(finalMarkdown, infoBlock);
        }

        const title = (finalText || '').split('\n').find(l => l.startsWith('# '))?.replace(/^#\s+/, '').trim() || program.name;
        const item = {
          ts: Date.now(),
          industry,
          region: region.trim(),
          program: { id: program.id, name: program.name },
          profileId: activeProfile?.id || null,
          profileName: activeProfile?.name || null,
          title,
          charCount: finalText.replace(/\s+/g, '').length,
          qc: data.qc,
          text: finalText,
          textMarkdown: finalMarkdown,
          published: false,
        };
        setResult(item);
        saveHistory(item);
      }
    } catch (e) {
      setErrorMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ──────────────────────────────────────────────────────────
  // 복사 유틸
  // ──────────────────────────────────────────────────────────
  function copy(text, key) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1200);
    });
  }

  // 네이버용 본문: # 제목 + 해시태그 라인 제거 → 본문만 깔끔하게
  function buildNaverBody(text) {
    if (!text) return '';
    const lines = text.split('\n');
    const out = [];
    for (const l of lines) {
      if (l.trim().startsWith('# ')) continue;          // 제목 제거
      if (/^\s*#[\w가-힣]/.test(l.trim())) continue;    // 해시태그 라인 제거 (#키워드 #키워드)
      out.push(l);
    }
    return out.join('\n').trim();
  }

  function extractTitle(text) {
    if (!text) return '';
    const t = text.split('\n').find(l => l.startsWith('# '));
    return t ? t.replace(/^#\s+/, '').trim() : '';
  }

  function extractHashtags(text) {
    if (!text) return '';
    // 해시태그 라인(맨 마지막에 #으로 시작하는 라인들) 추출
    const lines = text.split('\n').reverse();
    const tags = [];
    for (const l of lines) {
      const t = l.trim();
      if (!t) continue;
      if (t.startsWith('#') && !t.startsWith('# ')) tags.unshift(t);
      else break;
    }
    return tags.join(' ');
  }

  const previewTitle    = result ? extractTitle(result.text) : '';
  const previewBodyMd   = result ? result.textMarkdown || result.text : '';
  const previewBodyNvr  = result ? buildNaverBody(result.text) : '';
  const previewTags     = result ? extractHashtags(result.text) : '';

  // ──────────────────────────────────────────────────────────
  // 렌더
  // ──────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={{fontWeight:700, fontSize:18}}>📝 반장닷컴 발행 도구 <span style={S.badge}>index-lite</span></div>
          <div style={S.subtle}>내부 발행 속도 극대화 · localStorage only</div>
        </div>
      </header>

      <main style={S.main}>
        {/* LEFT — 입력 폼 + 결과 */}
        <section style={S.left}>

          {/* 0. 병원 프로필 — 활성화하면 본문에 자동 반영 */}
          <div style={S.card}>
            <div style={S.cardTitle}>
              🏥 병원 프로필
              <span style={{...S.subtle, fontWeight: 400, marginLeft: 8}}>
                활성화하면 본문에 사실 정보가 자동 반영됩니다
              </span>
            </div>

            {!showProfileForm && (
              <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                <select
                  style={{...S.input, maxWidth: 280}}
                  value={activeId}
                  onChange={e => selectProfile(e.target.value)}
                >
                  <option value="">— 사용 안 함 —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.region ? ` (${p.region})` : ''}
                    </option>
                  ))}
                </select>
                <button style={S.miniBtn} onClick={openNewProfile}>+ 새 프로필</button>
                {activeProfile && (
                  <>
                    <button style={S.miniBtn} onClick={() => openEditProfile(activeProfile)}>편집</button>
                    <button style={{...S.miniBtn, color:'#B71C1C'}} onClick={() => deleteProfile(activeProfile.id)}>삭제</button>
                  </>
                )}
              </div>
            )}

            {!showProfileForm && activeProfile && (
              <div style={S.profilePreview}>
                <div style={{fontWeight:700, marginBottom:4}}>{activeProfile.name}</div>
                <div style={{fontSize:12, color:'#555', lineHeight:1.6}}>
                  {[activeProfile.station, activeProfile.parking, activeProfile.hours, activeProfile.phone, activeProfile.note]
                    .filter(Boolean).join(' · ') || <span style={S.subtle}>입력된 정보 없음 — 편집하세요</span>}
                </div>
              </div>
            )}

            {showProfileForm && (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                <input style={S.input} placeholder="병원명 *"                          value={profileForm.name}    onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                <input style={S.input} placeholder="지역 (예: 강남)"                  value={profileForm.region}  onChange={e => setProfileForm({...profileForm, region: e.target.value})} />
                <input style={S.input} placeholder="역 정보 (예: 강남역 도보 3분)"     value={profileForm.station} onChange={e => setProfileForm({...profileForm, station: e.target.value})} />
                <input style={S.input} placeholder="주차 (예: 건물 지하주차장 이용)"  value={profileForm.parking} onChange={e => setProfileForm({...profileForm, parking: e.target.value})} />
                <input style={S.input} placeholder="진료시간 (예: 평일 야간진료)"     value={profileForm.hours}   onChange={e => setProfileForm({...profileForm, hours: e.target.value})} />
                <input style={S.input} placeholder="전화번호"                          value={profileForm.phone}   onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                <input style={{...S.input, gridColumn: '1 / -1'}} placeholder="기타 안내 (예: 무료 주차 2시간 / 예약제 운영)" value={profileForm.note} onChange={e => setProfileForm({...profileForm, note: e.target.value})} />

                <div style={{gridColumn: '1 / -1', fontSize:11, color:'#888', lineHeight:1.5, padding:'4px 2px'}}>
                  ⚠️ 광고법 위반 우려 표현은 자동 차단됩니다 (최고/특가/할인/보장 등). 사실 정보만 입력하세요.
                </div>

                <div style={{gridColumn: '1 / -1', display:'flex', gap:8}}>
                  <button style={S.primarySm} onClick={submitProfileForm}>
                    {editProfile ? '수정 저장' : '+ 저장'}
                  </button>
                  <button style={S.miniBtn} onClick={cancelProfileForm}>취소</button>
                </div>
              </div>
            )}
          </div>

          <div style={S.card}>
            <div style={S.cardTitle}>1. 지역 · 업종</div>
            <div style={S.row}>
              <input
                style={S.input}
                placeholder="지역 (예: 강남, 홍대, 분당 정자동)"
                value={region}
                onChange={e => setRegion(e.target.value)}
              />
              <select style={{...S.input, maxWidth:240}} value={industry} onChange={e => setIndustry(e.target.value)}>
                {INDUSTRIES.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
              </select>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardTitle}>
              2. 시술 선택
              <button
                style={{...S.miniBtn, marginLeft:8}}
                onClick={() => setUseCustom(v => !v)}
              >
                {useCustom ? '← 빠른선택으로' : '직접 입력으로 →'}
              </button>
            </div>

            {!useCustom && (
              <div style={S.pickGrid}>
                {quickPicks.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPickId(p.id)}
                    style={{
                      ...S.pickBtn,
                      ...(pickId === p.id ? S.pickBtnOn : {}),
                    }}
                  >
                    <div style={{fontWeight:600}}>{p.name}</div>
                    <div style={S.pickMeta}>{p.cat} · {p.keywords.slice(0,2).join('/')}</div>
                  </button>
                ))}
                {quickPicks.length === 0 && <div style={S.subtle}>이 업종 빠른선택 없음 — 직접 입력 사용</div>}
              </div>
            )}

            {useCustom && (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                <input style={S.input} placeholder="id (영문, 예: filler)"     value={customId}      onChange={e => setCustomId(e.target.value)} />
                <input style={S.input} placeholder="name (한글, 예: 필러)"     value={customName}    onChange={e => setCustomName(e.target.value)} />
                <input style={S.input} placeholder="cat (카테고리)"            value={customCat}     onChange={e => setCustomCat(e.target.value)} />
                <input style={S.input} placeholder="keywords (콤마 구분)"      value={customKeyword} onChange={e => setCustomKeyword(e.target.value)} />
              </div>
            )}
          </div>

          <div style={S.card}>
            <div style={S.cardTitle}>3. 옵션 (선택)</div>
            <input
              style={{...S.input, marginBottom:8}}
              placeholder="제목 강제 지정 (overrideTitle, 비워두면 자동)"
              value={overrideTitle}
              onChange={e => setOverrideTitle(e.target.value)}
            />
            <textarea
              style={{...S.input, height:70, fontFamily:'inherit'}}
              placeholder="메모 (userMemo, 글에 반영할 특이사항)"
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
          </div>

          <div style={{display:'flex', gap:8, alignItems:'center', margin:'8px 0 16px'}}>
            <button style={S.primary} onClick={handleGenerate} disabled={loading}>
              {loading ? '생성 중…' : '🚀 생성하기'}
            </button>
            {errorMsg && <div style={S.err}>{errorMsg}</div>}
          </div>

          {result && (
            <div style={S.card}>
              <div style={S.cardTitle}>📄 결과</div>

              <div style={S.titleBox}>
                <div style={{fontSize:12, color:'#888'}}>제목</div>
                <div style={{fontSize:17, fontWeight:700, marginTop:4}}>{previewTitle}</div>
              </div>

              <div style={S.qcRow}>
                <QCBadge label="글자수" value={result.charCount} good={result.charCount >= 2000} />
                <QCBadge label="정보블럭" value={result.qc?.hasInfoBlock ? 'O' : 'X'} good={!!result.qc?.hasInfoBlock} />
                <QCBadge label="수치" value={result.qc?.hasExamValue ? 'O' : 'X'} good={!!result.qc?.hasExamValue} />
                <QCBadge label="키워드" value={result.qc?.kwCount ?? '-'} good={(result.qc?.kwCount ?? 0) >= 5} />
                <QCBadge label="복합KW" value={result.qc?.fullKwCount ?? '-'} good={(result.qc?.fullKwCount ?? 0) >= 3} />
                {Array.isArray(result.qc?.violations) && result.qc.violations.length > 0 && (
                  <QCBadge label="위반" value={result.qc.violations.length} good={false} />
                )}
              </div>

              <div style={S.copyRow}>
                <button style={S.copyBtn} onClick={() => copy(previewTitle, 'title')}>
                  {copiedKey === 'title' ? '✓ 복사됨' : '제목 복사'}
                </button>
                <button style={S.copyBtn} onClick={() => copy(previewBodyNvr, 'naver')}>
                  {copiedKey === 'naver' ? '✓ 복사됨' : '네이버용 본문'}
                </button>
                <button style={S.copyBtn} onClick={() => copy(previewBodyMd, 'md')}>
                  {copiedKey === 'md' ? '✓ 복사됨' : '마크다운 전체'}
                </button>
                <button style={S.copyBtn} onClick={() => copy(previewTags, 'tags')}>
                  {copiedKey === 'tags' ? '✓ 복사됨' : '해시태그'}
                </button>
              </div>

              <div style={S.preview}>
                <pre style={S.pre}>{result.text}</pre>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT — 최근 10건 */}
        <aside style={S.right}>
          <div style={S.cardTitle}>🕘 최근 10건</div>
          {history.length === 0 && <div style={S.subtle}>아직 없음</div>}
          {history.map((h, i) => (
            <div key={h.ts} style={S.histItem}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontWeight:600, fontSize:13}}>
                  {h.region} · {h.program?.name}
                </div>
                <label style={{fontSize:11, color:'#666', display:'flex', alignItems:'center', gap:4}}>
                  <input type="checkbox" checked={!!h.published} onChange={() => togglePublished(i)} />
                  발행
                </label>
              </div>
              <div style={{fontSize:11, color:'#888', marginTop:2}}>
                {new Date(h.ts).toLocaleString()} · {h.charCount}자
                {h.qc?.hasInfoBlock ? ' · 블럭O' : ' · 블럭X'}
                {h.qc?.hasExamValue ? ' · 수치O' : ' · 수치X'}
                {h.profileName ? ` · 🏥 ${h.profileName}` : ''}
              </div>
              <div style={{fontSize:12, marginTop:4, color:'#333', lineHeight:1.4}}>
                {h.title}
              </div>
              <div style={{display:'flex', gap:4, marginTop:6}}>
                <button style={S.miniBtn} onClick={() => setResult(h)}>다시 보기</button>
                <button style={S.miniBtn} onClick={() => copy(h.title, 'h-title-'+i)}>
                  {copiedKey === 'h-title-'+i ? '✓' : '제목'}
                </button>
                <button style={S.miniBtn} onClick={() => copy(buildNaverBody(h.text), 'h-body-'+i)}>
                  {copiedKey === 'h-body-'+i ? '✓' : '본문'}
                </button>
              </div>
            </div>
          ))}
        </aside>
      </main>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
function QCBadge({ label, value, good }) {
  return (
    <div style={{
      ...S.qcBadge,
      background: good ? '#E8F5E9' : '#FFEBEE',
      color:      good ? '#1B5E20' : '#B71C1C',
      borderColor:good ? '#A5D6A7' : '#EF9A9A',
    }}>
      <span style={{opacity:0.7, marginRight:4}}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 인라인 스타일
// ────────────────────────────────────────────────────────────
const S = {
  page:      { minHeight:'100vh', background:'#F5F6F8', color:'#222', fontFamily:'-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif' },
  header:    { background:'#fff', borderBottom:'1px solid #eee', padding:'12px 0' },
  headerInner:{ maxWidth:1200, margin:'0 auto', padding:'0 16px', display:'flex', justifyContent:'space-between', alignItems:'baseline' },
  badge:     { fontSize:11, background:'#222', color:'#fff', padding:'2px 6px', borderRadius:4, marginLeft:6 },
  subtle:    { color:'#888', fontSize:12 },

  main:      { maxWidth:1200, margin:'0 auto', padding:'16px', display:'grid', gridTemplateColumns:'1fr 320px', gap:16, alignItems:'start' },
  left:      { display:'flex', flexDirection:'column', gap:12 },
  right:     { background:'#fff', border:'1px solid #eee', borderRadius:8, padding:12, position:'sticky', top:12, maxHeight:'calc(100vh - 24px)', overflowY:'auto' },

  card:      { background:'#fff', border:'1px solid #eee', borderRadius:8, padding:14 },
  cardTitle: { fontWeight:700, marginBottom:10, fontSize:14, display:'flex', alignItems:'center' },

  row:       { display:'flex', gap:8 },
  input:     { flex:1, padding:'10px 12px', border:'1px solid #ddd', borderRadius:6, fontSize:14, outline:'none', background:'#fff' },

  pickGrid:  { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:8 },
  pickBtn:   { textAlign:'left', padding:'10px 12px', border:'1px solid #ddd', borderRadius:6, background:'#fff', cursor:'pointer', fontSize:13 },
  pickBtnOn: { borderColor:'#1976D2', background:'#E3F2FD' },
  pickMeta:  { fontSize:11, color:'#888', marginTop:2 },

  primary:   { padding:'12px 20px', background:'#1976D2', color:'#fff', border:'none', borderRadius:6, fontSize:15, fontWeight:600, cursor:'pointer' },
  primarySm: { padding:'7px 14px',  background:'#1976D2', color:'#fff', border:'none', borderRadius:5, fontSize:13, fontWeight:600, cursor:'pointer' },
  err:       { color:'#B71C1C', fontSize:13 },

  titleBox:  { padding:10, background:'#FAFAFA', borderRadius:6, marginBottom:10 },
  qcRow:     { display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 },
  qcBadge:   { fontSize:12, padding:'4px 8px', borderRadius:12, border:'1px solid' },

  copyRow:   { display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 },
  copyBtn:   { padding:'6px 12px', background:'#222', color:'#fff', border:'none', borderRadius:4, fontSize:12, cursor:'pointer' },

  preview:   { background:'#FAFAFA', border:'1px solid #eee', borderRadius:6, padding:12, maxHeight:480, overflowY:'auto' },
  pre:       { whiteSpace:'pre-wrap', wordBreak:'break-word', fontFamily:'inherit', margin:0, fontSize:13, lineHeight:1.6 },

  histItem:  { padding:8, borderBottom:'1px solid #f0f0f0', marginBottom:4 },
  miniBtn:   { padding:'3px 8px', background:'#fff', border:'1px solid #ccc', borderRadius:4, fontSize:11, cursor:'pointer' },
  profilePreview: { marginTop:10, padding:'10px 12px', background:'#F3F8FF', border:'1px solid #BBDEFB', borderRadius:6 },
};
