# AI-POST · ENGINE DEVELOPMENT PLAYBOOK v1.0

**상태:** ACTIVE / 신규 콘텐츠 엔진 작업 시 필독  
**기반:** `AI-POST NEW CONTENT ENGINE DEVELOPMENT SOP v1.1`, Purpose Driven Guideline, V3 Architecture  
**원칙:** 기존 FREEZE 엔진은 이 문서 때문에 수정하지 않는다.

---

# 1. 엔진 개발의 한 줄

> **검색자의 실제 질문을 먼저 정하고, 승인된 FACT 안에서 충분히 답하며, 전 CAT 실생성 검증 후 FREEZE/CLOSE한다.**

표준 순서:

```text
검색시장 확인
→ Search Question
→ CAT / Purpose
→ FACT SoT
→ FACT Gate
→ Prompt
→ Entailment 감사
→ 제목
→ 방문정보
→ 사진
→ 집중 Smoke
→ 전 CAT Final Sweep
→ FREEZE / CLOSE
```

순서를 임의로 뒤집지 않는다.

---

# 2. 착수 전 Gate

새 엔진을 만들기 전에 확인한다.

- 실제 검색시장/상업 검색의도가 존재하는가
- 사용자가 실제로 묻는 질문이 무엇인가
- 업종부터 정하고 억지 질문을 만드는 구조가 아닌가
- 기존 엔진과 동일 개념인지, 새 엔진이 필요한지
- 기존 FREEZE 엔진 수정 없이 추가 가능한가
- 현재 One Axis가 엔진 개발을 허용하는가

시장/질문 근거가 약하면 Prompt부터 만들지 않는다.

---

# 3. Search Question → CAT / Purpose

Keyword만으로 엔진을 만들지 않는다.

각 CAT는 검색자의 질문과 목적을 가진다.

최소 확인:
- `search_question`
- `purpose`
- `answer`
- `decision_points`
- `allowed_facts`
- `fact_gate`
- `next_action`

핵심 콘텐츠 흐름:

```text
검색될 이유
→ 읽을 이유
→ 선택할 이유
```

선택 이유는 광고문구가 아니라 실제 업체 FACT에 근거해야 한다.

---

# 4. FACT SoT

FACT는 가능한 한 하나의 구조화된 SoT로 관리한다.

원칙:
- 하나의 FACT = 하나의 명확한 주장 단위 우선
- FACT 근거 추적 가능
- 표시 블록과 본문 evidence는 같은 FACT에서 파생
- GPT가 부족한 FACT를 추론해 채우지 않음
- UI에 있다는 이유만으로 evidence 없는 사실 구조를 만들지 않음

특히 법령·비용·조건·자격·절차처럼 modifier가 중요한 정보는 원자화한다.

---

# 5. Prompt

Prompt의 역할은 FACT를 늘리는 것이 아니라 **승인된 FACT를 독자가 이해하기 쉽게 설명하는 것**이다.

금지:
- FACT 없는 조건
- FACT 없는 수치
- FACT 없는 원인·효과
- 보장
- 업체의 경험/성과/전문성을 임의 창작

FACT를 단순 복사하는 것도 목적형 콘텐츠가 아니다. FACT 범위 안에서 맥락·순서·의미를 설명한다.

권장: 한 문단에 과도한 FACT를 넣지 않는다. SOP 기준으로 최대 3개 FACT를 우선한다.

`facts=[]` 문단에서 새로운 사실 설명을 시작하지 않는다.

---

# 6. Entailment / QC

Entailment는 FACT 확장·왜곡을 찾는 감사 장치다.

원칙:
- 결과 하나를 보고 즉시 Prompt 수정하지 않는다.
- 자동 수정 금지.
- FAIL이 하나 있다고 엔진 전체를 자동 HOLD하지 않는다.
- evidence coverage와 반복성/구조성을 함께 본다.

주요 holdout 교훈:
- 법률 열거 modifier → FACT 원자화
- multi-FACT dilution → 문단 FACT 밀도 관리
- `facts=[]` 조언 경계
- 표시 블록과 statement 불일치 → 동일 FACT SoT
- JUDGE_INVALID → 판정 구조 확인
- Prompt 규칙은 확률적 → Gate/실생성으로 검증

---

# 7. 제목

제목은 최종 실제 호출 경로의 SoT를 TRACE한 뒤 수정한다.

