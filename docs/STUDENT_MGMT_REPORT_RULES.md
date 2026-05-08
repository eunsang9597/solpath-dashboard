# 수강생 관리 — 리포트/집계 조건 정리 (현행 코드 기준)

이 문서는 **2026-05-06 기준 레포 코드 구현**을 바탕으로, 화면에 보이는 표들이 어떤 조건으로 값을 계산하는지 정리합니다.  
“어떤 값이 왜 서로 다를 수 있는지”를 빠르게 판단하기 위한 용도입니다.

---

## 1) 공통 데이터 소스

- **주문 이벤트 시트**: `student_member_order_events` (`DB_STUDENT_ORDER_EVENT_HEADERS`)
  - 핵심 기간 필드: `product_start_date`, `product_end_date`
  - 자동 분류 필드: `enroll_status` (`신규|재등록|다시옴`)
  - 내부 산정용: `rereg_base_date` (직전 종료일; `enroll_status` 산정에 사용)
  - 운영 기준일: `rereg_reminder_date` (기본: 종료일 7일 전; 편집/보존됨)
- **멤버 마스터 시트**: `student_member_master` (`DB_STUDENT_MEMBER_HEADERS`)
  - 최종 상태: `member_status` (override가 있으면 override, 없으면 auto)

---

## 2) 이벤트 행 제외(공통 필터)

아래 조건은 집계/목록 생성 시 반복적으로 적용됩니다.

- **카테고리 제외**
  - `internal_category`가 비어있거나 `unmapped|textbook|jasoseo` 인 행은 제외
- **취소/환불 제외(집계용)**
  - `dbStuOrderEventRowExcludedForDailyAttendance_`가 true면 제외  
    (대략 `claim_status=cancel` 또는 `section_status/order_status`에 CANCEL 포함 등)
- **상품 유효성(product_mapping)**
  - `prod_no → product_mapping`을 통해 `product_name/internal_category/lifecycle/sales_end` 등을 참고
  - `dbStuPmEligibleForDailyReportYmd_(pm, ymd)`가 false면 제외
    - `lifecycle=test` 제외
    - `sales_end` 이후는 제외(당일 포함/제외는 함수 구현 기준)

---

## 3) 멤버 “자동 상태” 계산(수강중/주의 필요/이탈)

구현: `gas/DB/dbStudentMgmt.js`의 `dbStuBuildMemberStatusAutoMap_`

### 3.1 기준일(baseYmd)

멤버별로 이벤트를 훑어 **가장 늦은 기준일**을 잡습니다.

- `baseYmd` 우선순위:
  1) `product_end_date`
  2) `product_start_date`

> `rereg_reminder_date`는 “연락/리마인드 날짜”이며, **자동 상태 계산에는 사용하지 않습니다.**

### 3.2 상태 판정(오늘 기준)

- `exitDate = baseYmd + 14일`
- 오늘이 `exitDate`를 **지났으면**: `이탈`
- 오늘이 `baseYmd`를 **지났고**, `exitDate` 이하면: `주의 필요`
- 그 외: `수강중`

### 3.3 환불(최신 주문 기준) 강제 이탈

구현: `dbStuMemberLatestOrderIsRefundChurn_`

- 멤버별로 `order_time`이 가장 최신인 이벤트 1건을 고름
- 그 이벤트의 `claim_status=cancel`이면 **자동 상태를 이탈로 강제**
- 이후 더 최신의 “정상 구매”가 생기면, 그게 최신이 되므로 이탈 강제가 풀릴 수 있음

---

## 4) 표 A — 일자별 수강 인원

화면: “일자별 수강 인원”  
API: `studentMgmtDailyPeopleReport` → `dbStudentMgmtDailyPeopleReport_`

### 4.1 기준일

- 사용자 입력 `ymd` (yyyy-MM-dd)

### 4.2 표 행(수강반) 구성

- `product_mapping`에서 `dbStuPmEligibleForDailyReportYmd_(pm, ymd)`를 만족하는 상품명을 기준으로 행을 생성
- 같은 상품명이 여러 `prod_no`를 갖더라도 **`product_name` 정규화 키(`prodKey`)로 묶어 1행**

### 4.3 인원 포함 조건(멤버 단위)

이벤트를 (멤버×상품) 단위로 묶어, 해당 `ymd`에 “활성”인 것만 집계합니다.

- **기간 조건(핵심)**:  
  `product_start_date ≤ ymd ≤ product_end_date`
- 제외 조건: 위 “이벤트 행 제외(공통 필터)” 적용
- 동일 멤버·동일 상품에 이벤트가 여러 개면:
  - `ymd`에 활성인 이벤트들 중 **시작일이 가장 최신**인 1건만 남김(`bestByMemberProd`)
- 남은 1건의 `enroll_status`로
  - `total` +1
  - `신규|재등록|다시옴` 카운트 +1

