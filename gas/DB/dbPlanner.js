/**
 * 플래너 마스터 DB — 전화 매칭·기록·공통 일정.
 * 문서: docs/PLANNER_DB_ARCHITECTURE.md
 */

/**
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet|null}
 */
function dbPlannerOpenMaster_() {
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty(DB_PROP_SHEETS_PLANNER_MASTER_ID);
  id = id != null ? String(id).trim() : '';
  if (!id.length || !dbDriveSpreadsheetIdIsUsableNow_(id)) {
    return null;
  }
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    Logger.log('dbPlannerOpenMaster_: ' + (e && e.message != null ? e.message : String(e)));
    return null;
  }
}

/**
 * @param {string} s
 * @return {string}
 */
function dbPlannerNameNorm_(s) {
  return String(s != null ? s : '').replace(/\s+/g, '');
}

/**
 * @param {unknown} segs
 * @return {string} '' if invalid
 */
function dbPlannerPhoneFromSegments_(segs) {
  if (!segs || typeof segs.length !== 'number' || segs.length !== 3) {
    return '';
  }
  var a = String(segs[0] != null ? segs[0] : '').replace(/\D/g, '');
  var b = String(segs[1] != null ? segs[1] : '').replace(/\D/g, '');
  var c = String(segs[2] != null ? segs[2] : '').replace(/\D/g, '');
  if (a.length !== 3 || b.length !== 4 || c.length !== 4) {
    return '';
  }
  return a + b + c;
}

/**
 * 시트 셀 값 → 숫자만 문자열(지수 표기·number 타입 보정).
 * @param {unknown} raw
 * @return {string}
 */
function dbPlannerRawToPhoneDigits_(raw) {
  if (raw == null || raw === '') {
    return '';
  }
  if (typeof raw === 'number' && isFinite(raw)) {
    var n = Math.abs(/** @type {number} */ (raw));
    if (n >= 1e9 && n < 1e12) {
      return String(Math.round(n)).replace(/\D/g, '');
    }
  }
  var s = String(raw).trim();
  if (/[eE]/.test(s)) {
    var nf = Number(s);
    if (isFinite(nf)) {
      return String(Math.round(Math.abs(nf))).replace(/\D/g, '');
    }
  }
  return s.replace(/\D/g, '');
}

/**
 * 한국 휴대전화 11자리(`010…`)로 정규화. 실패 시 `''`.
 * @param {unknown} raw getValues 셀
 * @param {unknown} [displayRaw] getDisplayValues 셀(있으면 우선)
 * @return {string}
 */
function dbPlannerNormalizePhoneKR_(raw, displayRaw) {
  /** @type {string[]} */
  var parts = [];
  if (displayRaw != null && String(displayRaw).trim() !== '') {
    parts.push(dbPlannerRawToPhoneDigits_(displayRaw));
  }
  if (raw != null && raw !== '') {
    parts.push(dbPlannerRawToPhoneDigits_(raw));
  }
  var d = '';
  var pi;
  for (pi = 0; pi < parts.length; pi++) {
    if (parts[pi].length >= 10) {
      d = parts[pi];
      break;
    }
  }
  if (!d.length && parts.length) {
    d = parts[0];
  }
  if (d.length === 10 && d.charAt(0) === '1' && d.charAt(1) === '0') {
    return '0' + d;
  }
  if (d.length === 11 && d.charAt(0) === '0') {
    return d;
  }
  if (d.length === 11) {
    return d;
  }
  return '';
}

/**
 * members.callnum 등 → `dbPlannerNormalizePhoneKR_`.
 * @param {unknown} raw
 * @return {string}
 */
function dbPlannerNormalizePhoneFromCallnum_(raw) {
  return dbPlannerNormalizePhoneKR_(raw, null);
}

/**
 * 시트 셀 → 문자열(숫자로 저장된 전화 등). 빈 칸·null 허용.
 * @param {unknown} raw
 * @return {string}
 */
