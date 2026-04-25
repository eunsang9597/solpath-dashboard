/**
 * Open API → 시트 스냅샷 [실행 전용] 진입점.
 *
 * GAS [실행] 드롭다운이 **현재 열어 둔 파일**의 `function`만 보여 주면, 이 파일을 연 뒤
 * 아래 중 하나를 선택해 실행하세요. (같은 이름의 본문은 `DB/dbSyncMembers.js` 등)
 *
 * 동작이 `ReferenceError: dbSync… is not defined`이면: 원격에 `DB/`가 없을 수 있음 → `clasp push` 후
 * 스크립트 편집기 왼쪽 파일 트리에 `DB` 폴더·`dbSyncMembers.js`가 있는지 확인.
 */
function run_OpenSync_Members() {
  return dbSyncMembersOpen();
}

function run_OpenSync_Products() {
  return dbSyncProductsOnePage();
}

function run_OpenSync_Orders() {
  return dbSyncOrdersOpen();
}

function run_OpenSync_All() {
  return dbSyncOpenAll(); // { members, products, orders }
}