### 4.4 “상품 시작일이 기준일보다 늦으면 안 보이게”

추가 필터(현행 구현):

- `prodKey`별 이벤트 중 **가장 이른** `product_start_date`를 `minStartByProdKey`로 구함
- `minStartByProdKey[prodKey]`가 없거나, `minStart > ymd` 이면 그 상품 행은 표에서 제외

### 4.5 셀 클릭 → 명단

API: `studentMgmtDailyPeopleProductMembers` → `dbStudentMgmtDailyPeopleProductMembers_`

- 입력: `{ ymd, prodKey, enrollFilter }`
  - `enrollFilter`가 비면 총원, `신규|재등록|다시옴`이면 해당 상태만
- 명단은 (멤버×상품)당 시작일 최신 1건 로직으로 만들고, `enrollFilter`로 필터

---

## 5) 표 B — 재등록 현황(오늘 기준)

화면: “재등록 현황 (오늘 기준)”  
API: `studentMgmtRenewalStatusReport` → `dbStudentMgmtRenewalStatusReport_`

### 5.1 기준일

- `ymd`를 payload로 받을 수 있지만 기본은 **오늘(서울)** 입니다.

### 5.2 사용되는 “관리 윈도우” 정의

이 표는 아래 “관리 기준일(baseYmd)”로 윈도우를 정의합니다.

- 이벤트의 `baseYmd`:
  - `product_end_date` 우선, 없으면 `product_start_date`
- 이벤트의 `exitYmd`:
  - `exitYmd = baseYmd + 14일`

### 5.3 total(총원) 산정

(멤버×상품) 그룹에서:

1) 멤버 최종 상태(`member_status`)가 `이탈` 또는 `복귀 예정`이면 total에 포함하지 않음  
2) `cur` 선택:
   - `ymd ≤ exitYmd` 인 이벤트들 중 **시작일이 가장 최신**인 1건
3) `cur`가 있으면 `total +1`

> 즉, 이 표의 total은 “오늘이 `exitYmd` 이전인 사람”만 잡습니다.

### 5.4 drop(등록X)

(멤버×상품) 그룹에서:

- 멤버 최종 상태(`member_status`)가 `이탈` 또는 `복귀 예정`이면 `drop +1`
- (이 경우 total/re/planned/contact에는 포함되지 않음)

### 5.5 re(재등록)

`cur`가 잡힌 total 후보 중:

- 동일 (멤버×상품) 그룹에 `nx.startYmd > cur.exitYmd` 인 이벤트가 존재하면 `re +1`

> 이 정의는 “다음 동일상품 수강이 **exit(=base+14) 이후에 시작**하는 주문이 이미 존재”일 때만 재등록으로 잡습니다.  
> 데이터가 “연속 재등록(바로 다음날 시작)” 형태면, `nx.startYmd`가 `cur.exitYmd`를 못 넘어서 `re=0`이 쉽게 나올 수 있습니다.

### 5.6 planned(등록예정)

`cur`가 잡힌 total 후보 중, 재등록(re)이 아닌 경우에만:

- `rereg_reminder_date`가 있고,
- `0 ≤ (rereg_reminder_date - 오늘) ≤ 3일` 이면 `planned +1`

### 5.7 contact(연락필요)

`cur`가 잡힌 total 후보 중, 재등록/등록예정이 아닌 경우에만:

- 멤버 최종 상태(`member_status`)가 `주의 필요`이면 `contact +1`

### 5.8 비율

- `재등록률 = re / total`
- `예상재등록률 = (re + planned) / total`
- total=0이면 0

### 5.9 셀 클릭 → 명단

API: `studentMgmtRenewalStatusProductMembers` → `dbStudentMgmtRenewalStatusProductMembers_`

- 입력: `{ ymd, prodKey, bucket }`
  - bucket: `total|re|planned|drop|contact`
- 동일 로직으로 멤버를 고른 뒤, bucket 조건에 맞는 멤버만 반환
- 반환 멤버 필드:
  - `uid, name, callnum, last_login_time, member_status, product_end_date, rereg_reminder_date`

---

## 6) “일자별 총원”과 “재등록 현황 total-drop”이 같아야 하나?

현행 구현에서는 **같아야 할 이유가 없습니다.**

- **기준일이 다름**
  - 일자별: 사용자가 고른 `ymd`에 대해 `start ≤ ymd ≤ end`
  - 재등록: 오늘(서울) 기준 + `ymd ≤ exitYmd(base+14)` (end가 아님)
- **멤버 상태(이탈) 반영 여부**
  - 재등록: `member_status=이탈`이면 total에서 제외(drop로 카운트)
  - 일자별: 멤버 상태를 보지 않고 “기간 활성”만으로 집계

따라서 두 표는 “같은 사람을 다른 기준으로 세는 표”입니다.

