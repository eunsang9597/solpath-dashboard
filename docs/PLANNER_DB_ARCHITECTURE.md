# 플래너(달력) DB·페이지 — 설계 메모

관리자 대시보드와 별도로, 아임웹에 심는 **공개용 달력형 플래너**와 그에 맞는 **Google 스프레드시트 DB** 구조를 정리한 문서다. **§10 이후**는 시트·API 구현용 **초안 스펙**이며, 변경 시 이 문서를 갱신한다.

---

## 1. 페이지·대상 (비회원 우선)

| 구분 | 설명 |
|------|------|
| 관리자 대시보드 | 기존 임베드 페이지. **학생 공개 플래너와 분리.** |
| 플래너 페이지 | **새 아임웹 페이지**에 붙일 전용 UI. 달력 형태, 일자 클릭 등. |
| **비회원(브라우저 기준)** | 아임웹 **로그인 여부와 무관하게**, 아래 **솔패스 목록 매칭에 실패**한 세션. |
| **회원(플래너 의미)** | **솔패스 목록에 올라온 행**과 전화(및 필요 시 이름) 매칭에 **성공**한 세션. (아임웹 회원 API가 없어도 “목록에 있는 사람”을 회원으로 본다.) |

**입장:** 운영이 채운 **솔패스 경험자 목록**이 있고, 사용자는 **방문할 때마다** 전화번호를 입력한다(세션으로 생략하지 않음).

**화면:** 비회원·회원 **같은 플래너 UI**로 보이게 한다. 차이는 **운영이 등록·연결해 주는 데이터 방식**과 **백엔드가 무엇을 자동으로 불러오느냐**에 있다(아래 §4·§8).

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

## 4. 저장 정책 (비회원 vs 회원)

| 구분 | 학생별 플래너 스프레드시트 | 마스터 플래너 DB |
|------|---------------------------|-----------------|
| **비회원** | **저장하지 않는다.** (개인 할 일·todo 등 **쓰기 없음**) | **“로그” 탭이 아니라 `멤버`(가칭) 등 기록용 탭**에 행이 **쌓인다.** 방문·매칭 결과 등 운영이 보는 **기록**으로 둔다. |
| **회원** | **저장한다.** 개인 데이터·todo 등은 학생별 파일에 둔다. | 목록·연결·공통 일정 + 필요 시 **동일 멤버 기록**에도 남길 수 있다(정책 선택). |

- **회원**은 매칭 성공 후 **개인 데이터·일정을 자동으로 불러온다**(학생 시트·마스터 조회). 비회원은 **같은 화면**이지만 학생 시트에는 쓰지 않고, **멤버 쪽 기록**만 쌓는 쪽으로 구분한다.

---

## 5. 스프레드시트 파일 구조

| 파일 | 역할 |
|------|------|
| **마스터 플래너 DB** | 목록·**멤버(기록)**·공통 일정·학생 파일 ID 연결. Drive **표시 이름**은 `솔루션편입_수강생_마스터` 등과 동일 접두로 **`솔루션편입_플래너_마스터`**. |
| **학생별 플래너 DB** | **회원(매칭 성공)**에게만 프로비저닝·쓰기. 비회원은 파일을 만들지 않거나 건드리지 않는다. |

---

## 6. 마스터 DB — 탭명·역할 (구현 초안 §10과 동일)

| 탭명(시트) | 역할 |
|------------|------|
| `planner_registry` | 솔패스 대상 목록(동기화로 채움). 매칭용 전화·표시 이름·`member_code` 등. |
| `planner_member_records` | 방문·매칭 **기록** append-only (비회원 흐름에서도 쌓임). |
| `planner_student_links` | `member_code` ↔ `student_spreadsheet_id`, `provisioned_at`. |
| `planner_common_calendar` | 공통 일정 **단일 탭**. |

---

## 7. 학생별 DB 안에 둘 것 (개별)

- **회원 전용:** 할 일(todo)·완료·메모 등. 탭명 **`planner_personal_todos`** — 헤더는 아래 §10.5와 `gas/DB/dbSchema.js`의 `DB_PLANNER_PERSONAL_TODO_HEADERS`와 동일.
- 공통 일정은 복제하지 않고 마스터에서 읽어 합성.

---

## 8. 프론트엔드

- **UI:** 비회원·회원 **동일한 플래너 화면**을 쓴다. 다만 비회원은 학생 시트에 **저장되지 않고**, 회원은 **자동으로 개인 데이터를 불러온다**.
- **학생에게 보이는 화면:** **구글 드라이브 연결·열기**, 스프레드시트/운영 파일로 가는 **링크·버튼은 두지 않는다.** 관리자 대시보드와 역할을 섞지 않는다.
- 방문마다 전화 3칸 → (필요 시) 이름 → API 매칭. 입력 영역 **안**에 개인정보 안내.
- 아임웹 **로그인 회원 전용 단축 플로**는 추후: 같은 백엔드, UI만 분기.

