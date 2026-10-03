# AI-POST · CURRENT MISSION

**기준일:** 2026-10-03  
**현재 대형 목표:** P페이지 1F 완성 → **최종 CLOSE / Production 정상 사용 승인 (2026-10-03)**  
**현재 상태:** **`P-PAGE-1F-PRODUCTION-GATE-01` CLOSE** — 34커밋 main fast-forward(`695b9b3..1d1b32f`) · push · Vercel Production 배포 Ready · Production E2E PASS — §18 참조. ①~⑦-F · FIRST-USER-EDIT-FLOW · F1~F3 · IDENTITY · FACT-INPUT-OPEN 전부 CLOSE. 이후 TRACE 2축(`P-PAGE-SEARCH-INDEX-TRACE` · `P-PAGE-SEARCH-FACT-INPUT-TRACE`) CLOSE — §19. 지역×서비스 검색 Pilot 0/8 → 대표서비스안 기각·원복 → 다중업무 SoT TRACE CLOSE — §20. **다음 One Axis = `P-PAGE-MULTI-SERVICE-SEARCH-ARCHITECTURE-01` (DESIGN ONLY · 구현 금지 · 미착수)** — §20 (2F·Pilot 착수 금지 · HOLD 후보 2건 개발 금지). 다음 방향(기록만 · 개발 금지): 블로그 본문 의존 제거 → 업체 FACT 기반 독립 P페이지 생성 — §18  
**⚠ store 14 사진 2장(`14/7cbf7a81-…` 대표 · `14/2dc52872-…`) 유지 — 삭제·변경 금지**

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

Architecture 정본: `docs/claude/P-PAGE_SEARCH_CONVERSION_ARCHITECTURE-01.md` — **ACTIVE** / P페이지·P페이지 검색자산 작업 시 필독(헌법 §0-6, `af78f92`).
- `P-PAGE-SEARCH-DISCOVERY-01` = P검색확장 **2F 미래 후보** — 현재 구현 금지.

---

# 2. 확정된 원스크린 구조 (③ PRODUCT PASS, 2026-10-01)

P페이지 › ⚙️ 기본 설정 (`navView="pseo-basic"`, 서버 `pseo_access.can_enter` 충족 시)

```text
왼쪽  = P페이지 정보 직접 수정 (마이페이지 왕복 없음)
오른쪽 = 내 P페이지 수정 확인 (저장된 hubStore 를 공개 P페이지 항목·순서대로 표시)
[공개 P페이지 보기] = 실제 /p/{store.id} 새 탭 — 최종 확인
```

- 왼쪽 (`StoreInfoForm section="pseo"`, `lib/Store.js`) — 순서(F-1 `6f3d541` 이후): 업체 기본정보 → 생활권 → 업체 사진 → 운영정보 → 검색정보
  - 🏥 업체 기본정보 = `identSection`(마이페이지와 공용 JSX) — 업체명·주소·전화 편집, 업종 🔒 읽기 전용(업종센터 버튼 미노출)
  - 📍 생활권 = `regionSection` 공용
  - 운영·상담·출장정보 = `visitSection` 공용
  - 🔎 검색정보(`meta.search_fact`) — OWNER / store 14 만 편집기
  - 📷 업체 사진 = `lib/pseo/StorePhotoCard.js`(⑦-D) — §7
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
c6f720e  PSEO-FACT-INPUT-OPEN-01  feat(p-page): open search fact services and process to eligible members (pages/api/me/store.js · lib/Store.js)
6f4638f  P-PAGE-1F-IDENTITY-01  fix(p-page): show store industry label (pages/p/[storeId]/index.js · lib/PseoRoom.js)
6f3d541  F1-PHOTO-INPUT-ORDER-01  fix(p-page): align photo input order (lib/Store.js)
9dfa546  F2-SERVICE-AREA-POSITION-01  fix(p-page): align field service area (pages/p/[storeId]/index.js · lib/PseoRoom.js)
e876b08  F3-TRAVEL-INFO-CONSISTENCY-01  fix(p-page): expose field visit info (pages/p/[storeId]/index.js · lib/PseoRoom.js)
827bbf6  FIRST-USER-EDIT-FLOW-01 STEP 2  feat(p-page): connect editor and preview focus (pages/index.js · lib/Store.js · lib/PseoRoom.js)
a789692  HANDOVER (문서) docs(handover): close p-page photo axis
af78f92  DOC-ARCHITECTURE-REGISTER-01  docs(p-page): register search conversion architecture (CLAUDE.md §0-6 · Architecture 문서)
e2d87f8  STEP 7-F  feat(p-page): publish interactive store photos (pages/p/[storeId]/index.js · lib/pseo/StorePhotoCard.js)
fbf8609  HANDOVER-MISSION-UPDATE (문서)
344a313  STEP 7-E  feat: show store photos in P-page edit preview (pages/index.js · lib/Store.js · lib/pseo/StorePhotoCard.js · lib/PseoRoom.js)
b628b65  HANDOVER-MISSION-UPDATE (문서)
c5e0dce  STEP 7-D  feat: add P-page store photo editor (lib/Store.js · lib/pseo/StorePhotoCard.js)
2b19dbd  MISSION-UPDATE-7C (문서)
eca3b49  STEP 7-C  feat: add store photo_pool read/manage endpoint (pages/api/me/store-photo.js 단독)
cc27f66  MISSION-HANDOVER-2026-10-02 (문서)
ace7f3b  STEP 7-B  feat: add signed store photo upload endpoint (pages/api/me/store-photo-upload.js 단독)
83670f1  MISSION-HANDOVER-2026-10-01c (문서)
77e98b0  MISSION-HANDOVER-2026-10-01b (문서)
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

