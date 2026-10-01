# AI-POST · CURRENT MISSION

**기준일:** 2026-10-01  
**현재 대형 목표:** P페이지 1F 완성  
**현재 상태:** 운영팩 설치·활성화 완료(헌법 v1.0) → 본 작업 복귀 대기. 다음 = ① P페이지 실제 화면 확인(USER PRODUCT PASS)

> 이 문서는 영구 헌법이 아니다. 현재 항해 상태를 기록하며 선장 지시에 따라 갱신한다.
> 세션 인수인계는 이 문서로 한다. 새 세션은 이 문서만으로 현재 위치를 복원할 수 있어야 한다.

---

# 1. 현재 제품 방향

현재 우선순위는 **P페이지 1F**다.

제품 층:

```text
Blog = 콘텐츠 생성
P 1F = 업체당 대표 검색 거점 / Mini Homepage
P 2F = 지역×서비스 검색확장 (별도 유료/임대 개념)
3F = 전환 Funnel (별도 부가 과금 후보)
```

현재는 **1F만 진행**한다.

금지:
- 2F 구현
- Funnel 구현
- AEO/GEO 별도 기능
- JSON-LD 확장
- Blog FREEZE 엔진 수정

---

# 2. P페이지 1F 목표 UX

사용자는 MyPage에서 최소 사업자 기본정보를 등록한다.

P페이지에 들어오면 같은 SoT의 기존 정보가 자동으로 보인다. 별도의 “업체정보 불러오기” 버튼은 두지 않는다.

P페이지는 장기적으로 한 화면에서:

```text
왼쪽: 업체 FACT 관리
오른쪽: 내 P페이지 Preview
```

를 지향한다.

1F 정보 목표:
- 업체 기본정보
- 운영/상담/출장정보
- 서비스 가능지역
- 실제 제공 서비스/진행순서/업무방식
- 실제 업체사진
- 연락 CTA

목표 방향: 사용자가 MyPage ↔ P페이지를 반복 이동하지 않는다. 업체명·주소·전화·생활권 같은 안전한 기본정보는 P페이지에서 직접 수정하는 방향(③ 단계, 아직 미구현).

업종은 엔진 라우팅 영향이 있으므로 일반 기본정보처럼 자유 수정하지 않는다(읽기 전용 유지).

---

# 3. 기준선 / 커밋 현황

작업 브랜치: `feat/p-page-one-screen-01`

```text
7c6ce17  OPERATING-PACK-INSTALL-01   운영헌법 v1.0 + docs/claude 3종 (문서 전용)
27f6201  P-PAGE-ONE-SCREEN-01 STEP 1 UI Shell
2f73862  PSEO-MY-SEARCH-PAGE-UX-01A  마이페이지 「내 검색페이지」 카드(생활권만)
8ff75f9  PSEO-MINIHOME-UI-01         P페이지 방 1차(메뉴 · 입장판정 · PseoRoom)
695b9b3  (main 기준선) PSEO-INTERNAL-WORK-MODE-FIX-01
```

- `8ff75f9`, `2f73862`는 작업폴더에 미커밋으로 남아 있던 이전 작업을 hunk 단위로 분리해 커밋한 것(H-006).
- push / main merge 없음.

별도 브랜치 보존:
- `fix/pseo-eligibility-enterprise-gap` — commit `a472ebe` (eligibility `PAID_PLANS` 에 enterprise 추가)
- 기술검증은 코드 수준(isPseoEligible 스텁 회귀 10케이스)까지. 실제 Enterprise 계정 `/p` 공개는 미검증.
- 현재 브랜치에 임의 병합·cherry-pick 금지.

무관 dirty tree: 156건(M 5 + D 49 + ?? 102, 2026-10-01 실측). 절대 stage하지 않는다.

**HOLD — 출처 불명 기존 dirty (수정·복구·stage·commit·삭제 금지):**
- `data/patterns_clinic.json` (mtime 2026-08-25)
- `lib/restaurant-prompts.js` (mtime 2026-09-20)
- `pages/api/generateRestaurant.js` (mtime 2026-09-20)

이 세션 작업 이전부터 존재. 해당 엔진을 실제로 열 때 별도 TRACE 축으로 처리한다.

`.claude/launch.json`(dev 서버 설정)은 도구용이며 커밋 대상이 아니다.

---

# 4. STEP 1 UI Shell 현재 상태 (`27f6201`)

**상태: TECHNICAL PASS / PRODUCT PASS 미완료 → CLOSE 아님.**

진입: P페이지 › ⚙️ 기본 설정 (`navView="pseo-basic"`, 서버 `pseo_access.can_enter` 충족 시)

## 왼쪽 (`StoreInfoForm section="pseo"`, `lib/Store.js`)
- 🏢 업체 기본정보 — 표시 전용(업체명·업종·주소·전화·생활권, 출장형은 서비스 가능지역=`visit_info.serviceArea`) + [마이페이지에서 수정] 버튼
  - ※ 표시 전용 + 마이페이지 왕복은 최종 UX가 아님(③ 단계에서 직접편집으로 전환 예정)