function dbPlannerCellToSheetText_(raw) {
  if (raw == null || raw === '') {
    return '';
  }
  if (Object.prototype.toString.call(raw) === '[object Date]') {
    return Utilities.formatDate(/** @type {Date} */ (raw), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(raw).trim();
}

/**
 * 날짜 열 셀 → `yyyy-MM-dd` (서울). 문자열이 이미 날짜 접두면 앞 10자만.
 * @param {unknown} raw
 * @return {string}
 */
function dbPlannerCellToYmdSeoul_(raw) {
  if (raw == null || raw === '') {
    return '';
  }
  if (Object.prototype.toString.call(raw) === '[object Date]') {
    return Utilities.formatDate(/** @type {Date} */ (raw), 'Asia/Seoul', 'yyyy-MM-dd');
  }
  var s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  return s;
}

/**
 * 시트 셀 → 정수 PK/FK/회차. 숫자 셀·지수 표기·앞뒤 문자 섞임 허용. 빈 칸·해석 불가 → `''`.
 * @param {unknown} raw
 * @return {number|string}
 */
function dbPlannerCellToSheetInt_(raw) {
  if (raw == null || raw === '') {
    return '';
  }
  if (typeof raw === 'number' && isFinite(raw)) {
    return Math.round(raw);
  }
  var s = String(raw).trim();
  if (!s.length) {
    return '';
  }
  if (/[eE]/.test(s)) {
    var nf = Number(s);
    if (isFinite(nf)) {
      return Math.round(nf);
    }
    return '';
  }
  var digits = s.replace(/\D/g, '');
  if (!digits.length) {
    return '';
  }
  var n = Number(digits);
  return isFinite(n) ? Math.round(n) : '';
}

/**
 * 강의 `duration`(분) — **0 이상 정수**. `60`·`60분`·`1시간30분`·숫자 셀. 빈 칸·해석 불가 → `0`.
 * @param {unknown} raw
 * @return {number}
 */
function dbPlannerCellToDurationMinutes_(raw) {
  if (raw == null || raw === '') {
    return 0;
  }
  if (typeof raw === 'number' && isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  var s = String(raw).trim();
  if (!s.length) {
    return 0;
  }
  if (/[eE]/.test(s)) {
    var nf = Number(s);
    if (isFinite(nf)) {
      return Math.max(0, Math.round(nf));
    }
    return 0;
  }
  var hr = s.match(/^(\d+)\s*시간(?:\s*(\d+)\s*분)?\s*$/);
  if (hr) {
    var h = Number(hr[1]);
    var mn = hr[2] != null && String(hr[2]).length ? Number(hr[2]) : 0;
    if (isFinite(h) && isFinite(mn)) {
      return Math.max(0, Math.round(h * 60 + mn));
    }
  }
  var m = s.match(/(\d+(?:\.\d+)?)/);
  if (m) {
    var n = Number(m[1]);
    if (isFinite(n)) {
      return Math.max(0, Math.round(n));
    }
  }
  return 0;
}

/**
 * `planner_curriculum_lectures.duration` 열 — 정수 서식 + 값 보정(분).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sh
 */
function dbPlannerFixCurriculumLectureDurationColumn_(sh) {
  var ixDur = DB_PLANNER_CURRICULUM_LECTURE_HEADERS.indexOf('duration');
  if (ixDur < 0) {
    ixDur = 4;
  }
  var col = ixDur + 1;
  var lr = sh.getLastRow();
  if (lr < 2) {
    return;
  }
  var nCols = DB_PLANNER_CURRICULUM_LECTURE_HEADERS.length;
  var numRows = lr - 2 + 1;
  var vals = sh.getRange(2, 1, numRows, nCols).getValues();
  var outCol = [];
  var i;
  for (i = 0; i < numRows; i++) {
    var row = vals[i] || [];
    outCol.push([dbPlannerCellToDurationMinutes_(row[ixDur])]);
  }
  sh.getRange(2, col, numRows, 1).setNumberFormat('0');
  sh.getRange(2, col, numRows, 1).setValues(outCol);
}

/**
 * `planner_registry.phone_normalized` 읽기·매칭용 — `dbPlannerNormalizePhoneKR_`.
 * @param {unknown} raw getValues 셀
 * @return {string}
 */
function dbPlannerNormalizePhoneFromSheet_(raw) {
  return dbPlannerNormalizePhoneKR_(raw, null);
}

/**
 * API·`planner_student_links` resolve용. `member_code` 우선, 없으면 `imweb_uid`.
 * @param {string} memberCode
 * @param {string} imwebUid
 * @return {string}
 */
function dbPlannerLinkKeyFromParts_(memberCode, imwebUid) {
  var mc = String(memberCode != null ? memberCode : '').trim();
  if (mc.length) {
    return mc;
  }
  return String(imwebUid != null ? imwebUid : '').trim();
}

/**
 * registry `phone_normalized` 열만 텍스트(`@`) + 열 너비.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sh
 * @return {number} 보정한 행 수
 */
function dbPlannerApplyRegistryPhoneColumnFormat_(sh) {
  var ixPhone = DB_PLANNER_REGISTRY_HEADERS.indexOf('phone_normalized');
  if (ixPhone < 0) {
    ixPhone = 2;
  }
  var col = ixPhone + 1;
  sh.setColumnWidth(col, 132);
  var lr = sh.getLastRow();
  if (lr < 2) {
    return 0;
  }
  var numRows = lr - 2 + 1;
  sh.getRange(2, col, numRows, 1).setNumberFormat('@');
  return numRows;
}

/**
 * registry 2행~ `phone_normalized`를 읽어 11자리 텍스트로 다시 씀(숫자 셀·앞자리 0 누락 복구).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sh
 * @return {number} 유효 전화가 있는 행 수
 */
function dbPlannerFixRegistryPhoneColumn_(sh) {
  var ixPhone = DB_PLANNER_REGISTRY_HEADERS.indexOf('phone_normalized');
  if (ixPhone < 0) {
    ixPhone = 2;
  }
  var col = ixPhone + 1;
  var lr = sh.getLastRow();
  if (lr < 2) {
    return 0;
  }
  var nCols = DB_PLANNER_REGISTRY_HEADERS.length;
  var numRows = lr - 2 + 1;
  var vals = sh.getRange(2, 1, numRows, nCols).getValues();
  var dispVals = sh.getRange(2, 1, numRows, nCols).getDisplayValues();
  var outCol = [];
  var kept = 0;
  var i;
  for (i = 0; i < numRows; i++) {
    var row = vals[i] || [];
    var rowD = dispVals[i] || [];
    var phRaw = rowD[ixPhone] != null && String(rowD[ixPhone]).trim() !== '' ? rowD[ixPhone] : row[ixPhone];
    var ph = dbPlannerNormalizePhoneKR_(row[ixPhone], phRaw);
    outCol.push([ph]);
    if (ph.length) {
      kept++;
    }
  }
  sh.getRange(2, col, numRows, 1).setNumberFormat('@');
  sh.getRange(2, col, numRows, 1).setValues(outCol);
  return kept;
}

/**
 * registry 데이터 열(2행~) 서식을 텍스트(`@`)로 고정 — 전화 앞자리 0 유지.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sh
 * @param {number} nCols
 */
function dbPlannerApplyRegistryTextFormats_(sh, nCols) {
  var lr = sh.getLastRow();
  if (lr < 2 || nCols < 1) {
    return;
  }
  var numRows = lr - 2 + 1;
  sh.getRange(2, 1, numRows, nCols).setNumberFormat('@');
  dbPlannerApplyRegistryPhoneColumnFormat_(sh);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {number}
 */
function dbPlannerFixRegistryPhoneColumnOnMaster_(ss) {
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_REGISTRY);
  if (!sh) {
    return 0;
  }
  return dbPlannerFixRegistryPhoneColumn_(sh);
}

/**
 * `planner_registry.phone_normalized` 열을 11자리 텍스트로 일괄 보정(수기 붙여넣기·숫자 셀 복구).
 * @return {{ ok: true, data: { phoneRows: number } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbPlannerFixRegistryPhonesFromMaster_() {
  var ss = dbPlannerOpenMaster_();
  if (!ss) {
    return {
      ok: false,
      error: {
        code: 'PLANNER_NOT_CONFIGURED',
        message: '플래너 마스터(SHEETS_PLANNER_MASTER_ID)가 없습니다.'
      }
    };
  }
  return { ok: true, data: { phoneRows: dbPlannerFixRegistryPhoneColumnOnMaster_(ss) } };
}

/**
 * registry 시트 2행~ 전체 행(헤더 너비) 읽기.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sheetName
 * @return {Array<Array>}
 */
function dbPlannerReadRegistryRowArraysFromSheet_(ss, sheetName) {
  var sh = ss.getSheetByName(String(sheetName || DB_SHEET_PLANNER_REGISTRY));
  if (!sh || sh.getLastRow() < 2) {
    return [];
  }
  var nCol = DB_PLANNER_REGISTRY_HEADERS.length;
  var numRows = sh.getLastRow() - 2 + 1;
  return sh.getRange(2, 1, numRows, nCol).getValues();
}

/**
 * rebuild로 새로 쓰는 registry 행에 기존 프로필·월 구간(수기)을 복원한다.
 * @param {Array} newRow
 * @param {Array} existingRow
 * @return {Array}
 */
function dbPlannerRegistryMergeProfileFromExisting_(newRow, existingRow) {
  if (!existingRow || !existingRow.length) {
    return newRow;
  }
  var h = DB_PLANNER_REGISTRY_HEADERS;
  var profileKeys = [
    'track',
    'admission_type',
    'prev_university',
    'prev_major_gpa',
    'goal_university',
    'goal_department',
    'study_status',
    'plan_features',
    'subject_guides_json',
    'monthly_plan_notices_json'
  ];
  var ki;
  for (ki = 0; ki < profileKeys.length; ki++) {
    var ix = h.indexOf(profileKeys[ki]);
    if (ix >= 0 && ix < newRow.length && ix < existingRow.length) {
      newRow[ix] = existingRow[ix];
    }
  }
  var ixRanges = h.indexOf('planner_month_ranges_json');
  if (ixRanges >= 0 && ixRanges < existingRow.length) {
    var prevRanges = String(existingRow[ixRanges] != null ? existingRow[ixRanges] : '').trim();
    if (prevRanges.length && prevRanges !== '[]') {
      newRow[ixRanges] = existingRow[ixRanges];
    }
  }
  return newRow;
}

/**
 * 원천 마스터 `order_items` + `product_mapping`에서 **솔패스** 구매 이력이 있는 회원으로 `planner_registry`를 갱신한다.
 * rebuild 전 `planner_registry` 2행~ 스냅샷을 읽어, 주문에서 다시 쓰는 행에는 **프로필·코칭 열**(track~monthly_plan_notices_json)과
 * 비어 있지 않은 `planner_month_ranges_json`을 유지한다. 주문 집계에 없던 **수기 행**은 그대로 남긴다.
 * `planner_month_ranges_json`이 비어 있거나 `[]`이면 첫 솔패스 주문 시각(서울 월)~당월 구간을 자동 채운다.
 * 제외 규칙은 `dbStudentMgmtRebuildFromMaster_`와 동일(구매자 이름·`dbAnOrderLineSkipForAnalytics_` 등), 단 **internal_category === solpass** 인 라인만 집계한다.
 *
 * @return {{ ok: true, data: Object }|{ ok: false, error: { code: string, message: string } }}
 */
function dbPlannerRebuildRegistryFromMaster_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return {
      ok: false,
      error: {
        code: 'PLANNER_SYNC_BUSY',
        message: '이미 동기화가 진행 중입니다. 끝날 때까지 기다려 주세요.'
      }
    };
  }
  try {
    return dbPlannerRebuildRegistryFromMasterBody_(Date.now());
  } finally {
    try {
      lock.releaseLock();
    } catch (eRel) {}
  }
}

var DB_PLANNER_PROVISION_BUDGET_MS = 270000;

function dbPlannerRebuildRegistryFromMasterBody_(startedAtMs) {
  var master;
  try {
    master = dbOpenMaster_();
  } catch (e0) {
    return {
      ok: false,
      error: {
        code: 'NO_SHEETS_MASTER',
        message: '원천 DB(SHEETS_MASTER_ID)를 열 수 없습니다.'
      }
    };
  }
  var ssPl = dbPlannerOpenMaster_();
  if (!ssPl) {
    return {
      ok: false,
      error: {
        code: 'PLANNER_NOT_CONFIGURED',
        message: '플래너 마스터(SHEETS_PLANNER_MASTER_ID)가 없습니다. run_Planner_InitMaster 먼저 실행하세요.'
      }
    };
  }

  var shI = master.getSheetByName(DB_SHEET_ORDER_ITEMS);
  if (!shI || shI.getLastRow() < 2) {
    return { ok: false, error: { code: 'NO_ORDER_DATA', message: 'order_items가 비어 있습니다. 먼저 주문을 동기화하세요.' } };
  }

  var shO = master.getSheetByName(DB_SHEET_ORDERS);
  var orderMap = {};
  var orderToMember = {};
  var ordererNameMap = {};
  var ordererNameByMemberCode = {};
  if (shO && shO.getLastRow() >= 2) {
    var oLr = shO.getLastRow();
    var ov = shO.getRange(2, 1, oLr - 1, 5).getValues();
    var oi;
    for (oi = 0; oi < ov.length; oi++) {
      var ol = ov[oi] || [];
      var on0 = String(ol[0] != null ? ol[0] : '').trim();
      if (on0) {
        orderMap[on0] = ol[1];
        var mcOrd = String(ol[2] != null ? ol[2] : '').trim();
        orderToMember[on0] = mcOrd;
        ordererNameMap[on0] = ol[3];
        if (mcOrd.length && ol[3] != null && String(ol[3]).trim().length) {
          ordererNameByMemberCode[mcOrd] = String(ol[3]).trim();
        }
      }
    }
  }

  var memberToGroupTitles = {};
  var memberRowByCode = {};
  var shMem = master.getSheetByName(DB_SHEET_MEMBERS);
  if (shMem && shMem.getLastRow() >= 2) {
    var mLr = shMem.getLastRow();
    var mW = DB_MEMBERS_HEADERS.length;
    var mVals = shMem.getRange(2, 1, mLr - 1, mW).getValues();
    var ixMc = DB_MEMBERS_HEADERS.indexOf('member_code');
    var ixName = DB_MEMBERS_HEADERS.indexOf('name');
    var ixCall = DB_MEMBERS_HEADERS.indexOf('callnum');
    var ixUid = DB_MEMBERS_HEADERS.indexOf('uid');
    var ixGt = DB_MEMBERS_HEADERS.indexOf('group_titles');
    var mx;
    for (mx = 0; mx < mVals.length; mx++) {
      var mRow = mVals[mx] || [];
      var mcode = String(mRow[ixMc] != null ? mRow[ixMc] : '').trim();
      if (!mcode.length) {
        continue;
      }
      memberToGroupTitles[mcode] = dbAnParseGroupTitlesCell_(ixGt >= 0 ? mRow[ixGt] : '');
      memberRowByCode[mcode] = {
        name: ixName >= 0 ? mRow[ixName] : '',
        callnum: ixCall >= 0 ? mRow[ixCall] : '',
        uid: ixUid >= 0 ? mRow[ixUid] : ''
      };
    }
  }

  var pmMap = dbPmReadMappingMap_();
  var wI = DB_ORDER_ITEMS_HEADERS.length;
  var iLr = shI.getLastRow();
  var iVals = shI.getRange(2, 1, iLr - 1, wI).getValues();

  /** @type {Object<string, boolean>} */
  var forceSkip = typeof DB_STU_FORCE_SKIP_ORDER_ITEM_CODES_ !== 'undefined' ? DB_STU_FORCE_SKIP_ORDER_ITEM_CODES_ : {};

  /** member_code -> { ts: string, item: string } (order_time 문자열 사전순 최소) */
  var firstSol = {};
  var skipped = 0;
  var j;
  for (j = 0; j < iVals.length; j++) {
    var L = iVals[j] || [];
    var itemSkip = String(L[1] != null ? L[1] : '').trim();
    if (itemSkip && forceSkip[itemSkip]) {
      skipped++;
      continue;
    }
    var ordNo = String(L[2] != null ? L[2] : '').trim();
    var pkey = dbPmRowKey_(L[8]);
    var cat = 'unmapped';
    var life = 'active';
    if (pkey && pmMap[pkey]) {
      cat = String(pmMap[pkey].internal_category || 'unmapped').trim() || 'unmapped';
      life = String(pmMap[pkey].lifecycle || 'active').trim() || 'active';
    }
    if (String(cat).trim().toLowerCase() !== 'solpass') {
      skipped++;
      continue;
    }
    var memCode = ordNo && orderToMember[ordNo] != null ? String(orderToMember[ordNo]).trim() : '';
    var gTitles = memCode.length && memberToGroupTitles[memCode] ? memberToGroupTitles[memCode] : [];

    if (dbStuSkipByPurchaser_(ordNo, ordererNameMap)) {
      skipped++;
      continue;
    }
    if (cat === 'unmapped' || cat === 'textbook') {
      skipped++;
      continue;
    }
    if (dbAnOrderLineSkipForAnalytics_(life, gTitles)) {
      skipped++;
      continue;
    }
    if (!memCode.length) {
      skipped++;
      continue;
    }

    var orderTimeStr = orderMap[ordNo] != null ? String(orderMap[ordNo]) : '';
    var itemCode = String(L[1] != null ? L[1] : '').trim();
    if (!firstSol[memCode] || String(orderTimeStr).localeCompare(firstSol[memCode].ts) < 0) {
      firstSol[memCode] = { ts: orderTimeStr, item: itemCode };
    }
  }

  var nCol = DB_PLANNER_REGISTRY_HEADERS.length;
  var existingRows = dbPlannerReadRegistryRowArraysFromSheet_(ssPl, DB_SHEET_PLANNER_REGISTRY);
  /** @type {Object<string, Array>} */
  var existingByMc = {};
  var eri;
  for (eri = 0; eri < existingRows.length; eri++) {
    var er = existingRows[eri] || [];
    var mcE = String(er[0] != null ? er[0] : '').trim();
    if (mcE.length) {
      existingByMc[mcE] = er;
    }
  }

  var nowIso = Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss");
  var out = [];
  /** @type {Object<string, boolean>} */
  var rebuiltMc = {};
  var skippedNoPhone = 0;
  var codes = Object.keys(firstSol);
  codes.sort();
  var ci;
  for (ci = 0; ci < codes.length; ci++) {
    var mc = codes[ci];
    var prev = existingByMc[mc];
    var phone = '';
    var disp = '';
    var uid = '';
    var mr = memberRowByCode[mc];
    if (mr) {
      phone = dbPlannerNormalizePhoneFromCallnum_(mr.callnum);
      disp = String(mr.name != null ? mr.name : '').trim();
      uid = String(mr.uid != null ? mr.uid : '').trim();
    }
    if (!disp.length && ordererNameByMemberCode[mc]) {
      disp = String(ordererNameByMemberCode[mc]).trim();
    }
    if (prev) {
      if (!phone.length) {
        phone = String(prev[2] != null ? prev[2] : '').trim();
      }
      if (!disp.length) {
        disp = String(prev[3] != null ? prev[3] : '').trim();
      }
      if (!uid.length) {
        uid = String(prev[1] != null ? prev[1] : '').trim();
      }
    }
    if (!phone.length) {
      skippedNoPhone++;
      continue;
    }
    var monthRangesJson = dbPlannerDefaultMonthRangesJsonFromOrderTime_(firstSol[mc].ts);
    var row = [
      String(mc),
      String(uid),
      String(phone),
      String(disp),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      String(firstSol[mc].item || ''),
      monthRangesJson,
      String(nowIso)
    ];
    if (prev) {
      row = dbPlannerRegistryMergeProfileFromExisting_(row, prev);
    }
    out.push(row);
    rebuiltMc[mc] = true;
  }

  var preservedRegistryRows = 0;
  var extraMc = Object.keys(existingByMc);
  extraMc.sort();
  var xi;
  for (xi = 0; xi < extraMc.length; xi++) {
    var mcX = extraMc[xi];
    if (rebuiltMc[mcX]) {
      continue;
    }
    var exRow = existingByMc[mcX];
    var kept = exRow.slice(0, nCol);
    while (kept.length < nCol) {
      kept.push('');
    }
    out.push(kept);
    preservedRegistryRows++;
  }
  out.sort(function (a, b) {
    return String(a[0] != null ? a[0] : '').localeCompare(String(b[0] != null ? b[0] : ''));
  });

  var shReg = dbGetOrCreateSheetWithHeaders_(ssPl, DB_SHEET_PLANNER_REGISTRY, DB_PLANNER_REGISTRY_HEADERS);
  dbClearDataRows2Plus_(shReg, nCol);
  if (out.length) {
    dbSetValuesFromRow2_(shReg, out, nCol);
    dbPlannerApplyRegistryTextFormats_(shReg, nCol);
    dbPlannerFixRegistryPhoneColumn_(shReg);
  }

  var prov = dbPlannerProvisionStudentsFromRegistry_(ssPl, startedAtMs);
  return {
    ok: true,
    data: {
      written: out.length,
      preservedRegistryRows: preservedRegistryRows,
      skippedLines: skipped,
      skippedNoPhone: skippedNoPhone,
      provisioned: prov.provisioned,
      reusedStudentFiles: prov.reused,
      reusedByTitle: prov.reusedByTitle,
      trashedBrokenLinks: prov.trashedBroken,
      trashedOrphanLinks: prov.trashedOrphans,
      provisionErrors: prov.provisionErrors,
      incomplete: prov.incomplete ? true : false,
      processed: prov.processed,
      total: prov.total
    }
  };
}

/**
 * @param {string} fileId
 */
function dbPlannerTrashFileBestEffort_(fileId) {
  var s = fileId != null ? String(fileId).trim() : '';
  if (!s.length) {
    return;
  }
  try {
    DriveApp.getFileById(s).setTrashed(true);
  } catch (e) {
    Logger.log('dbPlannerTrashFileBestEffort_: ' + s + ' ' + (e && e.message != null ? e.message : String(e)));
  }
}

/**
 * 플래너 마스터 파일이 들어 있는 Drive 폴더(첫 부모).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {string}
 */
function dbPlannerMasterParentFolderId_(ss) {
  try {
    var it = DriveApp.getFileById(ss.getId()).getParents();
    if (it.hasNext()) {
      return String(it.next().getId()).trim();
    }
  } catch (e) {
    Logger.log('dbPlannerMasterParentFolderId_: ' + (e && e.message != null ? e.message : String(e)));
  }
  return '';
}

/**
 * Drive 파일명 한 조각 — `/\:*?"<>|` 제거, 공백 정리.
 * @param {string} raw
 * @param {string} [fallback]
 * @return {string}
 */
function dbPlannerSanitizeStudentFileLabelPart_(raw, fallback) {
  var s = String(raw != null ? raw : '').trim();
  if (!s.length && fallback != null) {
    s = String(fallback).trim();
  }
  if (!s.length) {
    return 'unknown';
  }
  var t = s.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();
  if (t.length > 56) {
    t = t.slice(0, 56);
  }
  return t.length ? t : 'unknown';
}

/**
 * 학생 플래너 Drive 제목 접미사 — `display_name(imweb_uid)` (§10.1.1).
 * `imweb_uid` 없으면 `member_code`, 둘 다 없으면 `link_key`. 이름 없으면 `link_key`를 이름 자리에.
 * @param {string} displayName
 * @param {string} imwebUid
 * @param {string} memberCode
 * @param {string} linkKey
 * @return {string}
 */
function dbPlannerStudentFileTitleSuffix_(displayName, imwebUid, memberCode, linkKey) {
  var lk = String(linkKey != null ? linkKey : '').trim();
  var uid = String(imwebUid != null ? imwebUid : '').trim();
  var mc = String(memberCode != null ? memberCode : '').trim();
  var idRaw = uid.length ? uid : mc.length ? mc : lk;
  var idPart = dbPlannerSanitizeStudentFileLabelPart_(idRaw, 'unknown');
  var dnRaw = String(displayName != null ? displayName : '').trim();
  var namePart = dbPlannerSanitizeStudentFileLabelPart_(dnRaw, lk.length ? lk : idPart);
  var suffix = namePart + '(' + idPart + ')';
  if (suffix.length > 120) {
    suffix = suffix.slice(0, 120);
  }
  return suffix;
}

/**
 * 주문·ISO 시각 문자열 → 서울 `yyyy-MM` (실패 시 빈 문자열).
 * @param {string} isoOrLike
 * @return {string}
 */
function dbPlannerYearMonthFromOrderTimeSeoul_(isoOrLike) {
  var s = String(isoOrLike != null ? isoOrLike : '').trim();
  if (!s.length) {
    return '';
  }
  try {
    var d = new Date(s);
    if (isNaN(d.getTime())) {
      return '';
    }
    return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM');
  } catch (e) {
    return '';
  }
}

/**
 * `planner_month_ranges_json` 최소 형태 — rebuild 시 **첫 솔패스 라인 주문 시각**(서울 월) ~ **서울 당월** 한 구간.
 * 상품 실제 수강 시작일은 `product_mapping` 등과 맞춘 뒤 교체 예정(지금은 주문 시각 대용).
 * @param {string} firstOrderTimeStr
 * @return {string} JSON 문자열
 */
function dbPlannerDefaultMonthRangesJsonFromOrderTime_(firstOrderTimeStr) {
  var startYm = dbPlannerYearMonthFromOrderTimeSeoul_(firstOrderTimeStr);
  var nowYm = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM');
  if (!startYm.length) {
    startYm = nowYm;
  }
  if (startYm > nowYm) {
    var t = startYm;
    startYm = nowYm;
    nowYm = t;
  }
  var arr = [{ start_month: startYm, end_month: nowYm }];
  return JSON.stringify(arr);
}

/**
 * @param {string} raw
 * @return {Object[]}
 */
function dbPlannerParseMonthRangesJson_(raw) {
  var s = String(raw != null ? raw : '').trim();
  if (!s.length) {
    return [];
  }
  try {
    var arr = JSON.parse(s);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

/**
 * @param {string} ym
 * @return {{ y: number, m: number }|null}
 */
function dbPlannerYearMonthToParts_(ym) {
  var m = String(ym != null ? ym : '').match(/^(\d{4})-(\d{1,2})$/);
  if (!m) {
    return null;
  }
  var mo = Number(m[2]);
  if (!isFinite(mo) || mo < 1 || mo > 12) {
    return null;
  }
  return { y: Number(m[1]), m: mo };
}

/**
 * 시작~끝 월(포함) 모든 `yyyy-MM` 나열. 잘못된 값이면 빈 배열.
 * @param {string} startYm
 * @param {string} endYm
 * @return {string[]}
 */
function dbPlannerExpandOneRangeYearMonths_(startYm, endYm) {
  var a = dbPlannerYearMonthToParts_(startYm);
  var b = dbPlannerYearMonthToParts_(endYm);
  if (!a || !b) {
    return [];
  }
  var y = a.y;
  var mo = a.m;
  var endY = b.y;
  var endMo = b.m;
  if (y > endY || (y === endY && mo > endMo)) {
    var t = a;
    a = b;
    b = t;
    y = a.y;
    mo = a.m;
    endY = b.y;
    endMo = b.m;
  }
  var out = [];
  while (y < endY || (y === endY && mo <= endMo)) {
    out.push(y + '-' + (mo < 10 ? '0' : '') + mo);
    mo++;
    if (mo > 12) {
      mo = 1;
      y++;
    }
  }
  return out;
}

/**
 * 레지스트리 JSON에서 모든 월 탭 후보(중복 제거·정렬).
 * @param {string} raw
 * @return {string[]}
 */
function dbPlannerExpandAllYearMonthsFromRangesJson_(raw) {
  var arr = dbPlannerParseMonthRangesJson_(raw);
  var seen = {};
  var out = [];
  var i;
  var j;
  for (i = 0; i < arr.length; i++) {
    var seg = arr[i];
    if (!seg || typeof seg !== 'object') {
      continue;
    }
    var sm = String(seg.start_month != null ? seg.start_month : seg.start != null ? seg.start : '').trim();
    var em = String(seg.end_month != null ? seg.end_month : seg.end != null ? seg.end : '').trim();
    var expanded = dbPlannerExpandOneRangeYearMonths_(sm, em);
    for (j = 0; j < expanded.length; j++) {
      var ym = expanded[j];
      if (!seen[ym]) {
        seen[ym] = true;
        out.push(ym);
      }
    }
  }
  out.sort();
  return out;
}

/**
 * 학생 파일에 `planner_month_ranges_json` 이 가리키는 **모든** 월 탭 생성(헤더 포함). 빈/파싱 불가면 서울 당월 1개만.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} rangesJsonRaw
 */
function dbPlannerEnsurePersonalTodoSheetsForStudent_(ss, rangesJsonRaw) {
  var yms = dbPlannerExpandAllYearMonthsFromRangesJson_(rangesJsonRaw);
  var k;
  if (!yms.length) {
    dbPlannerEnsurePersonalTodoSheet_(ss);
    return;
  }
  for (k = 0; k < yms.length; k++) {
    var parts = yms[k].match(/^(\d{4})-(\d{1,2})$/);
    if (!parts) {
      continue;
    }
    var tab = dbPlannerPersonalTodosSheetName_(Number(parts[1]), Number(parts[2]));
    dbGetOrCreateSheetWithHeaders_(ss, tab, DB_PLANNER_PERSONAL_TODO_HEADERS);
  }
  dbDeleteOrphanDefaultSheetIfAny_(ss);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function dbPlannerEnsurePersonalTodoSheet_(ss) {
  var tab = dbPlannerPersonalTodosSheetNameFromYearMonthStr_('');
  dbGetOrCreateSheetWithHeaders_(ss, tab, DB_PLANNER_PERSONAL_TODO_HEADERS);
  dbDeleteOrphanDefaultSheetIfAny_(ss);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs
 * @param {string} displayName registry `display_name`
 * @param {string} imwebUid registry `imweb_uid`
 * @param {string} memberCode registry `member_code`
 * @param {string} linkKey resolve용 `link_key`
 * @param {string} rangesJsonRaw `planner_month_ranges_json` (학생 월 탭 목록)
 * @return {string} 새 스프레드시트 ID 또는 실패 시 ''
 */
function dbPlannerCreateStudentPlannerSpreadsheet_(masterSs, displayName, imwebUid, memberCode, linkKey, rangesJsonRaw) {
  var folderId = dbPlannerMasterParentFolderId_(masterSs);
  if (!folderId) {
    folderId = dbPmGetMasterParentFolderId_();
  }
  if (!folderId) {
    var base = dbResolveMasterParentFolderId_();
    if (base) {
      folderId = dbGetOrCreateDbSubfolder_(base) || '';
    }
  }
  if (!folderId) {
    Logger.log('dbPlannerCreateStudentPlannerSpreadsheet_: no folder');
    return '';
  }
  var title =
    DB_PLANNER_STUDENT_FILE_TITLE_PREFIX +
    dbPlannerStudentFileTitleSuffix_(displayName, imwebUid, memberCode, linkKey);
  var file = dbDriveCreateSpreadsheetInFolder_(title, folderId);
  if (!file || !file.id) {
    return '';
  }
  var id = String(file.id).trim();
  var ss = dbOpenNewSpreadsheetByIdWithRetry_(id);
  if (ss) {
    dbPlannerEnsurePersonalTodoSheetsForStudent_(ss, rangesJsonRaw != null ? String(rangesJsonRaw) : '');
  } else {
    Logger.log('dbPlannerCreateStudentPlannerSpreadsheet_: open retry fail id=' + id);
  }
  return id;
}

/**
 * 폴더에서 제목이 같은 스프레드시트 중 **가장 최근 수정** ID. 없으면 ''.
 * @param {string} folderId
 * @param {string} title
 * @return {string}
 */
function dbPlannerFindStudentSpreadsheetIdByTitle_(folderId, title) {
  var fid = String(folderId != null ? folderId : '').trim();
  var name = String(title != null ? title : '').trim();
  if (!fid.length || !name.length) {
    return '';
  }
  try {
    var folder = DriveApp.getFolderById(fid);
    var it = folder.getFilesByName(name);
    var bestId = '';
    var bestMs = 0;
    while (it.hasNext()) {
      var f = it.next();
      if (f.isTrashed && typeof f.isTrashed === 'function' && f.isTrashed()) {
        continue;
      }
      if (f.getMimeType() !== 'application/vnd.google-apps.spreadsheet') {
        continue;
      }
      var id = String(f.getId()).trim();
      if (!id.length || !dbDriveSpreadsheetIdIsUsableNow_(id)) {
        continue;
      }
      var ms = 0;
      try {
        ms = f.getLastUpdated().getTime();
      } catch (eT) {
        ms = 0;
      }
      if (!bestId.length || ms >= bestMs) {
        bestId = id;
        bestMs = ms;
      }
    }
    return bestId;
  } catch (e) {
    Logger.log(
      'dbPlannerFindStudentSpreadsheetIdByTitle_: ' + (e && e.message != null ? e.message : String(e))
    );
    return '';
  }
}

/**
 * `planner_student_links`에서 같은 `link_key`(또는 member_code / imweb_uid) 행을 덮어쓰거나 한 행 추가.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sh
 * @param {number} wL
 * @param {number} ixMc
 * @param {number} ixUid
 * @param {string} mc
 * @param {string} uid
 * @param {string} sid
 * @param {string} provAt
 */
function dbPlannerUpsertStudentLinkRow_(sh, wL, ixMc, ixUid, mc, uid, sid, provAt) {
  var row = [mc, uid, sid, provAt];
  while (row.length < wL) {
    row.push('');
  }
  var lk = dbPlannerLinkKeyFromParts_(mc, uid);
  var lr = sh.getLastRow();
  if (lr >= 2) {
    var n = lr - 2 + 1;
    var vals = sh.getRange(2, 1, n, wL).getValues();
    var i;
    for (i = 0; i < vals.length; i++) {
      var rowMc = dbPlannerCellToSheetText_(vals[i][ixMc]);
      var rowUid = dbPlannerCellToSheetText_(vals[i][ixUid]);
      if (dbPlannerLinkKeyFromParts_(rowMc, rowUid) === lk || (mc.length && rowMc === mc) || (uid.length && rowUid === uid)) {
        sh.getRange(2 + i, 1, 1, wL).setValues([row]);
        return;
      }
    }
  }
  var next = sh.getLastRow() < 2 ? 2 : sh.getLastRow() + 1;
  sh.getRange(next, 1, 1, wL).setValues([row]);
}

/**
 * `planner_registry` 행(`member_code` 또는 `imweb_uid` 있음)마다 학생 파일·links 4열을 맞춘다.
 * 링크 ID가 살아 있으면 그 파일을 연지 않고 재사용한다(매 동기화마다 22파일을 열다 6분에 끊기던 경로).
 * ID가 깨졌으면 같은 제목 파일을 찾고, 없으면 새로 만든다. **링크 행은 학생 한 명마다 즉시 기록**한다.
 * 레지스트리에 없는 링크 `link_key`는 제거하고 파일은 휴지통으로 보낸다.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs
 * @param {number} [startedAtMs]
 * @return {{ provisioned: number, reused: number, reusedByTitle: number, trashedBroken: number, trashedOrphans: number, provisionErrors: number, incomplete: boolean, processed: number, total: number }}
 */
function dbPlannerProvisionStudentsFromRegistry_(masterSs, startedAtMs) {
  dbPlannerFixRegistryPhoneColumnOnMaster_(masterSs);
  var nowIso = Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss");
  var started = startedAtMs != null && isFinite(Number(startedAtMs)) ? Number(startedAtMs) : Date.now();
  var out = {
    provisioned: 0,
    reused: 0,
    reusedByTitle: 0,
    trashedBroken: 0,
    trashedOrphans: 0,
    provisionErrors: 0,
    incomplete: false,
    processed: 0,
    total: 0
  };
  var shLinks = dbGetOrCreateSheetWithHeaders_(masterSs, DB_SHEET_PLANNER_STUDENT_LINKS, DB_PLANNER_STUDENT_LINK_HEADERS);
  var wL = DB_PLANNER_STUDENT_LINK_HEADERS.length;
  var ixLkMc = DB_PLANNER_STUDENT_LINK_HEADERS.indexOf('member_code');
  var ixLkUid = DB_PLANNER_STUDENT_LINK_HEADERS.indexOf('imweb_uid');
  var ixLkSid = DB_PLANNER_STUDENT_LINK_HEADERS.indexOf('student_spreadsheet_id');
  var ixLkProv = DB_PLANNER_STUDENT_LINK_HEADERS.indexOf('provisioned_at');
  if (ixLkMc < 0) {
    ixLkMc = 0;
  }
  if (ixLkUid < 0) {
    ixLkUid = 1;
  }
  if (ixLkSid < 0) {
    ixLkSid = 2;
  }
  if (ixLkProv < 0) {
    ixLkProv = 3;
  }

  var regTargets = dbPlannerReadRegistryLinkTargetsOrdered_(masterSs);
  out.total = regTargets.length;
  var regSet = {};
  var ri;
  for (ri = 0; ri < regTargets.length; ri++) {
    regSet[regTargets[ri].link_key] = true;
  }

  /** @type {Object<string, { sid: string, prov: string, member_code: string, imweb_uid: string }>} */
  var linkByKey = {};
  if (shLinks.getLastRow() >= 2) {
    var lr0 = shLinks.getLastRow();
    var n0 = lr0 - 2 + 1;
    var lv = shLinks.getRange(2, 1, n0, wL).getValues();
    var li;
    for (li = 0; li < lv.length; li++) {
      var rowL = lv[li] || [];
      var mc0 = dbPlannerCellToSheetText_(rowL[ixLkMc]);
      var uid0 = dbPlannerCellToSheetText_(rowL[ixLkUid]);
      var lk0 = dbPlannerLinkKeyFromParts_(mc0, uid0);
      if (!lk0.length) {
        continue;
      }
      linkByKey[lk0] = {
        sid: String(rowL[ixLkSid] != null ? rowL[ixLkSid] : '').trim(),
        prov: String(rowL[ixLkProv] != null ? rowL[ixLkProv] : '').trim(),
        member_code: mc0,
        imweb_uid: uid0
      };
    }
  }

  var keepRows = [];
  var orphanKeys = [];
  var lkScan;
  for (lkScan in linkByKey) {
    if (!Object.prototype.hasOwnProperty.call(linkByKey, lkScan)) {
      continue;
    }
    if (regSet[lkScan]) {
      var keep = linkByKey[lkScan];
      keepRows.push([keep.member_code, keep.imweb_uid, keep.sid, keep.prov]);
    } else {
      orphanKeys.push(lkScan);
    }
  }
  var oi;
  for (oi = 0; oi < orphanKeys.length; oi++) {
    var lkOrphan = orphanKeys[oi];
    var sidO = linkByKey[lkOrphan].sid;
    if (sidO) {
      dbPlannerTrashFileBestEffort_(sidO);
      out.trashedOrphans++;
    }
    delete linkByKey[lkOrphan];
  }
  dbClearDataRows2Plus_(shLinks, wL);
  if (keepRows.length) {
    dbSetValuesFromRow2_(shLinks, keepRows, wL);
  }

  /**
   * @param {string} lk
   * @param {string} mc
   * @param {string} uid
   * @return {{ sid: string, prov: string, member_code: string, imweb_uid: string }|null}
   */
  function findPrevLink_(lk, mc, uid) {
    if (linkByKey[lk]) {
      return linkByKey[lk];
    }
    var k;
    for (k in linkByKey) {
      if (!Object.prototype.hasOwnProperty.call(linkByKey, k)) {
        continue;
      }
      var ent = linkByKey[k];
      if (mc.length && ent.member_code === mc) {
        return ent;
      }
      if (uid.length && ent.imweb_uid === uid) {
        return ent;
      }
    }
    return null;
  }

  /**
   * @param {string} lk
   * @param {string} mc
   * @param {string} uid
   * @param {string} sidW
   * @param {string} provW
   */
  function rememberAndWrite_(lk, mc, uid, sidW, provW) {
    dbPlannerUpsertStudentLinkRow_(shLinks, wL, ixLkMc, ixLkUid, mc, uid, sidW, provW);
    linkByKey[lk] = { sid: sidW, prov: provW, member_code: mc, imweb_uid: uid };
  }

  var folderId = dbPlannerMasterParentFolderId_(masterSs);
  if (!folderId) {
    folderId = dbPmGetMasterParentFolderId_();
  }
  if (!folderId) {
    var base = dbResolveMasterParentFolderId_();
    if (base) {
      folderId = dbGetOrCreateDbSubfolder_(base) || '';
    }
  }

  var ci;
  for (ci = 0; ci < regTargets.length; ci++) {
    if (Date.now() - started >= DB_PLANNER_PROVISION_BUDGET_MS) {
      out.incomplete = true;
      out.processed = ci;
      return out;
    }
    var tgt = regTargets[ci];
    var lk = tgt.link_key;
    var mcW = tgt.member_code;
    var uidW = tgt.imweb_uid;
    var prev = findPrevLink_(lk, mcW, uidW);
    var sid = prev && prev.sid ? prev.sid : '';
    var rangesJson = String(tgt.planner_month_ranges_json != null ? tgt.planner_month_ranges_json : '');
    if (sid.length > 0 && dbDriveSpreadsheetIdIsUsableNow_(sid)) {
      out.reused++;
      out.processed = ci + 1;
      continue;
    }
    var title =
      DB_PLANNER_STUDENT_FILE_TITLE_PREFIX +
      dbPlannerStudentFileTitleSuffix_(tgt.display_name, uidW, mcW, lk);
    var foundId = dbPlannerFindStudentSpreadsheetIdByTitle_(folderId, title);
    var titleHit = foundId;
    if (foundId.length && dbDriveSpreadsheetIdIsUsableNow_(foundId)) {
      try {
        dbPlannerEnsurePersonalTodoSheetsForStudent_(SpreadsheetApp.openById(foundId), rangesJson);
      } catch (eFound) {
        Logger.log(
          'dbPlannerProvisionStudentsFromRegistry_: title open fail ' +
            foundId +
            ' ' +
            (eFound && eFound.message != null ? eFound.message : String(eFound))
        );
        foundId = '';
      }
    } else {
      foundId = '';
    }
    if (foundId.length) {
      if (sid.length && sid !== foundId) {
        dbPlannerTrashFileBestEffort_(sid);
        out.trashedBroken++;
      }
      rememberAndWrite_(lk, mcW, uidW, foundId, nowIso);
      out.reused++;
      out.reusedByTitle++;
      out.processed = ci + 1;
      continue;
    }
    if (titleHit.length) {
      out.provisionErrors++;
      out.processed = ci + 1;
      continue;
    }
    if (sid.length) {
      dbPlannerTrashFileBestEffort_(sid);
      out.trashedBroken++;
    }
    var nid = dbPlannerCreateStudentPlannerSpreadsheet_(masterSs, tgt.display_name, uidW, mcW, lk, rangesJson);
    if (!nid.length) {
      out.provisionErrors++;
      out.processed = ci + 1;
      continue;
    }
    rememberAndWrite_(lk, mcW, uidW, nid, nowIso);
    out.provisioned++;
    out.processed = ci + 1;
  }
  out.processed = regTargets.length;
  out.incomplete = false;
  return out;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {{ member_code: string, imweb_uid: string, link_key: string, display_name: string, planner_month_ranges_json: string }[]}
 */
function dbPlannerReadRegistryLinkTargetsOrdered_(ss) {
  var rows = dbPlannerReadRegistryRows_(ss);
  var out = [];
  var seen = {};
  var i;
  for (i = 0; i < rows.length; i++) {
    var r = rows[i];
    var lk = r.link_key;
    if (!lk.length || seen[lk]) {
      continue;
    }
    seen[lk] = true;
    out.push({
      member_code: r.member_code,
      imweb_uid: r.imweb_uid,
      link_key: lk,
      display_name: String(r.display_name != null ? r.display_name : '').trim(),
      planner_month_ranges_json: String(r.planner_month_ranges_json != null ? r.planner_month_ranges_json : '')
    });
  }
  return out;
}

/**
 * 제작용: 연결된 **모든** 학생 플래너 스프레드시트를 휴지통으로 보내고, 마스터의 `planner_registry`·`planner_student_links` 본문(2행~)을 비운다.
 * 레거시 `planner_member_records` 탭이 있으면 삭제한다.
 *
 * @return {{ ok: true, data: { trashedStudentFiles: number, clearedTabs: string[] } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbPlannerDevFullReset_() {
  var initR = dbInitPlannerMasterSheets_();
  if (initR && initR.error) {
    return { ok: false, error: { code: initR.error.code, message: initR.error.message } };
  }
  var ss = dbPlannerOpenMaster_();
  if (!ss) {
    return {
      ok: false,
      error: { code: 'PLANNER_NOT_CONFIGURED', message: '플래너 마스터를 열 수 없습니다.' }
    };
  }
  var shLinks = ss.getSheetByName(DB_SHEET_PLANNER_STUDENT_LINKS);
  var trashed = 0;
  if (shLinks && shLinks.getLastRow() >= 2) {
    var lrL = shLinks.getLastRow();
    var nL = lrL - 2 + 1;
    var lv = shLinks.getRange(2, 2, nL, 2).getValues();
    var seen = {};
    var lj;
    for (lj = 0; lj < lv.length; lj++) {
      var sid = String(lv[lj][0] != null ? lv[lj][0] : '').trim();
      if (!sid.length || seen[sid]) {
        continue;
      }
      seen[sid] = true;
      dbPlannerTrashFileBestEffort_(sid);
      trashed++;
    }
  }
  var shReg = ss.getSheetByName(DB_SHEET_PLANNER_REGISTRY);
  if (shReg) {
    dbClearDataRows2Plus_(shReg, DB_PLANNER_REGISTRY_HEADERS.length);
  }
  if (shLinks) {
    dbClearDataRows2Plus_(shLinks, DB_PLANNER_STUDENT_LINK_HEADERS.length);
  }
  dbPlannerDeleteLegacyMemberRecordsSheet_(ss);
  return {
    ok: true,
    data: {
      trashedStudentFiles: trashed,
      clearedTabs: [DB_SHEET_PLANNER_REGISTRY, DB_SHEET_PLANNER_STUDENT_LINKS]
    }
  };
}

/**
 * 폐기된 마스터 탭 `planner_member_records` 가 남아 있으면 삭제한다.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function dbPlannerDeleteLegacyCommonCalendarSheet_(ss) {
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_COMMON_CALENDAR);
  if (!sh) {
    return;
  }
  try {
    if (ss.getSheets().length <= 1) {
      Logger.log('dbPlannerDeleteLegacyCommonCalendarSheet_: skip — only sheet left');
      return;
    }
    ss.deleteSheet(sh);
  } catch (e) {
    Logger.log(
      'dbPlannerDeleteLegacyCommonCalendarSheet_: ' + (e && e.message != null ? e.message : String(e))
    );
  }
}

function dbPlannerDeleteLegacyMemberRecordsSheet_(ss) {
  var sh = ss.getSheetByName('planner_member_records');
  if (!sh) {
    return;
  }
  try {
    if (ss.getSheets().length <= 1) {
      Logger.log('dbPlannerDeleteLegacyMemberRecordsSheet_: skip — only sheet left');
      return;
    }
    ss.deleteSheet(sh);
  } catch (e) {
    Logger.log(
      'dbPlannerDeleteLegacyMemberRecordsSheet_: ' + (e && e.message != null ? e.message : String(e))
    );
  }
}

/**
 * registry 한 탭 읽기(헤더 동일 가정).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sheetName
 * @return {{ member_code: string, imweb_uid: string, link_key: string, phone_normalized: string, display_name: string, planner_month_ranges_json: string }[]}
 */
function dbPlannerReadRegistryRowsFromSheet_(ss, sheetName) {
  var sh = ss.getSheetByName(String(sheetName || '').trim());
  if (!sh || sh.getLastRow() < 2) {
    return [];
  }
  var lr = sh.getLastRow();
  var nCols = DB_PLANNER_REGISTRY_HEADERS.length;
  var numRows = lr - 2 + 1;
  if (numRows < 1) {
    return [];
  }
  var ixMc = DB_PLANNER_REGISTRY_HEADERS.indexOf('member_code');
  if (ixMc < 0) ixMc = 0;
  var ixUid = DB_PLANNER_REGISTRY_HEADERS.indexOf('imweb_uid');
  if (ixUid < 0) ixUid = 1;
  var ixPhone = DB_PLANNER_REGISTRY_HEADERS.indexOf('phone_normalized');
  if (ixPhone < 0) ixPhone = 2;
  var ixName = DB_PLANNER_REGISTRY_HEADERS.indexOf('display_name');
  if (ixName < 0) ixName = 3;
  var ixRanges = DB_PLANNER_REGISTRY_HEADERS.indexOf('planner_month_ranges_json');
  var vals = sh.getRange(2, 1, numRows, nCols).getValues();
  var dispVals = sh.getRange(2, 1, numRows, nCols).getDisplayValues();
  var out = [];
  var i;
  for (i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    var rowD = dispVals[i] || [];
    var mc = dbPlannerCellToSheetText_(row[ixMc]);
    var uid = dbPlannerCellToSheetText_(row[ixUid]);
    var lk = dbPlannerLinkKeyFromParts_(mc, uid);
    var ph = dbPlannerNormalizePhoneKR_(row[ixPhone], rowD[ixPhone]);
    var dn = dbPlannerCellToSheetText_(row[ixName]);
    var rangesCell = ixRanges >= 0 ? dbPlannerCellToSheetText_(row[ixRanges]) : '';
    if (!ph.length) {
      continue;
    }
    out.push({
      member_code: mc,
      imweb_uid: uid,
      link_key: lk,
      phone_normalized: ph,
      display_name: dn,
      planner_month_ranges_json: rangesCell
    });
  }
  return out;
}

/**
 * registry 전체(회원 탭 우선) — `planner_registry` + `planner_registry_manual` 합집합.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {{ member_code: string, imweb_uid: string, link_key: string, phone_normalized: string, display_name: string, planner_month_ranges_json: string }[]}
 */
function dbPlannerReadRegistryRows_(ss) {
  var mainRows = dbPlannerReadRegistryRowsFromSheet_(ss, DB_SHEET_PLANNER_REGISTRY);
  var manualRows = dbPlannerReadRegistryRowsFromSheet_(ss, DB_SHEET_PLANNER_REGISTRY_MANUAL);
  /** @type {Object<string, boolean>} */
  var seen = {};
  var out = [];
  var i;
  for (i = 0; i < mainRows.length; i++) {
    var r0 = mainRows[i];
    if (!r0 || !r0.link_key || seen[r0.link_key]) continue;
    seen[r0.link_key] = true;
    out.push(r0);
  }
  for (i = 0; i < manualRows.length; i++) {
    var r1 = manualRows[i];
    if (!r1 || !r1.link_key || seen[r1.link_key]) continue;
    seen[r1.link_key] = true;
    out.push(r1);
  }
  return out;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {{ event_id: string, start_date: string, end_date: string, title: string, description: string, category: string, sort_key: number }[]}
 */
function dbPlannerReadCommonEvents_(ss) {
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_COMMON_CALENDAR);
  if (!sh || sh.getLastRow() < 2) {
    return [];
  }
  var lr = sh.getLastRow();
  var nCols = DB_PLANNER_COMMON_CALENDAR_HEADERS.length;
  var numRows = lr - 2 + 1;
  if (numRows < 1) {
    return [];
  }
  var vals = sh.getRange(2, 1, numRows, nCols).getValues();
  var out = [];
  var i;
  for (i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    var sk = row[6];
    var skn = sk != null && String(sk).trim() !== '' ? Number(sk) : 0;
    if (!isFinite(skn)) {
      skn = 0;
    }
    out.push({
      event_id: String(row[0] != null ? row[0] : '').trim(),
      start_date: String(row[1] != null ? row[1] : '').trim(),
      end_date: String(row[2] != null ? row[2] : '').trim(),
      title: String(row[3] != null ? row[3] : '').trim(),
      description: String(row[4] != null ? row[4] : '').trim(),
      category: String(row[5] != null ? row[5] : '').trim(),
      sort_key: skn
    });
  }
  return out;
}

/**
 * 마스터 `planner_curriculum_courses` 전체.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object[]}
 */
function dbPlannerReadCurriculumCourses_(ss) {
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_CURRICULUM_COURSES);
  if (!sh || sh.getLastRow() < 2) {
    return [];
  }
  var headers = DB_PLANNER_CURRICULUM_COURSE_HEADERS;
  var nCols = headers.length;
  var lr = sh.getLastRow();
  var n = lr - 2 + 1;
  var vals = sh.getRange(2, 1, n, nCols).getValues();
  var out = [];
  var i;
  var ixCid = headers.indexOf('course_id');
  var ixSub = headers.indexOf('subject');
  var ixInst = headers.indexOf('instructor');
  var ixName = headers.indexOf('course_name');
  var ixLink = headers.indexOf('link_url');
  if (ixCid < 0) {
    ixCid = 0;
  }
  if (ixSub < 0) {
    ixSub = 1;
  }
  if (ixInst < 0) {
    ixInst = 2;
  }
  if (ixName < 0) {
    ixName = 3;
  }
  if (ixLink < 0) {
    ixLink = 4;
  }
  for (i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    out.push({
      course_id: dbPlannerCellToSheetInt_(row[ixCid]),
      subject: dbPlannerCellToSheetText_(row[ixSub]),
      instructor: dbPlannerCellToSheetText_(row[ixInst]),
      course_name: dbPlannerCellToSheetText_(row[ixName]),
      link_url: dbPlannerCellToSheetText_(row[ixLink])
    });
  }
  return out;
}

/**
 * 마스터 `planner_curriculum_lectures` 전체 (`lecture_no` 오름차순).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object[]}
 */
function dbPlannerReadCurriculumLectures_(ss) {
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_CURRICULUM_LECTURES);
  if (!sh || sh.getLastRow() < 2) {
    return [];
  }
  var headers = DB_PLANNER_CURRICULUM_LECTURE_HEADERS;
  var nCols = headers.length;
  var lr = sh.getLastRow();
  var n = lr - 2 + 1;
  var vals = sh.getRange(2, 1, n, nCols).getValues();
  var ixLid = headers.indexOf('lecture_id');
  var ixCid = headers.indexOf('course_id');
  var ixNo = headers.indexOf('lecture_no');
  var ixName = headers.indexOf('lecture_name');
  var ixDur = headers.indexOf('duration');
  if (ixLid < 0) {
    ixLid = 0;
  }
  if (ixCid < 0) {
    ixCid = 1;
  }
  if (ixNo < 0) {
    ixNo = 2;
  }
  if (ixName < 0) {
    ixName = 3;
  }
  if (ixDur < 0) {
    ixDur = 4;
  }
  var out = [];
  var i;
  for (i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    out.push({
      lecture_id: dbPlannerCellToSheetInt_(row[ixLid]),
      course_id: dbPlannerCellToSheetInt_(row[ixCid]),
      lecture_no: dbPlannerCellToSheetInt_(row[ixNo]),
      lecture_name: dbPlannerCellToSheetText_(row[ixName]),
      duration: dbPlannerCellToDurationMinutes_(row[ixDur])
    });
  }
  out.sort(function (a, b) {
    var ca = Number(a.course_id);
    var cb = Number(b.course_id);
    if (ca !== cb) {
      return (isFinite(ca) ? ca : 0) - (isFinite(cb) ? cb : 0);
    }
    return (Number(a.lecture_no) || 0) - (Number(b.lecture_no) || 0);
  });
  return out;
}

/**
 * 커리큘럼 캐시 무효화용 — 강좌·강의 데이터 행 수 (`courses:lectures`).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {string}
 */
function dbPlannerCurriculumVersion_(ss) {
  var shC = ss.getSheetByName(DB_SHEET_PLANNER_CURRICULUM_COURSES);
  var shL = ss.getSheetByName(DB_SHEET_PLANNER_CURRICULUM_LECTURES);
  var cr = 0;
  var lr = 0;
  if (shC && shC.getLastRow() >= 2) {
    cr = shC.getLastRow() - 1;
  }
  if (shL && shL.getLastRow() >= 2) {
    lr = shL.getLastRow() - 1;
  }
  return String(cr) + ':' + String(lr);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {{ courses: Object[], lectures: Object[] }}
 */
function dbPlannerReadCurriculum_(ss) {
  return {
    courses: dbPlannerReadCurriculumCourses_(ss),
    lectures: dbPlannerReadCurriculumLectures_(ss)
  };
}

/**
 * 마스터 `planner_curriculum_lectures.duration` 열 보정 — init·수동 실행용(read 경로에서는 호출하지 않음).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function dbPlannerFixCurriculumLectureDurationOnMaster_(ss) {
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_CURRICULUM_LECTURES);
  if (sh) {
    dbPlannerFixCurriculumLectureDurationColumn_(sh);
  }
}

/**
 * 플래너 UI — 커리큘럼 카탈로그만 (bootstrap과 분리 · sessionStorage 캐시용).
 * @param {Object} [_body]
 * @return {Object}
 */
function dbPlannerCurriculum_(body) {
  body = body || {};
  var ss = dbPlannerOpenMaster_();
  if (!ss) {
    return {
      ok: false,
      error: { code: 'PLANNER_NOT_CONFIGURED', message: '플래너 마스터가 연결되지 않았습니다.' }
    };
  }
  var version = dbPlannerCurriculumVersion_(ss);
  return {
    ok: true,
    data: {
      version: version,
      curriculum: dbPlannerReadCurriculum_(ss)
    }
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} linkKey `member_code` 우선, 없으면 `imweb_uid` 와 동일 규칙
 * @return {string}
 */
function dbPlannerStudentSpreadsheetId_(ss, linkKey) {
  var want = String(linkKey != null ? linkKey : '').trim();
  if (!want.length) {
    return '';
  }
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_STUDENT_LINKS);
  if (!sh || sh.getLastRow() < 2) {
    return '';
  }
  var wL = DB_PLANNER_STUDENT_LINK_HEADERS.length;
  var ixLkMc = DB_PLANNER_STUDENT_LINK_HEADERS.indexOf('member_code');
  var ixLkUid = DB_PLANNER_STUDENT_LINK_HEADERS.indexOf('imweb_uid');
  var ixLkSid = DB_PLANNER_STUDENT_LINK_HEADERS.indexOf('student_spreadsheet_id');
  if (ixLkMc < 0) {
    ixLkMc = 0;
  }
  if (ixLkUid < 0) {
    ixLkUid = 1;
  }
  if (ixLkSid < 0) {
    ixLkSid = 2;
  }
  var lr = sh.getLastRow();
  var numRows = lr - 2 + 1;
  if (numRows < 1) {
    return '';
  }
  var vals = sh.getRange(2, 1, numRows, wL).getValues();
  var i;
  for (i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    var mc = dbPlannerCellToSheetText_(row[ixLkMc]);
    var uid = dbPlannerCellToSheetText_(row[ixLkUid]);
    if (dbPlannerLinkKeyFromParts_(mc, uid) === want) {
      return String(row[ixLkSid] != null ? row[ixLkSid] : '').trim();
    }
    if (mc === want || uid === want) {
      return String(row[ixLkSid] != null ? row[ixLkSid] : '').trim();
    }
  }
  return '';
}

/**
 * 월 탭 `planner_personal_todos_YYYY_MM` 전열 → bootstrap `personal` (헤더 키 객체 배열).
 * 레거시 제한 스텁 형태(`task_id` 없음)는 과거 프론트 호환용으로 사용하지 않음 ― 항상 헤더 키를 채운다.
 * @param {string} spreadsheetId
 * @param {string} [yearMonthOpt] `yyyy-MM` · 생략 시 서울 이번 달 탭 `planner_personal_todos_YYYY_MM`
 * @return {Object[]}
 */
function dbPlannerReadPersonalStub_(spreadsheetId, yearMonthOpt) {
  var sid = String(spreadsheetId != null ? spreadsheetId : '').trim();
  if (!sid.length || !dbDriveSpreadsheetIdIsUsableNow_(sid)) {
    return [];
  }
  try {
    var ss = SpreadsheetApp.openById(sid);
    var tab = dbPlannerPersonalTodosSheetNameFromYearMonthStr_(yearMonthOpt != null ? yearMonthOpt : '');
    var sh = ss.getSheetByName(tab);
    if (!sh) {
      sh = ss.getSheetByName(DB_SHEET_PLANNER_PERSONAL_TODOS);
    }
    if (!sh || sh.getLastRow() < 2) {
      return [];
    }
    var lr = sh.getLastRow();
    var headers = DB_PLANNER_PERSONAL_TODO_HEADERS;
    var nCols = headers.length;
    var n = lr - 2 + 1;
    var vals = sh.getRange(2, 1, n, nCols).getValues();
    var dateKeys = {
      date: true,
      created_date: true,
      updated_date: true
    };
    var out = [];
    var i;
    for (i = 0; i < vals.length; i++) {
      var row = vals[i] || [];
      /** @type {Record<string, (string|number)>} */
      var obj = {};
      var j;
      for (j = 0; j < headers.length; j++) {
        var key = headers[j];
        var cell = row[j];
        if (key === 'task_id') {
          if (typeof cell === 'number' && isFinite(cell)) {
            obj.task_id = cell;
          } else if (cell != null && String(cell).trim() !== '') {
            var tn = Number(cell);
            var ts = String(cell).trim();
            obj.task_id = isFinite(tn) && String(tn) === ts ? tn : ts;
          } else {
            obj.task_id = '';
          }
        } else if (key === 'sort_key') {
          var skn = cell != null && String(cell).trim() !== '' ? Number(cell) : 0;
          obj.sort_key = isFinite(skn) ? skn : 0;
        } else if (dateKeys[key]) {
          obj[key] = dbPlannerCellToYmdSeoul_(cell);
        } else {
          obj[key] = dbPlannerCellToSheetText_(cell);
        }
      }
      var titleStr = String(obj.title != null ? obj.title : '').trim();
      if (!titleStr.length) {
        obj.title = '(제목 없음)';
      }
      out.push(obj);
    }
    out.sort(function (a, b) {
      var da = String((a && a.date) || '');
      var db = String((b && b.date) || '');
      if (da !== db) {
        return da < db ? -1 : da > db ? 1 : 0;
      }
      return (Number(a.sort_key) || 0) - (Number(b.sort_key) || 0);
    });
    return out;
  } catch (e) {
    Logger.log('dbPlannerReadPersonalStub_: ' + (e && e.message != null ? e.message : String(e)));
    return [];
  }
}

/**
 * 본문·쿼리에서 `year_month` 정규화. `yyyy-MM` 만 허용, 실패 시 `''`.
 * @param {Object} body
 * @return {string}
 */
function dbPlannerNormalizeYearMonthFromBody_(body) {
  body = body || {};
  var raw = String(body.year_month != null ? body.year_month : body.yearMonth != null ? body.yearMonth : '').trim();
  if (!raw.length) {
    return '';
  }
  var m = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) {
    return '';
  }
  var mo = Number(m[2]);
  if (!isFinite(mo) || mo < 1 || mo > 12) {
    return '';
  }
  var mm = mo < 10 ? '0' + mo : String(mo);
  return m[1] + '-' + mm;
}

/**
 * 플래너 어드민 모드 암호 검증 — 정적 비교만 (`DB_PLANNER_ADMIN_UNLOCK_SECRET`).
 * @param {Object} e `parameter.admin_secret` / `parameter.as` 또는 POST `{ admin_secret }`
 * @return {{ ok: true, data: { outcome: 'ok'|'fail' } }}
 */
function dbPlannerAdminVerify_(e) {
  e = e || {};
  var secret = '';
  if (e.parameter && typeof e.parameter === 'object') {
    secret = String(
      e.parameter.admin_secret != null
        ? e.parameter.admin_secret
        : e.parameter.as != null
          ? e.parameter.as
          : ''
    ).trim();
  }
  if (!secret.length && e.admin_secret != null) {
    secret = String(e.admin_secret).trim();
  }
  var expected =
    typeof DB_PLANNER_ADMIN_UNLOCK_SECRET !== 'undefined' ? String(DB_PLANNER_ADMIN_UNLOCK_SECRET) : 'admin_solpath';
  if (secret.length && secret === expected) {
    return { ok: true, data: { outcome: 'ok' } };
  }
  return { ok: true, data: { outcome: 'fail' } };
}

/**
 * @param {Object} body
 * @return {Object}
 */
function dbPlannerMatch_(body) {
  body = body || {};
  var phone = dbPlannerPhoneFromSegments_(body.phoneSegments);
  var nameIn = String(body.name != null ? body.name : '').trim();
  var ss = dbPlannerOpenMaster_();
  if (!ss) {
    return {
      ok: false,
      error: { code: 'PLANNER_NOT_CONFIGURED', message: '플래너 마스터가 아직 연결되지 않았습니다. initPlannerMasterSheets 후 SHEETS_PLANNER_MASTER_ID를 확인하세요.' }
    };
  }
  if (!phone.length) {
    return { ok: true, data: { outcome: 'bad_phone', needName: false, memberCode: null, displayName: null } };
  }
  var rows = dbPlannerReadRegistryRows_(ss);
  var hits = [];
  var hi;
  for (hi = 0; hi < rows.length; hi++) {
    if (rows[hi].phone_normalized === phone) {
      hits.push(rows[hi]);
    }
  }
  var outcome;
  var linkKey = '';
  var displayName = null;
  var needName = false;
  if (hits.length === 0) {
    outcome = 'no_match';
  } else if (hits.length === 1) {
    outcome = 'matched';
    linkKey = hits[0].link_key;
    displayName = hits[0].display_name || null;
  } else {
    if (!nameIn.length) {
      outcome = 'need_name';
      needName = true;
    } else {
      var want = dbPlannerNameNorm_(nameIn);
      var narrowed = [];
      var hj;
      for (hj = 0; hj < hits.length; hj++) {
        if (dbPlannerNameNorm_(hits[hj].display_name) === want) {
          narrowed.push(hits[hj]);
        }
      }
      if (narrowed.length === 1) {
        outcome = 'matched';
        linkKey = narrowed[0].link_key;
        displayName = narrowed[0].display_name || null;
      } else {
        outcome = 'name_mismatch';
      }
    }
  }
  return {
    ok: true,
    data: {
      outcome: outcome,
      needName: needName,
      link_key: linkKey.length ? linkKey : null,
      displayName: displayName
    }
  };
}

/**
 * `phone_normalized` 만으로 화면용 번호 (시트 열 없음).
 * @param {string} normalized
 * @return {string}
 */
function dbPlannerPhoneDisplayFromNormalized_(normalized) {
  var d = String(normalized != null ? normalized : '').replace(/\D/g, '');
  if (d.length === 11 && d.indexOf('010') === 0) {
    return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
  }
  if (d.length === 10 && d.indexOf('10') === 0) {
    return '0' + d.slice(0, 2) + '-' + d.slice(2, 6) + '-' + d.slice(6);
  }
  return String(normalized != null ? normalized : '').trim();
}

/**
 * 전화·link_key로 registry 행 찾기 (전열 값 포함).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} linkKeyReq
 * @param {string} phone `dbPlannerNormalizePhoneFromSheet_` 결과
 * @return {{ hits: { sheetName: string, link_key: string, display_name: string, row: Object[], rowD: Object[], rowIndex: number }[], picked: { sheetName: string, link_key: string, display_name: string, row: Object[], rowD: Object[], rowIndex: number }|null }}
 */
function dbPlannerRegistryMatchForPhoneAndLink_(ss, linkKeyReq, phone) {
  var headers = DB_PLANNER_REGISTRY_HEADERS;
  var ixMc = headers.indexOf('member_code');
  var ixUid = headers.indexOf('imweb_uid');
  var ixPhone = headers.indexOf('phone_normalized');
  var ixName = headers.indexOf('display_name');
  if (ixMc < 0) ixMc = 0;
  if (ixUid < 0) ixUid = 1;
  if (ixPhone < 0) ixPhone = 2;
  if (ixName < 0) ixName = 3;
  var nCols = headers.length;

  /** @type {{ sheetName: string, link_key: string, display_name: string, row: Object[], rowD: Object[], rowIndex: number }[]} */
  var hits = [];
  var picked = null;

  var sheetNames = [DB_SHEET_PLANNER_REGISTRY, DB_SHEET_PLANNER_REGISTRY_MANUAL];
  var si;
  for (si = 0; si < sheetNames.length; si++) {
    var sh = ss.getSheetByName(sheetNames[si]);
    if (!sh || sh.getLastRow() < 2) {
      continue;
    }
    var lr = sh.getLastRow();
    var numRows = lr - 2 + 1;
    if (numRows < 1) {
      continue;
    }
    var vals = sh.getRange(2, 1, numRows, nCols).getValues();
    var dispVals = sh.getRange(2, 1, numRows, nCols).getDisplayValues();
    var i;
    for (i = 0; i < vals.length; i++) {
      var row = vals[i] || [];
      var rowD = dispVals[i] || [];
      var mc = dbPlannerCellToSheetText_(row[ixMc]);
      var uid = dbPlannerCellToSheetText_(row[ixUid]);
      var lk = dbPlannerLinkKeyFromParts_(mc, uid);
      var ph = dbPlannerNormalizePhoneKR_(row[ixPhone], rowD[ixPhone]);
      if (!ph.length) continue;
      if (ph !== phone) continue;
      var dn = dbPlannerCellToSheetText_(row[ixName]);
      var hit = { sheetName: sheetNames[si], link_key: lk, display_name: dn, row: row, rowD: rowD, rowIndex: 2 + i };
      hits.push(hit);
      if (!picked && lk === linkKeyReq) {
        picked = hit;
      }
    }
    if (picked) {
      // 회원 탭 우선: registry에서 찾으면 manual은 더 보지 않는다.
      break;
    }
  }
  return { hits: hits, picked: picked };
}

/**
 * registry 한 행 → bootstrap `student_profile` (API 키만).
 * @param {Object[]} row `getValues` 한 줄
 * @param {Object[]} rowD `getDisplayValues` 한 줄
 * @return {Object}
 */
function dbPlannerStudentProfileFromRegistryCells_(row, rowD) {
  var headers = DB_PLANNER_REGISTRY_HEADERS;
  /** @param {number} ix */
  function cell(ix) {
    if (ix < 0) {
      return '';
    }
    return dbPlannerCellToSheetText_(row[ix]);
  }
  var ixPhone = headers.indexOf('phone_normalized');
  var phNorm =
    ixPhone >= 0 ? dbPlannerNormalizePhoneKR_(row[ixPhone], rowD && rowD[ixPhone] != null ? rowD[ixPhone] : null) : '';
  return {
    display_name: cell(headers.indexOf('display_name')),
    track: cell(headers.indexOf('track')),
    admission_type: cell(headers.indexOf('admission_type')),
    prev_university: cell(headers.indexOf('prev_university')),
    prev_major_gpa: cell(headers.indexOf('prev_major_gpa')),
    goal_university: cell(headers.indexOf('goal_university')),
    goal_department: cell(headers.indexOf('goal_department')),
    study_status: cell(headers.indexOf('study_status')),
    plan_features: cell(headers.indexOf('plan_features')),
    subject_guides_json: cell(headers.indexOf('subject_guides_json')),
    monthly_plan_notices_json: cell(headers.indexOf('monthly_plan_notices_json')),
    phone_display: dbPlannerPhoneDisplayFromNormalized_(phNorm)
  };
}

/**
 * 수기 비회원용 `member_code` — `manual_yyyyMMdd_NNNNNN` (registry 전체와 중복 없음).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {string}
 */
function dbPlannerGenerateManualMemberCode_(ss) {
  /** @type {Object<string, boolean>} */
  var seen = {};
  var rows = dbPlannerReadRegistryRows_(ss);
  var ri;
  for (ri = 0; ri < rows.length; ri++) {
    var r0 = rows[ri];
    if (!r0) {
      continue;
    }
    if (r0.member_code) {
      seen[String(r0.member_code)] = true;
    }
    if (r0.imweb_uid) {
      seen[String(r0.imweb_uid)] = true;
    }
    if (r0.link_key) {
      seen[String(r0.link_key)] = true;
    }
  }
  var day = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
  var attempt;
  for (attempt = 0; attempt < 40; attempt++) {
    var rnd = String(Math.floor(Math.random() * 1e6));
    while (rnd.length < 6) {
      rnd = '0' + rnd;
    }
    var code = 'manual_' + day + '_' + rnd;
    if (!seen[code]) {
      return code;
    }
  }
  return 'manual_' + String(Date.now()) + '_' + String(Math.floor(Math.random() * 1e6));
}

/**
 * 관리자 — `planner_registry_manual`에 학생 1명 추가 + 학생 파일 프로비저닝.
 * @param {Object} body `{ display_name, phoneSegments }`
 * @return {Object}
 */
function dbPlannerRegistryManualCreate_(body) {
  body = body || {};
  var displayName = String(
    body.display_name != null ? body.display_name : body.name != null ? body.name : ''
  ).trim();
  var phone = dbPlannerPhoneFromSegments_(body.phoneSegments);
  if (!displayName.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: '학생 이름을 입력해 주세요.' } };
  }
  if (!phone.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: '휴대전화를 11자리(010…)로 입력해 주세요.' } };
  }
  var ss = dbPlannerOpenMaster_();
  if (!ss) {
    return {
      ok: false,
      error: { code: 'PLANNER_NOT_CONFIGURED', message: '플래너 마스터가 연결되지 않았습니다.' }
    };
  }
  dbPlannerFixRegistryPhoneColumnOnMaster_(ss);
  var existing = dbPlannerReadRegistryRows_(ss);
  var wantName = dbPlannerNameNorm_(displayName);
  var dupPhone = 0;
  var ei;
  for (ei = 0; ei < existing.length; ei++) {
    var ex = existing[ei];
    if (!ex || ex.phone_normalized !== phone) {
      continue;
    }
    dupPhone++;
    if (dbPlannerNameNorm_(ex.display_name) === wantName) {
      return {
        ok: false,
        error: { code: 'DUPLICATE_STUDENT', message: '같은 이름·전화로 이미 등록된 학생입니다.' }
      };
    }
  }
  var memberCode = dbPlannerGenerateManualMemberCode_(ss);
  var nowIso = Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss");
  var sh = dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_PLANNER_REGISTRY_MANUAL, DB_PLANNER_REGISTRY_HEADERS);
  var nCol = DB_PLANNER_REGISTRY_HEADERS.length;
  var nextRow = sh.getLastRow() < 2 ? 2 : sh.getLastRow() + 1;
  var row = [
    memberCode,
    '',
    phone,
    displayName,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    nowIso
  ];
  sh.getRange(nextRow, 1, 1, nCol).setValues([row]);
  sh.getRange(nextRow, 1, 1, nCol).setNumberFormat('@');
  dbPlannerApplyRegistryPhoneColumnFormat_(sh);
  dbPlannerFixRegistryPhoneColumn_(sh);
  var prov = dbPlannerProvisionStudentsFromRegistry_(ss);
  if (prov.provisionErrors > 0 && prov.provisioned === 0 && prov.reused === 0) {
    return {
      ok: false,
      error: {
        code: 'PLANNER_PROVISION_FAILED',
        message: '레지스트리에는 추가했으나 학생 플래너 파일을 만들지 못했습니다. Drive 폴더·권한을 확인하세요.'
      }
    };
  }
  return {
    ok: true,
    data: {
      member_code: memberCode,
      link_key: memberCode,
      display_name: displayName,
      phone_normalized: phone,
      phone_display: dbPlannerPhoneDisplayFromNormalized_(phone),
      duplicate_phone_count: dupPhone,
      provisioned: prov.provisioned,
      reused_student_file: prov.reused
    }
  };
}