- **2026-10-03 main 반영 완료**: `695b9b3..1d1b32f` 34커밋 fast-forward(순서 무변경) → `git push origin main`(사장님 cmd 실행) → Vercel Production 자동배포 Ready. origin/main = 로컬 main = `1d1b32f`.
- 이후 HANDOVER 문서 커밋은 작업 브랜치 로컬에만 있음(push 금지 · main 미반영 — main push 시 Vercel 재배포 발생, 시점은 선장 판정).
- ⚠ main 에 push = Vercel Production 자동 배포. main 반영 승인 = 배포 승인.

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
④ 실제 저장 E2E               PASS / CLOSE (전화 1항목)
⑤ 업체사진 TRACE              PASS / CLOSE (코드 변경 0)
⑥ PHOTO-SOT-CONTRACT-01        PASS / CLOSE (설계만 · base64 기각 → signed upload)
⑦-A PHOTO-STORAGE-FOUNDATION-01 PASS / CLOSE (bucket 생성 · 코드 변경 0)
⑦-B PHOTO-UPLOAD-API-01        PASS / CLOSE (ace7f3b)
⑦-C PHOTO-POOL-API-01          PASS / CLOSE (eca3b49 · 실제 Supabase E2E)
⑦-D 업체사진 UI                PASS / CLOSE (c5e0dce · 사장님 Chrome PNG 첨부 PASS)
⑦-E 오른쪽 수정확인 사진        PASS / CLOSE (344a313 · 사장님 Chrome PRODUCT PASS)
⑦-F 공개 /p 사진               PASS / CLOSE (e2d87f8 · F-1 공개 연결 TRACE · F-2 최소 구현 · F-4 썸네일 상호작용 · F-5 크기·배열 · 사장님 Chrome PC/Mobile PRODUCT PASS)
FIRST-USER-EDIT-FLOW-01 STEP 1  TRACE PASS (코드 변경 0)
FIRST-USER-EDIT-FLOW-01 STEP 2  PRODUCT PASS / CLOSE (827bbf6 · 사장님 Chrome 「정상 반영」)
F3-TRAVEL-INFO-CONSISTENCY-01   PRODUCT PASS / CLOSE (e876b08 · 사장님 Chrome PC/모바일 폭) — §13
F2-SERVICE-AREA-POSITION-01     PRODUCT PASS / CLOSE (9dfa546 · 사장님 Chrome) — §14
F1-PHOTO-INPUT-ORDER-01         PRODUCT PASS / CLOSE (6f3d541 · 사장님 Chrome) — §15
P-PAGE-1F-IDENTITY-01           PRODUCT PASS / CLOSE (6f4638f · 사장님 Chrome) — §16
PSEO-FACT-INPUT-OPEN-01         PRODUCT PASS / CLOSE (c6f720e · 고패킹 account 23 실제 E2E · 원복 완료) — §17
P-PAGE-1F-PRODUCTION-GATE-01    CLOSE (main 1d1b32f 배포 · Production E2E PASS) — §18
P페이지 1층                      최종 CLOSE / Production 정상 사용 승인 (2026-10-03)
P-PAGE-SEARCH-INDEX-TRACE       CLOSE (TRACE · 코드 변경 0) — §19
P-PAGE-SEARCH-FACT-INPUT-TRACE  PASS / CLOSE (TRACE · 코드 변경 0) — §19
P-PAGE-REGION-SERVICE-SEARCH-PILOT-01  STEP1 FAIL 0/8 · STEP2 신호 TRACE · STEP3 설계 · STEP4 NO PATCH / CLOSE — §20
P-PAGE-PRIMARY-SERVICE-DESIGN-01      구현 후 제품 채택 기각 · 2파일 원복 완료(커밋 없음) — §20
ONBOARDING-PRIMARY-WORK-TRACE-01      TRACE 완료(코드 변경 0) — §20
P-PAGE 다중업무 SoT TRACE             CLOSE — §20
다음 One Axis                    P-PAGE-MULTI-SERVICE-SEARCH-ARCHITECTURE-01 (DESIGN ONLY) ← 지금 여기 · 미착수
(구 ⑥ Preview: ③에서 「수정 확인 + 공개 P페이지 보기」로 대체 판정 — 별도 Preview 만들지 않음)
```

## ② specialty 보존 (CLOSE)
- 업체명·주소·전화 저장은 `specialty` 키를 보내지 않는다. 업종센터에서 전문점을 직접 고른 경우(`specPicked`)에만 기존값과 다를 때 전송.
- 검증: 컴포넌트 12시나리오 + 실제 LG 계정 저장 요청 가로채기(DB 미기록)로 `specialty` 미전송 확인.
- 미검증 기록: 실제 전문점 계정 DB 재조회(테스트 계정 없음).

## ④ 저장 E2E (PASS / CLOSE)
- 대상: LG 인테리어 store 14, 전화 1항목. 저장은 사장님이 크롬 기본 설정에서 실제 [저장] 2회(변경·복구).
- 1038 저장: DB 재조회 `phone` 1건만 변경(나머지 19항목 동일) → 우측 수정 확인 1038 → `/p/14` 전화 CTA·tel·sms 1038.
- 1039 복구: 저장 전 스냅샷과 비교 변경 0건 · 우측 1039 · `/p/14` 1039.
- 사장님 크롬 `/p/14` 화면에서도 1039 복구 확인.
- 선장 판정: 전화 1항목으로 핵심 저장선 실증 완료. 업체명·주소·생활권·운영정보·검색정보 반복 E2E는 이번 축에서 추가하지 않는다.

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
- (⑦-F 이후 · 후보만, 다음 축 아님) `P-PAGE-PHOTO-VIEWER` — 사진 클릭 확대/라이트박스. ⑦-F 에서 범위 밖 판정
- (⑦-F 이후 · 후보만) /p 「제공 서비스」가 첫 화면 맨 아래 제목만 보임 — 사진축 아님, P페이지 전체 정보구조 후보
- (⑦-F 이후 · 미검증) 실제 6장 데이터 /p 렌더 — DB 변경 없이 브라우저 DOM 임시 복제로만 배열 확인(복제 썸네일은 클릭 동작 없음)
- **HOLD** `P-PAGE-PUBLISH-INDEPENDENCE-01` — P페이지 공개(/p · sitemap)가 블로그 발행 1건(`MIN_HUB_POSTS`)에 종속되어야 하는지 (§19). 개발 금지.
- **HOLD** `P-PAGE-FACT-SCOPE-01` — 일반회원에게 실제 업무방식/차이 FACT(`differentiators`)를 어디까지 입력받을지 (§19). 개발 금지.

---

# 6. search_fact 권한

`search_fact` 편집은 `canManagePseoFact`(OWNER 또는 store 14)로 잠겨 있다. 일반 유료회원 P페이지에서는 「입력은 준비 중」으로 보인다. UI 축에서 임의로 권한을 풀지 않는다.

---

# 7. 업체사진 (⑤~⑦-F CLOSE)

## 확정 계약 (선장 승인)
- SoT = `store_profiles.photo_pool`(jsonb 배열, 기존 컬럼). 신규 DB 컬럼 없음. ⑦-B 시점 21행 전부 `[]`.
- 원소 = `{ "path": "{store.id}/{uuid}.jpg" }` — bucket 상대 경로만 저장(전체 URL 저장 금지, 읽을 때 서버가 URL 변환).
- 배열 0번 = 대표사진, 이후 = 추가사진(순서 = 표시 순서). 별도 대표 플래그 없음.
- 최대 총 6장(대표 1 + 추가 5).
- 조작(⑥ 설계): 등록 = 끝에 추가(비었으면 대표) / 대표변경 = 0번으로 이동 / 교체 = 같은 위치 path 를 **새 UUID** 로 / 삭제 = 제거(0번 삭제 시 다음이 대표). 순서 = 업로드 → DB 저장 → 기존 객체 삭제. 서버가 현재 DB 값 기준으로 새 배열 계산(클라이언트는 배열 전체를 보내지 않음). 사진 조작은 `photo_pool` 만 변경.
- Storage: bucket `store-photos` · public=true · 5MB · `image/jpeg` only · 신규 RLS 정책 없음(클라이언트 직접 쓰기 불가).
- 업로드 = signed upload. `POST /api/me/store-photo-upload`(본문 없음) → `requireAccount` → `store_profiles.account_id` 로 서버가 store.id 결정 → `{store.id}/{uuid}.jpg` 에만 발급 → `{ ok, path, token, signedUrl }`. 클라이언트의 store/path/bucket 입력은 읽지 않음. `photo_pool` 6장 이상이면 409 `PHOTO_LIMIT`(읽기만, 선장 유지 승인).
- /p 표시 위치 확정: 전화 → 문자/길찾기 → **업체사진** → 영업정보 → 제공 서비스 (`nav.row` 와 `section.info` 사이).
- /p 공개 표시 계약 (⑦-F 최종, `e2d87f8`, `pages/p/[storeId]/index.js`):
  - SSR 에서 `photo_pool` → `{현재 storeId}/{UUID}.jpg` 만 통과 → 최대 6장 → `getPublicUrl` → `store.photos`(URL 배열). raw `photo_pool`/path 는 props 미포함. Storage 추가조회 없음.
  - 첫 사진([0])을 초기 대표로 크게 표시. 큰 사진 = `3:2 + object-fit: cover`.
  - 썸네일 = 대표 포함 전체 사진(최대 6) · 72×54 · 한 줄 고정(`nowrap`) · 폭 초과(모바일 5~6장) 시 가로 스크롤. **1장이면 썸네일 숨김.**
  - 썸네일 = `<button type="button">` + `aria-pressed` + 선택 테두리. 클릭은 큰 사진 **표시만** 변경(`useState`, 초기 0 = SSR 동일). DB 대표사진·순서 변경 없음 · 페이지 이동/추적 없음.
  - popup/lightbox/slider/zoom 없음. Intent · JSON-LD · og:image · tracking 무변경.
- 입력 UI = `lib/pseo/StorePhotoCard.js`(⑦-D) — `lib/Store.js` `section==="pseo"` 의 「📷 업체 사진」 카드(`#pseo-sec-photo`) 자리. 마이페이지 분기 무변경.
  - 사진 state 는 `hubStore` 와 분리(카드 내부). `/api/me/store` 응답에 `photo_pool` 이 없어 `saveStore → setHubStore(j.store)` 전체 교체 시 지워지기 때문.
  - 입력 = JPG·PNG(`accept="image/jpeg,image/png"`). HEIC/HEIF/WebP/GIF 거절(HEIC 는 별도 축 후보). 원본 30MB · 5,000만 화소 초과 거절.
  - JPG·PNG 모두 브라우저 canvas 로 JPEG 재인코딩: 긴 변 최대 1600px(확대 없음) · 품질 0.82 · 결과 5MB 초과 시 0.70 1회 재처리 → 그래도 초과면 거절. PNG 투명영역 = 흰 배경. EXIF/GPS 제거.
  - 흐름 = 변환 → 발급(`store-photo-upload`) → 브라우저 → Supabase signedUrl 직접 PUT → `store-photo add/replace`. 이미지 바이너리 앱 서버 미경유.
  - 최대 6장 · [0] 「대표」 배지 · [대표로] · [◀▶] · [교체] · [삭제(확인창)] · 여러 장은 남은 칸까지 한 장씩 순차 · 조작 중 잠금 · 「사진 처리 중 n/m」.
  - 카드 안내 「사진 공개 페이지 반영은 준비 중입니다.」 — ⑦-F 에서 제거 완료(`e2d87f8`).
