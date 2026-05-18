# 플래너 일일 학습 — 시트 매핑 (1차 최종)

> **구현 정본:** [PLANNER_IMPLEMENTATION.md](./PLANNER_IMPLEMENTATION.md)  
> **마스터·학생 시트:** [PLANNER_DB_ARCHITECTURE.md](./PLANNER_DB_ARCHITECTURE.md)

**2026-05-16 (1차 최종):** 타임라인·○△×·메모는 학생 파일 **`planner_personal_todos_YYYY_MM`** 한 탭·11열 행에만 둔다. 아래 `planner_daily_time_blocks` / `planner_study_sessions` 는 **사용하지 않음**(참고만).

---

## 1. 행 필드 (정본)

| 저장 위치 | 필드 | UI |
|-----------|------|-----|
| `timeline_slots` | JSON 배열 문자열 | 일일 모달 10분 격자 (`dayTimelineTodoByDate`는 페인트 캐시) |
| `mark` | `none` \| `circle` \| `triangle` \| `x` | 일일 모달 달성도 select |
| `category:memo` + `title` | 메모 본문 | 일일 textarea → 저장 시 행 upsert |

---

## 2. 프론트 런타임 캐시 (DB 아님)

| 캐시 | 용도 |
|------|------|
| `dayTimelineTodoByDate` | 칠하기 UX; 저장 시 `plannerPersistTimelineSlotMapToMonthTodos_` |
| `dayFixedBlockSlotsByDate` | 고정 막힘 칸 표시 |
| `dayMemoByDate` | textarea 바인딩; 저장 시 `category:memo` 행 |

**폐기:** `dayTodoCompletionByDate`, `dayTodoOrderByDate`, POST 본문의 `dayTimelineTodoByDate`.

---

## 3. 참고 스키마 (미사용)

- `planner_daily_time_blocks` — 미사용  
- `planner_study_sessions` — 미사용  

슬롯 키 규칙은 `plan.js`의 `plannerTimelineSlotKey_` / `plannerNormalizeTimelineSlotKeyFromApi_` 와 동일해야 한다.
