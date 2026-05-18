# 플래너(달력) DB·페이지 — 설계 메모

> **1차 최종 구현(프론트·저장·상태):** [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md)  
> **일일 필드 매핑:** [PLANNER_DAILY_STUDY_SCHEMA.md](./PLANNER_DAILY_STUDY_SCHEMA.md)

관리자 대시보드와 별도로, 아임웹에 심는 **공개용 달력형 플래너**와 그에 맞는 **Google 스프레드시트 DB** 구조를 정리한 문서다.

> **마스터 플랜 DB 스키마 최종본:** 아래 **「마스터 플랜 DB 최종본」** 절.  
> 프론트·payload·연동 진행: [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md).

---

## 마스터 플랜 DB 최종본

**대상:** Google 스프레드시트 **`솔루션편입_플래너_마스터`** 한 파일 (`Script Property` `SHEETS_PLANNER_MASTER_ID`).  
**상태 (2026-05):** 마스터 **탭·1행 헤더·`init`** 확정. GAS read/API·학생 파일·todo 연동은 [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md) §10·§12.

### 파일·탭 한눈에

| 탭 (시트명) | 성격 | 날짜 | 누가 채움 | 비고 |
|-------------|------|------|----------|------|
| `planner_registry` | **학생(멤버) 마스터** — 전화 매칭·프로필 | 없음 (행=사람) | 솔패스 `plannerRegistryRebuild` + 운영 수기 | 회원/비회원 **타입 컬럼 없음**. `phone_display`는 시트에 없음(API만) |
| `planner_student_links` | **학생 ↔ Drive 파일** 연결 | 없음 | GAS 프로비저닝 | `link_key` = `member_code` 우선, 없으면 `imweb_uid` |
| `planner_curriculum_courses` | **강좌** 카탈로그 | **없음** | 운영 (학원 커리큘럼 그대로) | PK `course_id` (숫자) |
| `planner_curriculum_lectures` | **강의** 카탈로그 (강좌 하위) | **없음** | 운영 | FK `course_id` · 회차 `lecture_no` |
| ~~`planner_common_calendar`~~ | *(폐기)* 날짜 박힌 “공통 일정” | — | — | `init` 시 탭 삭제. **커리큘럼으로 대체** |
| ~~`planner_member_records`~~ | *(폐기)* 방문 로그 | — | — | `init` 시 탭 삭제 |

**학생별 파일** (`planner_student_links`로 연결, 마스터 아님): 탭 **`planner_personal_todos_YYYY_MM`** — 날짜 있는 **실제 할 일(todo)** 한 월분. 상세는 §7·[PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md) §10.4.

### 데이터가 흐르는 방식

```
[마스터] planner_curriculum_courses (강좌)
              │
              ▼ course_id
[마스터] planner_curriculum_lectures (강의)     ← 날짜 없음, 목록만
              │
              │  운영/플래너: 강좌 선택 → lecture_no 구간(예: 2~10) → 날짜에 분배
              ▼
[학생 파일] planner_personal_todos_YYYY_MM (todo) ← date·mark·timeline_slots

[마스터] planner_registry ──전화 매칭──► 게이트
              │
              ├── student_profile (API, 시트 14열)
              └── planner_student_links ──► 학생 스프레드시트 열기
```

- **커리큘럼(강좌·강의)** = “무엇을 공부할지” **재료**. 매번 todo에 손으로 치지 않고 **불러와서** 날짜만 붙인다.
- **todo** = “이 학생이 **언제** 무엇을 할지” **분배 결과**. 지금 프론트의 빠른 등록(과목+N강)은 이 흐름의 **단순 UI**이고, 연동 후에는 강의 카탈로그에서 고른다.

### 탭별 — 컬럼·특이사항

#### `planner_registry` (14열, 영문 헤더)