/**
 * 플래너 UI — 본문에 **들어 있는 프로필 키만** registry에 반영.
 * 월 상담기록은 `monthly_plan_notices_patch`(달 → 본문)만 받아 기존 칸에 merge — 보내지 않은 달은 건드리지 않는다.
 * @param {Object} body
 * @return {Object}
 */
function dbPlannerRegistryProfileSave_(body) {
  body = body || {};
  var phone = dbPlannerPhoneFromSegments_(body.phoneSegments);
  var nameIn = String(body.name != null ? body.name : '').trim();
  var linkKeyReq = String(
    body.linkKey != null ? body.linkKey : body.link_key != null ? body.link_key : body.memberCode != null ? body.memberCode : ''
  ).trim();
  var profIn = body.student_profile && typeof body.student_profile === 'object' ? body.student_profile : null;
  var monthlyPatch = dbPlannerParseJsonObjectArg_(body.monthly_plan_notices_patch);
  var ss = dbPlannerOpenMaster_();
  if (!ss) {
    return {
      ok: false,
      error: { code: 'PLANNER_NOT_CONFIGURED', message: '플래너 마스터가 연결되지 않았습니다.' }
    };
  }
  if (!phone.length || !linkKeyReq.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: '전화·link_key가 필요합니다.' } };
  }
  if (!profIn && !(monthlyPatch && Object.keys(monthlyPatch).length)) {
    return {
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'student_profile 또는 monthly_plan_notices_patch가 필요합니다.' }
    };
  }
  var reg = dbPlannerRegistryMatchForPhoneAndLink_(ss, linkKeyReq, phone);
  var hits = reg.hits;
  var pickedHit = reg.picked;
  if (!pickedHit) {
    return { ok: false, error: { code: 'PLANNER_VERIFY_FAILED', message: '회원 정보를 다시 확인할 수 없습니다.' } };
  }
  if (hits.length > 1) {
    if (dbPlannerNameNorm_(nameIn) !== dbPlannerNameNorm_(pickedHit.display_name)) {
      return { ok: false, error: { code: 'PLANNER_VERIFY_FAILED', message: '이름이 목록과 일치하지 않습니다.' } };
    }
  }
  var sh = ss.getSheetByName(String(pickedHit.sheetName || DB_SHEET_PLANNER_REGISTRY));
  if (!sh) {
    return { ok: false, error: { code: 'PLANNER_NOT_CONFIGURED', message: 'planner_registry 탭이 없습니다.' } };
  }
  var rowIx = pickedHit.rowIndex;
  var headers = DB_PLANNER_REGISTRY_HEADERS;
  var keys = [
    'display_name',
    'track',
    'admission_type',
    'prev_university',
    'prev_major_gpa',
    'goal_university',
    'goal_department',
    'study_status',
    'plan_features',
    'subject_guides_json'
  ];
  var monCol = 0;
  var mergedMonthly = null;
  if (monthlyPatch && Object.keys(monthlyPatch).length) {
    monCol = headers.indexOf('monthly_plan_notices_json') + 1;
    if (monCol > 0) {
      mergedMonthly = dbPlannerMergeMonthlyNoticesCell_(sh.getRange(rowIx, monCol).getValue(), monthlyPatch);
      if (mergedMonthly == null) {
        return {
          ok: false,
          error: {
            code: 'PLANNER_MONTHLY_NOTICES_CORRUPT',
            message: '기존 월 상담기록(JSON)을 읽지 못해 아무것도 저장하지 않았습니다. 시트 값을 확인해 주세요.'
          }
        };
      }
    }
  }
  var written = 0;
  var ki;
  for (ki = 0; ki < keys.length; ki++) {
    var key = keys[ki];
    if (!profIn || !Object.prototype.hasOwnProperty.call(profIn, key)) {
      continue;
    }
    var col = headers.indexOf(key) + 1;
    if (col < 1) {
      continue;
    }
    var v = profIn[key] != null ? String(profIn[key]) : '';
    if (key === 'subject_guides_json') {
      v = dbPlannerNormalizeRegistryJsonObjectCell_(v);
    }
    if (dbPlannerWriteRegistryCellIfChanged_(sh, rowIx, col, v)) {
      written++;
    }
  }
  if (mergedMonthly != null && monCol > 0) {
    if (dbPlannerWriteRegistryCellIfChanged_(sh, rowIx, monCol, mergedMonthly)) {
      written++;
    }
  }
  return { ok: true, data: { written: written } };
}

