# 집계·분석 (매출·건수 목표)

원천 DB(`SHEETS_MASTER_ID`)·운영 DB(`SHEETS_OPERATIONS_ID`)와 **별도 파일**에 두는 **리포트·KPI 롱 스키마**다. 프론트의 엑셀형 피벗은 만들지 않고, 시트에는 **정규형(한 줄 한 목표)** 만 둔다. 대시보드 **「매출·건수 집계」** 탭이 이 파일을 가리킨다.

## 1. Script Property

| 키 | 의미 |
|----|------|
| `SHEETS_ANALYTICS_ID` | 집계·분석 전용 스프레드시트 파일 ID. 없으면 탭에서 **「집계 시트 준비」** 로 생성·저장 |

## 2. 파일·시트 이름 (고정 문자열)

| 항목 | 값 |
|------|-----|
| Drive에 만들어지는 스프레드시트 제목 | `솔루션편입_집계_매출건수` |
| 목표(KPI) 탭 | `kpi_매출건수_목표` — 제목에 **「매출」** 포함 |
| (예약) 일 단위 롱 팩트 | `fact_매출건수_일별` — 추후 동기·캐시 파이프 연결 |

부모 폴더는 원천 마스터와 동일 규칙(`dbPmGetMasterParentFolderId_` → `DB` 하위 등, `gas/DB/dbAnalytics.js` · `dbProductMapping.js` 와 동일).

## 3. `kpi_매출건수_목표` 스키마

| 열 | 설명 |
|----|------|
| `year` | 연도 (숫자, 예: 2026) |
| `month` | `1`–`12`(해당 월) 또는 `0`(해당 **연** 한 줄로 잡는 연간 목표) |
| `scope` | `category` — `internal_category` 키 / `product` — `prod_no` |
| `scope_key` | 대분류면 `solpass`·`unmapped` 등 **영문 키**, 상품이면 상품 번호(문자열·숫자 일치) |
| `target_amount` | 매출 목표(원), 0 이상 |
| `target_count` | 건수(또는 인원) 목표, 0 이상 |
| `notes` | 메모 |
| `updated_at` | ISO8601 (GAS·프론트가 갱신 시 기록) |

**전년 동월·동기간 달성도** 등은 이 롱 테이블 + 집계된 주문 데이터를 조인해 프론트·시트 수식 쪽에서 계산한다(이번 범위에서는 **목표 저장 + 조회·편집 UI**까지).

## 4. Open API (`HttpOpenSync.js`)

| `action` | 용도 |
|----------|------|
| `initAnalyticsSheets` | 스프레드시트 생성, `kpi_매출건수_목표`·`fact_매출건수_일별` 탭+헤더, `SHEETS_ANALYTICS_ID` 설정 |
| `analyticsTargetsGet` | 목표 시트 2행~ → JSON `data.rows` |
| `analyticsTargetsApply` | `payload: {"rows":[...]}` — **전체 치환**(빈 배열이면 목표만 비움). JSONP GET + URL `payload` (배치 분할은 프론트가 `productMappingApply` 와 동일 패턴) |
| `analyticsResetAll` | `kpi`·`fact` 본문(2행~) 전부 삭제 — **전부 초기화** |

`productMappingState` 응답에 **`analyticsReady`**, **`analyticsSpreadsheetUrl`**, 시트명 필드가 **병합**되어 내려가 동일 한 번의 JSONP로 링크를 맞출 수 있다.

## 5. 프론트 (캡처 1 범위)

- **매출** / **건수** 서브탭: 동일 표에서 강조 열만 전환.
- **연·월 필터**: 클라이언트에서만 표시 행 제한(시트 전체는 `analyticsTargetsGet` 으로 로드).
- **초기화**: 운영 상품 매핑의「데이터 초기화」와 별개 — **집계·분석 파일**만 비움.

## 6. 범위 밖 (다음 단계)

- 캡처 3 격자(연×월 관리패스 등), 자동 집계로 `fact_매출건수_일별` 채우기, 차트 위젯.