| 컬럼 | 특이사항 |
|------|----------|
| `member_code` | 솔패스 rebuild. 수기 행 **빈 칸 OK** |
| `imweb_uid` | `members.uid`. **필수 아님** |
| `phone_normalized` | 게이트 매칭 키. 셀 **텍스트 `@`** |
| `display_name` | |
| `track` … `study_status` | 운영 수기. rebuild 시 **빈 문자열** |
| `first_solpass_order_id`, `registry_updated_at` | rebuild. 수기 행 빈 칸 OK |

**운영 규정:** registry에 올리는 행은 `member_code`·`imweb_uid` **둘 다 비우지 않음** (링크·파일 전제).

#### `planner_student_links` (4열)

| 컬럼 | 특이사항 |
|------|----------|
| `member_code` | registry와 동일 (없으면 빈 칸) |
| `imweb_uid` | registry와 동일 |
| `student_spreadsheet_id` | 학생 전용 플래너 파일 ID |
| `provisioned_at` | 프로비저닝 시각 (서울 ISO) |

**API `link_key`:** 시트 열 아님. `member_code` 있으면 그 값, 없으면 `imweb_uid`.

#### `planner_curriculum_courses` (5열) — **강좌**

| 컬럼 | 특이사항 |
|------|----------|
| `course_id` | **숫자 PK** |
| `subject` | 과목(문법·논리 등) |
| `instructor` | 강사 |
| `course_name` | 강좌명 |
| `link_url` | 자료 URL |

#### `planner_curriculum_lectures` (5열) — **강의** (강좌 1 : N)

| 컬럼 | 특이사항 |
|------|----------|
| `lecture_id` | **숫자 PK** |
| `course_id` | **FK** → `planner_curriculum_courses.course_id` |
| `lecture_no` | 회차 번호 · UI “2강~10강” **범위 선택** |
| `lecture_name` | 강의명 |
| `duration` | 시간(텍스트 — `45`, `60분` 등 운영 형식) |

### `initPlannerMasterSheets` 가 만드는 마스터 탭 (최종)

1. `planner_registry`  
2. `planner_student_links`  
3. `planner_curriculum_courses`  
4. `planner_curriculum_lectures`  

레거시 `planner_common_calendar`, `planner_member_records` 는 **생성하지 않음** · 있으면 **삭제**.

**코드 상수:** `gas/DB/dbSchema.js` — `DB_SHEET_*`, `DB_PLANNER_*_HEADERS`.

---

## 1. 페이지·데이터 (요약)

| 구분 | 설명 |
|------|------|
| 관리자 대시보드 | 기존 임베드. **플래너 UI와 분리.** |
| 플래너 페이지 | 아임웹 전용 달력·일일 모달·할 일 등록. |
| **마스터 `planner_registry`** | 솔패스 동기화 **멤버 한 행** = `member_code`·전화·이름 + **(확장 예정) 학생 기본 정보**. 운영 **시트 수기** 입력. 회원/비회원 **타입 컬럼으로 나누지 않음.** |
| **학생별 파일** | `planner_personal_todos_YYYY_MM` — **할 일**(월 단위 탭). 링크는 `planner_student_links`. |

**게이트:** 방문 시 전화(·필요 시 이름)로 registry 매칭. 매칭된 `member_code` 로 bootstrap.

**구현 정본(화면·payload):** [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md).

---

## 2. 솔패스 목록 + 전화번호 게이트

- **목적:** 아임웹이 회원 정보를 안 넘겨 주므로, **플래너 본문 전에** 전화번호로 목록과 매칭한다.
- **목록 데이터:** 원천 주문·`product_mapping`의 `solpass` 등 기존 파이프라인에서 뽑은 행. 이력 유지·삭제 정책은 운영 규칙에 따른다.
- **매칭 키:** 서버에서는 **정규화된 숫자만** 비교한다(예: `01012345678`).
- **이름(더블 체크):** **목록에서 동일 전화번호가 2행 이상**일 때만 입력받아, 목록의 이름과 **추가로** 대조한다. 전화가 **유일하게 1행**이면 이름 입력·검증은 하지 않는다.
- **이름 대조 규칙(확정):** 비교 전에 **공백만 제거**한 뒤 일치 여부를 본다(추가 정규화는 필요 시만).
- **보안:** 전화·이름을 시트에 어떻게 남길지(평문·마스킹·해시)는 **Step 2**에서 정한다.

