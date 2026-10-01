# AI-POST · CURRENT MISSION

**기준일:** 2026-10-01  
**현재 대형 목표:** P페이지 1F 완성  
**현재 상태:** ①②③ CLOSE. ④ 저장 E2E(전화 1항목) VERIFIED·복구 완료 → **선장 판정 대기**. 다음 후보 = ⑤ 업체사진(선장 OPEN 전 금지)

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

# 2. 확정된 원스크린 구조 (③ PRODUCT PASS, 2026-10-01)

P페이지 › ⚙️ 기본 설정 (`navView="pseo-basic"`, 서버 `pseo_access.can_enter` 충족 시)

```text
왼쪽  = P페이지 정보 직접 수정 (마이페이지 왕복 없음)
오른쪽 = 내 P페이지 수정 확인 (저장된 hubStore 를 공개 P페이지 항목·순서대로 표시)
[공개 P페이지 보기] = 실제 /p/{store.id} 새 탭 — 최종 확인
```

- 왼쪽 (`StoreInfoForm section="pseo"`, `lib/Store.js`)
  - 🏥 업체 기본정보 = `identSection`(마이페이지와 공용 JSX) — 업체명·주소·전화 편집, 업종 🔒 읽기 전용(업종센터 버튼 미노출)
  - 📍 생활권 = `regionSection` 공용
  - 운영·상담·출장정보 = `visitSection` 공용
  - 🔎 검색정보(`meta.search_fact`) — OWNER / store 14 만 편집기
  - 📷 업체 사진 — 「준비 중」
  - 저장 = 기존 `onApplyIdent` / `onSaveSubRegion` / 방문·검색정보 저장 → `saveStore` PATCH `/api/me/store`. 복사본 없음.
- 오른쪽 (`lib/PseoRoom.js` `pseo-basic`)
  - 공개 중(`access.live`): 「🌐 내 P페이지 수정 확인」 + [공개 P페이지 보기]
  - 공개 전: 「🏠 미니홈피 준비 중」 안내(기존 문구)
  - 아래 `HubCheck` — 저장된 hubStore 를 /p 항목·순서·라벨대로 표시. 전화 = `lib/pseo/phone` `resolvePhone` 공용. 링크·추적·실시간 반영 없음.
  - ※ `HUB_VISIT_KEYS` 는 `pages/p/[storeId]/index.js` `VISIT_KEYS` 와 같은 4키 — /p 쪽이 바뀌면 맞춰야 함(동기화 지점).
- 「🏠 내 미니홈피」(pseo-home) 메뉴 제거 — 기본 설정과 중복. 「발행 URL N건」 문구 미이전.

만들지 않기로 판정된 것(재제안 금지): 저장 전 실시간 Preview · iframe 삽입 · /p 공용 렌더러 분리 · 복제 렌더 엔진.  
(iframe TRACE 결과: 가능하나 page_view 오염 차단 sandbox 필요·전화 CTA 비동작 → 기각)

업종은 엔진 라우팅 영향이 있으므로 P페이지에서 수정하지 않는다.

---

# 3. 기준선 / 커밋 현황

작업 브랜치: `feat/p-page-one-screen-01`

```text
8a30dd3  STEP 3  내 미니홈피 흡수 + 기본 설정 우측 수정 확인
fef555f  STEP 3  재진입: 기본 설정 우측 = 공개 P페이지 보기
2a83013  STEP 3  P페이지 기본정보 직접편집 (마이페이지 왕복 제거)
d22eab0  STORE-SPECIALTY-PRESERVE-01 (STEP 2)
e18ed8c  MISSION-HANDOVER-2026-10-01
7c6ce17  OPERATING-PACK-INSTALL-01
27f6201  P-PAGE-ONE-SCREEN-01 STEP 1 UI Shell
2f73862  PSEO-MY-SEARCH-PAGE-UX-01A
8ff75f9  PSEO-MINIHOME-UI-01
695b9b3  (main 기준선)
```

- push / main merge 없음.

별도 브랜치 보존:
- `fix/pseo-eligibility-enterprise-gap` — commit `a472ebe` (eligibility `PAID_PLANS` 에 enterprise 추가). 현재 브랜치에 임의 병합·cherry-pick 금지.

무관 dirty tree: 156건(M 5 + D 49 + ?? 102). 절대 stage하지 않는다.

**HOLD — 출처 불명 기존 dirty (수정·복구·stage·commit·삭제 금지):**
- `data/patterns_clinic.json`
- `lib/restaurant-prompts.js`
- `pages/api/generateRestaurant.js`

`.claude/launch.json`(dev 서버 `next-dev`, `npx next dev -p 3100`)은 도구용이며 커밋 대상이 아니다.

---

# 4. STEP 이력

```text
① 실제 로그인 화면 확인        PRODUCT PASS
② STORE-SPECIALTY-PRESERVE-01  CLOSE (d22eab0)
③ P페이지 기본정보 직접편집     CLOSE (2a83013 · fef555f · 8a30dd3)
④ 실제 저장 E2E               VERIFIED (전화 1항목) · 선장 판정 대기   ← 지금 여기
⑤ 업체사진 저장계약/구현        미OPEN
⑥ Preview                     ③에서 「수정 확인 + 공개 P페이지 보기」로 대체 판정 — 별도 Preview 만들지 않음
```

