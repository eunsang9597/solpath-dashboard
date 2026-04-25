# `product_mapping` — DB 스키마 (v0)

원천 `products`는 아임웹 **상품명/카테고리가 옵션**과 **내부 대분류(솔패스·솔루틴·챌린지·교재)**가 1:1로 맞지 않으므로, **운영용 분류**는 이 시트(층 1)에서 `prod_no` 기준으로 관리한다. ([SPEC.md](./SPEC.md) §3.1, `product_mapping` Phase 2)

| 목적 | 설명 |
|------|------|
| PK | `prod_no` — `products.prod_no`와 동일(원천과 조인/검증 키) |
| 분류 4+1 | 내부 **대분류** + **아직 미분류** |
| 수명 | **진행(판매) 중** / **만료·종료** / **테스트** |

## 시트

- **이름:** `product_mapping` (`dbSchema.js` `DB_SHEET_PRODUCT_MAPPING`)
- **위치:** SPEC상 **원천과 별도 스프레드시트(운영 파일)** 권장. `Script Properties` 키 `SHEETS_OPERATIONS_ID`로 연다. (초기·개발 시에는 원천 마스터 **같은 파일 안에 탭만 추가**해도 됨)

## 컬럼 (순서 = 헤더 1행)

| 열 (snake_case) | 필수 | 타입 | 설명 |
|-----------------|------|------|------|
| `prod_no` | ○ | Number | **PK** — 원천 `products`와 1:1. 한 행만 허용(중복 upsert 시 갱신). |
| `product_name` | 권장 | String | `products.name` **스냅샷**. 목록/시트 열람용. 저장·동기화 시 갱신 가능(원천이 바뀌면 덮어써도 됨). |
| `internal_category` | ○ | String | 내부 대분류. 아래 **열거** 중 하나(저장은 영문 키). |
| `lifecycle` | ○ | String | 상품 **운영 상태**. 아래 **열거** 중 하나. |
| `created_at` | 권장 | ISO 8601 | 이 매핑 행 **최초 생성** 시각 (UTC 권장). |
| `updated_at` | 권장 | ISO 8601 | **마지막 수정** 시각(프론트/GAS 둘 다 갱신). |
| `notes` | — | String | 운영 메모(선택). |

### `internal_category` (영문 키 — SPEC §3.1과 동일)

| 키 | 한글(표시) | 비고 |
|----|------------|------|
| `unmapped` | 미분류 | **아직 UI에서 4개 중 하나를 고르지 않은 상태** — 집계/수갑 빌드에서 기본은 제외하거나 별도 경고. |
| `solpass` | 솔패스 | — |
| `solutine` | 솔루틴 | — |
| `challenge` | 챌린지 | — |
| `textbook` | 교재 | — |

### `lifecycle`

| 키 | 한글(표시) | 의도 |
|----|------------|------|
| `active` | 판매·진행 중 | 정상 판매/노출 중인 상품. |
| `archived` | 만료·종료 | 더 이상 판매하지 않거나, 리포트에서 "현재 판매"에서 빼고 싶은 **만료** 상품. |
| `test` | 테스트 | 내부/QA용; 집계에서 제외하거나 별도 필터(정책은 구현 시 고정). |

**기본 제안(신규 행):** `internal_category=unmapped`, `lifecycle=active` — 상품이 목록에 올라온 직후 자동 insert 시 이 값으로 두고, 운영자가 UI에서만 바꾸면 됨.

## 키·일관성

- **PK:** `prod_no` (단일). 복수 옵션 라인이 아니라 **상품 단위**로만 매핑(원천 `order_items`의 `prod_no`와 맞음).
- **정합:** `product_name`는 필수는 아니지만, 프론트·GAS는 저장 시 `products`에서 읽은 이름을 같이 써 두면 **시트만 열었을 때** 식별이 쉬움.
- **삭제:** 행 **삭제** vs `lifecycle=archived` — 보통 **삭제는 최소**하고, “안 쓴다”는 `archived` + 필요 시 `notes` (감사 추적). 삭제는 운영자만(선택).

## 수명(프론트·GAS)

- **최초:** `product` 목록에서 `prod_no` 선택 → `product_mapping`에 **insert** (또는 사전에 상품 풀 동기화로 행 **seed**).
- **이후:** 같은 `prod_no`로 **update(upsert)** — `internal_category`·`lifecycle`·`product_name`·`notes` 변경 시 `updated_at` 갱신.
- `created_at`은 **최초 insert 시만** 설정.

## 이후에 붙일 수 있는 것 (v1+·논의)

- `prod_no`는 유지하되, **기간 규칙**(`duration_rule`), 솔패스 **문/이** 트랙, 재등록 판정 override 등은 SPEC `product_mapping` Phase 2 확장과 [SPEC §4.2, §4.4](./SPEC.md)에 맞춰 **같은 시트에 열 추가**하거나 **별도 시트**로 쪼갤 수 있음.
- `enrollments`·집계 `agg_*`는 이 매핑을 **참조**해 카테고리·만료를 결정.

이 문서는 **v0 스키마 확정**용이며, GAS/프론트 구현 시 `dbSchema.js` `DB_PRODUCT_MAPPING_HEADERS`와 1:1로 맞출 것.

- 프론트(탭·저장·초기 시트 생성): [../front/docs/PRODUCT_CLASSIFICATION_UI.md](../front/docs/PRODUCT_CLASSIFICATION_UI.md)
- API: [BACKEND_API.md](./BACKEND_API.md) §2.3
