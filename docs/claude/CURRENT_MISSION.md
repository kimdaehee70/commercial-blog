# AI-POST · CURRENT MISSION

**기준일:** 2026-10-03  
**현재 대형 목표:** P페이지 1F 완성  
**현재 상태:** ①~⑦-E CLOSE. ⑦-F-1 TRACE PASS · ⑦-F-2 공개 /p 사진 구현 기술 PASS · **미커밋**(`pages/p/[storeId]/index.js` 1개). **다음 = ⑦-F-3 PRODUCT E2E(사장님 Chrome `/p/14`)** — §7·§11 참조  
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
⑦-F 공개 /p 사진               F-1 TRACE PASS · F-2 구현 기술 PASS(미커밋) · F-3 PRODUCT E2E 대기   ← 지금 여기
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

---

# 6. search_fact 권한

`search_fact` 편집은 `canManagePseoFact`(OWNER 또는 store 14)로 잠겨 있다. 일반 유료회원 P페이지에서는 「입력은 준비 중」으로 보인다. UI 축에서 임의로 권한을 풀지 않는다.

---

# 7. 업체사진 (⑤~⑦-E CLOSE, ⑦-F 진행 중)

## 확정 계약 (선장 승인)
- SoT = `store_profiles.photo_pool`(jsonb 배열, 기존 컬럼). 신규 DB 컬럼 없음. ⑦-B 시점 21행 전부 `[]`.
- 원소 = `{ "path": "{store.id}/{uuid}.jpg" }` — bucket 상대 경로만 저장(전체 URL 저장 금지, 읽을 때 서버가 URL 변환).
- 배열 0번 = 대표사진, 이후 = 추가사진(순서 = 표시 순서). 별도 대표 플래그 없음.
- 최대 총 6장(대표 1 + 추가 5).
- 조작(⑥ 설계): 등록 = 끝에 추가(비었으면 대표) / 대표변경 = 0번으로 이동 / 교체 = 같은 위치 path 를 **새 UUID** 로 / 삭제 = 제거(0번 삭제 시 다음이 대표). 순서 = 업로드 → DB 저장 → 기존 객체 삭제. 서버가 현재 DB 값 기준으로 새 배열 계산(클라이언트는 배열 전체를 보내지 않음). 사진 조작은 `photo_pool` 만 변경.
- Storage: bucket `store-photos` · public=true · 5MB · `image/jpeg` only · 신규 RLS 정책 없음(클라이언트 직접 쓰기 불가).
- 업로드 = signed upload. `POST /api/me/store-photo-upload`(본문 없음) → `requireAccount` → `store_profiles.account_id` 로 서버가 store.id 결정 → `{store.id}/{uuid}.jpg` 에만 발급 → `{ ok, path, token, signedUrl }`. 클라이언트의 store/path/bucket 입력은 읽지 않음. `photo_pool` 6장 이상이면 409 `PHOTO_LIMIT`(읽기만, 선장 유지 승인).
- /p 표시 위치 확정: 전화 → 문자/길찾기 → **업체사진** → 영업정보 → 제공 서비스 (`nav.row` 와 `section.info` 사이).
- 입력 UI = `lib/pseo/StorePhotoCard.js`(⑦-D) — `lib/Store.js` `section==="pseo"` 의 「📷 업체 사진」 카드(`#pseo-sec-photo`) 자리. 마이페이지 분기 무변경.
  - 사진 state 는 `hubStore` 와 분리(카드 내부). `/api/me/store` 응답에 `photo_pool` 이 없어 `saveStore → setHubStore(j.store)` 전체 교체 시 지워지기 때문.
  - 입력 = JPG·PNG(`accept="image/jpeg,image/png"`). HEIC/HEIF/WebP/GIF 거절(HEIC 는 별도 축 후보). 원본 30MB · 5,000만 화소 초과 거절.
  - JPG·PNG 모두 브라우저 canvas 로 JPEG 재인코딩: 긴 변 최대 1600px(확대 없음) · 품질 0.82 · 결과 5MB 초과 시 0.70 1회 재처리 → 그래도 초과면 거절. PNG 투명영역 = 흰 배경. EXIF/GPS 제거.
  - 흐름 = 변환 → 발급(`store-photo-upload`) → 브라우저 → Supabase signedUrl 직접 PUT → `store-photo add/replace`. 이미지 바이너리 앱 서버 미경유.
  - 최대 6장 · [0] 「대표」 배지 · [대표로] · [◀▶] · [교체] · [삭제(확인창)] · 여러 장은 남은 칸까지 한 장씩 순차 · 조작 중 잠금 · 「사진 처리 중 n/m」.
  - 카드 안내 「사진 공개 페이지 반영은 준비 중입니다.」 — ⑦-F PRODUCT PASS 후 별도 CLOSE STEP 에서 제거(아직 제거 금지).
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
- ⑦-F-2 (미커밋, `pages/p/[storeId]/index.js` 단 1개 · +57/−4): `PUBLIC_FIELDS` + `photo_pool`(SSR 원천 전용, 주석 갱신) → `{현재 storeId}/{UUID}.jpg` 정규식 필터 → `.slice(0, 6)` → `sb.storage.from("store-photos").getPublicUrl()` → `store.photos = [url…]`(raw path·photo_pool props 미포함). `</nav>` 와 `section.info` 사이 `section.photos` — 대표 `.photoMain`(100% · 4:3 · cover · eager) + `.thumbs/.thumb`(4.5×3.375rem · lazy). alt = 「{업체명} 대표사진」/「{업체명} 사진 n」. 클릭·링크·추적 없음.
  동기화 지점: `MAX_PHOTOS = 6` · UUID.jpg 규칙이 `store-photo.js` 와 `/p` 두 곳.
  정적 검증: SSR `GET /p/14` 200 · img 2(대표 7cbf7a81 · 썸네일 2dc52872) · props 에 `photo_pool`/`path` 0 · 거부 실측(타 store · `../` · 대문자 · 비UUID · 비객체 · `140/`) · 7장 이상 → 6 · 0/1/6장 렌더 · compile 0.
  금지범위 diff 0: `/api/me/**` · StorePhotoCard · PseoRoom · `[intentSlug].js` · JSON-LD · og:image · tracking · DB · Storage.