/**
 * 값이 같으면 쓰지 않는다 (같은 값 재기록으로 시트 버전 기록이 늘어나는 것 방지).
 * @param {Object} sheet
 * @param {number} rowIx
 * @param {number} col
 * @param {string} value
 * @return {boolean} 실제로 쓴 경우 `true`
 */
function dbPlannerWriteRegistryCellIfChanged_(sheet, rowIx, col, value) {
  var cell = sheet.getRange(rowIx, col);
  var prev = cell.getValue();
  if (String(prev != null ? prev : '') === String(value != null ? value : '')) {
    return false;
  }
  cell.setValue(value);
  return true;
}

/**
 * 기존 `monthly_plan_notices_json` + 이번에 고친 달만 merge. 요청에 없는 달은 그대로 둔다.
 * 기존 값이 있는데 객체 JSON이 아니면 `null` — 다른 달을 잃지 않도록 저장하지 않는다.
 * @param {*} rawCell
 * @param {Object} patch `yyyy-MM` → 본문
 * @return {string|null}
 */
function dbPlannerMergeMonthlyNoticesCell_(rawCell, patch) {
  var base = {};
  var s = String(rawCell != null ? rawCell : '').trim();
  if (s.length) {
    var parsed = null;
    try {
      parsed = JSON.parse(s);
    } catch (e) {
      return null;
    }
    if (!parsed || typeof parsed !== 'object' || Object.prototype.toString.call(parsed) === '[object Array]') {
      return null;
    }
    base = parsed;
  }
  var ks = Object.keys(patch);
  var i;
  for (i = 0; i < ks.length; i++) {
    var ym = String(ks[i] != null ? ks[i] : '').trim();
    if (!ym.length) {
      continue;
    }
    base[ym] = patch[ks[i]] != null ? String(patch[ks[i]]) : '';
  }
  return JSON.stringify(base);
}