- 조회·조작 = `pages/api/me/store-photo.js`(⑦-C). `requireAccount` → `account_id` 로 서버가 store 결정, 본문 `storeId` 무시.
  - `GET` → `{ ok, photos:[{path,url}] }`(url = 서버 `getPublicUrl`).
  - `POST {op}`: `add{path}` · `set_main{path}` · `move{path,to}` · `replace{oldPath,path}` · `delete{path}`. 사진은 path 로 지정(index 아님).
  - path 는 `{내 store.id}/{uuid}.jpg` 형식 + `exists` 확인. 6장 서버 재검증 — 초과 add = 409 `PHOTO_LIMIT` + 검증된 신규 객체 cleanup.
  - replace/delete = DB 반영 후 Storage remove. remove 실패해도 DB 결과 유지(`storage_cleanup:false`).
  - `/api/me/store` GET/PATCH 에는 `photo_pool` 없음(무변경). 이미지 바이너리 서버 중계·가공 없음.
  - 동기화 지점: `MAX_PHOTOS = 6` 이 `store-photo-upload.js` 와 `store-photo.js` 두 곳(리팩터링 보류 판정).

## 실측 기록
- ⑦-A: anon 직접 업로드 RLS 거부 · token 다른 경로 사용 거부 · 같은 경로 재사용 거부 · 비JPEG 거부 · anon list/delete 불가.
- 삭제 후 공개 URL: 원본은 즉시 삭제(origin 400), CDN 캐시(`max-age=3600`, cf HIT)로 +31초까지 200 → +92초부터 400. 1회 측정, 잔존 약 1~1.5분. 새 UUID 교체 계약으로 /p 는 영향 없음 — 운영 특성으로 기록. 없는 객체의 공개 URL 응답은 404 가 아니라 400.
- ⑦-B: LG(store 14) 로그인 → 본문 `storeId:99, path:"99/evil.jpg"` 무시 → `14/{uuid}.jpg` 발급 → 브라우저 PUT 200 → 공개 200 → 삭제 → bucket `[]` · `photo_pool` `[]`. 비로그인 401 · 잘못된 토큰 401 · GET 405 · text/plain 400.
- ⑦-C (2026-10-02, LG store 14, 실제 Supabase): 8×8 JPEG(≈760B) 실업로드 → add(본문 `storeId:99` 무시) · set_main · move · replace(이전 객체 삭제) · delete(대표 삭제 시 다음이 대표) 전부 200 + DB·bucket 재조회 일치. 거부: 타 업체 경로 400 · 없는 객체 400 · pool 밖 path 404. 6장 제한: 5장에서 2건 발급(경합 재현) → 6번째 add 200 → 업로드 API 7번째 발급 409 → 나머지 add 409 + 해당 객체 삭제 확인. 타 업체 `photo_pool` 수정 0 · store 14 사진 외 컬럼 변경 0. 종료 후 `photo_pool []` · bucket 비움 원복.
- 기록만: 사진 조작도 store row update 이므로 `store_profiles.updated_at` 이 갱신된다(조사 안 함 · ⑦-C 차단 사유 아님).
- ⑦-D (2026-10-02): 패널 실측 — PNG 3000×2000 → JPEG 1600×1067(투명영역 흰색) · 13.4MB JPG(EXIF+GPS 삽입) → 1600×1200 688KB EXIF 없음 · 800×600 확대 없음 · 5,180만 화소/30MB 초과/WebP/HEIC 거절 · 교체(PNG) 정상. DB·bucket·화면 일치 후 원복.
  사장님 Chrome: 로컬 PNG(`인테리어시공_시공사진_08.png`) 첨부 → 1/6 · 썸네일 · 「대표」 배지 · 「1장 등록했습니다.」 PASS. 결과 = `14/7cbf7a81-6fe4-43d5-a7c7-389818f10210.jpg` (JPEG 1200×800 · 135KB · EXIF 없음).
- ⑦-E (344a313): 사진 state 를 `Home` `storePhotos` 로 lift-up(앱 전체 1개) → 좌 `StoreInfoForm` → `StorePhotoCard`(photos/setPhotos props) · 우 `PseoRoom` → `HubCheck`(읽기 전용). `hubStore` 병합 없음 · API/DB/Storage 무변경. 위치 = 문자/길찾기 아래 · 영업시간 위. [0] 대표 크게(4:3) · 나머지 72×54 썸네일 · 0장 미표시.
  실증: Claude 패널 7항목(최초·추가·대표·순서·교체·삭제·새로고침) PASS + 사장님 Chrome 사진 추가 → 우측 즉시 썸네일 PRODUCT PASS(2026-10-03).
