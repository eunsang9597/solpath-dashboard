# 솔루션 학습 플래너 — 1차 최종 구현 정본

> **갱신:** 2026-05-16 (1차 최종)  
> **코드:** `front/js/plan.js`, `front/css/styles.css`, `front/IMWEB_SNIPPET_PLAN.html`  
> **DB·시트:** [PLANNER_DB_ARCHITECTURE.md](./PLANNER_DB_ARCHITECTURE.md) · 일일 필드: [PLANNER_DAILY_STUDY_SCHEMA.md](./PLANNER_DAILY_STUDY_SCHEMA.md)

이 문서는 **이전 목업·초안 문서를 고치지 않고**, 현재 구현이 **어디서 어떻게** 동작하는지 1차 최종 기준으로 기록한다.

---

## 0. 이전 대비 바뀐 점 (요약)

| 항목 | 예전(목업·초안) | 지금 (1차 최종) |
|------|----------------|-----------------|
| 할 일 원본 | `quickPlanByDate`, `plannerManualTodos` 분리 | **`monthTodos` 단일 배열** (bootstrap·등록·일일 편집 공통) |
| POST 본문 | `dayTimelineTodoByDate` 등 중첩 객체 | **`{ action, year_month, todos[] }` 만** (11열 행 1:1) |
| ○△× | `dayTodoCompletionByDate` | 행 **`mark`** |
| 메모 | `dayMemoByDate`만 | **`category:memo` 행** + textarea는 `dayMemoByDate` UI 캐시 |
| 타임라인 | 별도 탭·중첩 맵만 | 행 **`timeline_slots`** + 페인트용 **`dayTimelineTodoByDate` 캐시** |
| 할 일 순서 | 드래그·`dayTodoOrderByDate` | **없음** — 과목 **`sort_key`**: 어휘→문법→논리→독해→기타 |
| 저장 | 어드민 POST 미리보기만 | **회원** 달력 「일정 저장하기」·일일 「저장하기」→ `plannerPersonalTodosApply` |
| 월 삭제 | 빠른 등록 「이 달 지우기」(로컬만) | 달력 「**일정 삭제하기**」= **해당 월 todo 전부** 시트 덮어쓰기 |
| 밀림 | — | **`trace_dates` + `plannerApplyTodoDateMove_`** (코드만, **UI 미연동**) |
| bootstrap 하이드레이트 | `plannerHydrateDayMapsFromServerTodos_` | **제거** — `monthTodos` + 필요 시 일자별 타임라인 lazy 빌드 |

---

## 1. 데이터 흐름

```
게이트 plannerMatch → plannerBootstrap(year_month)
  ├─ student_profile  ← planner_registry
  ├─ common           ← 마스터 공통 일정
  ├─ curriculum       ← 강좌·강의 (빠른/개별 등록)
  └─ personal[]       ← 학생 파일 planner_personal_todos_YYYY_MM (11열)

편집: __spPlanState.monthTodos
저장: plannerPersonalTodosApply → 같은 월 탭 2행~ 전체 덮어쓰기 → bootstrap 재조회
```

- **학생 프로필**과 **할 일** payload는 분리 (`plannerRegistryProfileSave` vs `plannerPersonalTodosApply`).
- **회원/비회원 타입 컬럼 없음** — `plannerMatch` + registry 전화 매칭.

---

## 2. 프론트 상태 (`root.__spPlanState`)

| 키 | 역할 |
|----|------|
| `monthTodos` | **정본** — 해당 학생·보는 달 할 일 행 배열 |
| `plannerQuickPostBody` | 저장 직전 스냅샷 `{ action, year_month, todos[] }` |
| `dayTimelineTodoByDate` | 일일 모달 **10분 칸 → task_id** (페인트 캐시, 저장 시 `timeline_slots`로 반영) |
| `dayFixedBlockSlotsByDate` | `category:fixed` 막힌 칸 (회색 비활성) |
| `dayMemoByDate` | 일일 textarea ↔ `category:memo` 동기화용 |
| `viewMonth`, `selectedDate` | 달력·모달 |
| `role`, `planGuestUnlockMock` | 회원·시연 해제 |

**제거됨:** `quickPlanByDate`, `plannerManualTodos`, `dayTodoOrderByDate`, `dayTodoCompletionByDate`, `plannerHydrateDayMapsFromServerTodos_`.

---

## 3. 할 일 행 (11열) — `DB_PLANNER_PERSONAL_TODO_HEADERS`

| 컬럼 | 프론트 |
|------|--------|
| `task_id` | 문자열 PK (`man_*`, `fx_*`, 커리큘럼 연동 시 `lecture_id` 등) |
| `title` | 제목 · `memo`면 메모 본문 |
| `date` | `YYYY-MM-DD` |
| `trace_dates` | JSON 배열 문자열 — **밀림 UI 없음**, 서버·이동 API용 코드만 |
| `category` | `vocab` \| `grammar` \| `logic` \| `read` \| `misc` \| `fixed` \| `memo` \| `routine` |
| `lecture_id` | 마스터 강의 PK (없으면 빈 문자열) |
| `timeline_slots` | JSON 배열 문자열 (`[]` = 미칠함) |
| `sort_key` | 같은 날 정렬 — **과목 순서** (§4) |
| `mark` | `none` \| `circle` \| `triangle` \| `x` |
| `created_date` / `updated_date` | `YYYY-MM-DD` |