/**
 * 객체 또는 JSON 문자열 인자 → 객체 (배열·파싱 실패는 `null`).
 * @param {*} raw
 * @return {Object|null}
 */
function dbPlannerParseJsonObjectArg_(raw) {
  if (raw && typeof raw === 'object' && Object.prototype.toString.call(raw) !== '[object Array]') {
    return raw;
  }
  var s = String(raw != null ? raw : '').trim();
  if (!s.length) {
    return null;
  }
  try {
    var o = JSON.parse(s);
    if (!o || typeof o !== 'object' || Object.prototype.toString.call(o) === '[object Array]') {
      return null;
    }
    return o;
  } catch (e) {
    return null;
  }
}

/**
 * registry JSON 열 — 객체 JSON 문자열만 허용(빈 값 → `{}`).
 * @param {string} raw
 * @return {string}
 */
function dbPlannerNormalizeRegistryJsonObjectCell_(raw) {
  var s = String(raw != null ? raw : '').trim();
  if (!s.length) {
    return '{}';
  }
  try {
    var o = JSON.parse(s);
    if (!o || typeof o !== 'object' || Object.prototype.toString.call(o) === '[object Array]') {
      return '{}';
    }
    return JSON.stringify(o);
  } catch (e) {
    return '{}';
  }
}