## ② specialty 보존 (CLOSE)
- 업체명·주소·전화 저장은 `specialty` 키를 보내지 않는다. 업종센터에서 전문점을 직접 고른 경우(`specPicked`)에만 기존값과 다를 때 전송.
- 검증: 컴포넌트 12시나리오 + 실제 LG 계정 저장 요청 가로채기(DB 미기록)로 `specialty` 미전송 확인.
- 미검증 기록: 실제 전문점 계정 DB 재조회(테스트 계정 없음).

## ④ 저장 E2E (VERIFIED · 판정 대기)
- 대상: LG 인테리어 store 14, 전화 1항목. 저장은 사장님이 크롬 기본 설정에서 실제 [저장] 2회(변경·복구).
- 1038 저장: DB 재조회 `phone` 1건만 변경(나머지 19항목 동일) → 우측 수정 확인 1038 → `/p/14` 전화 CTA·tel·sms 1038.
- 1039 복구: 저장 전 스냅샷과 비교 변경 0건 · 우측 1039 · `/p/14` 1039.
- 미검증: 주소·업체명·생활권·운영정보·검색정보 저장 E2E(선장 지시 시 같은 방식으로 1항목씩).

---

# 5. 별도 축 후보 / HOLD (현재 축에 섞지 않음)

- 저장 버튼 통합(업체정보·생활권 저장 버튼이 따로) — HOLD
- 전문점만 변경 시 저장 버튼 비활성(identDirty 에 specialty 미포함) — 기존 동작
- 화면에서 전문점 해제 경로 없음 — 기존 동작
- 요금제 정보 로딩 전 P페이지 클릭 시 요금제 화면으로 이동 — 로딩 레이스
- 공개 P페이지 제3 입구: 마이페이지 「🔎 내 검색페이지」 [내 검색페이지 보기](`lib/Store.js`, OWNER/store14 전용, live 미확인) — 수정 금지 판정
- `access.live` = 발행글 수만 판정 → owner/allowlist 이면서 비유료인 업체는 버튼이 보여도 `/p` 404 가능 — 기록만
- 업체 본인이 [공개 P페이지 보기]로 /p 를 열어도 page_view 로 기록됨 — 기존 동작, 관측 해석 시 유의
- 헌법 §7 FREEZE 문구 중 `publish`, `ensure` 범위 정밀화 — 의미 TRACE 전 수정 금지
- Enterprise 수정 `a472ebe` 병합 시점 — 선장 결정

---

# 6. search_fact 권한

`search_fact` 편집은 `canManagePseoFact`(OWNER 또는 store 14)로 잠겨 있다. 일반 유료회원 P페이지에서는 「입력은 준비 중」으로 보인다. UI 축에서 임의로 권한을 풀지 않는다.

---

# 7. 업체사진 (⑤, 미OPEN)

현재 재사용 가능한 영구 서버 사진 저장 구조가 없다(Storage 코드 0, blob/base64/임시 URL 수준, `photo_pool` 미사용).

```text
DESIGN FIRST
→ 실제 저장 위치/소유권/공개성/삭제/대표사진 계약 (대표사진 1 + 추가사진 복수)
→ 최소 구현
→ 업로드/표시/삭제 E2E
```

선장 승인 전: Supabase bucket 생성 금지 · 신규 upload API 금지 · `photo_pool` 임의 정본화 금지. AI 생성 이미지를 실제 업체사진으로 사용하지 않는다.

---

# 8. 운영 리듬 (이번 미션에서 실증 중)

```text
선장 지시 → Claude 작업 1개 → Claude 자체 기술검증 → STOP
→ 사장 로컬 확인 → 선장 판정 → 필요 시 같은 STEP 재진입 → PASS 후 다음 STEP
```

- 사장 로컬 확인은 사장님 크롬에서 한다. Claude 브라우저 패널은 폭이 좁으면(≈280px) 왼쪽 편집칸이 가려져 조작 불가 — 패널은 읽기 검증(재조회·/p HTML·컴포넌트 렌더) 용도로 쓴다.
- 실제 저장(상태변경)은 사장님 승인·조작 1회 → Claude 재조회 검증 → 원래값 복구까지가 한 세트.
- dev 서버는 앱이 세션 종료 시 끌 수 있다. 「안 켜져」면 `next-dev` 재시작.

---

# 9. STOP 조건

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

# 10. 세션 운영

- 작업 세션은 항상 하나만 사용한다. 두 세션이 같은 작업폴더를 동시에 수정하지 않는다.
- 세션 교체는 축 CLOSE 직후, 이 문서를 갱신·커밋한 뒤에 한다.
- 새 세션은 워크트리 옵션 없이 `D:\commercial-blog` 로컬 폴더로 연다.

---

# 11. 새 세션이 할 일

1. git 기준선 확인(헌법 §8) — HEAD 가 이 문서 커밋인지, 156 dirty 외 변경 없는지.
2. ④ 선장 판정 확인(PASS/추가 항목 E2E/CLOSE). 판정 전 ⑤ 착수 금지.