- **현재 store 14 `photo_pool` = 2장 — `[0] 14/7cbf7a81-6fe4-43d5-a7c7-389818f10210.jpg`(대표) · `[1] 14/2dc52872-23d8-4f49-b6bd-3a7841209311.jpg`(사장님 추가). ⑦-F 실증 자산 — 삭제·변경 금지.** 다른 업체 21행 중 나머지 전부 `[]`.
- 기록만: 공개 렌더 시 Storage 존재 확인 없음 → pool 에 객체 없는 path 가 남으면 깨진 이미지(정상 경로로는 발생 안 함, 관리 Preview 동일).
- 미검증: authenticated 사용자의 Storage 직접 업로드 차단(실 로그인 E2E 단계에서 확인 예정). 저사양 휴대폰 대형 사진 메모리. 결과 5MB 초과 → 0.70 재처리 분기(재현 입력 없음, 코드 확인만).

## 금지 (계속)
- ⑦-F 범위 확장 금지: Intent 페이지(`[intentSlug].js`) 사진 연결 · JSON-LD/og:image 확장 · 사진 최적화/CDN 추가 개발 금지.
- `/api/me/store` 사진 필드 개방 금지. ⑦-F PRODUCT PASS 전 커밋 금지.
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

1. git 기준선 확인(헌법 §8) — branch `feat/p-page-one-screen-01` · ⑦-E CLOSE `344a313` 이후 커밋이 문서 전용인지 · dirty = 기존 156 + ⑦-F-2 미커밋 `pages/p/[storeId]/index.js` 1개(+57/−4) · staged 0. store 14 `photo_pool` 2장은 의도된 상태(§7) — 원복·삭제하지 않는다.
2. 사용자가 「인수인계 확인」을 보내면 기준선 결과만 보고하고 STOP.
3. 첫 STEP = ⑦-F-3 PRODUCT E2E(선장 지시 후). 사장님 Chrome 에서 실제 `/p/14`: ① 정상 진입 ② 사진 2장 ③ 첫 사진 = 큰 대표 ④ 두 번째 = 썸네일 ⑤ 위치 = 문자/길찾기 → 사진 → 영업시간/휴무 ⑥ 이미지 깨짐 없음 ⑦ 전화/문자/길찾기 회귀 없음 ⑧ 모바일/좁은 폭 치명적 깨짐 여부. 코드 수정·커밋 금지. (사장님이 /p 를 열면 page_view 가 기록됨 — 기존 동작)
4. PRODUCT PASS 후 별도 CLOSE STEP(선장 지시): `StorePhotoCard` 「사진 공개 페이지 반영은 준비 중입니다.」 문구 제거 → 최종 diff 재확인 → ⑦-F 변경만 커밋 → CURRENT_MISSION 갱신 여부 선장 결정. push/merge 금지.