---

## 8.1 결정사항(오늘 시연 범위) — 월간 달력 + 일일 모달 + 회원 잠금

### A. 월간 달력 UI(고정 그리드)

- 월간 화면은 **일반 달력처럼 6주(42칸) 고정 그리드**로 그린다.
- 해당 월에 속하지 않는 날짜(이전/다음 달 날짜)는 **같은 주에 표시**하되,
  - **회색/비활성**(클릭·등록 대상 아님)
  - 해당 월로 이동하기 전까지는 “보이기만” 한다.
- 월 이동(이전/다음)은 프론트 상태로 즉시 반영한다(전체 새로고침 없이).

### B. 날짜 클릭 → 일일 플래너 모달

- 달력에서 **(해당 월) 날짜 클릭 시** 그 날짜 기준 **일일 플래너 모달**을 연다.
- 레이아웃(뼈대):
  - **좌측**: 그 날짜의 할 일 목록(표/리스트)
  - **우측**: 시간 그리드 타임라인(모눈 칸)

### C. 비회원 잠금(구매 유도)

- 비회원도 **모달은 열린다.**
- 다만 일일 플래너 내용은
  - **반투명(딤/블러)** 처리하고
  - 중앙에 **“회원 전용 기능입니다”** 오버레이로 막는다(구매 유도 버튼 자리 포함).

### D. todo 방향(요약 표시 포함)

- 학생 todo는 **일일 + 시간(타임라인 배치)** 기준으로 간다.
- 운영이 “하루치 작업 묶음(예: 문법 1~3강)”을 넣고, 학생은 일일 플래너 안에서 **개별 항목으로 풀고 배치**하는 UX로 간다.
- 카테고리는 기본값 **어휘/문법/논리/독해/기타**를 두고, 추후 학생이 **추가 카테고리**를 만들 수 있게 한다.
- 월간 달력 표시는 “저장 구조를 따로 만들기”가 아니라, 같은 데이터를 읽어서 **집계/요약 형태로 대략 표시**하는 방향으로 간다(상세는 일일 모달).

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
- `planner_member_records.phone_normalized` **평문 vs 해시** 저장 전환 시점.
- 학생별 파일 **자동 생성 트리거:** `plannerRegistryRebuild` 직후, `planner_registry`에 있는 `member_code`마다 일괄 프로비저닝(링크 없음·깨진 링크는 새 파일 생성, 레지스트리에 없는 링크는 파일 휴지통 후 행 제거).

---

## 10. 시트 헤더(1행) 초안

### 10.1 `planner_registry`

| 컬럼 | 설명 |
|------|------|
| `member_code` | 내부 PK에 가깝게 쓰는 회원 식별자(원천 `members` 규칙과 동일 스펠링). |
| `phone_normalized` | 숫자만 11자 내외(예: `01012345678`). 매칭 기준. |
| `display_name` | 전화 중복 시 이름 대조·화면 표시. |
| `first_solpass_order_id` | (선택) 최초 인입 근거 주문/라인 참조. |
| `registry_updated_at` | (선택) 행 갱신 시각 ISO8601(서울). |

### 10.2 `planner_member_records` (기록)

| 컬럼 | 설명 |
|------|------|
| `record_id` | 고유 ID. 형식 **`pmr_` + UUID에서 하이픈 제거** (예: `pmr_a1b2c3d4e5f678901234567890abcdef`). |
| `created_at` | `Asia/Seoul` 기준 ISO8601. |
| `phone_normalized` | 요청에서 정규화한 값(저장 방식은 §9). |
| `name_entered` | 사용자가 입력한 이름(없으면 빈 문자열). |
| `match_outcome` | `matched` \| `no_match` \| `need_name` \| `name_mismatch` \| `bad_phone` \| `error`. |
| `member_code` | `matched`일 때만 채움, 그 외 빈 값. |

### 10.3 `planner_student_links`

| 컬럼 | 설명 |
|------|------|
| `member_code` | |
| `student_spreadsheet_id` | 학생별 플래너 파일 ID. |
| `provisioned_at` | ISO8601(서울). |

### 10.4 `planner_common_calendar`

| 컬럼 | 설명 |
|------|------|
| `event_id` | **§11** 규칙. |
| `start_date` | `YYYY-MM-DD`. |
| `end_date` | `YYYY-MM-DD` (하루 일정이면 `start_date`와 동일). |
| `title` | 달력 표시 제목. |
| `description` | (선택) 본문. |
| `category` | `live` \| `deadline` \| `holiday` \| `other` (필터·색용). |
| `sort_key` | 같은 날 정렬용 정수(기본 `0`). |