---

## 3. 전화번호 입력 UI (오입력 방지)

**매 방문** 플래너 본문 전에 받는다. 세 칸으로 나눈다.

| 칸 | 내용 | 제한(초안) |
|----|------|------------|
| 1 | 앞자리(통상 `010`, `011` 등) | **숫자만**, `maxlength=3` |
| 2 | 중간 4자리 | **숫자만**, `maxlength=4` |
| 3 | 끝 4자리 | **숫자만**, `maxlength=4` |

- `inputmode="numeric"` 등으로 비숫자 입력 최소화.
- 전화 중복으로 **이름 입력이 필요할 때만** 두 번째 단계 UI를 연다(서버가 `need_name` 등으로 분기 알려 줌).
- **개인정보 안내:** 전화번호·이름(해당 시)을 받는 **입력 박스 영역 안**에 짧은 수집·이용 안내 문구를 넣는다.
- 실패 메시지는 Enumeration을 줄이도록 **모호하게** 통일(구현 단계).

---

## 4. 저장 정책 (두 저장소)

| 데이터 | 위치 | 채움 |
|--------|------|------|
| **학생 기본 정보** (계열·전형·전적·목표대·학습 상태 등) | 마스터 **`planner_registry`** — 기존 멤버 행에 **컬럼 추가(예정)** | 운영 **수기** (별도 “비회원 입력 페이지” 없음) |
| **할 일·타임라인·일일 mark·메모 행** | 학생별 파일 **`planner_personal_todos_YYYY_MM`** ([PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md) §10.4) | 플래너 → API 연동 후 |
| **커리큘럼(강좌·강의)** | 마스터 `planner_curriculum_courses` · `planner_curriculum_lectures` | 운영 입력 · 날짜 분배 후 todo |

**폐기:** `planner_member_records`(방문·매칭 append 로그) 탭은 **사용하지 않음**. GAS는 생성·append 하지 않으며, `initPlannerMasterSheets` / `plannerDevFullReset` 시 레거시 탭이 있으면 삭제한다.

**프론트 `role: guest`:** bootstrap이 `memberCode` 없을 때 내리는 값. **제품에서 “비회원 타입”을 시트에 두는 것과 무관.** 당분간 UI·API 잔존(잠금 등) — [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md) §8.4.

---

## 5. 스프레드시트 파일 구조

| 파일 | 역할 |
|------|------|
| **마스터 플래너 DB** | registry·links·**curriculum_courses·curriculum_lectures**. 파일명 **`솔루션편입_플래너_마스터`**. |
| **학생별 플래너 DB** | registry에 있는 `member_code` 마다 프로비저닝 — **할 일·일일 데이터**만. |

---

## 6. DB 스키마 작업 순서 (정본)

**전체 번호·상태 표:** [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md) **§10.0** (프론트 기능 순서와 별개).

| # | 탭 | 파일 |
|---|-----|------|
| 0 | 마스터 Property·`init` | 마스터 |
| ① | `planner_registry` | 마스터 |
| ② | `planner_student_links` | 마스터 |
| ③a | `planner_curriculum_courses` | 마스터 (강좌) |
| ③b | `planner_curriculum_lectures` | 마스터 (강의) |
| ④ | `planner_personal_todos_YYYY_MM` | 학생별 |
| ⑤⑥ | 타임라인·메모 *(예정)* | 학생별 |
| — | ~~`planner_member_records`~~ 폐기 | — |

### 6.1 마스터 탭

| 탭명(시트) | 역할 |
|------------|------|
| `planner_registry` | 솔패스 멤버 목록 + 학생 프로필(14열). 매칭·`student_profile` API 원천. |
| `planner_student_links` | `member_code`·`imweb_uid`(각각 열) + `student_spreadsheet_id`. API `link_key` = mc 우선, 없으면 uid. ④ 전제. |
| `planner_curriculum_courses` | 강좌 카탈로그 (`course_id` 숫자 PK). |
| `planner_curriculum_lectures` | **강의** — `course_id` FK · `lecture_no` · `lecture_name`. |

