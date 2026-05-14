# 플래너 일일 학습 — 예상 DB 스키마 (초안)

> **목적**: 빠른 등록으로 생긴 **일자별 할 일**과, 일일 화면에서 **10분 타임라인·○△× 완료 표시**를 저장할 때를 가정한 **예상** 구조다. 구현·탭명은 `docs/PLANNER_DB_ARCHITECTURE.md`·`gas/DB/dbSchema.js` 와 맞출 때 이 문서를 갱신한다.

---

## 1. 흐름 요약

1. **빠른 등록** → 날짜별 `task` 행이 생김 (`planner_personal_todos` 또는 동등 탭).
2. **일일 타임라인** → 같은 날, `task_id`가 붙은 **10분 단위 블록**이 연속 구간으로 쌓임. 멈췄다가 다시 하면 **구간이 여러 개**로 나뉜다.
3. **과목별 총 공부 시간** → 그날 타임라인에서 `task.category`(문법·논리·독해·어휘)로 **합산 분** (집계·뷰로도 가능).
4. **○ △ ×** → 할 일(`task_id`)·날짜 단위 **완료/진행 정도** (UI는 단일 선택; DB는 enum 한 컬럼이면 충분).

---

## 2. 기존 탭과의 관계

| 구분 | 탭·엔티티 | 비고 |
|------|-----------|------|
| 할 일 마스터 | `planner_personal_todos` | `task_id`, `title`, `due_date`, `category`, `status` 등 기존 헤더 유지. 빠른 등록으로 append. |
| 일일 타임라인 | **신규** `planner_daily_time_blocks` (가칭) 또는 JSON 컬럼 | 10분 격자에 맞춘 블록 저장. |
| 완료 표시 | **신규** `planner_daily_task_mark` (가칭) 또는 `todos` 확장 컬럼 | 날짜+`task_id`당 `mark` 한 값. |
| 공부 세션(선택) | **신규** `planner_study_sessions` (가칭) | 시작·종료 시각의 **묶음 리스트**를 정규화해 두면, “했다 멈췄다 다시”를 그대로 표현. |

타임라인만 저장하고 세션은 **서버에서 블록을 순회해 생성**해도 된다.

---

## 3. `planner_daily_time_blocks` (예상)

10분 칸 하나 = 최대 한 행(덮어쓰기 정책은 “마지막 값” 또는 “이력 없음” 중 택일).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `block_id` | string, PK | 예: `ptb_` + UUID hex |
| `member_code` | string | 학생 식별 (마스터와 동일) |
| `calendar_date` | `YYYY-MM-DD` | 로컬일(서울) 기준 |
| `start_datetime` | ISO8601 | 블록 시작 (해당 10분 구간의 시작) |
| `end_datetime` | ISO8601 | 블록 끝 (보통 start + 10분) |
| `task_id` | string, FK | `planner_personal_todos.task_id` |
| `source` | enum | `manual_timeline` \| `import` 등 (선택) |
| `updated_at` | ISO8601 | |

**집계**: 같은 날·같은 `task_id`의 `end - start` 합 = 그 할 일에 배정된 총 시간. `task.category`로 join하면 **과목별 합계**.

**세션 리스트**: `task_id` + `calendar_date`로 `start_datetime` 정렬 후, **인접 블록이 10분으로 끊기면** 새 세션으로 묶거나, 별도 테이블에 `session_id`로 묶는다.

---

## 4. `planner_study_sessions` (예상, 선택)

“공부 일정 = (시작, 종료) 묶음”을 명시적으로 저장할 때.

| 컬럼 | 설명 |
|------|------|
| `session_id` | PK |
| `member_code` | |
| `calendar_date` | |
| `task_id` | |
| `started_at` | 세션 시작 |
| `ended_at` | 세션 종료(null이면 진행 중) |
| `pause_reason` | 선택, 텍스트 또는 enum |

세션은 **타임라인 블록에서 파생**해 upsert하거나, 클라이언트가 세션 단위로 POST하는 방식 중 하나.

---

## 5. `planner_daily_task_mark` (예상)

| 컬럼 | 설명 |
|------|------|
| `member_code` | |
| `calendar_date` | |
| `task_id` | |
| `mark` | `none` \| `circle` \| `triangle` \| `x` (UI와 동일) |
| `updated_at` | |

PK: `(member_code, calendar_date, task_id)` 유니크.

`planner_personal_todos`에 `daily_mark` JSON을 넣는 방식은 **날짜가 여러 개**일 때 비효율이므로 날짜 단위 테이블 권장.

---

## 6. 프론트 상태와의 매핑 (연동 시)

| 프론트 상태 | DB 후보 |
|-------------|---------|
| `plannerQuickPostBody.todos` | `planner_personal_todos` insert/update |
| `dayTimelineTodoByDate[ymd][h_sub]` | `planner_daily_time_blocks` 또는 동일 정보의 압축 JSON |
| `dayTodoCompletionByDate[ymd][task_id]` | `planner_daily_task_mark.mark` |

---

## 7. 열린 결정 사항

- 타임라인을 **블록 행**으로 둘지, 하루 한 행에 **JSON 배열**로 둘지(읽기 쉬움 vs 정규화).
- `○△×` 의 비즈니스 의미(예: 동그라미=시작만, 세모=진행, 엑스=완료)는 운영 규칙으로 문서화.
