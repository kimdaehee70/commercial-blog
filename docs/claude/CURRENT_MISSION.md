# AI-POST · CURRENT MISSION

**기준일:** 2026-09-30  
**현재 대형 목표:** P페이지 1F 완성  
**현재 상태:** 개발 일시 STOP — Claude 운영 헌법 도입 후 재개

> 이 문서는 영구 헌법이 아니다. 현재 항해 상태를 기록하며 선장 지시에 따라 갱신한다.

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

업종은 엔진 라우팅 영향이 있으므로 일반 기본정보처럼 자유 수정하지 않는다.

---

# 3. 현재까지 정리된 커밋

브랜치: `feat/p-page-one-screen-01`

- `8ff75f9` — `PSEO-MINIHOME-UI-01`
- `2f73862` — `PSEO-MY-SEARCH-PAGE-UX-01A`
- `27f6201` — `P-PAGE-ONE-SCREEN-01 STEP 1`

무관한 dirty tree가 다수 남아 있으므로 모든 후속 작업에서 stage 범위를 엄격히 통제한다.

`.claude/launch.json`은 개발 도구용이며 커밋 대상이 아니다.

별도 브랜치 보존:
- `fix/pseo-eligibility-enterprise-gap`
- commit `a472ebe`
- 현재 브랜치에 임의 병합 금지

---

# 4. STEP 1 UI Shell 현재 상태

구현된 구조:

## 왼쪽
- P페이지 기본 설정
- 업체 기본정보 표시
- 운영·상담·출장정보
- 검색정보(`meta.search_fact`) 영역
- 업체사진 `[준비 중]`

## 오른쪽
- `내 P페이지 미리보기`
- “업체 사진과 미리보기 기능은 다음 단계에서 연결됩니다.” placeholder

## MyPage
- 중복 `search_fact` 편집기는 제거된 상태

새 DB/API/photo storage/Preview/public gate 변경 없음.

---

# 5. 지금 진행 순서

현재 승인된 순서:

```text
① 실제 로그인 화면 확인
→ ② STORE-SPECIALTY-PRESERVE-01
→ ③ P페이지 기본정보 직접편집
→ ④ 실제 저장 E2E
→ ⑤ 업체사진 저장계약/구현
→ ⑥ Preview
```

각 단계는 선장 PASS 후 다음 단계로 넘어간다.

---

# 6. 즉시 다음 작업 — ① 실제 화면 확인

Claude는 사용자가 localhost에서 로그인한 뒤 **저장하지 않고** 다음을 확인한다.

P페이지 → 기본 설정:
1. 기존 업체정보 자동 표시
2. 운영/상담/출장정보 표시
3. 검색정보 위치
4. 업체사진 준비중 영역
5. 우측 Preview placeholder
6. 레이아웃 깨짐/스크롤/중복 UI

MyPage:
7. `search_fact` 편집기 중복 제거 확인

스크린샷/실측 결과를 보고하고 STOP.

**이 단계에서 코드 수정 금지.**

---

# 7. 다음 결함 후보 — specialty

TRACE에서 실제 위험 확인:
- 기본정보 저장이 사용자가 건드리지 않은 `specialty`를 함께 보낼 수 있음
- state가 빈 값이면 서버가 null로 저장해 전문점 값 소실 가능
- 계정 전환 stale state 오염 가능성

별도 축 후보:

`STORE-SPECIALTY-PRESERVE-01`

목표:
> 업체명·주소·전화 등 무관한 기본정보 저장이 specialty에 절대로 영향을 주지 않는 저장 계약.

선장 원칙:
> 이번 저장에서 사용자가 수정하지 않은 필드는 보내지 않는다.

현재는 **TRACE 완료 / 구현 미승인**.

실제 화면 확인 PASS 전에는 시작하지 않는다.

---

# 8. search_fact 권한

현재 일반 유료회원 전체에 대한 `search_fact` 편집 권한은 아직 별도 해결축이다. OWNER/store 14 중심의 내부 잠금이 남아 있을 수 있다.

STEP 1 UI Shell에서 임의로 권한을 풀지 않는다.

향후 eligibility/permission 별도 축에서 실제 유료 가입자의 P페이지 편집 계약을 검증한다.

---

# 9. 업체사진

TRACE 결과 현재 재사용 가능한 영구 서버 사진 저장 구조가 확인되지 않았다.

따라서 사진 단계는:

```text
DESIGN FIRST
→ 실제 저장 위치/소유권/공개성/삭제/대표사진 계약
→ 최소 구현
→ 업로드/표시/삭제 E2E
```

순서로 진행한다.

선장 승인 전:
- Supabase bucket 생성 금지
- 신규 upload API 금지
- `photo_pool` 임의 정본화 금지

AI 생성 이미지를 실제 업체사진으로 사용하지 않는다.

---

# 10. Preview

Preview는 사진 다음 축이다.

원칙:
- Public `/p` gate를 Preview 편의를 위해 완화하지 않는다.
- OWNER/private preview와 public page 접근제어를 분리한다.
- Bearer 인증 구조를 무시한 iframe 우회 금지.
- shared renderer/API refactor는 DESIGN/TRACE 후 승인.

---

# 11. STOP 조건

Claude는 다음 상황에서 즉시 STOP하고 선장 판정을 요청한다.

- 현재 단계 밖 파일 수정이 필요함
- DB/DDL/API/storage가 필요해 보임
- FREEZE 파일을 건드려야 함
- public `/p` gate 변경이 필요함
- 기존 SoT와 충돌
- 다른 미커밋 축 발견
- 실제 데이터 소실 가능성 발견
- 사용자에게 기술 설계 선택을 요구해야 하는 상황

---

# 12. 현재 사용자에게 필요한 조작

현재 단계에서는 사용자가 로컬 `localhost:3100`에 OWNER 또는 store 14 계정으로 **로그인만** 하면 된다.

저장 버튼은 누르지 않는다.

로그인 후 Claude는 ① 실제 화면 확인만 수행하고 보고 후 STOP한다.
