# AI-POST · PROJECT HISTORY / FAILURE MEMORY v1.0

**상태:** ACTIVE / 재발방지용 실전 이력  
**목적:** 모든 과거 작업을 기록하는 일지가 아니라, 현재 구조와 운영 규칙이 왜 생겼는지 Claude가 이해해야 하는 사고·오류·교훈을 보존한다.

> 이 문서는 Decision Log를 대체하지 않는다. 영구 정책은 원본 Decision/Architecture가 정본이다.

---

# H-001 · FREEZE와 자동 엔진 수정 충돌

**문제:** 관측/학습 결과를 엔진에 자동 반영하면 자기강화는 빨라지지만 FREEZE가 무의미해지고 과최적화 위험이 생긴다.

**결정:** AI는 개선안을 제안할 뿐. 관리자 승인 Gate 이후에만 엔진 업데이트.

**재발방지:** Claude가 “관측 결과가 이러니 Prompt를 자동 수정”하는 구조를 만들지 않는다.

---

# H-002 · QC와 관측 혼합 금지

**문제:** 글 자체 품질(QC)과 네이버 실제 성과(관측)를 섞으면 원인 분석이 불가능해진다.

**결정:** QC와 Observation은 독립. 상관분석에서 처음 만난다.

**재발방지:** 관리자 화면을 합치더라도 데이터 책임/SoT를 임의 통합하지 않는다.

---

# H-003 · Blog → pSEO 복제 오해

**문제:** 발행 블로그를 그대로 ai-post.ai에 다시 게시하면 검색 역할 중복과 대량복제 구조가 된다.

**영구 결정:** `PSEO-SEARCH-ASSET-SEPARATION-01`

```text
같은 Source, 다른 Search Value
Blog = 정보/설명/전문성/설득
pSEO = 지역/업체/서비스 탐색
```

**재발방지:** Blog 본문/제목을 P페이지·pSEO에 기계적으로 복사하지 않는다.

---

# H-004 · 업체 FACT Core와 pSEO 직접조회 전환 위험

**TRACE 결과:** 현재 MyPage는 `PATCH /api/me/store → store_profiles`를 사용하고, 엔진은 Core Builder를 거치지만 pSEO는 `store_profiles`를 직접 조회한다.

Core를 pSEO에 즉시 연결하면 place URL, 전화 분리, visit_info 다수 키, 미선언 업종 View 등이 손실될 위험이 확인됐다.

**결정:** pSEO Core 전환 HOLD. 신규 DDL 미승인. `visit_info` 현행 SoT 유지. Intent/JSON-LD/AEO/GEO 변경 금지.

**재발방지:** “공통 Core가 있으니 pSEO도 바로 연결”하지 않는다. 대조표와 회귀 Gate가 먼저다.

---

# H-005 · FACT 이름이 비슷하다고 같은 개념이 아님

**확인된 구분:**
- `departments` = 엔진 분야/겸업 분류
- 엔진 `TREATMENTS` = 메뉴 카탈로그
- `publish_history.treatment_name` = 발행 당시 선택 메뉴
- 업체 실제 제공 서비스 FACT = 별도 개념

**재발방지:** 컬럼 이름이 비슷하거나 데이터가 있어 보인다는 이유로 정본으로 재사용하지 않는다.

---

# H-006 · P페이지 작업 기준선 오인 사건 (2026-09-30)

**사건:** `PseoRoom.js`, `lib/pseo/access.js`, P페이지 메뉴 관련 코드가 기존 정식 기준선이라고 보고 TRACE했으나 실제로는 이전 작업이 작업폴더에 미커밋 상태로 남아 있었다.

**위험:** 새 STEP이 미커밋 이전 작업 위에 쌓여 축별 변경 추적이 어려워짐.

**처리:** 변경 조각을 분리하여 3개 커밋으로 정리.

- `8ff75f9` — `PSEO-MINIHOME-UI-01`
- `2f73862` — `PSEO-MY-SEARCH-PAGE-UX-01A`
- `27f6201` — `P-PAGE-ONE-SCREEN-01 STEP 1`

**재발방지 규칙:** 모든 작업 시작 전 `git status / branch / log / diff / staged diff` 확인. 기존 dirty tree의 출처를 모르면 구현 금지. 같은 파일에 여러 축이 섞이면 hunk 단위 분리.

---

# H-007 · Enterprise eligibility 누락

**사건:** 실제 유료 Enterprise 플랜이 다른 결제/플랜 코드에서는 유료로 취급되지만 `lib/pseo/eligibility.js`의 `PAID_PLANS`에는 `basic/standard/pro`만 있어 Enterprise가 `PLAN_NOT_PAID`로 차단될 수 있었다.

