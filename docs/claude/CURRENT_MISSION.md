# AI-POST · CURRENT MISSION

**기준일:** 2026-10-03  
**현재 대형 목표:** P페이지 1F 완성  
**현재 상태:** ①~⑦-F CLOSE. **`P-PAGE-FIRST-USER-EDIT-FLOW-01` STEP 1 TRACE PASS · STEP 2 편집↔미리보기 양방향 연결 CLOSE**(`827bbf6`). **`P-PAGE-F3-TRAVEL-INFO-CONSISTENCY-01` CLOSE**(`e876b08`). **`P-PAGE-F2-SERVICE-AREA-POSITION-01` CLOSE**(`9dfa546`). **`P-PAGE-F1-PHOTO-INPUT-ORDER-01` CLOSE**(`6f3d541`). **`P-PAGE-1F-IDENTITY-01` CLOSE / PRODUCT PASS**(`6f4638f`). **다음 One Axis = `PSEO-FACT-INPUT-OPEN-01` — TRACE FIRST** — §16 참조  
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
PSEO-FACT-INPUT-OPEN-01         TRACE FIRST   ← 지금 여기 (구현 금지)
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

1. git 기준선 확인(헌법 §8) — branch `feat/p-page-one-screen-01` · HEAD = 이 문서의 HANDOVER 커밋(직전 `6f3d541` · `6ca2ef3`) · dirty = 기존 156건만(HOLD 3 포함) · staged 0. store 14 `photo_pool` 2장은 의도된 상태(§7) — 원복·삭제하지 않는다.
2. 사용자가 「인수인계 확인」을 보내면 기준선 결과만 보고하고 STOP.
3. 다음 축 = **`PSEO-FACT-INPUT-OPEN-01` TRACE ONLY**(§16). 그 외 축은 선장 지시 전 OPEN 하지 않는다. §5 후보 · §12 후속 후보 F-4~F-6(F-1·F-2·F-3 CLOSE) · `P-PAGE-SEARCH-DISCOVERY-01`(2F 미래 후보)을 임의로 승격하지 않는다.
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