/**
 * 페이로드 todo 한 줄 → 시트 1행 (`DB_PLANNER_PERSONAL_TODO_HEADERS` 순서).
 * @param {Object} raw
 * @param {string} todayYmd 서울 `yyyy-MM-dd`
 * @return {Array}
 */
function dbPlannerPersonalTodoRowFromPayload_(raw, todayYmd) {
  var o = raw || {};
  var tidStr = o.task_id != null ? String(o.task_id).trim() : '';
  var taskCell = '';
  if (tidStr.length) {
    var tn = Number(tidStr);
    taskCell = isFinite(tn) && String(tn) === tidStr ? tn : tidStr;
  }
  var title = String(o.title != null ? o.title : '').trim() || '(제목 없음)';
  var planDate = String(o.date != null ? o.date : '').trim();
  var cat = String(o.category != null ? o.category : '').trim() || 'misc';
  var lec = String(o.lecture_id != null ? o.lecture_id : '');
  var ts = String(o.timeline_slots != null ? o.timeline_slots : '').trim() || '[]';
  var sk = o.sort_key != null && String(o.sort_key).trim() !== '' ? Number(o.sort_key) : 0;
  if (!isFinite(sk)) {
    sk = 0;
  }
  var mark = String(o.mark != null ? o.mark : '').trim() || 'none';
  var okMark = { none: true, circle: true, triangle: true, x: true };
  if (!okMark[mark]) {
    mark = 'none';
  }
  var traceDates = String(o.trace_dates != null ? o.trace_dates : '').trim();
  if (!traceDates.length) {
    traceDates = '[]';
  }
  var today = String(todayYmd != null ? todayYmd : '').trim();
  var cDate = String(o.created_date != null ? o.created_date : '').trim();
  if (!cDate.length && o.created_at != null) {
    cDate = String(o.created_at).trim().slice(0, 10);
  }
  if (!cDate.length) {
    cDate = today;
  }
  return [taskCell, title, planDate, cat, lec, ts, sk, mark, traceDates, cDate, today];
}