- ⑦-F-1 TRACE: `/p/[storeId]/index.js` 단일 SSR(service role). photo_pool 은 기존 `PUBLIC_FIELDS` 「제외 확정」이었음(A: 조회 안 됨). photo_pool 쓰기 경로 = `store-photo.js` 단 1곳(`/api/me/store` EDITABLE_COLS 미포함). 공용 렌더러 재사용 불가(③ 판정 유지). 선장 승인: photo_pool SSR 원천 사용 · 공개 직전 path 재검증 + 최대 6장 · exists 조회 금지 · 별도 API/fetch/helper 금지.
- ⑦-F-2 공개 연결 최소 구현: SSR 검증 → `store.photos` → `section.photos`(`</nav>` 와 `section.info` 사이). alt = 「{업체명} 대표사진」/「{업체명} 사진 n」.
  동기화 지점: `MAX_PHOTOS = 6` · UUID.jpg 규칙이 `store-photo.js` 와 `/p` 두 곳.
  정적 검증: SSR `GET /p/14` 200 · props 에 `photo_pool`/`path` 0 · 거부 실측(타 store · `../` · 대문자 · 비UUID · 비객체 · `140/`) · 7장 이상 → 6 · compile 0.
  사장님 Chrome PRODUCT(F-3): 데스크톱 + 400×832 모바일 PASS. 사진 클릭 확대 없음 = FAIL 아님(선장 판정, 후보 `P-PAGE-PHOTO-VIEWER`).
- ⑦-F-4 썸네일 상호작용: 대표 포함 전체 썸네일 + `<button>` · 클릭 → 큰 사진 변경 → 첫 썸네일 → 복귀. Claude 패널 실제 클릭 왕복 · 클릭 시 API 요청 0 · 콘솔 오류 0.
- ⑦-F-5 크기·배열: 4:3 → 3:2 · 썸네일 한 줄 + 가로 스크롤. 실측(1366×768 / 375×812): 대표 480×320 / 335×223 · 6장(DOM 임시 복제) PC 한 줄 스크롤 없음 · 모바일 한 줄 + 스크롤(4+2 줄바꿈 해소, 휴무 끝 839 → 755) · 페이지 가로 overflow 0.
  사장님 Chrome PRODUCT: 모바일 400×832 · PC 1920 PASS(2026-10-03).
- ⑦-F 최종 커밋 `e2d87f8`: `pages/p/[storeId]/index.js` +110/−2 · `lib/pseo/StorePhotoCard.js` −1. 금지범위 diff 0: `/api/me/**` · PseoRoom · `[intentSlug].js` · JSON-LD · og:image · tracking · DB · Storage.
- **현재 store 14 `photo_pool` = 2장 — `[0] 14/7cbf7a81-6fe4-43d5-a7c7-389818f10210.jpg`(대표) · `[1] 14/2dc52872-23d8-4f49-b6bd-3a7841209311.jpg`(사장님 추가). 실증 자산 — 삭제·변경 금지.** 다른 업체 21행 중 나머지 전부 `[]`.
- 기록만: 공개 렌더 시 Storage 존재 확인 없음 → pool 에 객체 없는 path 가 남으면 깨진 이미지(정상 경로로는 발생 안 함, 관리 Preview 동일).
- 미검증: authenticated 사용자의 Storage 직접 업로드 차단(실 로그인 E2E 단계에서 확인 예정). 저사양 휴대폰 대형 사진 메모리. 결과 5MB 초과 → 0.70 재처리 분기(재현 입력 없음, 코드 확인만). 실제 6장 데이터 /p(§5).

## 금지 (계속)
- 사진 범위 확장 금지(별도 축 승인 전): Intent 페이지(`[intentSlug].js`) 사진 연결 · JSON-LD/og:image 확장 · 사진 최적화/CDN · 라이트박스/확대.
- `/api/me/store` 사진 필드 개방 금지.
- AI 생성 이미지(`/api/image`)를 실제 업체사진으로 사용 금지.
- `lib/commonPhotoBox.js` 의 `photoPool`(alt 키 객체) 은 DB `photo_pool` 과 무관 — 연결 금지(H-005).

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

1. git 기준선 확인(헌법 §8) — branch `feat/p-page-one-screen-01` · HEAD = 이 문서의 최종 HANDOVER 커밋(main = origin/main = Production `1d1b32f` · 그 위 로컬 문서 커밋만 존재) · dirty = 기존 156건만(HOLD 3 포함) · staged 0. store 14 `photo_pool` 2장은 의도된 상태(§7) — 원복·삭제하지 않는다.
2. 사용자가 「인수인계 확인」을 보내면 기준선 결과만 보고하고 STOP.
3. **다음 One Axis = `P-PAGE-MULTI-SERVICE-SEARCH-ARCHITECTURE-01` — DESIGN ONLY, 구현 금지. 지시 원문 요약·제약은 §20 끝.** 사용자가 이 축 착수를 지시하면 설계안(구조 비교)만 제출하고 STOP. (이하 기존 기록) P페이지 1층 최종 CLOSE(§18). 다음 방향(블로그 본문 의존 제거 → 업체 FACT 기반 독립 P페이지 생성)은 기록만 — 지시 전 개발 금지. 2F·Pilot 으로 시작하지 않는다. 그 외 축은 선장 지시 전 OPEN 하지 않는다. §5 후보 · §12 후속 후보 F-4~F-6(F-1·F-2·F-3 CLOSE) · `P-PAGE-SEARCH-DISCOVERY-01`(2F 미래 후보)을 임의로 승격하지 않는다.
4. P페이지·P페이지 검색자산 작업이면 `docs/claude/P-PAGE_SEARCH_CONVERSION_ARCHITECTURE-01.md`(ACTIVE)를 먼저 읽는다. push/merge 금지.

---

# 12. P-PAGE-FIRST-USER-EDIT-FLOW-01 (STEP 1 PASS · STEP 2 CLOSE)

목적: P페이지를 처음 쓰는 일반회원이 `기본 설정`에서 길을 잃지 않게 한다.

## STEP 1 TRACE (코드 변경 0) — 확인된 원인
- 좌 순서 = 기본정보 → 생활권 → 운영정보 → 검색정보 → 사진 / 우(HubCheck)·/p 순서 = 생활권(상단 지역줄) → 업체명·주소·전화 → 사진 → 운영 4키 → 제공서비스 → 서비스지역(serviceArea) → 진행순서 → 이렇게 일합니다 → 상담 전 확인사항(preVisit).
- 저장 버튼 4개(기본정보 · 생활권 · 운영정보 · 검색정보) + 사진 즉시 반영. 상자 간 미저장 경고 없음.
- 운영정보 중 `HUB_VISIT_KEYS` 4키 · serviceArea · preVisit 외 항목은 우측·/p 대표 페이지 미노출(Intent 페이지 `[intentSlug].js` 에는 다수 노출 — 정정사항: 출동 가능시간 `dispatch24` · 출장 안내 `etc`(라벨 「안내」) 는 Intent 페이지에만 나옴).
- 안내 UI(무엇부터/지금/다음) 없음. P페이지에서는 `onCoachVideo` 미주입 → 「▶ 영상보기」 숨김.