금지:
- 죽은 pool 수정
- 보기 좋은 제목 몇 개만 보고 PASS
- 제목 문제를 본문 Prompt 수정으로 해결
- 검색자 언어와 동떨어진 내부 용어 중심 제목

실제 검색자가 쓰는 질문/상황 언어를 우선한다.

---

# 8. 방문정보

UI에 저장된 모든 업체정보를 모든 본문에 넣지 않는다.

구분:
- 업체 자산으로 저장할 정보
- 해당 CAT 목적상 본문에 필요한 정보

`UI 필드 존재 = 본문 의무 출력`이 아니다.

주소/시간/휴무/예약/상담/주차/교통/연락처는 목적에 맞게 선택한다.

---

# 9. 사진

사진 Gate 전에 **현재 엔진의 실제 사진 처리 방식**을 TRACE한다.

## A. 시스템 치환형

```text
UI 라벨 → 저장/전달 key → placeholder → 실제 사진 치환
```

PASS는 실제 입력 사진이 올바른 생성 위치에 1:1 치환되는 것까지 확인한다.

## B. 발행자 첨부형

```text
사진 정책/라벨 → placeholder → 슬롯 위치/순서 → 발행자 안내
```

존재하지 않는 DB/storage/치환 기능을 요구하지 않는다.

공통 금지:
- 사진 처리 방식을 추측
- Gate를 통과하려고 새 사진 시스템을 발명
- 사진 때문에 정상 FREEZE Prompt/generator 수정

---

# 10. Smoke

전 CAT 순회 전 사실 민감도가 높은 대표 CAT를 집중 Smoke한다.

우선 대상:
- 자격/조건
- 비용
- 법령
- 절차

확인:
- FACT Gate
- Purpose 충족
- Entailment
- 사실 확장
- 조건 강화/약화
- 정보 손실
- 정보블록 중복
- 문체

**발견 즉시 수정하지 않는다.** 반복·구조 결함인지 먼저 본다.

---

# 11. 과수정 방지

출시 전 수정 후보는 원칙적으로 다음에 한한다.

1. 명백한 사실 오류
2. 검색 목적에 답하지 못함
3. 필요한 정보 손실
4. Gate/wiring 구조 이상
5. 동일 중대 결함이 여러 CAT에서 반복

원칙적으로 출시 차단이 아닌 것:
- 더 자연스럽게 다듬을 수 있는 문장
- 약한 반복
- 취향 차이
- 의미를 해치지 않는 다소 딱딱한 표현
- 단발성 경미 표현

---

# 12. Final Sweep

전 CAT를 한 번에 보고 공통 결함 여부를 판단한다.

Final Sweep 중 금지:
- 결과 하나마다 Prompt 수정
- Gate 즉시 강화
- FACT 추가 조사로 범위 확장
- 깨끗한 CAT만 반복 생성
- 한 문장 때문에 엔진 전체 재설계

CAT별 기록:

```text
CAT
FACT Gate
Entailment
Purpose
정보손실
사실 확장/왜곡
중복
제목
사진/방문정보
출시차단 결함
판정
```

---

# 13. CLOSE / FREEZE

CLOSE 조건:
- 전체 CAT Purpose PASS
- 명백한 사실오류 없음
- 필수 정보 손실 없음
- 생성 경로 정상
- FACT SoT 추적 가능
- 제목 Gate PASS
- 방문정보 정책 확인
- 사진 슬롯 전체 경로 확인
- 실생성 Final Sweep 완료
- 출시차단 구조결함 없음

CLOSE 시 기록:
- data/FACT
- prompt
- generate handler
- Gate
- 제목 pool/selector
- 사진 슬롯
- 방문정보 정책
- 핵심 파일 hash
- statement hash
- known holdout

FREEZE 이후:

```text
발견 → 별도 축 OPEN → 영향 분석 → 승인 → 수정 → 재검증
```

다른 엔진에서 더 좋은 방법을 찾았다는 이유로 기존 엔진을 고치지 않는다.

---

# 14. 엔진 개발 중 Claude의 행동

Claude는 각 STEP마다:

1. TRACE
2. 근거 보고
3. 선장 승인
4. 구현
5. 검증
6. STOP

을 반복한다.

한 번에 엔진 전체를 만들어 놓고 마지막에 승인받지 않는다.

**좋은 엔진을 빨리 만드는 것보다, FACT와 검색목적을 훼손하지 않고 검증 가능한 엔진을 만드는 것이 우선이다.**