/**
 * 마스터 커리큘럼에 있는 `lecture_id` 집합.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object<string, boolean>}
 */
function dbPlannerCurriculumLectureIdSet_(ss) {
  var lectures = dbPlannerReadCurriculumLectures_(ss);
  var set = {};
  var i;
  for (i = 0; i < lectures.length; i++) {
    var L = lectures[i];
    if (!L) {
      continue;
    }
    var lid = L.lecture_id != null ? String(L.lecture_id).trim() : '';
    if (lid.length) {
      set[lid] = true;
    }
  }
  return set;
}

/**
 * `CacheService` — curriculum `version` 키당 lecture_id 집합 (apply sanitize용).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object<string, boolean>}
 */
function dbPlannerCurriculumLectureIdSetCached_(ss) {
  var version = dbPlannerCurriculumVersion_(ss);
  var cache = CacheService.getScriptCache();
  var cacheKey = 'pl_lec_ids_v1_' + version;
  var hit = cache.get(cacheKey);
  if (hit != null && String(hit).length) {
    try {
      var parsed = JSON.parse(String(hit));
      if (Object.prototype.toString.call(parsed) === '[object Array]') {
        /** @type {Object<string, boolean>} */
        var setHit = {};
        var hi;
        for (hi = 0; hi < parsed.length; hi++) {
          var id0 = String(parsed[hi] != null ? parsed[hi] : '').trim();
          if (id0.length) {
            setHit[id0] = true;
          }
        }
        return setHit;
      }
    } catch (cacheErr) {
      Logger.log('dbPlannerCurriculumLectureIdSetCached_: cache parse failed');
    }
  }
  var set = dbPlannerCurriculumLectureIdSet_(ss);
  /** @type {string[]} */
  var ids = [];
  var k;
  for (k in set) {
    if (set.hasOwnProperty(k) && set[k]) {
      ids.push(String(k));
    }
  }
  try {
    cache.put(cacheKey, JSON.stringify(ids), 21600);
  } catch (putErr) {
    Logger.log('dbPlannerCurriculumLectureIdSetCached_: cache put failed');
  }
  return set;
}

/**
 * @param {Object[]} todosRaw
 * @return {boolean}
 */
function dbPlannerPayloadTodosHaveLectureId_(todosRaw) {
  if (!todosRaw || Object.prototype.toString.call(todosRaw) !== '[object Array]') {
    return false;
  }
  var i;
  for (i = 0; i < todosRaw.length; i++) {
    var o = todosRaw[i];
    if (!o || typeof o !== 'object') {
      continue;
    }
    var lec = String(o.lecture_id != null ? o.lecture_id : '').trim();
    if (lec.length) {
      return true;
    }
  }
  return false;
}

/**
 * apply 요청 검증 — registry·학생 파일.
 * @param {Object} body
 * @return {{ ok: true, ss: GoogleAppsScript.Spreadsheet.Spreadsheet, sid: string, ymNorm: string }|{ ok: false, error: { code: string, message: string } }}
 */
function dbPlannerPersonalTodosApplyContext_(body) {
  body = body || {};
  var phone = dbPlannerPhoneFromSegments_(body.phoneSegments);
  var nameIn = String(body.name != null ? body.name : '').trim();
  var linkKeyReq = String(
    body.linkKey != null ? body.linkKey : body.link_key != null ? body.link_key : body.memberCode != null ? body.memberCode : ''
  ).trim();
  var ymNorm = dbPlannerNormalizeYearMonthFromBody_(body);
  var ss = dbPlannerOpenMaster_();
  if (!ss) {
    return {
      ok: false,
      error: { code: 'PLANNER_NOT_CONFIGURED', message: '플래너 마스터가 연결되지 않았습니다.' }
    };
  }
  if (!phone.length || !linkKeyReq.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: '전화·link_key가 필요합니다.' } };
  }
  if (!ymNorm.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'year_month(yyyy-MM)가 필요합니다.' } };
  }
  var reg = dbPlannerRegistryMatchForPhoneAndLink_(ss, linkKeyReq, phone);
  var hits = reg.hits;
  var pickedHit = reg.picked;
  if (!pickedHit) {
    return { ok: false, error: { code: 'PLANNER_VERIFY_FAILED', message: '회원 정보를 다시 확인할 수 없습니다.' } };
  }
  if (hits.length > 1) {
    if (dbPlannerNameNorm_(nameIn) !== dbPlannerNameNorm_(pickedHit.display_name)) {
      return { ok: false, error: { code: 'PLANNER_VERIFY_FAILED', message: '이름이 목록과 일치하지 않습니다.' } };
    }
  }
  var sid = dbPlannerStudentSpreadsheetId_(ss, linkKeyReq);
  if (!sid.length || !dbDriveSpreadsheetIdIsUsableNow_(sid)) {
    return { ok: false, error: { code: 'PLANNER_NO_STUDENT_FILE', message: '학생 플래너 파일이 없습니다.' } };
  }
  return { ok: true, ss: ss, sid: sid, ymNorm: ymNorm };
}

/**
 * @param {Object[]} todosRaw
 * @param {string} ymNorm
 * @param {string} todayYmd
 * @param {Object<string, boolean>|null} lectureIdSet
 * @return {Array[]}
 */
function dbPlannerPersonalTodosMatrixFromPayload_(todosRaw, ymNorm, todayYmd, lectureIdSet) {
  var prefix = ymNorm + '-';
  /** @type {Array[]} */
  var matrix = [];
  if (!todosRaw || Object.prototype.toString.call(todosRaw) !== '[object Array]') {
    return matrix;
  }
  var i;
  for (i = 0; i < todosRaw.length; i++) {
    var row = dbPlannerPersonalTodoRowFromPayload_(todosRaw[i], todayYmd);
    if (lectureIdSet) {
      row = dbPlannerPersonalTodoRowSanitizeLecture_(row, lectureIdSet);
    }
    var dCell = String(row[2] != null ? row[2] : '').trim();
    if (!dCell.length || dCell.indexOf(prefix) !== 0) {
      continue;
    }
    matrix.push(row);
  }
  matrix.sort(function (a, b) {
    var da = String(a[2] != null ? a[2] : '');
    var db0 = String(b[2] != null ? b[2] : '');
    if (da !== db0) {
      return da < db0 ? -1 : da > db0 ? 1 : 0;
    }
    var ska = Number(a[6]);
    var skb = Number(b[6]);
    if (ska !== skb) {
      return ska - skb;
    }
    var ta = String(a[0] != null ? a[0] : '');
    var tb = String(b[0] != null ? b[0] : '');
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
  return matrix;
}

/**
 * @param {string} sid
 * @param {string} ymNorm
 * @param {Array[]} matrix
 * @param {'replace'|'append'} mode
 */
function dbPlannerPersonalTodosWriteMatrix_(sid, ymNorm, matrix, mode) {
  var ssSt = SpreadsheetApp.openById(sid);
  var tabName = dbPlannerPersonalTodosSheetNameFromYearMonthStr_(ymNorm);
  var sh = dbGetOrCreateSheetWithHeaders_(ssSt, tabName, DB_PLANNER_PERSONAL_TODO_HEADERS);
  var nCols = DB_PLANNER_PERSONAL_TODO_HEADERS.length;
  if (mode === 'replace') {
    dbClearDataRows2Plus_(sh, nCols);
    if (matrix.length) {
      dbSetValuesFromRow2_(sh, matrix, nCols);
    }
    return;
  }
  if (matrix.length) {
    dbAppendValuesFromRow2_(sh, matrix, nCols);
  }
}

/**
 * 마스터에 없는 `lecture_id`는 빈 칸으로 정리(apply 시).
 * @param {Array} row
 * @param {Object<string, boolean>} lectureIds
 * @return {Array}
 */
function dbPlannerPersonalTodoRowSanitizeLecture_(row, lectureIds) {
  if (!row || !row.length) {
    return row;
  }
  var lec = String(row[4] != null ? row[4] : '').trim();
  if (!lec.length) {
    return row;
  }
  if (lectureIds && lectureIds[lec]) {
    return row;
  }
  var out = row.slice();
  out[4] = '';
  return out;
}

/** 분할 apply 버퍼 Cache TTL(초) — 마지막 batch 전까지 시트 미변경 */
var PLANNER_APPLY_BUF_CACHE_SEC = 1800;

/**
 * @param {string} sid
 * @param {string} ymNorm
 * @param {string} sessionId
 * @return {string}
 */
function dbPlannerApplyBufferMetaKey_(sid, ymNorm, sessionId) {
  return 'pl_abm_' + sid + '_' + ymNorm + '_' + sessionId;
}

/**
 * @param {string} sid
 * @param {string} ymNorm
 * @param {string} sessionId
 * @param {number} batchIndex
 * @return {string}
 */
function dbPlannerApplyBufferChunkKey_(sid, ymNorm, sessionId, batchIndex) {
  return 'pl_abc_' + sid + '_' + ymNorm + '_' + sessionId + '_' + String(batchIndex);
}

/**
 * @param {string} sid
 * @param {string} ymNorm
 * @param {string} sessionId
 * @return {string}
 */
function dbPlannerApplyBufferDoneKey_(sid, ymNorm, sessionId) {
  return 'pl_abd_' + sid + '_' + ymNorm + '_' + sessionId;
}

/**
 * 분할 POST — chunk는 Cache에만 쌓고 **마지막 batch**에서 한 번 replace(중간 실패 시 시트 유지).
 * 동일 `apply_session_id`+`batch_index` 재전송은 멱등(중복 append 없음).
 * @param {{ sid: string, ymNorm: string }} ctx
 * @param {string} sessionId
 * @param {Array[]} matrix
 * @param {number} batchIndex
 * @param {number} batchTotal
 * @return {Object}
 */
function dbPlannerPersonalTodosApplyBuffered_(ctx, sessionId, matrix, batchIndex, batchTotal) {
  var cache = CacheService.getScriptCache();
  var doneKey = dbPlannerApplyBufferDoneKey_(ctx.sid, ctx.ymNorm, sessionId);
  var doneRaw = cache.get(doneKey);
  if (doneRaw) {
    try {
      var doneObj = JSON.parse(doneRaw);
      return {
        ok: true,
        data: {
          written: doneObj.written != null ? doneObj.written : matrix.length,
          year_month: ctx.ymNorm,
          batch_index: batchIndex,
          batch_total: batchTotal,
          apply_session_id: sessionId,
          committed: true,
          idempotent: true
        }
      };
    } catch (eDone) {}
  }

  var chunkKey = dbPlannerApplyBufferChunkKey_(ctx.sid, ctx.ymNorm, sessionId, batchIndex);
  var metaKey = dbPlannerApplyBufferMetaKey_(ctx.sid, ctx.ymNorm, sessionId);
  try {
    cache.put(chunkKey, JSON.stringify(matrix), PLANNER_APPLY_BUF_CACHE_SEC);
  } catch (eChunk) {
    return {
      ok: false,
      error: {
        code: 'PLANNER_WRITE_FAILED',
        message:
          '분할 저장 버퍼에 실패했습니다(용량 초과 가능). 다시 저장하거나 todo 수를 줄여 주세요. ' +
          (eChunk && eChunk.message != null ? String(eChunk.message) : String(eChunk))
      }
    };
  }

  var metaRaw = cache.get(metaKey);
  /** @type {{ batch_total: number, received: Object<string, boolean> }} */
  var meta = { batch_total: batchTotal, received: {} };
  if (metaRaw) {
    try {
      meta = JSON.parse(metaRaw);
      if (!meta.received || typeof meta.received !== 'object') {
        meta.received = {};
      }
    } catch (eMeta) {
      meta = { batch_total: batchTotal, received: {} };
    }
  }
  meta.batch_total = batchTotal;
  meta.received[String(batchIndex)] = true;
  cache.put(metaKey, JSON.stringify(meta), PLANNER_APPLY_BUF_CACHE_SEC);

  if (batchIndex !== batchTotal - 1) {
    return {
      ok: true,
      data: {
        written: matrix.length,
        year_month: ctx.ymNorm,
        batch_index: batchIndex,
        batch_total: batchTotal,
        apply_session_id: sessionId,
        buffered: true
      }
    };
  }

  var merged = [];
  var i;
  for (i = 0; i < batchTotal; i++) {
    var cr = cache.get(dbPlannerApplyBufferChunkKey_(ctx.sid, ctx.ymNorm, sessionId, i));
    if (!cr) {
      return {
        ok: false,
        error: {
          code: 'PLANNER_WRITE_FAILED',
          message: '분할 저장 chunk ' + String(i + 1) + '/' + String(batchTotal) + '가 없습니다. 처음부터 다시 저장해 주세요.'
        }
      };
    }
    try {
      var part = JSON.parse(cr);
      if (part && Object.prototype.toString.call(part) === '[object Array]') {
        merged = merged.concat(part);
      }
    } catch (eParse) {
      return {
        ok: false,
        error: {
          code: 'PLANNER_WRITE_FAILED',
          message: '분할 저장 chunk 파싱 실패: ' + (eParse && eParse.message != null ? String(eParse.message) : String(eParse))
        }
      };
    }
  }

  try {
    dbPlannerPersonalTodosWriteMatrix_(ctx.sid, ctx.ymNorm, merged, 'replace');
  } catch (eW) {
    return {
      ok: false,
      error: { code: 'PLANNER_WRITE_FAILED', message: eW && eW.message != null ? String(eW.message) : String(eW) }
    };
  }

  for (i = 0; i < batchTotal; i++) {
    cache.remove(dbPlannerApplyBufferChunkKey_(ctx.sid, ctx.ymNorm, sessionId, i));
  }
  cache.remove(metaKey);
  cache.put(doneKey, JSON.stringify({ written: merged.length }), PLANNER_APPLY_BUF_CACHE_SEC);

  return {
    ok: true,
    data: {
      written: merged.length,
      year_month: ctx.ymNorm,
      batch_index: batchIndex,
      batch_total: batchTotal,
      apply_session_id: sessionId,
      committed: true
    }
  };
}

/**
 * 학생 월 탭을 페이로드 `todos` 중 `date`가 해당 `year_month` 인 행만으로 **전체 덮어쓰기**.
 * `batch_total`>1 — Cache 버퍼 후 마지막 batch에서 replace(`apply_session_id` 필수).
 * `batch_total`===1 — 즉시 replace(재시도 멱등).
 * @param {Object} body
 * @return {Object}
 */
function dbPlannerPersonalTodosApply_(body) {
  body = body || {};
  var todosRaw = body.todos;
  if (!todosRaw || Object.prototype.toString.call(todosRaw) !== '[object Array]') {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'todos 배열이 필요합니다.' } };
  }
  var ctx = dbPlannerPersonalTodosApplyContext_(body);
  if (!ctx.ok) {
    return ctx;
  }
  var batchTotalRaw = body.batch_total != null ? Number(body.batch_total) : 1;
  var batchIndexRaw = body.batch_index != null ? Number(body.batch_index) : 0;
  var batchTotal = isFinite(batchTotalRaw) && batchTotalRaw >= 1 ? Math.floor(batchTotalRaw) : 1;
  var batchIndex = isFinite(batchIndexRaw) && batchIndexRaw >= 0 ? Math.floor(batchIndexRaw) : 0;
  if (batchIndex >= batchTotal) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'batch_index가 batch_total 범위를 벗어났습니다.' } };
  }
  var sessionId = String(
    body.apply_session_id != null
      ? body.apply_session_id
      : body.applySessionId != null
        ? body.applySessionId
        : ''
  ).trim();
  if (batchTotal > 1 && !sessionId.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: '분할 저장에는 apply_session_id가 필요합니다.' } };
  }
  var todayYmd = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  /** @type {Object<string, boolean>|null} */
  var lectureIdSet = null;
  if (dbPlannerPayloadTodosHaveLectureId_(todosRaw)) {
    lectureIdSet = dbPlannerCurriculumLectureIdSetCached_(ctx.ss);
  }
  var matrix = dbPlannerPersonalTodosMatrixFromPayload_(todosRaw, ctx.ymNorm, todayYmd, lectureIdSet);
  try {
    if (batchTotal <= 1) {
      dbPlannerPersonalTodosWriteMatrix_(ctx.sid, ctx.ymNorm, matrix, 'replace');
    } else {
      return dbPlannerPersonalTodosApplyBuffered_(ctx, sessionId, matrix, batchIndex, batchTotal);
    }
  } catch (eW) {
    return {
      ok: false,
      error: { code: 'PLANNER_WRITE_FAILED', message: eW && eW.message != null ? String(eW.message) : String(eW) }
    };
  }
  return {
    ok: true,
    data: {
      written: matrix.length,
      year_month: ctx.ymNorm,
      batch_index: batchIndex,
      batch_total: batchTotal
    }
  };
}