- 운영·상담·출장정보 — 마이페이지와 동일 `visitSection` (저장 `onSaveVisit` → `visit_info`)
- 🔎 검색 정보(`meta.search_fact`) — OWNER / store 14 만 편집기 노출, 그 외 「입력은 준비 중」
- 📷 업체 사진 — 「대표사진과 실제 업체사진을 등록할 수 있습니다.」 + 비활성 [준비 중]

## 오른쪽 (`lib/PseoRoom.js`)
- 「내 P페이지 미리보기 / 업체 사진과 미리보기 기능은 다음 단계에서 연결됩니다.」 placeholder

## MyPage
- 중복 `search_fact` 편집기 제거됨(편집 위치 = P페이지 단일)
- 기본정보·생활권·방문정보·제목설정·「내 검색페이지」 카드는 유지

새 DB/API/photo storage/Preview/public gate 변경 없음.

검증 완료: SSR 렌더 회귀 20항목 PASS, 이동 블록 원본 동일, 로컬 컴파일 정상.
미검증: 실제 로그인 화면(①).

---

# 5. 진행 순서

```text
① 실제 로그인 화면 확인 (USER PRODUCT PASS)   ← 지금 여기
→ ② STORE-SPECIALTY-PRESERVE-01
→ ③ P페이지 기본정보 직접편집
→ ④ 실제 저장 E2E
→ ⑤ 업체사진 저장계약/구현
→ ⑥ Preview
```

각 단계는 선장 기술판정 후, UI 축은 사용자 PRODUCT PASS까지 받아야 다음 단계로 넘어간다(헌법 §9.1).

---

# 6. 즉시 다음 작업 — ① 실제 화면 확인

**이 단계에서 코드 수정 금지.** 사용자 확인 범위는 `27f6201`과 그 변경으로 영향받은 화면으로 한정(과거 커밋 재OPEN 금지).

Claude 준비:
1. git 기준선 확인(헌법 §8)
2. dev 서버 실행 — `.claude/launch.json` 의 `next-dev` (`npx next dev -p 3100`)
3. 사용자에게 아래 확인 절차를 짧게 제시

사용자 조작(로그인은 사용자만 가능 · Claude는 비밀번호 입력 불가):

```text
localhost:3100 접속 → OWNER 또는 store 14 계정으로 로그인
① P페이지 → ② 기본 설정
③ 왼쪽에 기존 업체정보가 자동으로 들어와 있는지
④ 운영/상담/출장 정보 · 검색정보 위치 · 업체사진 「준비 중」
⑤ 오른쪽 미리보기 자리
⑥ 레이아웃 깨짐 / 스크롤 / 중복 UI
⑦ 마이페이지에 검색정보(search_fact) 편집기가 없는지
저장 버튼은 누르지 않는다. 화면이 의도와 맞는지만 본다.
```

- 사용자 “맞다” → PRODUCT PASS
- 사용자 “의도와 다르다” → PRODUCT FAIL. Claude는 즉시 수정하지 않고 `의도 / 실제 화면 / 차이 / 관련 코드경로` 보고 후 STOP.

Claude는 스크린샷(데스크톱 폭)과 실측을 보고하고 STOP.

---

# 7. 다음 결함 축 — STORE-SPECIALTY-PRESERVE-01

**상태: TRACE 완료 / 구현 미승인. ① PRODUCT PASS 전 시작 금지.**

TRACE 결과(코드 경로):
- `lib/Store.js:146` — `specialty` state는 마운트 시 1회 `initialSpecialty || hubStore.specialty || ""` 로 초기화
- 이후 변경 경로는 `openEditFor(ind, spec)`(업종센터 선택)·`initialSpecialty` effect 뿐
- `[hubStore]` 재초기화 effect는 form/visitInfo/searchFact만 재동기화 — **specialty 제외**
- `onApplyIdent`(기본정보 저장)는 항상 `specialty: specialty || ""` 를 PATCH
- 서버 `pages/api/me/store.js` — body에 키가 있고 값이 `""` 면 **null 저장**

위험:
- hubStore 도착 전 폼이 마운트되면 `""` 고정 → 업체명·주소·전화만 저장해도 전문점 값 소실(무경고)
- 로그아웃 없이 계정 전환 시 이전 계정 specialty가 새 계정에 기록될 수 있음
- 현재 P페이지(pseoLeft)는 pseoAccess와 hubStore가 같은 시점에 들어와 B 경로는 성립하지 않음 — 그러나 ③에서 같은 저장 함수를 재사용하기 전에 막아야 함

선장 원칙:
> 이번 저장에서 사용자가 수정하지 않은 필드는 보내지 않는다.
> 목표는 dirty-ref 추가가 아니라, 업체명·주소·전화 수정이 specialty에 절대 영향을 주지 않는 저장 계약.