## STEP 2 편집 ↔ 미리보기 양방향 연결 (`827bbf6`)
- 대표 target 1:1 고정: `ident`(업체명·주소·전화·칩) · `region`(상단 지역줄) · `visit`(운영 4키 블록) · `sf`(제공 서비스 블록만) · `photo`(사진).
- 좌→우: `lib/Store.js` pseo 분기 5영역 wrapper(`data-zone`, flex column gap 10) `onFocusCapture`/`onPointerDownCapture` → `Home.pseoFocus`. **영역이 바뀔 때만** 우측 `navScrollRef` 상자만 scrollTo(이미 보이면 이동 없음) + outline 약 1.6초. 타이핑(onChange) 미연결.
- 우→좌: `lib/PseoRoom.js` HubCheck `data-pv` 5곳 = role=button(클릭·Enter, cursor pointer, title 「왼쪽에서 수정」) → `Home.pseoPick {k,n}` → 좌측 스크롤 부모 scrollTo + 좌측 영역 outline 약 1.6초.
- 빈 데이터 = 편집 미리보기 전용 점선 placeholder 5종(「…가 여기에 표시됩니다」). 공개 /p 미적용 · DB 저장 없음.
- `pseoLeft` false 시 두 state 초기화. 마이페이지 분기는 props 미주입 → 무동작.
- 무변경: `pages/p/**` · `lib/pseo/**`(StorePhotoCard) · `/api/**` · DB · Storage · `HUB_VISIT_KEYS` · 저장 핸들러.
- 검증: Claude 패널 4문항(우 사진→좌 사진 / 우 업체정보→좌 기본정보 / 좌 서비스→우 제공서비스만 / 빈 상태 placeholder 양방향) PASS · 같은 영역 입력 시 이동 0 · console error 0 · 마이페이지 표식 0. 빈 상태는 브라우저 메모리 state 임시 교체 + store 쓰기 요청 차단(발생 0)으로 실증 후 원복. 사장님 Chrome 「정상 반영」 = PRODUCT PASS.
- 미검증: 저장 버튼 실제 payload 비교(저장 코드 diff 0) · 좌측 상자 간격 픽셀 비교.

## 후속 후보 (기록만 · 선장 판정 전 착수 금지)
- ~~F-1~~ → `P-PAGE-F1-PHOTO-INPUT-ORDER-01` CLOSE(§15). 원래 기록: 좌측 사진 입력란을 생활권과 운영정보 사이로 이동(우·/p 순서 일치) — 사장님 제안.
- ~~F-2~~ → `P-PAGE-F2-SERVICE-AREA-POSITION-01` CLOSE(§14). 원래 기록: 출동 가능지역(serviceArea)을 상단 표시(우측+/p 동시 · 생활권과 합치지 않음 · 라벨 구분) — 사장님 제안, 기술 의견 = 표시만 이동(A안).
- ~~F-3~~ → `P-PAGE-F3-TRAVEL-INFO-CONSISTENCY-01` CLOSE(§13). 원래 기록: 출장형 운영정보 노출·라벨 정리: 출장 안내(etc)·출동 가능시간(dispatch24) 대표 페이지 미노출 · preVisit 「방문 전 확인사항」↔「상담 전 확인사항」 · 대표 페이지와 Intent 페이지 목록 불일치.
- F-4 제공 서비스 표시 방식(A 이름·설명 한 줄 / B 이름만 나열 / C 펼치기 / D 유지) — 기술 의견 A.
- F-5 진행 순서·실제 방식 순서 이동 기능 없음(끝에만 추가) · 라벨 불일치(「우리 업체의 실제 방식」↔「이렇게 일합니다」).
- F-6 접근성: 우측 role=button 의 접근 이름이 title(「왼쪽에서 수정」)로 읽힐 수 있음.

---

# 13. P-PAGE-F3-TRAVEL-INFO-CONSISTENCY-01 (CLOSE · `e876b08`)

목적: 출장형 사장님이 입력·저장한 운영정보가 대표 P페이지에서 사라지지 않게 한다.

- STEP 1 TRACE: 저장·API 결손 0. 소실은 렌더러 key 목록에서만 발생. 대표 /p 는 `dispatch24`·`etc` 미소비, Intent 는 `preVisit` 미소비.
  - 정정: 「출동 가능시간·출장 안내는 Intent 에 나온다」는 코드상으로만 참. 출장형 업체 중 Intent 자격(core_keyword 2회 이상) 0곳 → 실제 공개 노출 0이었음.
- STEP 3 구현(`e876b08`): 출장형(`!hasPhysicalStore(industry) && industry !== "funeral"`, Store.js isField 와 같은 규칙)일 때만 기존 영업·이용정보 행 뒤에 `dispatch24`「출동 가능시간」 · `etc`「출장 안내」 추가. 빈 값은 기존 필터로 미표시.
  - 대표 /p(`pages/p/[storeId]/index.js`)와 우측 수정 확인(`lib/PseoRoom.js` HubCheck) 동일 노출. 순서: 영업시간 → 휴무 → (기존 주차·예약) → 출동 가능시간 → 출장 안내.
  - 동기화 지점: `FIELD_VISIT_KEYS` 가 두 파일에 같은 값으로 있음(`VISIT_KEYS`/`HUB_VISIT_KEYS` 와 함께 맞춘다).
- 검증: store 14 /p HTML 4행 순서·값 · 서비스 지역/상담 전 확인사항 유지 · 비출장형 회귀 0(DB 21행 전후 비교, 변화 = store 14 만) · 우측 행 클릭 → 좌측 운영정보 이동·강조(STEP 2 동작) 유지 · 모바일 375/400 가로 넘침 0 · console error 0. 사장님 Chrome PRODUCT PASS.
- 변경 없음: DB · API · 저장 구조 · Intent(`[intentSlug].js`) · CSS · STEP 2 양방향 편집 로직 · Core/Adapter.
- 표시 특성(수정 안 함): 「출동 가능시간」 라벨이 좁은 라벨 칸에서 두 줄로 접힘 · `etc` 줄바꿈은 공백으로 합쳐짐(`dd` pre-line 없음).

## 남은 후보 / 관찰 (착수 금지)
- ~~`serviceArea` 위치·라벨~~ → F-2 CLOSE(§14).
- `preVisit` Intent 미노출 · 대표/Intent 라벨 불일치(휴무↔휴무일 등) — 기록만.
- 출장형 Intent 페이지 0건 — 별도 검색자산 축(F-3 범위 아님).
- 관찰: Claude 브라우저 패널 모바일 폭에서 /p/14 두 번째 사진 썸네일이 회색 빈칸으로 보임(사장님 Chrome 에서는 정상 표시). 미조사·미착수.
- 다음 F축 = 미정 / 선장 결정 대기.

---

# 14. P-PAGE-F2-SERVICE-AREA-POSITION-01 (CLOSE / FREEZE · `9dfa546`)

목적: 출장형 「출동 가능지역」(`serviceArea`)의 좌측 입력 위치와 우측 수정 확인·공개 /p 표시 위치를 맞춘다.