**수정:** 별도 브랜치 `fix/pseo-eligibility-enterprise-gap`, 커밋 `a472ebe`. `eligibility.js`에 enterprise만 추가. 다른 공개 Gate/계정 fallback은 건드리지 않음.

**상태:** 수정 커밋 보존. 현재 P페이지 작업 브랜치와 병합하지 않은 상태(2026-09-30 기준).

**재발방지:** 결제 플랜 enum/allowlist가 여러 위치에 있을 때 하나만 보고 유료 여부를 판단하지 않는다. 실제 eligibility 경로를 회귀검증한다.

---

# H-008 · `specialty` 무관 저장 시 소실 위험

**발견:** `Store.js`의 기본정보 저장 경로에서 `specialty`를 사용자가 건드리지 않아도 항상 payload에 포함할 수 있고, state가 `""`이면 서버가 `null`로 저장하여 음식점 전문점 값이 지워질 수 있다.

**추가 위험:** 계정 전환 시 stale state가 남으면 다른 계정 값 오염 가능성.

**핵심 교훈:** 공유 save 함수는 관련 없는 필드를 같이 보내지 않아야 한다.

**선장 원칙:** “이번 저장에서 사용자가 수정하지 않은 필드는 보내지 않는다.”

**상태:** 2026-09-30 기준 TRACE 완료, 수정 미승인/미구현. 별도 축 `STORE-SPECIALTY-PRESERVE-01` 후보.

**재발방지:** 기본정보 저장과 엔진 분기 필드 저장 계약을 분리해 검증. 단순 dirty-ref 추가가 목표가 아니라 무관 저장이 specialty에 영향을 주지 않는 계약이 목표.

---

# H-009 · 사진 시스템을 있다고 가정하면 안 됨

**P페이지 TRACE:** 현 저장소에서 재사용 가능한 영구 서버 사진 저장 구조가 확인되지 않았다. Supabase Storage 사용 코드가 없고, 기존 이미지 흐름 상당수는 브라우저 blob/base64 분석/임시 생성 URL 수준이다. `store_profiles.photo_pool`도 실사용 경로가 확인되지 않았다.

**결정:** P페이지 실제 업체사진은 별도 저장계약 설계가 필요. UI Shell 단계에서 bucket/API를 임의 생성하지 않는다.

**재발방지:** 사진은 먼저 시스템 치환형인지 발행자 첨부형인지 TRACE. 존재하지 않는 storage를 가정하지 않는다.

---

# H-010 · Owner Preview와 Public Gate 혼동 금지

**TRACE:** 공개 `/p`는 public eligibility/gate를 사용하고, 인증은 Bearer 중심이라 단순 iframe으로 OWNER preview를 만들기 어렵다. 공개 조건을 풀어 preview를 해결하면 public gate 회귀가 생길 수 있다.

**결정:** Preview는 별도 축. public `/p` gate를 UI 편의를 위해 완화하지 않는다.

**재발방지:** owner/private preview와 public published page를 같은 접근제어로 취급하지 않는다.

---

# H-011 · 미래 아이디어가 현재 개발축을 먹는 문제

**문제:** AEO/GEO/FAQ/AI Discovery/새 퍼널 등 좋은 아이디어가 나오면 즉시 개발 요구로 변질될 수 있다.

**결정:** `REFERENCE ONLY` 자산은 개발 승인 아님. 필요성이 확인되면 별도 TRACE → 선장 판정 → 정식 축 OPEN.

**재발방지:** “향후 좋다”와 “지금 구현한다”를 분리한다.

---

# H-012 · 사용자에게 기술 판단을 떠넘기는 문제

**문제:** Claude가 복수 구현안을 사용자에게 직접 선택시키면 사용자가 개발 중간 관리자 역할을 하게 되고 전체 아키텍처 판단이 분산된다.

**결정:** 사용자는 로그인/실결제/실사이트 확인 등 인간 조작 중심. 구조 선택은 근거·대안·영향을 선장에게 보고하고 STOP.

---

# 이력 추가 규칙

새 History 항목은 다음 조건 중 하나를 만족할 때만 추가한다.

- 데이터 소실/오염 가능성
- 결제/권한/공개 Gate 사고
- FREEZE 회귀
- SoT 중복/오해
- 잘못된 기준선/커밋 혼합
- 반복 가능성이 높은 구조적 버그
- 현재 운영규칙이 생긴 이유를 설명하는 중요한 사건

형식:

```text
# H-XXX · 제목
사건/문제:
원인:
영향:
처리:
상태:
재발방지:
관련 축/커밋:
```

사소한 UI 문구 수정이나 일회성 작업일지는 기록하지 않는다.