---

## 7. 학생별 DB

- **④** 탭 **`planner_personal_todos_YYYY_MM`** — 헤더 [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md) §10.4 · `DB_PLANNER_PERSONAL_TODO_HEADERS`.
- **⑤⑥** 일일 타임라인·메모 — [PLANNER_DAILY_STUDY_SCHEMA.md](./PLANNER_DAILY_STUDY_SCHEMA.md).
- 학생 **기본 정보는 여기 두지 않는다** — 마스터 ① `planner_registry`.
- 커리큘럼(강좌·강의)은 마스터에서 읽어 todo 분배에 사용(연동 예정).

---

## 8. 프론트엔드

- **학생 정보 표:** registry(연동 후) → `plannerBootstrap.data.student_profile` → `renderPlannerStudentProfile_`. 지금은 목업 병합.
- **할 일:** 로컬 state → payload → (연동 후) 학생 파일만.
- 드라이브 링크·운영 파일 버튼은 학생 화면에 **노출하지 않음**.
- 게이트: 전화 3칸 → (필요 시) 이름 → `plannerMatch` / `plannerBootstrap`.

---

## 8.1 결정사항(오늘 시연 범위) — 월간 달력 + 일일 모달 + 회원 잠금

### A. 월간 달력 UI(고정 그리드)

- 월간 화면은 **일반 달력처럼 6주(42칸) 고정 그리드**로 그린다.
- 해당 월에 속하지 않는 날짜(이전/다음 달 날짜)는 **같은 주에 표시**하되,
  - **회색/비활성**(클릭·등록 대상 아님)
  - 해당 월로 이동하기 전까지는 “보이기만” 한다.
- 월 이동(이전/다음)은 프론트 상태로 즉시 반영한다(전체 새로고침 없이).
- **주(행) 왼쪽 메타 칸:** 6줄 각각이 **그 줄의 일요일~토요일 실제 한 주**와 1:1로 맞는다. 라벨 문구는 **그 주의 날짜 구간·ISO 주차 등으로만 동적 계산**한다. 스프레드시트 목업에 있던 **「N개월차」「교재명+학습목표」 세로 블록**은 **커리큘럼/DB 연동 후** 붙이며, 하드코딩된 기수 문구는 넣지 않는다.

### B. 날짜 클릭 → 일일 플래너 모달

- 달력에서 **(해당 월) 날짜 클릭 시** 그 날짜 기준 **일일 플래너 모달**을 연다.
- 레이아웃(뼈대):
  - **좌측**: 그 날짜의 할 일 목록(표/리스트)
  - **우측**: 시간 그리드 타임라인(모눈 칸)

### C. 일일 모달 잠금 (현재 코드만)

- `bootstrap.role === 'guest'` 일 때 일일 모달 **딤 + 「회원 전용」** (`planGuestUnlockMock` 시연 해제).
- **제품·DB 방향(§4)과 별개**로 프론트에 남아 있는 동작. 페이지 입장 정책은 이 문서 범위 밖.

### D. todo 방향(요약 표시 포함)

- 학생 todo는 **일일 + 시간(타임라인 배치)** 기준으로 간다.
- 운영이 “하루치 작업 묶음(예: 문법 1~3강)”을 넣고, 학생은 일일 플래너 안에서 **개별 항목으로 풀고 배치**하는 UX로 간다.
- 카테고리는 기본값 **어휘/문법/논리/독해/기타**를 두고, 추후 학생이 **추가 카테고리**를 만들 수 있게 한다.
- 월간 달력 표시는 “저장 구조를 따로 만들기”가 아니라, 같은 데이터를 읽어서 **집계/요약 형태로 대략 표시**하는 방향으로 간다(상세는 일일 모달).
- **시연 단계:** 주차 왼쪽 **문법·논리·독해** 커리큘럼 표(교재명·학습 목표·목차)는 프론트 **목업**으로 채우고, API가 준비되면 `plannerBootstrap`(또는 전용 필드)에서 **동일 레이아웃으로 치환**한다.