- STEP 1 TRACE: 입력은 운영정보 상자(출동 가능시간 옆)인데, 표시는 제공 서비스 아래 독립 「서비스 지역」 블록(`fact.serviceArea`)이었고 우측 클릭 연결도 없었음. 값 보유 = 출장형 store 14·20뿐.
- 선장 결정 B안. 구현(`9dfa546`): `FIELD_VISIT_KEYS` 에 `["serviceArea","출동 가능지역"]` 을 `dispatch24`·`etc` 사이에 추가(두 파일 동일) · 독립 「서비스 지역」 블록 제거 · `fact.serviceArea` 제거(유일 소비처가 그 블록).
  - 출장형 운영정보 최종 순서: 영업시간 → 휴무 → 출동 가능시간 → 출동 가능지역 → 출장 안내.
  - 표시 라벨 「출동 가능지역」으로 통일 → 좌측 입력 ↔ 우측 수정 확인 ↔ 공개 /p 대응 일치. 우측 행은 `data-pv="visit"` 안 → 클릭 시 좌측 운영정보 이동·강조(STEP 2 로직 무변경).
- 검증: /p/14 5행 순서·값 · 「서비스 지역」 HTML 0건 · 제공 서비스 다음 진행 순서 · 우측 동일 · 비출장형 회귀 0(DB 21행 전후 비교, 변화 = store 14·20) · 375/400/1366 가로 넘침 0 · console error 0. 사장님 Chrome PRODUCT PASS.
- 변경 없음: Intent(`[intentSlug].js` 의 「서비스 지역」 라벨 유지) · DB · API · Store.js · CSS.
- 기록만: 비출장형 업체가 `serviceArea` 값을 가져도 대표 /p·우측에 표시되지 않음(현재 해당 값 0건 · 비출장형 입력 양식에 입력란 없음).
- 다음 축 = 미정 / 선장 결정 대기.

---

# 15. P-PAGE-F1-PHOTO-INPUT-ORDER-01 (CLOSE / FREEZE · `6f3d541`)

목적: 좌측 입력 순서를 우측 수정 확인·공개 /p 의 「업체정보 → 사진 → 운영정보 → 제공 서비스」 흐름에 맞춘다.

- STEP 1 TRACE: 좌측만 사진이 맨 끝(`27f6201` UI Shell 의 ④ 자리 → ⑦-D `c5e0dce` 가 그 자리에 카드 삽입). 우측·/p 는 업체정보 바로 뒤. 우측 사진 클릭 시 좌측 2316px 이동. 사진 기능 자체 이상 없음.
- 선장 결정 B안 / B-1. 구현(`6f3d541`, `lib/Store.js` 1개): `zone("photo", <StorePhotoCard … />)` 2줄을 `#pseo-sec-basic` 종료 직후 · `visit` 앞으로 그대로 이동 + 순서 주석 갱신.
  - 좌측 최종 순서: `ident → region → photo → visit → sf` = 업체 기본정보 → 생활권 → 업체 사진 → 출장·운영정보 → 검색 정보.
  - 사진 카드 위치만 이동. 저장·업로드·삭제·교체·대표사진·순서변경 로직 · props · `storePhotos` state · API/DB/Storage 무변경. `data-zone="photo"` 유지.
- 검증: 사진 카드 1개 · 기존 2장·대표 순서 유지 · 사진 바로 아래 운영정보 · 사진 GET 진입 시 1건(변경 전과 동일) · 사진 관련 쓰기 0 · 공개 /p/14 회귀 0(`pages/p/**` diff 0) · console error 0 · 1024/768 폭 신규 파손 0. 좌→우 / 우→좌 이동·강조 사장님 Chrome 실확인 PASS.
  - 기록: Claude 패널이 숨김 상태면 smooth 스크롤·outline 전환 애니메이션이 진행되지 않음 → 패널 측정은 inline 스타일로 강조만 확인, 스크롤은 사장님 Chrome 으로 확인.
  - 기록: 400폭에서는 좌측 열 전체가 91px 로 줄어 좌측 5개 영역이 모두 넘침 — 기존 레이아웃 특성(§8), F-1 무관.
- F-1 · F-2 · F-3 모두 CLOSE / FREEZE.
- 미해결 별도 후보(F-1 미포함): 공개 /p 두 번째 썸네일 회색 빈칸(Claude 패널에서만 관찰 · 사장님 Chrome 정상 · 썸네일 `loading="lazy"`) — 미조사.
- 남은 1층 후보: F-4(제공 서비스 표시) · F-5(진행 순서·실제 방식 순서/라벨) · F-6(우측 role=button 접근 이름). 다음 F축 착수 금지 · 선장 결정 대기.

---

# 16. P-PAGE-1F-IDENTITY-01 (CLOSE / PRODUCT PASS · `6f4638f`)

- 공개 /p 와 우측 수정 확인에 업체명 아래 업종 표시명(`industry` → `getCatalogItem().name`, 카탈로그에 없으면 미표시). title/description · DB · API 무변경. 동기화 지점 = 두 파일의 같은 규칙.
- 사장님 Chrome PRODUCT PASS(store 14). 업체명에 업종 없는 실제 공개업체 미검증 — CLOSE 차단 아님(선장 판정).
- 다음 One Axis: `PSEO-FACT-INPUT-OPEN-01` — TRACE FIRST(구현 금지). 일반 P페이지 자격 회원에게 어떤 FACT 를 어떤 권한으로 열지 실측.
- Production merge/deploy: HOLD (C3 별도 Gate).
- flooring/bedding 라벨 차이(좌측 엔진 라벨 ↔ 카탈로그 name): BACKLOG / HOLD.

---

# 17. PSEO-FACT-INPUT-OPEN-01 (CLOSE / PRODUCT PASS · `c6f720e`)

- 일반 P페이지 자격회원(`getPseoAccess.can_enter`)에게 `search_fact` services·process 입력·저장 개방. differentiators 는 일반회원 HOLD(화면 미노출 · 서버 403 `PSEO_FACT_FIELD_LOCKED` · 기존값 보존). `canManagePseoFact`(OWNER·store 14) 무변경.
- PRODUCT E2E: 고패킹 account 23 / store 20(관리자 지급 basic) 실제 저장·새로고침 유지·우측 반영 PASS. 원복 완료: account 23·20 free(admin 구독 이력은 canceled 로 보존), store 20 = 빈 search_fact 이력만 잔존(선장 인정). C1 업종 표시 미검증도 「하나2 → 바닥시공」으로 해소.
- 다음 One Axis: `P-PAGE-1F-PRODUCTION-GATE-01` → CLOSE(§18).
- 기록만: account 19(store 18) test 표식 계정 · 실빌링키 자동결제 예정 2026-10-07.

---

# 18. P-PAGE-1F-PRODUCTION-GATE-01 (CLOSE · 2026-10-03) — P페이지 1층 최종 CLOSE

