/**
 * 원천 DB (Google Sheets) — 스키마·Property 키.
 * Open API 응답(camelCase) → 아래 **헤더(snake_case) 열**로 매핑. ([BACKEND_API.md](../../docs/BACKEND_API.md) 주문 절)
 *
 * 원천 시트는 GAS만 쓰기·사람 읽기 전용(락은 시트 UI에서 별도 설정).
 */
var DB_PROP_SHEETS_MASTER_ID = 'SHEETS_MASTER_ID';
/** (선택) 마스터 스프레드시트를 **처음 만들 때** 둘 Google Drive 폴더 ID. */
var DB_PROP_SHEETS_MASTER_PARENT_FOLDER_ID = 'SHEETS_MASTER_PARENT_FOLDER_ID';

/**
 * (선택) **레포에 박는** 팀용 폴더 ID. 비어 있으면 `dbGetParentFolderIdOfClaspScript_()` = **clasp로 연동된 이 GAS
 * 프로젝트 파일이 Drive에 있는 그 폴더**를 씀(ScriptApp.getScriptId + Drive). Properties가 최우선.
 * @type {string}
 */
var DB_DEFAULT_SHEETS_MASTER_PARENT_FOLDER_ID = '';

/**
 * `My Drive`에서 루트 → … 순으로 내려갈 **폴더 이름** (캡처: `00_admin` / `10_IMWEB_DASHBOARD`).
 * 새 마스터 DB 스프레드시트는 **여기(마지막 폴더)**에 두도록 이동. 이름 바꾸면 여기도 같이 맞출 것.
 * @type {string[]}
 */
var DB_DEFAULT_MASTER_FOLDER_PATH = ['00_admin', '10_IMWEB_DASHBOARD'];

/** `dbSetupMasterDatabase` — 스크립트가 있는 Drive 폴더 **아래** 이 이름의 하위 폴더를 만들고(없으면 사용), 시트는 그 안에 둔다. */
var DB_SUBFOLDER_NAME = 'DB';

var DB_PROP_UNIT_CODE = 'IMWEB_UNIT_CODE';

var DB_SHEET_MEMBERS = 'members';
var DB_SHEET_ORDERS = 'orders';
var DB_SHEET_ORDER_ITEMS = 'order_items';
var DB_SHEET_PRODUCTS = 'products';
var DB_SHEET_SYNC_LOG = 'sync_log';

/**
 * 층 1(운영/파생) — 상품·내부 분류 매핑. 원천 `products`와 **별도 시트(또는 별도 스프레드시트)**. (레포 `docs/SCHEMA_PRODUCT_MAPPING.md` 참고)
 * Script Property: `SHEETS_OPERATIONS_ID` — 없으면 개발/초기에는 원천 마스터와 **같은 파일**에 탭만 두는 방식으로도 동작시킬 수 있음(구현에서 결정).
 */
var DB_PROP_SHEETS_OPERATIONS_ID = 'SHEETS_OPERATIONS_ID';
var DB_SHEET_PRODUCT_MAPPING = 'product_mapping';

/**
 * @type {string[]}
 * - internal_category: `unmapped` | `solpass` | `solutine` | `challenge` | `textbook` (docs/SPEC.md §3.1·§4, 영문 키 고정)
 * - lifecycle: `active` (판매·운영) | `archived` (만료/종료) | `test` (테스트)
 */
var DB_PRODUCT_MAPPING_HEADERS = [
  'prod_no',
  'product_name',
  'internal_category',
  'lifecycle',
  'created_at',
  'updated_at',
  'notes'
];

/** 끝 2열: docs/SPEC.md §5.1.1 공통 */
var DB_META_SUFFIX = ['fetched_at', 'source_sync_id'];

/** @type {string[]} */
var DB_MEMBERS_HEADERS = [
  'member_code',
  'uid',
  'name',
  'callnum',
  'gender',
  'birth',
  'addr',
  'sms_agree',
  'email_agree',
  'join_time',
  'recommend_code',
  'recommend_target_code',
  'last_login_time',
  'member_grade',
  'group_json'
].concat(DB_META_SUFFIX);

/** @type {string[]} */
var DB_ORDERS_HEADERS = [
  'order_no',
  'order_time',
  'orderer_member_code',
  'orderer_name',
  'orderer_call',
  'order_status',
  'order_type',
  'currency',
  'total_price',
  'total_discount_price',
  'total_point',
  'line_coupon_sum',
  'payment_amount'
].concat(DB_META_SUFFIX);

/** @type {string[]} */
var DB_ORDER_ITEMS_HEADERS = [
  'order_section_item_no',
  'order_item_code',
  'order_no',
  'order_status',
  'section_status',
  'claim_status',
  'claim_type',
  'prod_no',
  'prod_name',
  'line_price',
  'line_price_sale',
  'line_point',
  'line_coupon',
  'line_period_discount',
  'options_raw',
  'options_count',
  'row_json'
].concat(DB_META_SUFFIX);

/** @type {string[]} — §3.3.4 + 메타 */
var DB_PRODUCTS_HEADERS = [
  'prod_no',
  'prod_status',
  'categories',
  'name',
  'prod_type_data',
  'price',
  'price_org',
  'is_exist_options',
  'is_mix',
  'add_time',
  'edit_time'
].concat(DB_META_SUFFIX);

/** @type {string[]} */
var DB_SYNC_LOG_HEADERS = [
  'sync_id',
  'started_at',
  'ended_at',
  'entity',
  'status',
  'rows_written',
  'message'
];