### 10.5 학생별 파일 — `planner_personal_todos` (탭명 고정)

| 컬럼 | 설명 |
|------|------|
| `task_id` | 고유 ID(예: `pt_` + UUID hex). |
| `title` | 할 일 제목. |
| `description` | 상세·메모. |
| `status` | `todo` \| `doing` \| `done` \| `cancelled` 등(구현·UI에서 고정 집합으로 쓴다). |
| `priority` | `low` \| `normal` \| `high` 또는 숫자(팀 합의). |
| `due_date` | `YYYY-MM-DD` (달력 정렬 우선). |
| `start_date` | (선택) `YYYY-MM-DD`. |
| `category` | 짧은 태그 문자열. |
| `sort_key` | 같은 날짜 내 정렬 정수. |
| `completed_at` | 완료 시각 ISO(서울), 없으면 빈 값. |
| `created_at` | 생성 시각. |
| `updated_at` | 수정 시각. |

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

`plannerMatch` — 매칭 + `planner_member_records` 한 행 append.

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
  "memberCode": ""
}
```

- `memberCode`: 직전 `plannerMatch`가 `matched`일 때 받은 값. `guest` 흐름이면 빈 문자열 등 구현에서 합의한 값.

**응답 래퍼:** 기존 오픈싱크와 동일하게 `{ ok: true, data: { ... } }` 또는 `{ ok: false, error: { code, message } }` (`ContentService` JSON MIME).

**브라우저 CORS:** 임웹 출처에서 `fetch`로 위 JSON을 읽으려면, **이 `doPost` 응답**에 `Access-Control-Allow-Origin` 등 필요한 헤더를 붙이는 처리를 구현에 포함한다(GAS 기본 `TextOutput`만으로 부족하면 팀에서 쓰는 래핑·프록시 패턴으로 맞춘다).

### 12.1 `plannerMatch` — `data` 본문

| 필드 | 타입 | 설명 |
|------|------|------|
| `outcome` | string | 위 `match_outcome`와 동일 집합. |
| `needName` | boolean | `outcome === 'need_name'`일 때 `true`. |
| `memberCode` | string \| null | `matched`일 때만. |
| `displayName` | string \| null | (선택) 화면 인사용, 목록의 `display_name`. |

### 12.2 `plannerBootstrap` — `data` 본문

| 필드 | 타입 | 설명 |
|------|------|------|
| `role` | `"member"` \| `"guest"` | 매칭 성공 여부에 따른 분기. |
| `common` | array | `planner_common_calendar`에서 읽은 이벤트 객체 배열 (`event_id`, `start_date`, `end_date`, `title`, `description`, `category`, `sort_key`). |
| `personal` | array \| null | **`member`만** 학생 파일 `planner_personal_todos`에서 읽은 항목 배열(제목·날짜 등; 초기엔 빈 배열). **`guest`는 항상 `null`**. |

### 12.3 `plannerRegistryRebuild` — 레지스트리 동기화

원천 마스터(`order_items`·`orders`·`members`·`product_mapping`)를 읽어, **솔패스(`internal_category === solpass`)** 구매 이력이 있고 수강생 DB 재구축과 **동일한 제외 규칙**(구매자 이름 `솔루션편입` 제외, `dbAnOrderLineSkipForAnalytics_` 등)을 통과한 회원만 `planner_registry`에 **한 줄씩** 덮어쓴다. `members.callnum`을 숫자만 10~11자리로 정규화한 뒤 비어 있으면 해당 회원은 **행에서 제외**(`skippedNoPhone`).

```json
{ "action": "plannerRegistryRebuild" }
```

**응답 `data`:** `written`, `skippedLines`, `skippedNoPhone`에 더해 **`provisioned`**(신규 학생 파일 수), **`reusedStudentFiles`**, **`trashedBrokenLinks`**, **`trashedOrphanLinks`**, **`provisionErrors`**(Drive 생성 실패 건수).

GAS 편집기 [실행]: `run_Planner_RebuildRegistry`.

### 12.4 `plannerDevFullReset` — 제작용 전체 초기화

`dbInitPlannerMasterSheets_()`로 마스터 탭을 보장한 뒤, `planner_student_links`에 연결된 **모든** 학생용 스프레드시트 ID를 **휴지통**으로 보내고(중복 ID는 한 번만), 마스터의 **`planner_registry` / `planner_member_records` / `planner_student_links`** 본문(2행~)을 비운다. **`planner_common_calendar`는 건드리지 않는다.**

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
- `planner_member_records.phone_normalized` **평문 vs 해시**는 §9와 동일하게 이후 결정.

이 문서는 논의를 고정하기 위한 것이며, 구현 시 `docs/` 내 다른 스키마 문서(`SCHEMA_*`, `BACKEND_API.md`)와 함께 맞춘다.