### E. 프론트 렌더링(React 없이)

- React(`useEffect`) 없이도, 프론트는 `state` 객체 + `render()` 호출 패턴으로
  - **낙관적 UI**(화면 선반영 → 저장)와
  - 저장 결과(성공/실패)에 따른 후처리를 구현할 수 있다.
- “운영/다른 세션 변경을 학생 화면에 즉시 반영”은 별도 갱신이 필요하다(예: 폴링/재조회). 다만 전체 페이지 새로고침(F5) 없이도 갱신 구현은 가능하다.

---

세부 컬럼·구현은 변경 가능하며, **§10–§13**은 코드·시트 생성 시 그대로 따를 **초안 스펙**이다.

---

## 9. 미확정(운영에서만 결정)

- Web App **할당량·남용 방지**(분당 호출 상한 등) 구체 수치.
- 학생별 파일 **자동 생성 트리거:** `plannerRegistryRebuild` 직후, `planner_registry`에 있는 `member_code`마다 일괄 프로비저닝(링크 없음·깨진 링크는 새 파일 생성, 레지스트리에 없는 링크는 파일 휴지통 후 행 제거).

---

## 10. 시트 헤더(1행) 초안

### 10.1 `planner_registry`

**확정 헤더** (`gas/DB/dbSchema.js` → `DB_PLANNER_REGISTRY_HEADERS`, **14열**). 상세: [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md) §10.1.

| # | 컬럼 | 채움 |
|---|------|------|
| 1 | `member_code` | 솔패스 rebuild. 수기 행 빈 칸 OK |
| 2 | `imweb_uid` | `members.uid`. **필수 아님** |
| 3 | `phone_normalized` | `callnum` 정규화. 텍스트 `@` |
| 4 | `display_name` | `members.name` |
| 5–11 | `track` … `study_status` | 운영 수기( rebuild 시 빈 칸 ) |
| 12 | `first_solpass_order_id` | rebuild |
| 13 | `planner_month_ranges_json` | rebuild·수기 — JSON `[{start_month,end_month},…]` (학생 **월 탭** 범위, §10.4). 빈 `[]` 가능 |
| 14 | `registry_updated_at` | rebuild |

**`phone_display`:** 시트에 **두지 않음**. bootstrap/API가 `phone_normalized` 를 표시용으로 포맷해 `student_profile.phone_display` 에만 넣음.

`plannerBootstrap.data.student_profile` = 위 프로필 열 + API에서 만든 `phone_display` (구현 예정).

### 10.1.1 `plannerRegistryRebuild` · 학생 파일 이름 (기록만)

| | 현재 코드 | 변경 예정 |
|--|-----------|-----------|
| registry 적재 | `member_code`, `phone`, `display_name`(←`members.name`), `first_solpass…` | + **`imweb_uid`←`members.uid`** (member_code로 members 행 조회) |
| Drive 파일명 | `솔루션편입_플래너_학생_{member_code}` (`dbPlannerCreateStudentPlannerSpreadsheet_`) | **`솔루션편입_플래너_학생_{display_name}({imweb_uid})`** (파일명 sanitize). 코드만으로 사람 식별하기 어렵던 부분 개선 |
| 식별 기준 | 파일명·눈에 보이는 값이 member_code 위주 | 시트·Drive에서 **이름(아이디)** |

구현·헤더 마이그레이션 전까지 기존 5컬럼·member_code 파일명 유지.

### 10.1.2 시트 입력·서식 (운영 · GAS)