## C3 TRACE (배포 전 Gate PASS)
- 기준선: origin/main = main = `695b9b3` · HEAD..main 0 → fast-forward 가능.
- 34커밋 감사(코드 21 · 문서 13) · 변경 14파일(코드 9 · 문서 5). FREEZE 경로 변경 0 · `[intentSlug].js`·eligibility·billing·vercel.json·package.json 변경 0 · 신규 env 0 · DDL 0. 저장계약 변경 = `pages/api/me/store.js` 2곳(8ff75f9 `pseo_access` GET · c6f720e search_fact 개방) 모두 승인 축.
- 미커밋 156건 격리: 대상 14파일과 겹침 0 · HEAD 단독 clean worktree `next build` PASS.
- Production Supabase = 로컬과 동일 프로젝트 `vuuqtrzcfjbywlxqskoi`(사장님 Vercel 환경변수 확인) · bucket `store-photos` 존재.
- `a472ebe`(enterprise eligibility): enterprise 구독·accounts 0건 · 34커밋과 독립 → **제외 확정**(별도 축). `fix/pseo-eligibility-enterprise-gap` 에만 존재.

## 배포
- 사장님 cmd: `git fetch . feat/p-page-one-screen-01:main` → `git push origin main` (Claude 실행은 자동모드 안전장치 차단).
- Vercel `1d1b32f` · main · Production · Ready 57s. 운영 `https://ai-post.ai/p/14` SSR 에 photo_pool 사진 URL 출력 = 새 코드 서비스 확인.

## Production E2E
- ① `/p/14` 사장님 Chrome: 대표 + 썸네일 · 썸네일 클릭 큰 사진 전환 PASS.
- ② 기본 설정 저장: **SKIP**(선장 판정) — 배포 전 store 20 실제 E2E PASS + 배포 코드 동일성으로 승계. store 20 은 현재 free · 구독 기간 종료 · 발행 0 · `/p/20` 404 → 자격 재지급(A안) 기각.
- ③ store 14 사진(선장이 이번 E2E 한정 쓰기 허용): 업로드 → 3/6 · 공개 SSR 3장(`[2] 14/072b6b2b-4023-442a-ad30-330f1bf7865f.jpg`) · Storage 200 → 공개 /p 3번째 썸네일 표시·클릭 → 테스트 1장 삭제 → 2/6 · 공개 SSR `[0] 7cbf7a81…` `[1] 2dc52872…`(업로드 전과 동일) · 테스트 객체 Storage 400. SERVICE_ROLE_KEY 운영 경로 실증.
- 미검증 기록: 운영 DB photo_pool 직접 조회 안 함(안전장치 차단) — 공개 SSR(photo_pool 직접 판독)으로 대체 근거.
- 기록만: 확인 열람으로 /p/14 page_view 수 건 발생(승인된 정상 동작).

## 정리
- 임시 빌드 worktree `D:\cb-gate-wt`: worktree 등록 해제 → node_modules junction 링크만 제거(/s 미사용 · 원본 node_modules 정상) → 빈 폴더 삭제. **정리 완료.**
- 미커밋 156건(HOLD 3 포함): 기존 작업으로 그대로 보존 · stage·수정·삭제 등 접촉 금지.
- `a472ebe`: 제외 유지(별도 축 · 선장 결정 전 병합 금지).

## 최종 인수인계 (P페이지 1층)
- `P-PAGE-1F-PRODUCTION-GATE-01` CLOSE · **P페이지 1층 Production 정상 사용 / 최종 CLOSE**.
- Production = `1d1b32f`(main = origin/main). 이후 HANDOVER 문서 커밋은 작업 브랜치 로컬에만 있음 — push 금지(main push = Vercel 재배포).
- 사진 Production E2E PASS · 테스트 사진 삭제 · store 14 `photo_pool` 원래 2장·순서 원복 완료.

## 다음 방향 (기록만 · 개발 금지)
- **블로그 본문 의존 제거 → 업체 FACT 기반의 독립적인 P페이지 생성 기능.**
- 현재는 방향 기록일 뿐 OPEN 된 축이 아니다. 축 이름·범위·순서는 선장이 정한다.
- 다음 방에서 **선장 TRACE 지시 대기**. 그 전에 코드 수정·설계·구현 착수 금지.
- 2F · Pilot 착수 금지.

---

# 19. P페이지 검색기초 TRACE (2026-10-03 · 코드 변경 0)

## P-PAGE-SEARCH-INDEX-TRACE (CLOSE)
- STEP 1 Production 실측 `/p/14`: 200 · title 「LG 인테리어」(업체명만) · description 「{지역줄} LG 인테리어 연락처와 방문 안내」 · meta robots / X-Robots-Tag 없음 · self canonical · robots.txt `/p/` 차단 없음 · sitemap 포함. JSON-LD·og 0. SSR 본문 전체 HTML.
- 원천: 업체 FACT = `store_profiles`(store_name·industry·region·sub_region·address·phone·visit_info·photo_pool) · 하는 일 = `meta.search_fact` · 블로그 의존 = 「최근 글」(publish_history 제목·날짜·링크 12) · 「이런 내용을 다룹니다」(core_keyword, store 14 = 0) · 공개 Gate(발행 ≥1).
- 최근 글 제거 가정 검색의미 4문항(업체·지역·하는 일·이용/연락) 모두 YES — 하는 일은 store 14 search_fact 한정. 블로그 제목에는 search_fact 밖 작업명(샷시·현관문필름·배관·방충망·누수·줄눈) 노출.
- STEP 2 Google 실검색: `site:ai-post.ai/p/14` · `site:ai-post.ai "LG 인테리어"` · `"https://ai-post.ai/p/14"` 모두 발견(스니펫에 search_fact 「제공 서비스」 문구 사용) · 「LG 인테리어 남양주」 3위 · 「LG 인테리어 덕소」 미발견. (상호명+지역 검색만 확인 — 비상호 「지역+하는 일」 검색은 미시험)
- Naver 실검색 · GSC URL 검사 · Naver Search Advisor 콘솔 = **미검증**(패널 차단·로그인 필요). 소유확인 흔적: DNS TXT google-site-verification · `public/naver8ddb….html`(200).
- sitemap P페이지 1건 = 조건(active · account · store 1 제외 · 유효 유료 구독행 · 발행 ≥1)을 DB 21행에 대입 시 store 14 만 통과(admin 지급 basic/canceled ~2099-12-31 · 발행 27). store 18 = 유료·발행 0.

## P-PAGE-SEARCH-FACT-INPUT-TRACE (PASS / CLOSE)
- 정식 경로 존재: P페이지 › ⚙️ 기본 설정 좌측 「🔎 검색 정보」 → `PATCH /api/me/store` → `sanitizeSearchFact`(saved_at 부여) → `meta.search_fact` merge → /p · 우측 HubCheck 소비. 마이페이지 입력란 없음.
- AI 자동생성 · 발행키워드(core_keyword·treatment_name·departments) 혼입 0. 쓰기 경로 = store.js 단 1곳.
- 일반 유료회원(`can_enter`) = services·process 입력 가능 · differentiators 제한(OWNER·store 14 전용). 무료 = 「준비 중」 카드 + 서버 403.
- DB: search_fact 보유 = store 14(8/6/3, saved_at 2026-09-29 20:26 KST — 입력 잠금 `695b9b3` 3분 전) · store 20(빈 값, §17 흔적). 나머지 19 없음.
- **store 14 search_fact 는 실제 업체 확인 여부 미검증** — 검색 노출 실험 표본으로만 사용. 「LG 인테리어가 실제 제공한다고 검증된 FACT」로 확정 금지.