/**
 * @param {Object} body
 * @return {Object}
 */
function dbPlannerBootstrap_(body) {
  body = body || {};
  var phone = dbPlannerPhoneFromSegments_(body.phoneSegments);
  var nameIn = String(body.name != null ? body.name : '').trim();
  var linkKeyReq = String(
    body.linkKey != null ? body.linkKey : body.link_key != null ? body.link_key : body.memberCode != null ? body.memberCode : ''
  ).trim();
  var ss = dbPlannerOpenMaster_();
  if (!ss) {
    return {
      ok: false,
      error: { code: 'PLANNER_NOT_CONFIGURED', message: '플래너 마스터가 연결되지 않았습니다.' }
    };
  }
  if (!phone.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'phoneSegments가 올바르지 않습니다.' } };
  }
  var common = dbPlannerReadCommonEvents_(ss);
  var curriculumVersion = dbPlannerCurriculumVersion_(ss);
  if (!linkKeyReq.length) {
    return {
      ok: true,
      data: { role: 'guest', common: common, personal: null, student_profile: null, curriculum_version: curriculumVersion }
    };
  }
  var reg = dbPlannerRegistryMatchForPhoneAndLink_(ss, linkKeyReq, phone);
  var hits = reg.hits;
  var pickedHit = reg.picked;
  if (!pickedHit) {
    return { ok: false, error: { code: 'PLANNER_VERIFY_FAILED', message: '회원 정보를 다시 확인할 수 없습니다.' } };
  }
  if (hits.length > 1) {
    if (dbPlannerNameNorm_(nameIn) !== dbPlannerNameNorm_(pickedHit.display_name)) {
      return { ok: false, error: { code: 'PLANNER_VERIFY_FAILED', message: '이름이 목록과 일치하지 않습니다.' } };
    }
  }
  var sid = dbPlannerStudentSpreadsheetId_(ss, linkKeyReq);
  var ymNorm = dbPlannerNormalizeYearMonthFromBody_(body);
  var personal = dbPlannerReadPersonalStub_(sid, ymNorm.length ? ymNorm : '');
  var student_profile = dbPlannerStudentProfileFromRegistryCells_(pickedHit.row, pickedHit.rowD);
  return {
    ok: true,
    data: {
      role: 'member',
      common: common,
      personal: personal,
      student_profile: student_profile,
      curriculum_version: curriculumVersion
    }
  };
}

/**
 * @return {{ id: string, url: string, already: boolean, createdNew: boolean }|{ error: { code: string, message: string } }}
 */
function dbInitPlannerMasterSheets_() {
  try {
    var p = PropertiesService.getScriptProperties();
    var existing = p.getProperty(DB_PROP_SHEETS_PLANNER_MASTER_ID);
    existing = existing != null ? String(existing).trim() : '';
    if (existing) {
      if (!dbDriveSpreadsheetIdIsUsableNow_(existing)) {
        existing = '';
      } else {
        try {
          var ss0 = SpreadsheetApp.openById(existing);
          dbGetOrCreateSheetWithHeaders_(ss0, DB_SHEET_PLANNER_REGISTRY, DB_PLANNER_REGISTRY_HEADERS);
          dbGetOrCreateSheetWithHeaders_(ss0, DB_SHEET_PLANNER_REGISTRY_MANUAL, DB_PLANNER_REGISTRY_HEADERS);
          dbGetOrCreateSheetWithHeaders_(ss0, DB_SHEET_PLANNER_STUDENT_LINKS, DB_PLANNER_STUDENT_LINK_HEADERS);
          dbGetOrCreateSheetWithHeaders_(ss0, DB_SHEET_PLANNER_CURRICULUM_COURSES, DB_PLANNER_CURRICULUM_COURSE_HEADERS);
          dbGetOrCreateSheetWithHeaders_(ss0, DB_SHEET_PLANNER_CURRICULUM_LECTURES, DB_PLANNER_CURRICULUM_LECTURE_HEADERS);
          dbPlannerDeleteLegacyCommonCalendarSheet_(ss0);
          dbPlannerDeleteLegacyMemberRecordsSheet_(ss0);
          dbDeleteOrphanDefaultSheetIfAny_(ss0);
          dbPlannerFixRegistryPhoneColumnOnMaster_(ss0);
          dbPlannerFixCurriculumLectureDurationOnMaster_(ss0);
          return {
            id: existing,
            url: 'https://docs.google.com/spreadsheets/d/' + existing + '/edit',
            already: true,
            createdNew: false
          };
        } catch (e0) {
          Logger.log('dbInitPlannerMasterSheets_: existing open fail ' + (e0 && e0.message));
          existing = '';
        }
      }
    }

    var folderId = dbPmGetMasterParentFolderId_();
    if (!folderId) {
      var base = dbResolveMasterParentFolderId_();
      if (base) {
        folderId = dbGetOrCreateDbSubfolder_(base) || '';
      }
    }
    if (!folderId) {
      return {
        error: {
          code: 'PLANNER_NO_DRIVE_PARENT',
          message:
            '플래너 마스터를 둘 Drive 위치를 정하지 못했습니다. 먼저 원천 마스터(SHEETS_MASTER_ID)를 만든 뒤 다시 시도하세요.'
        }
      };
    }

    if (!existing) {
      var reusedId = dbAnFindSpreadsheetIdByNamesInFolder_(folderId, [DB_PLANNER_SPREADSHEET_TITLE]);
      if (reusedId) {
        var ssReuse = SpreadsheetApp.openById(reusedId);
        dbGetOrCreateSheetWithHeaders_(ssReuse, DB_SHEET_PLANNER_REGISTRY, DB_PLANNER_REGISTRY_HEADERS);
        dbGetOrCreateSheetWithHeaders_(ssReuse, DB_SHEET_PLANNER_REGISTRY_MANUAL, DB_PLANNER_REGISTRY_HEADERS);
        dbGetOrCreateSheetWithHeaders_(ssReuse, DB_SHEET_PLANNER_STUDENT_LINKS, DB_PLANNER_STUDENT_LINK_HEADERS);
        dbGetOrCreateSheetWithHeaders_(ssReuse, DB_SHEET_PLANNER_CURRICULUM_COURSES, DB_PLANNER_CURRICULUM_COURSE_HEADERS);
        dbGetOrCreateSheetWithHeaders_(ssReuse, DB_SHEET_PLANNER_CURRICULUM_LECTURES, DB_PLANNER_CURRICULUM_LECTURE_HEADERS);
        dbPlannerDeleteLegacyCommonCalendarSheet_(ssReuse);
        dbPlannerDeleteLegacyMemberRecordsSheet_(ssReuse);
        p.setProperty(DB_PROP_SHEETS_PLANNER_MASTER_ID, reusedId);
        dbDeleteOrphanDefaultSheetIfAny_(ssReuse);
        dbPlannerFixRegistryPhoneColumnOnMaster_(ssReuse);
        dbPlannerFixCurriculumLectureDurationOnMaster_(ssReuse);
        return {
          id: reusedId,
          url: 'https://docs.google.com/spreadsheets/d/' + reusedId + '/edit',
          already: true,
          createdNew: false
        };
      }
    }

    var file = dbDriveCreateSpreadsheetInFolder_(DB_PLANNER_SPREADSHEET_TITLE, folderId);
    if (!file || !file.id) {
      return {
        error: {
          code: 'PLANNER_DRIVE_CREATE_FAILED',
          message: '플래너 마스터 스프레드시트를 만들지 못했습니다. Drive 권한·할당량을 확인하세요.'
        }
      };
    }

    var id = String(file.id).trim();
    var ss = dbOpenNewSpreadsheetByIdWithRetry_(id);
    if (!ss) {
      return {
        error: {
          code: 'PLANNER_OPEN_AFTER_CREATE',
          message: '만든 플래너 마스터 시트를 열지 못했습니다. 잠시 뒤 다시 시도하세요.'
        }
      };
    }

    dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_PLANNER_REGISTRY, DB_PLANNER_REGISTRY_HEADERS);
    dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_PLANNER_REGISTRY_MANUAL, DB_PLANNER_REGISTRY_HEADERS);
    dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_PLANNER_STUDENT_LINKS, DB_PLANNER_STUDENT_LINK_HEADERS);
    dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_PLANNER_CURRICULUM_COURSES, DB_PLANNER_CURRICULUM_COURSE_HEADERS);
    dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_PLANNER_CURRICULUM_LECTURES, DB_PLANNER_CURRICULUM_LECTURE_HEADERS);
    dbPlannerDeleteLegacyCommonCalendarSheet_(ss);
    dbPlannerDeleteLegacyMemberRecordsSheet_(ss);
    dbDeleteOrphanDefaultSheetIfAny_(ss);
    p.setProperty(DB_PROP_SHEETS_PLANNER_MASTER_ID, id);

    return {
      id: id,
      url: 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
      already: false,
      createdNew: true
    };
  } catch (x) {
    Logger.log('dbInitPlannerMasterSheets_: ' + (x && x.message != null ? x.message : String(x)));
    return {
      error: {
        code: 'PLANNER_INIT_EXCEPTION',
        message: '플래너 마스터 준비 중 예외: ' + (x && x.message != null ? String(x.message) : String(x))
      }
    };
  }
}