- **`planner_registry` 2행~** 열 서식: **텍스트(`@`)**. `plannerRegistryRebuild` 직후 GAS가 일괄 적용(`dbPlannerApplyRegistryTextFormats_`). 전화를 숫자로 두면 앞자리 `0`이 사라져 `1072527692`처럼 보이므로 **텍스트 필수**.
- **읽기:** 전화·프로필·수기 열은 `getDisplayValues` 우선 → 문자열. 전화는 10자리 `10…` 이면 `010…` 로 복구(`dbPlannerNormalizePhoneFromSheet_`).
- **빈 칸:** `member_code`, `first_solpass_order_id`, `planner_month_ranges_json`, `registry_updated_at` 은 수기 행에서 **비워도 됨**(JSON 비면 학생 월 탭은 **당월**만 프로비저닝). `phone_normalized`(및 표시용 이름·프로필)만 채워도 매칭·화면 표시 가능.
- **화면:** `student_profile` 은 시트 값을 **있는 그대로** 내려줌(빈 문자열 허용). 학생이 시트에 직접 입력하지 않음.

### 10.2 `planner_student_links` — **확정 (4열)**

| 컬럼 | 설명 |
|------|------|
| `member_code` | registry와 동일. 솔패스 행은 보통 채움. 없으면 빈 칸. |
| `imweb_uid` | registry와 동일 (`members.uid`). `member_code` 없을 때 링크·resolve용. |
| `student_spreadsheet_id` | 학생별 플래너 파일 ID. |
| `provisioned_at` | ISO8601(서울). |

**`link_key` (API·GAS resolve, 시트 열 아님):** `member_code`가 있으면 그 값, 없으면 `imweb_uid`.

**운영 규정:** registry 행은 `member_code`·`imweb_uid` **둘 다 비우지 않음**.

**조회:** `link_key`로 links 행 찾을 때 — `member_code` 열 일치 우선, 아니면 `imweb_uid` 열 일치.

### 10.3 `planner_curriculum_courses` (강좌) — **확정**

`planner_common_calendar` **대체**. 날짜 없음.

| 컬럼 (1행, 영문) | 설명 |
|------------------|------|
| `course_id` | 숫자 PK · 강의 시트 FK |
| `subject` | 과목 |
| `instructor` | 강사 |
| `course_name` | 강좌명 |
| `link_url` | 링크 URL |

### 10.4 `planner_curriculum_lectures` (강의) — **확정**

| 컬럼 (1행, 영문) | 설명 |
|------------------|------|
| `lecture_id` | 숫자 PK |
| `course_id` | FK → `planner_curriculum_courses.course_id` |
| `lecture_no` | 강의 회차 번호 |
| `lecture_name` | 강의명 |
| `duration` | 시간(텍스트) |

상세: [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md) §10.3.2 · **마스터 최종본**은 본 문서 「마스터 플랜 DB 최종본」.

### 10.5 학생별 파일 — `planner_personal_todos_YYYY_MM`

`gas/DB/dbSchema.js` → `DB_PLANNER_PERSONAL_TODO_HEADERS` (**11열**), `dbPlannerPersonalTodosSheetNameFromYearMonthStr_`.  
상세: [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md) §8.2 · §10.4.

| 컬럼 | 설명 |
|------|------|
| `task_id` | 월 탭 안 **고정 문자열** (apply 재번호 없음). |
| `title` | 할 일 제목; `memo` 행은 메모 본문; `routine` 은 취침·식사·자습 등. |
| `date` | **현재** 할 일 날짜 `YYYY-MM-DD` (이동 시 변경). |
| `trace_dates` | 밀림으로 떠난 날 JSON 배열. UI 회색 흔적. 앞당김 시 추가 없음. |
| `category` | 문자열. `misc` = UI 「기타」. 커리큘럼 선택 시 코드 상수만; 직접 입력 등은 [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md) §8.2. |
| `lecture_id` | 마스터 `planner_curriculum_lectures.lecture_id`; 없으면 빈 칸. |
| `timeline_slots` | 슬롯 키 JSON 배열 문자열; **없으면 `[]`**. |
| `sort_key` | 같은 날짜 내 정렬. |
| **`mark`** | **`none` \| `circle` \| `triangle` \| `x`** — 일일 ○△×. |
| `created_date` | 행 최초 생성 날짜 `YYYY-MM-DD`. |
| `updated_date` | 마지막 저장 날짜 `YYYY-MM-DD` (apply 시 서울 당일로 갱신). |

---

## 11. `event_id` 규칙 (공통 일정)