범위: 최소 변경. 음식점 엔진·전문점 로직·DB·P페이지 확장 금지. 서버 저장계약(`me/store.js`) 변경이 필요해 보이면 영향분석 후 STOP(헌법 §7).

필수 회귀: 전문점 유지 / 일반 음식점 유지 / 업체명만 / 주소만 / 전화만 수정 / 전문점 정상 변경·해제 경로. 실제 전문점 테스트 계정으로 검증(jsdom 등 신규 의존성 설치 금지).

---

# 8. ③ 기본정보 직접편집 — TRACE 결과 (구현 미승인)

- 업체명·주소·전화: 마이페이지 「🏥 업체 기본정보」 편집기 → `onApplyIdent` → `saveStore` PATCH 재사용 가능
  - 주소 변경 시 `suggestRegion` 으로 region 자동추출 동반, 실패 시 region 키 미전송
  - 주소/업종 변경 시 확인 단계 + ⚠️ 경고
- 생활권: `regionSection` → `onSaveSubRegion` 재사용 가능(POSTING 생활권 방에서 이미 재사용)
- 업종: P페이지에서는 읽기 전용. 클라이언트는 업종 변경 시에만 `/api/store-industry` 호출, 서버는 비OWNER 업종 변경을 제거(`industry_denied`)
- 구현안(승인 대기): `regionSection`/`visitSection` 과 같은 방식으로 기본정보 편집기 JSX를 `identSection` 상수로 이동 → P페이지 표시카드 대체, 업종 칸은 읽기 전용
- **선행 조건: ② specialty 보존 CLOSE**

---

# 9. search_fact 권한

현재 `search_fact` 편집은 `canManagePseoFact`(OWNER 또는 store 14)로 잠겨 있다. 일반 유료회원 P페이지에서는 「입력은 준비 중」으로 보인다.

UI 축에서 임의로 권한을 풀지 않는다. 향후 eligibility/permission 별도 축에서 처리한다.

---

# 10. 업체사진

TRACE 결과 현재 재사용 가능한 영구 서버 사진 저장 구조가 없다(Storage 코드 0, blob/base64/임시 URL 수준, `photo_pool` 미사용).

사진 단계:

```text
DESIGN FIRST
→ 실제 저장 위치/소유권/공개성/삭제/대표사진 계약 (대표사진 1 + 추가사진 복수)
→ 최소 구현
→ 업로드/표시/삭제 E2E
```

선장 승인 전:
- Supabase bucket 생성 금지
- 신규 upload API 금지
- `photo_pool` 임의 정본화 금지

AI 생성 이미지를 실제 업체사진으로 사용하지 않는다.

---

# 11. Preview

Preview는 사진 다음 축이다.

원칙:
- Public `/p` gate를 Preview 편의를 위해 완화하지 않는다.
- OWNER/private preview와 public page 접근제어를 분리한다.
- 인증은 Bearer 전용(쿠키 없음) → `/p` SSR에서 본인 판별 불가. iframe 우회 금지.
- shared renderer/API refactor(`hubData.js` 추출, `/p` SSR 변경)는 DESIGN/TRACE 후 승인.

---

# 12. HOLD 목록

- 출처 불명 FREEZE 계열 dirty 3건(§3)
- 헌법 §7 FREEZE 문구 중 `publish`, `ensure` 범위 정밀화 — 의미 TRACE 전 수정 금지
- Enterprise 수정 `a472ebe` 병합 시점 — 선장 결정

---

# 13. STOP 조건

Claude는 다음 상황에서 즉시 STOP하고 선장 판정을 요청한다.

- 현재 단계 밖 파일 수정이 필요함
- DB/DDL/API/storage가 필요해 보임
- FREEZE 파일을 건드려야 함
- public `/p` gate 변경이 필요함
- 기존 SoT와 충돌
- 다른 미커밋 축 발견
- 실제 데이터 소실 가능성 발견
- 사용자에게 기술 설계 선택을 요구해야 하는 상황
- 사용자가 화면을 보고 “의도와 다르다”고 판단함(PRODUCT FAIL)

---

# 14. 세션 운영

- 작업 세션은 항상 하나만 사용한다. 두 세션이 같은 작업폴더를 동시에 수정하지 않는다.
- 세션 교체는 축 CLOSE 직후, 이 문서를 갱신·커밋한 뒤에 한다. 작업 도중(구현 중·검증 중·staged 상태)에는 교체하지 않는다.
- 새 세션은 워크트리 옵션 없이 `D:\commercial-blog` 로컬 폴더로 연다.

---

# 15. 현재 사용자에게 필요한 조작

새 세션이 ① 준비(dev 서버 실행)를 마치고 안내하면, `localhost:3100` 에 OWNER 또는 store 14 계정으로 **로그인**하고 §6 절차대로 화면만 확인한다.

저장 버튼은 누르지 않는다.