**루틴(취침·식사):** `category:routine`, 타임라인 칠한 뒤에만 apply 포함 (`plannerShouldIncludeRowInMonthApply_`).

**고정:** `category:fixed`, `timeline_slots`에 막힌 칸 — 공부·루틴 행과 겹치면 apply 전 strip.

---

## 4. 표시·저장 순서 (드래그 없음)

상수 `PLANNER_STUDY_CATEGORY_ORDER`:

**어휘 → 문법 → 논리 → 독해 → 기타**

- 달력 칸 요약 그룹, 일일 모달 할 일 표, `sort_key` 부여(`plannerAssignCategorySortKeysForViewMonth_`)에 동일 적용.
- trace ghost·고정·루틴·메모는 별도 rank (`plannerCompareMonthTodoDisplay_`).

---

## 5. UI·저장

### 5.1 달력 (회원)

| 버튼 | id | 동작 |
|------|-----|------|
| 일정 저장하기 | `#sp-plan-month-save` | `monthTodos` → `plannerPersonalTodosApply` (전월) |
| 일정 삭제하기 | `#sp-plan-month-clear` | 해당 `viewMonth` todo **전부 제거** 후 동일 API로 빈 월 덮어쓰기 |

메시지: `#sp-plan-month-apply-msg`

### 5.2 일일 모달 (회원)

| 버튼 | id | 동작 |
|------|-----|------|
| 저장하기 | `#sp-plan-day-save` | 열린 날 메모·타임라인 반영 후 **같은 월 전체** apply |

메시지: `#sp-plan-day-apply-msg`  
저장 전: `plannerPrepareClientStateBeforeApply_` (메모·`timeline_slots`).

### 5.3 어드민 (5탭)

- 할 일 등록 패널 + POST 미리보기 `#sp-plan-todos-apply` (라벨 동일 「일정 저장하기」).
- 「이 달 지우기」(`#sp-quick-clear`): **로컬만** 추가분 제거 (`_fromServer` 유지) — 달력 「일정 삭제하기」와 다름.
- 달력 할 일 **우클릭 삭제**: 어드민만, 확인 없음, 서버 행이면 자동 apply.

### 5.4 등록

| 패널 | 함수 | category |
|------|------|----------|
| 빠른 등록 v2 | `plannerApplyQuickCurriculumToMonthTodos_` | 커리큘럼 과목 |
| 고정 일정 | `plannerApplyFixedScheduleForMonth_` | `fixed` |
| 개별 | `plannerAppendManualTodoFromForm_` / 커리큘럼 | 사용자 선택 |

---

## 6. GAS API (연동됨)

| action | 용도 |
|--------|------|
| `plannerMatch` | 게이트 |
| `plannerBootstrap` | `year_month`, `personal`, `common`, `student_profile`, `curriculum` |
| `plannerRegistryProfileSave` | 프로필 빈칸만 |
| `plannerPersonalTodosApply` | **fetch POST**, 월 탭 덮어쓰기 · `lecture_id` 마스터 검증(`dbPlanner`) |

월 이동: bootstrap 재호출 (`plannerReloadBootstrapForViewMonth_`).

---

## 7. 미구현·보류 (1차 범위 밖)

| 항목 | 상태 |
|------|------|
| 밀림 UI | `trace_dates`, `plannerApplyTodoDateMove_` — **UI 없음** |
| 할 일 드래그 정렬 | **하지 않음** (§4) |
| §8.3 Drive 파일명 `display_name(uid)` | 문서·코드 별도 |
| 게스트 일일 잠금 | 코드 잔존 (`planGuestUnlockMock` 시연용) |

---

## 8. 파일·함수 색인

| 파일 | 핵심 |
|------|------|
| `front/js/plan.js` | `renderCalendar_`, `plannerApplyBootstrapPersonal_`, `plannerRebuildQuickPostPayload_`, `plannerPersonalTodosApplyClick_`, `plannerClearAllTodosForViewMonth_` |
| `gas/DB/dbPlanner.js` | bootstrap, apply, curriculum read |
| `gas/DB/dbSchema.js` | 헤더 상수 |
| `gas/HttpOpenSync.js` | POST 라우팅 |

---

## 9. 배포

- 임웹: `front/IMWEB_SNIPPET_PLAN.html` → jsDelivr `@<SHA>/front/…`
- 순서: [`.cursor/rules/git-push-dual-remotes.mdc`](../.cursor/rules/git-push-dual-remotes.mdc) 「프론트 직전 배포」
- GAS: clasp push (로컬 `gas/` 변경 반영)