- 형식: **`pcc_` + `Utilities.getUuid()` 결과에서 하이픈 제거한 32hex** (예: `pcc_550e8400e29b41d4a716446655440000`).
- 시트·API 전역에서 중복 없이 쓰기 위해 **생성은 서버(GAS)만** 담당한다.

---

## 12. Web App — 엔드포인트·전송·응답

- **배포:** 플래너 API는 **지금 쓰는 것과 동일한 GAS 프로젝트·동일 Web App `/exec` URL**에 둔다 (`window.__SOLPATH__.gasBaseUrl`와 동일 엔드포인트). 별도 배포 URL로 쪼개지 않는다.
- **전송(브라우저):** 관리자 대시보드와 동일하게 **`GET` JSONP** — `?format=jsonp&callback=NAME&action=plannerMatch|…` + 쿼리 `p0`·`p1`·`p2`(휴대전화)·`n`(이름)·`m`(`plannerBootstrap` 시 `memberCode`). GAS `TextOutput`은 CORS 헤더를 붙일 수 없어 **임웹에서는 `fetch` POST를 쓰지 않는다**(`docs/GAS_WEBAPP_SHEETS.md` §2). (쿼리 노출·로그는 운영에서 감수; 동일 출처 프록시가 필요하면 별도.) **curl·서버**는 기존처럼 `POST` + JSON(`doPost`) 유지.
- **라우팅:** 기존 `HttpOpenSync.js` `doPost`와 동일하게 본문 파싱 후 **`action` 필드**로 분기한다. `openSyncAllowedActions_()`에 위 액션 이름을 포함한다.

**요청 본문 초안**

`plannerMatch` — 전화·이름으로 registry 매칭만 (방문 로그 탭 없음).

```json
{
  "action": "plannerMatch",
  "phoneSegments": ["010", "1234", "5678"],
  "name": ""
}
```

- `phoneSegments`: 길이 3의 배열, 원소는 숫자만 문자열.
- `name`: 전화가 목록에서 유일하지 않아 이름 단계가 열렸을 때만 채운다. 그 외는 `""` 생략 가능.

`plannerBootstrap` — 달력 페이로드(서버에서 전화·이름·`memberCode` 재검증).

```json
{
  "action": "plannerBootstrap",
  "phoneSegments": ["010", "1234", "5678"],
  "name": "",
  "memberCode": "",
  "year_month": "2026-05"
}
```

- `memberCode`: 직전 `plannerMatch`가 `matched`일 때 받은 값. `guest` 흐름이면 빈 문자열 등 구현에서 합의한 값.
- `year_month`: 선택, `yyyy-MM`. 없으면 서울 당월 탭으로 `personal` 스텁 읽기 (`dbPlannerReadPersonalStub_`와 동일 규칙).

**응답 래퍼:** 기존 오픈싱크와 동일하게 `{ ok: true, data: { ... } }` 또는 `{ ok: false, error: { code, message } }` (`ContentService` JSON MIME).

**브라우저 CORS:** 임웹 출처에서 `fetch`로 위 JSON을 읽으려면, **이 `doPost` 응답**에 `Access-Control-Allow-Origin` 등 필요한 헤더를 붙이는 처리를 구현에 포함한다(GAS 기본 `TextOutput`만으로 부족하면 팀에서 쓰는 래핑·프록시 패턴으로 맞춘다).

### 12.1 `plannerMatch` — `data` 본문

| 필드 | 타입 | 설명 |
|------|------|------|
| `outcome` | string | 위 `match_outcome`와 동일 집합. |
| `needName` | boolean | `outcome === 'need_name'`일 때 `true`. |
| `link_key` | string \| null | `matched`일 때. registry 행의 `member_code` 우선, 없으면 `imweb_uid`. |
| `displayName` | string \| null | (선택) 화면 인사용, 목록의 `display_name`. |

JSONP `m`·bootstrap body는 **`link_key` 값**을 넣는다 (`memberCode` 필드명은 레거시 별칭).

### 12.2 `plannerBootstrap` — `data` 본문