## HOLD 후보 (개발 금지 · 선장 판정 대기)
- `P-PAGE-PUBLISH-INDEPENDENCE-01` — P페이지 공개가 블로그 발행 1건에 종속되어야 하는지(P페이지 독립 임대 상품 관점).
- `P-PAGE-FACT-SCOPE-01` — 일반회원에게 실제 업무방식/차이 FACT 를 어디까지 입력받을지.

## 기록 (선장 방향 메모 · 축 아님)
- 다음 검색 Pilot 핵심 질문: 상호명 없는 「지역 + 하는 일」 검색(예: 남양주 주방 리모델링 / 욕실 리모델링 / 아파트 인테리어)에서 /p 가 잡히는가. 지시 전 착수 금지.
- → §20 에서 실측 완료(0/8).

---

# 20. 지역×서비스 검색 Pilot → 다중업무 SoT 정리 (2026-10-03 · 코드 커밋 0)

## P-PAGE-REGION-SERVICE-SEARCH-PILOT-01 (STEP 4 NO PATCH / CLOSE)
- STEP 1 Google 실검색(브라우저 패널 · Google 로그아웃 · 한국 IP · 시크릿 아님): store 14 실제 services 기준 8개 검색어 — 남양주/덕소 × 아파트 인테리어·주방 리모델링·욕실 리모델링·도배 장판 → **/p/14 노출 0/8** · ai-post.ai 다른 페이지 0. (상호명 검색 「LG 인테리어 남양주」 = 3위 · §19)
- STEP 2 신호 TRACE(/p/14 Production HTML): title·H1 = 상호명만 · desc 서비스어 0 · H2 5개 지역어 0 · 서비스명 = `li > span`(heading 아님) 각 1회 · **업체 FACT 영역 지역×서비스 결합 0**(결합 문구는 「최근 글」 블로그 제목 3건뿐) · 「덕소」 = 주소 「덕소리」 1회 · 내부링크로 /p/14 진입 0(sitemap 만) · JSON-LD 0.
  비교(구조 차이만): ggid.co.kr/cases/namyangju(남양주 아파트 인테리어 1위) · sudong-interior.co.kr(남양주 도배 장판 1위) = title·H1 자체가 「남양주 + 서비스」 · 본문 heading 에 지역/서비스 구조.
  원인 후보(증거순): ①FACT 영역 지역×서비스 결합 부재 ②title·H1·desc 서비스어 0 ③내부링크 0 ④서비스명 heading 아님 ⑤권위·JSON-LD(미측정).
- STEP 3 설계: title `{region} {services[0].name} | {store_name}` 안 → **선장 기각**(services[0] = 대표 FACT 아님).
- STEP 4: 파일럿 범위 제한 기존 경로 TRACE → 없음(`PSEO_TEST_STORE_IDS` 는 입력·입장 권한 전용 — 머리 주석 「공개 /p/* 와 무관」 · env/DB 플래그 0) → **NO PATCH / CLOSE**. store14 전용 상수·새 env·DB 플래그·allowlist 의미 확장 모두 금지 판정.
- 덕소는 성공판정 대상 아님(서비스지역 FACT 에 없음 · 주소 확대해석 금지).

## P-PAGE-PRIMARY-SERVICE-DESIGN-01 (구현 → 채택 기각 → 원복)
- `search_fact.services[i].primary:true`(0~1개) 를 store.js·Store.js 에 구현 · 로직 Gate 11/11 PASS 했으나 **선장 방향 정정으로 채택 기각**. `git checkout` 으로 2파일 정확 원복(diff 0 · 커밋 이력 없음).
- **선장 결정: 대표 서비스 개념 도입 안 함.** 업체가 실제 수행하는 모든 서비스가 동등한 검색 대상.

## ONBOARDING-PRIMARY-WORK-TRACE-01 (코드 변경 0)
- 온보딩 = 업종 1개(`industry`, 인테리어는 업종센터에서 선택) + 업체명·주소·전화·생활권. 「하는 일/서비스」 선택 단계 없음. POST 시 `departments=[industry]` 서버 자동.
- 「내 메뉴」(myMenusMap) = localStorage 전용(DB 없음). 엔진 TREATMENTS = 코드 카탈로그. 온보딩 FACT 로 대표 「업종」은 가능, 대표/개별 「서비스」 결정 불가.

## P-PAGE 다중업무 SoT TRACE (CLOSE)
- 다중선택 UI = 마이페이지 「🔧 시공·서비스 분야」(secGuide 「함께 하는 분야를 모두 고르면 분야별 메뉴로 글을 쓸 수 있습니다. ★ 표시가 대표 분야입니다.」) → `store_profiles.departments`(jsonb, [0]=industry 불변, 서버 normalizeDepartments).
- 그룹: hospital(진료과 17) · construction(시공 17 + 생활 14) · silvercare(4). 그룹 없음 = 단일(dental·oriental·clinic — 주석 「독립 개원이 압도적」 · 음식점 · 전문직 · funeral · nursinghome · bedding 등 → 항상 []).
- 생성 소비 = 분야별 메뉴 섹션 → 메뉴→분야 역인덱스 → payload.industry(엔진 라우팅). generator/prompt 는 departments 값 직접 미참조.
- store 14 = `industry interior` · `departments ["interior"]`(사용자 추가 0) vs services 8개. 「주방 리모델링」 대응 분야 키 없음 · 도배·장판 = dobae+flooring 2키.
- **선장 판정(CLOSE):** ① departments = 엔진 분야/겸업 분류 SoT 유지 ② P페이지 실제 서비스 FACT 로 승격 금지(헌법 §5.4 · H-005 유지) ③ `search_fact.services` = P페이지 고객 관점 실제 서비스 FACT ④ 대표 서비스 개념 도입 안 함 ⑤ primary 원복 유지 ⑥ FREEZE 엔진·departments 계약 변경 금지.

## NEXT ONE AXIS — `P-PAGE-MULTI-SERVICE-SEARCH-ARCHITECTURE-01` (DESIGN ONLY · 구현 금지 · 미착수)
- 목표: 한 업체의 `search_fact.services` N개를 각각 「지역 × 서비스」 검색기회로 만드는 검색자산 구조 설계.
- 비교 최소 3안: (a) 현재 `/p/{storeId}` 한 페이지 안에서 N개 서비스를 지역과 각각 결합 (b) 업체 아래 서비스별 검색 URL/자산 (c) 기존 Intent/pSEO 구조(`[intentSlug].js` · core_keyword 기반) 재사용 가능성.
- 제약: Blog 본문 복제 금지 · departments 를 서비스 FACT 로 사용 금지 · publish_history 를 서비스 FACT 로 사용 금지 · 서비스 SoT = `search_fact.services` 만 · 없는 지역×서비스 조합 생성 금지 · 업체 미입력 서비스 생성 금지 · 대량 페이지부터 만들지 말 것 · 기존 P페이지 전환 기능 유지 · DDL 0 우선.
- 예제 필수: store 14 실제 8개 서비스 — 남양주 × 아파트 인테리어 / 주방 리모델링 / 욕실 리모델링 / 도배·장판 … 각각 어떻게 검색 의미를 갖는지.
- 산출: 구조안 비교 후 STOP(코드 수정 0).
- 참고 실측 자산: §19(색인·스니펫) · §20 STEP 2(신호·경쟁 구조) · store 14 search_fact 는 실제 업체 확인 미검증(실험 표본).