| 필드 | 타입 | 설명 |
|------|------|------|
| `role` | `"member"` \| `"guest"` | `link_key`(+ 전화·이름) 검증 성공 여부. **registry “비회원 타입”과 무관.** |
| `common` | array | `planner_common_calendar` 이벤트 배열. |
| `personal` | array \| null | 학생 파일 **해당 월** `planner_personal_todos_YYYY_MM` 스텁. `member`일 때만 채움. |
| `student_profile` | object \| null | **(구현 예정)** §10.1 registry 프로필 컬럼 → 화면 학생 정보 표. |

### 12.3 `plannerRegistryRebuild` — 레지스트리 동기화

원천 마스터(`order_items`·`orders`·`members`·`product_mapping`)를 읽어, **솔패스(`internal_category === solpass`)** 구매 이력이 있고 수강생 DB 재구축과 **동일한 제외 규칙**(구매자 이름 `솔루션편입` 제외, `dbAnOrderLineSkipForAnalytics_` 등)을 통과한 회원만 `planner_registry`에 **한 줄씩** 덮어쓴다. 조인 키는 **`member_code`** → `members` 행에서 **`name`·`uid`(→ 예정 `display_name`·`imweb_uid`)** 를 가져온다. `members.callnum` 정규화 전화가 없으면 행 제외(`skippedNoPhone`). 학생 Drive 파일명·registry 확장 컬럼 목표는 **§10.1.1** (기록만).

```json
{ "action": "plannerRegistryRebuild" }
```

**응답 `data`:** `written`, `skippedLines`, `skippedNoPhone`에 더해 **`provisioned`**(신규 학생 파일 수), **`reusedStudentFiles`**, **`trashedBrokenLinks`**, **`trashedOrphanLinks`**, **`provisionErrors`**(Drive 생성 실패 건수).

GAS 편집기 [실행]: `run_Planner_RebuildRegistry`.

### 12.4 `plannerDevFullReset` — 제작용 전체 초기화

`dbInitPlannerMasterSheets_()`로 마스터 탭을 보장한 뒤, `planner_student_links`에 연결된 **모든** 학생용 스프레드시트 ID를 **휴지통**으로 보내고(중복 ID는 한 번만), 마스터의 **`planner_registry` / `planner_student_links`** 본문(2행~)을 비운다. 레거시 **`planner_member_records`** 탭이 있으면 삭제한다. **`planner_common_calendar`는 건드리지 않는다.**

```json
{ "action": "plannerDevFullReset" }
```

**응답 `data`:** `trashedStudentFiles`(휴지통 시도한 고유 파일 수), `clearedTabs`(탭 이름 배열).

GAS 편집기 [실행]: `run_Planner_DevFullReset`.

---

## 13. Script Properties (키 이름 초안)

| 키 | 값 |
|----|-----|
| `SHEETS_PLANNER_MASTER_ID` | 마스터 플래너 스프레드시트 ID. 기존 `SHEETS_STUDENT_ID`·`SHEETS_MASTER_ID`와 **같은 네이밍 패턴**. |

(학생별 파일 ID는 `planner_student_links`에 두고, 파일마다 별도 Property를 두지 않는 방향을 권장한다.)

---

## 14. 구현 시 남는 기술 메모

- **CORS·401 (임웹):** 플래너 프론트는 관리자와 동일하게 **`GET` JSONP**로 `…/exec`를 호출한다(`front/js/plan.js`). `fetch` POST는 GAS `TextOutput` CORS 한계로 막힐 수 있다. **Web App 배포**: **Execute as Me** + **Anyone(익명)** + `clasp push` 후 **새 버전 배포**. 레포 `gas/appsscript.json` 의 `webapp.executeAs` 는 `USER_DEPLOYING`(Me) 권장.
- **할당량·남용 방지:** 분당 호출 상한 등 수치는 구현·운영에서 정한다.
이 문서는 논의를 고정하기 위한 것이며, 구현 시 `docs/` 내 다른 스키마 문서(`SCHEMA_*`, `BACKEND_API.md`)와 함께 맞춘다.
