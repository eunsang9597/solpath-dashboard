/**
 * 수강생 관리 DB — `솔루션편입_수강생_마스터` (docs/SCHEMA_STUDENT_MANAGEMENT.md)
 * 원천 `order_items`·`orders`·`members`·`product_mapping` 읽기 → 이벤트·마스터 전면 재구축.
 */

/** 원천에 그대로 있어도 수강생 이벤트에 올리지 않음 — 키: `order_item_code` */
var DB_STU_FORCE_SKIP_ORDER_ITEM_CODES_ = {
  oi20260221610510d93a19c: true
};

/**
 * 원천에 없는 특이 케이스 고정 이벤트(리빌드 시 항상 병합).
 * 날짜 입력은 `yyyy.MM.dd`/`yyyy-MM-dd`/`yyyy/MM/dd` 모두 허용.
 */
var DB_STU_FIXED_MANUAL_EVENTS_ = [
  {
    manual_key: 'fixed_hongboyoung_20260209_challenge',
    member_code: '',
    name: '홍보영',
    internal_category: 'challenge',
    lifecycle: 'active',
    order_time: '2026.02.09',
    product_start_date: '2026.02.09',
    product_end_date: '2026.02.14',
    order_status: 'closed',
    section_status: 'PURCHASE_CONFIRMATION',
    prod_no: '79',
    prod_name: '일주일 만에 영어 노베이스 탈출하기 챌린지'
  },
  {
    manual_key: 'fixed_kimtaeyun_20260209_challenge',
    member_code: 'm2026020743093367f2541',
    name: '김태윤',
    internal_category: 'challenge',
    lifecycle: 'active',
    order_time: '2026.02.09',
    product_start_date: '2026.02.09',
    product_end_date: '2026.02.14',
    order_status: 'closed',
    section_status: 'PURCHASE_CONFIRMATION',
    prod_no: '79',
    prod_name: '일주일 만에 영어 노베이스 탈출하기 챌린지'
  },
  {
    manual_key: 'fixed_leeminje_20260209_challenge',
    member_code: 'm20260209d1920f53cc5da',
    name: '이민제',
    internal_category: 'challenge',
    lifecycle: 'active',
    order_time: '2026.02.09',
    product_start_date: '2026.02.09',
    product_end_date: '2026.02.14',
    order_status: 'closed',
    section_status: 'PURCHASE_CONFIRMATION',
    prod_no: '79',
    prod_name: '일주일 만에 영어 노베이스 탈출하기 챌린지'
  },
  {
    manual_key: 'fixed_hwangseoyoung_20260209_challenge',
    member_code: 'm202602090b4074ae8656d',
    name: '황서영',
    internal_category: 'challenge',
    lifecycle: 'active',
    order_time: '2026.02.09',
    product_start_date: '2026.02.09',
    product_end_date: '2026.02.14',
    order_status: 'closed',
    section_status: 'PURCHASE_CONFIRMATION',
    prod_no: '79',
    prod_name: '일주일 만에 영어 노베이스 탈출하기 챌린지'
  }
];

/**
 * @param {*} input
 * @param {boolean} endOfDay
 * @return {string}
 */
function dbStuNormalizeManualDateTime_(input, endOfDay) {
  var s = input != null ? String(input).trim() : '';
  if (!s.length) {
    return '';
  }
  var m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (m) {
    var y = parseInt(m[1], 10);
    var mo = parseInt(m[2], 10);
    var d = parseInt(m[3], 10);
    if (isFinite(y) && isFinite(mo) && isFinite(d)) {
      var dt = new Date(y, mo - 1, d);
      return (
        Utilities.formatDate(dt, 'Asia/Seoul', 'yyyy-MM-dd') +
        (endOfDay ? ' 23:59:59' : ' 00:00:00')
      );
    }
  }
  var ymd = s.slice(0, 10).replace(/[.\/]/g, '-');
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return ymd + (endOfDay ? ' 23:59:59' : ' 00:00:00');
  }
  return s;
}

/**
 * --- STUDENT `product_end_date` 기본 가산 일수 ---
 * 운영 정책이 바뀌면 **이 함수만** 고치면 됨. (스키마 문서와 주석을 함께 맞출 것.)
 * `jasoseo` 는 종료일 없음(빈 칸).
 *
 * @param {string} internalCategory
 * @return {number} 0 이면 종료일 비움
 */
function dbStuDefaultDurationDaysForCategory_(internalCategory) {
  var c = internalCategory != null ? String(internalCategory).trim().toLowerCase() : '';
  if (c === 'jasoseo') {
    return 0;
  }
  if (c === 'challenge') {
    return 14;
  }
  if (c === 'solpass') {
    return 28;
  }
  /** 솔루틴: 시작일 포함 26일(예: 4/6 시작 → 5/1 종료) — `dbStuEndDateFromStartYmd_` 와 동일 규칙 */
  if (c === 'solutine') {
    return 26;
  }
  return 28;
}

/**
 * 구매일(서울) 다음 날 00:00:00 현지 표시 문자열
 * @param {string|Date} orderTimeRaw
 * @return {string}
 */
function dbStuNextDayMidnightSeoulString_(orderTimeRaw) {
  var ymd = dbAnOrderTimeToSeoulYmd_(orderTimeRaw);
  if (!ymd || ymd.length < 10) {
    return orderTimeRaw != null ? String(orderTimeRaw) : '';
  }
  var p = ymd.split('-');
  var y = parseInt(p[0], 10);
  var mo = parseInt(p[1], 10) - 1;
  var d = parseInt(p[2], 10);
  var dt = new Date(y, mo, d);
  dt.setDate(dt.getDate() + 1);
  return Utilities.formatDate(dt, 'Asia/Seoul', 'yyyy-MM-dd') + ' 00:00:00';
}

/**
 * 시작일(날짜, 앞 10자 yyyy-MM-dd)을 **1일째로 포함**한 N일권의 **마지막 날** 23:59:59 서울.
 * 예: 3/27 시작·28일권 → 3/27~4/23 → 종료 4/23 23:59:59 (시작 + (N-1)일).
 * @param {string} startCell
 * @param {number} nDays
 * @return {string}
 */
function dbStuEndDateFromStartYmd_(startCell, nDays) {
  if (!nDays || nDays < 1) {
    return '';
  }
  var s = startCell != null ? String(startCell).trim() : '';
  if (!s.length) {
    return '';
  }
  var ymd = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return '';
  }
  var p = ymd.split('-');
  var dt = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  dt.setDate(dt.getDate() + (nDays - 1));
  return Utilities.formatDate(dt, 'Asia/Seoul', 'yyyy-MM-dd') + ' 23:59:59';
}

/**
 * 수강생 DB 전용 구매자 제외 — **전화번호 규칙 없음** (이름만 집계와 동일 strict)
 * @param {string} orderNo
 * @param {Object} ordererNameMap
 * @return {boolean}
 */
function dbStuSkipByPurchaser_(orderNo, ordererNameMap) {
  return Boolean(orderNo && ordererNameMap[orderNo] === '솔루션편입');
}

/**
 * @param {string} cat
 * @return {boolean}
 */
function dbStuIsAllowedCategory_(cat) {
  var c = cat != null ? String(cat).trim().toLowerCase() : '';
  return c === 'solpass' || c === 'challenge' || c === 'solutine' || c === 'jasoseo';
}

/**
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet|null}
 */
function dbStuOpen_() {
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty(DB_PROP_SHEETS_STUDENT_ID);
  id = id != null ? String(id).trim() : '';
  if (!id || !dbDriveSpreadsheetIdIsUsableNow_(id)) {
    return null;
  }
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    Logger.log('dbStuOpen_: ' + (e && e.message != null ? e.message : String(e)));
    return null;
  }
}

/**
 * @return {{ studentMgmtReady: boolean, studentMgmtReason: string, studentMgmtSpreadsheetUrl: string, studentMemberRowCount: number, studentEventRowCount: number }}
 */
function dbStudentStateFields_() {
  var empty = {
    studentMgmtReady: false,
    studentMgmtReason: 'NO_STUDENT_SHEET',
    studentMgmtSpreadsheetUrl: '',
    studentMemberRowCount: 0,
    studentEventRowCount: 0
  };
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty(DB_PROP_SHEETS_STUDENT_ID);
  id = id != null ? String(id).trim() : '';
  if (!id) {
    return empty;
  }
  if (!dbDriveSpreadsheetIdIsUsableNow_(id)) {
    return empty;
  }
  try {
    var ss = SpreadsheetApp.openById(id);
    if (!ss) {
      return empty;
    }
    var shM = ss.getSheetByName(DB_SHEET_STUDENT_MEMBER_MASTER);
    var shE = ss.getSheetByName(DB_SHEET_STUDENT_ORDER_EVENTS);
    var mCount = shM && shM.getLastRow() >= 2 ? shM.getLastRow() - 1 : 0;
    var eCount = shE && shE.getLastRow() >= 2 ? shE.getLastRow() - 1 : 0;
    return {
      studentMgmtReady: true,
      studentMgmtReason: '',
      studentMgmtSpreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
      studentMemberRowCount: mCount,
      studentEventRowCount: eCount
    };
  } catch (x) {
    Logger.log('dbStudentStateFields_: ' + (x && x.message != null ? x.message : String(x)));
    return empty;
  }
}

/**
 * 기존 이벤트 시트에서 `product_start_date`·`product_end_date` 만 보존 (order_item_code 키)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} shE
 * @return {Object<string, {start: *, end: *, updated: *}>}
 */
function dbStuReadPreserveDates_(shE) {
  var out = {};
  if (!shE || shE.getLastRow() < 2) {
    return out;
  }
  var w = DB_STUDENT_ORDER_EVENT_HEADERS.length;
  var hdr = shE.getRange(1, 1, 1, w).getValues()[0];
  var ixCode = -1;
  var ixStart = -1;
  var ixEnd = -1;
  var ixUpdated = -1;
  var i;
  for (i = 0; i < hdr.length; i++) {
    var h = String(hdr[i] != null ? hdr[i] : '').trim();
    if (h === 'order_item_code') {
      ixCode = i;
    }
    if (h === 'product_start_date') {
      ixStart = i;
    }
    if (h === 'product_end_date') {
      ixEnd = i;
    }
    if (h === 'updated_at') {
      ixUpdated = i;
    }
  }
  if (ixCode < 0) {
    return out;
  }
  var lr = shE.getLastRow();
  var vals = shE.getRange(2, 1, lr - 1, w).getValues();
  var j;
  for (j = 0; j < vals.length; j++) {
    var row = vals[j] || [];
    var code = String(row[ixCode] != null ? row[ixCode] : '').trim();
    if (!code.length) {
      continue;
    }
    out[code] = {
      start: ixStart >= 0 ? row[ixStart] : '',
      end: ixEnd >= 0 ? row[ixEnd] : '',
      updated: ixUpdated >= 0 ? row[ixUpdated] : ''
    };
  }
  return out;
}

/**
 * 기존 멤버 시트에서 운영 입력값(override, remarks) 보존 (member_code 키)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} shM
 * @return {Object<string, { statusOverride: string, remarksJson: string }>}
 */
function dbStuReadPreserveMemberOps_(shM) {
  var out = {};
  if (!shM || shM.getLastRow() < 2) {
    return out;
  }
  var w = DB_STUDENT_MEMBER_HEADERS.length;
  var hdr = shM.getRange(1, 1, 1, w).getValues()[0];
  var ixCode = -1;
  var ixOverride = -1;
  var ixRemarks = -1;
  var i;
  for (i = 0; i < hdr.length; i++) {
    var h = String(hdr[i] != null ? hdr[i] : '').trim();
    if (h === 'member_code') {
      ixCode = i;
    }
    if (h === 'member_status_override') {
      ixOverride = i;
    }
    if (h === 'remarks_json') {
      ixRemarks = i;
    }
  }
  if (ixCode < 0) {
    return out;
  }
  var lr = shM.getLastRow();
  var vals = shM.getRange(2, 1, lr - 1, w).getValues();
  var j;
  for (j = 0; j < vals.length; j++) {
    var row = vals[j] || [];
    var code = String(row[ixCode] != null ? row[ixCode] : '').trim();
    if (!code.length) {
      continue;
    }
    out[code] = {
      statusOverride: ixOverride >= 0 && row[ixOverride] != null ? String(row[ixOverride]).trim() : '',
      remarksJson: ixRemarks >= 0 && row[ixRemarks] != null ? String(row[ixRemarks]).trim() : ''
    };
  }
  return out;
}

/**
 * @param {string} s
 * @return {string}
 */
function dbStuNormalizeYmd_(s) {
  var t = s != null ? String(s).trim() : '';
  if (!t.length) {
    return '';
  }
  var m = t.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m) {
    var y = m[1];
    var mo = ('0' + String(parseInt(m[2], 10))).slice(-2);
    var d = ('0' + String(parseInt(m[3], 10))).slice(-2);
    return y + '-' + mo + '-' + d;
  }
  var p = t.slice(0, 10).replace(/[.\/]/g, '-');
  return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : '';
}

/**
 * @param {*} v
 * @return {Date|null}
 */
function dbStuDateFromAny_(v) {
  var ymd = dbStuNormalizeYmd_(v != null ? String(v) : '');
  if (!ymd) {
    return null;
  }
  var p = ymd.split('-');
  var dt = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  return isFinite(dt.getTime()) ? dt : null;
}

/**
 * @param {string} ymd
 * @return {string}
 */
function dbStuIsoFromYmdNoTime_(ymd) {
  var t = dbStuNormalizeYmd_(ymd);
  return t ? t + 'T00:00:00.000Z' : '';
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sh
 * @param {string[]} headers
 * @return {Object}
 */
function dbStuHeaderIndexMap_(sh, headers) {
  var out = {};
  var w = headers.length;
  var hdr = sh.getRange(1, 1, 1, w).getValues()[0];
  var i;
  for (i = 0; i < hdr.length; i++) {
    out[String(hdr[i] != null ? hdr[i] : '').trim()] = i;
  }
  return out;
}

/**
 * @param {Object<string, {start: *, end: *, updated: *}>} preserve
 * @param {string} nowIso
 * @param {string} batchId
 * @return {{ rows: Array<Array<*>>, manualNameByMemberCode: Object<string, string> }}
 */
function dbStuBuildFixedManualRows_(preserve, nowIso, batchId) {
  var rows = [];
  var manualNameByMemberCode = {};
  var i;
  for (i = 0; i < DB_STU_FIXED_MANUAL_EVENTS_.length; i++) {
    var m = DB_STU_FIXED_MANUAL_EVENTS_[i] || {};
    var itemCode = 'manual_' + String(m.manual_key != null ? m.manual_key : '').trim();
    if (!itemCode || itemCode === 'manual_') {
      continue;
    }
    var memberCode = String(m.member_code != null ? m.member_code : '').trim();
    var memberName = String(m.name != null ? m.name : '').trim();
    if (memberCode.length && memberName.length) {
      manualNameByMemberCode[memberCode] = memberName;
    }
    var pStart = dbStuNormalizeManualDateTime_(m.product_start_date, false);
    var pEnd = dbStuNormalizeManualDateTime_(m.product_end_date, true);
    var rowEv = [
      itemCode,
      'manual_' + String(i + 1),
      memberCode,
      dbStuNormalizeManualDateTime_(m.order_time, false),
      String(m.internal_category != null ? m.internal_category : '').trim().toLowerCase() || 'challenge',
      String(m.lifecycle != null ? m.lifecycle : '').trim().toLowerCase() || 'active',
      pStart,
      pEnd,
      '',
      '',
      String(m.order_status != null ? m.order_status : '').trim() || 'closed',
      String(m.section_status != null ? m.section_status : '').trim() || 'PURCHASE_CONFIRMATION',
      '',
      '',
      '',
      String(m.prod_no != null ? m.prod_no : '').trim(),
      String(m.prod_name != null ? m.prod_name : '').trim(),
      '',
      '',
      JSON.stringify({
        source: 'manual_fixed',
        manual_key: String(m.manual_key != null ? m.manual_key : ''),
        name: memberName
      }),
      '',
      nowIso,
      batchId
    ];
    var prev = preserve[itemCode];
    if (prev) {
      if (prev.start !== '' && prev.start != null) {
        rowEv[6] = prev.start;
      }
      if (prev.end !== '' && prev.end != null) {
        rowEv[7] = prev.end;
      }
      if (prev.updated !== '' && prev.updated != null) {
        rowEv[20] = prev.updated;
      }
    }
    rows.push(rowEv);
  }
  return { rows: rows, manualNameByMemberCode: manualNameByMemberCode };
}

/**
 * 수강 시작/종료일 편집 목록: `order_item_code`별 1행(동일 코드 중복 시 order_time 최신).
 * 같은 멤버·같은 internal_category라도 월호 등 별도 주문이면 모두 표시.
 * 종료일이 현재 기준 14일 초과 지난 건은 제외.
 * @return {{ ok: true, data: { rows: Object[] } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbStudentMgmtDateEditorList_() {
  var ssStu = dbStuOpen_();
  if (!ssStu) {
    return { ok: false, error: { code: 'NO_STUDENT_SHEET', message: '수강생 DB가 없습니다.' } };
  }
  var shEv = ssStu.getSheetByName(DB_SHEET_STUDENT_ORDER_EVENTS);
  var shM = ssStu.getSheetByName(DB_SHEET_STUDENT_MEMBER_MASTER);
  if (!shEv || shEv.getLastRow() < 2) {
    return { ok: true, data: { rows: [] } };
  }
  var evIdx = dbStuHeaderIndexMap_(shEv, DB_STUDENT_ORDER_EVENT_HEADERS);
  var rows = shEv.getRange(2, 1, shEv.getLastRow() - 1, DB_STUDENT_ORDER_EVENT_HEADERS.length).getValues();
  var nameByMemberCode = {};
  if (shM && shM.getLastRow() >= 2) {
    var mIdx = dbStuHeaderIndexMap_(shM, DB_STUDENT_MEMBER_HEADERS);
    var mVals = shM.getRange(2, 1, shM.getLastRow() - 1, DB_STUDENT_MEMBER_HEADERS.length).getValues();
    var mi;
    for (mi = 0; mi < mVals.length; mi++) {
      var mr = mVals[mi] || [];
      var mc = String(mr[mIdx.member_code] != null ? mr[mIdx.member_code] : '').trim();
      if (!mc.length) {
        continue;
      }
      var nm = String(mr[mIdx.name] != null ? mr[mIdx.name] : '').trim();
      if (nm.length) {
        nameByMemberCode[mc] = nm;
      }
    }
  }
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  var bestByKey = {};
  var i;
  for (i = 0; i < rows.length; i++) {
    var r = rows[i] || [];
    var cat = String(r[evIdx.internal_category] != null ? r[evIdx.internal_category] : '').trim().toLowerCase();
    if (!dbStuIsAllowedCategory_(cat)) {
      continue;
    }
    if (cat === 'jasoseo') {
      continue;
    }
    var claimStatus = String(r[evIdx.claim_status] != null ? r[evIdx.claim_status] : '').trim().toLowerCase();
    if (claimStatus === 'cancel') {
      continue;
    }
    var endRaw = r[evIdx.product_end_date];
    if (String(endRaw != null ? endRaw : '').trim().length) {
      var endDt = dbStuDateFromAny_(endRaw);
      if (endDt && endDt.getTime() < cutoff.getTime()) {
        continue;
      }
    }
    var memberCode = String(r[evIdx.member_code] != null ? r[evIdx.member_code] : '').trim();
    var itemCode = String(r[evIdx.order_item_code] != null ? r[evIdx.order_item_code] : '').trim();
    if (!itemCode.length) {
      continue;
    }
    /** 멤버+카테고리 최신 1건이면 4월·5월호처럼 늦게 결제한 월호만 남음 → 주문항목 코드 단위 */
    var key = itemCode;
    var ot = String(r[evIdx.order_time] != null ? r[evIdx.order_time] : '').trim();
    var otKey = dbStuNormalizeYmd_(ot) + '|' + ot;
    var prev = bestByKey[key];
    if (!prev || otKey > prev.orderTimeKey || (otKey === prev.orderTimeKey && itemCode > prev.orderItemCode)) {
      var nm0 = memberCode.length && nameByMemberCode[memberCode] ? nameByMemberCode[memberCode] : '';
      if (!nm0.length) {
        nm0 = memberCode.length ? memberCode + '(비회원)' : '비회원';
      }
      bestByKey[key] = {
        orderItemCode: itemCode,
        memberCode: memberCode,
        memberName: nm0,
        internalCategory: cat,
        orderTime: ot,
        productStartDate: String(r[evIdx.product_start_date] != null ? r[evIdx.product_start_date] : ''),
        productEndDate: String(r[evIdx.product_end_date] != null ? r[evIdx.product_end_date] : ''),
        updatedAt: String(evIdx.updated_at >= 0 && r[evIdx.updated_at] != null ? r[evIdx.updated_at] : ''),
        prodName: String(r[evIdx.prod_name] != null ? r[evIdx.prod_name] : ''),
        orderTimeKey: otKey
      };
    }
  }
  var out = [];
  var keys = Object.keys(bestByKey);
  var ki;
  for (ki = 0; ki < keys.length; ki++) {
    var it = bestByKey[keys[ki]];
    delete it.orderTimeKey;
    out.push(it);
  }
  out.sort(function (a, b) {
    var an = String(a.memberName || '');
    var bn = String(b.memberName || '');
    if (an !== bn) {
      return an.localeCompare(bn);
    }
    var ac = String(a.internalCategory || '');
    var bc = String(b.internalCategory || '');
    if (ac !== bc) {
      return ac.localeCompare(bc);
    }
    return String(b.orderTime || '').localeCompare(String(a.orderTime || ''));
  });
  return { ok: true, data: { rows: out } };
}

/**
 * @param {Object} payload
 * @return {{ ok: true, data: { orderItemCode: string, productStartDate: string, productEndDate: string, updatedAt: string } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbStudentMgmtDateEditorSave_(payload) {
  payload = payload || {};
  var orderItemCode = payload.orderItemCode != null ? String(payload.orderItemCode).trim() : '';
  if (!orderItemCode.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'orderItemCode가 필요합니다.' } };
  }
  var ssStu = dbStuOpen_();
  if (!ssStu) {
    return { ok: false, error: { code: 'NO_STUDENT_SHEET', message: '수강생 DB가 없습니다.' } };
  }
  var shEv = ssStu.getSheetByName(DB_SHEET_STUDENT_ORDER_EVENTS);
  if (!shEv || shEv.getLastRow() < 2) {
    return { ok: false, error: { code: 'NO_EVENT_ROWS', message: '수강생 이벤트 데이터가 없습니다.' } };
  }
  var idx = dbStuHeaderIndexMap_(shEv, DB_STUDENT_ORDER_EVENT_HEADERS);
  var vals = shEv.getRange(2, 1, shEv.getLastRow() - 1, DB_STUDENT_ORDER_EVENT_HEADERS.length).getValues();
  var rowNo = -1;
  var found = null;
  var i;
  for (i = 0; i < vals.length; i++) {
    var r = vals[i] || [];
    if (String(r[idx.order_item_code] != null ? r[idx.order_item_code] : '').trim() === orderItemCode) {
      rowNo = i + 2;
      found = r;
      break;
    }
  }
  if (rowNo < 2 || !found) {
    return { ok: false, error: { code: 'NOT_FOUND', message: '수정할 주문 항목을 찾지 못했습니다.' } };
  }
  var changedStart = Boolean(payload.changedStart);
  var changedEnd = Boolean(payload.changedEnd);
  if (!changedStart && !changedEnd) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: '변경된 값이 없습니다.' } };
  }
  var cat = String(found[idx.internal_category] != null ? found[idx.internal_category] : '').trim().toLowerCase();
  var startCurrent = String(found[idx.product_start_date] != null ? found[idx.product_start_date] : '');
  var endCurrent = String(found[idx.product_end_date] != null ? found[idx.product_end_date] : '');
  var startOut = startCurrent;
  var endOut = endCurrent;
  if (changedStart) {
    var startYmd = dbStuNormalizeYmd_(payload.productStartDate != null ? String(payload.productStartDate) : '');
    if (!startYmd) {
      return { ok: false, error: { code: 'BAD_REQUEST', message: '시작일 형식이 올바르지 않습니다.' } };
    }
    startOut = startYmd + ' 00:00:00';
    if (!changedEnd) {
      if (cat === 'jasoseo') {
        endOut = '';
      } else {
        var nd = dbStuDefaultDurationDaysForCategory_(cat);
        endOut = dbStuEndDateFromStartYmd_(startOut, nd);
      }
    }
  }
  if (changedEnd) {
    var endYmd = dbStuNormalizeYmd_(payload.productEndDate != null ? String(payload.productEndDate) : '');
    endOut = endYmd ? endYmd + ' 23:59:59' : '';
  }
  if (cat !== 'jasoseo' && endOut) {
    var sDt = dbStuDateFromAny_(startOut);
    var eDt = dbStuDateFromAny_(endOut);
    if (sDt && eDt && eDt.getTime() < sDt.getTime()) {
      return { ok: false, error: { code: 'BAD_REQUEST', message: '종료일은 시작일보다 빠를 수 없습니다.' } };
    }
  }
  var nowIso = new Date().toISOString();
  shEv.getRange(rowNo, idx.product_start_date + 1, 1, 1).setValue(startOut);
  shEv.getRange(rowNo, idx.product_end_date + 1, 1, 1).setValue(endOut);
  if (idx.updated_at >= 0) {
    shEv.getRange(rowNo, idx.updated_at + 1, 1, 1).setValue(nowIso);
  }
  return {
    ok: true,
    data: {
      orderItemCode: orderItemCode,
      productStartDate: startOut,
      productEndDate: endOut,
      updatedAt: nowIso
    }
  };
}

/**
 * @param {Object} payload
 * @return {{ ok: true, data: { saved: number, rows: Object[] } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbStudentMgmtDateEditorSaveBatch_(payload) {
  payload = payload || {};
  var rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'rows가 비어 있습니다.' } };
  }
  var out = [];
  var i;
  for (i = 0; i < rows.length; i++) {
    var one = rows[i] || {};
    var r = dbStudentMgmtDateEditorSave_(one);
    if (!r || !r.ok) {
      return r || { ok: false, error: { code: 'SAVE_FAILED', message: '저장 실패' } };
    }
    out.push(r.data || {});
  }
  return { ok: true, data: { saved: out.length, rows: out } };
}

/**
 * (member_code + category)별 주문 상태 산정.
 * 규칙:
 * - 첫 주문: 신규
 * - 현재 시작일 - 직전 종료일 <= 14일: 재등록
 * - 현재 시작일 - 직전 종료일 > 14일: 다시옴
 * @param {Array<Array<*>>} rows
 * @param {{ memberCode: number, internalCategory: number, start: number, end: number, status: number, baseDate: number }} idx
 */
function dbStuApplyEnrollStatus_(rows, idx) {
  if (idx.status < 0 || idx.baseDate < 0) {
    return;
  }
  var groups = {};
  var i;
  for (i = 0; i < rows.length; i++) {
    var r = rows[i] || [];
    var mc = String(r[idx.memberCode] != null ? r[idx.memberCode] : '').trim();
    var cat = String(r[idx.internalCategory] != null ? r[idx.internalCategory] : '').trim().toLowerCase();
    if (!mc.length || !cat.length || cat === 'jasoseo') {
      continue;
    }
    var k = mc + '|' + cat;
    if (!groups[k]) {
      groups[k] = [];
    }
    groups[k].push(i);
  }
  var keys = Object.keys(groups);
  var ki;
  for (ki = 0; ki < keys.length; ki++) {
    var arr = groups[keys[ki]] || [];
    arr.sort(function (ai, bi) {
      var a = rows[ai] || [];
      var b = rows[bi] || [];
      var as = dbStuNormalizeYmd_(a[idx.start] != null ? String(a[idx.start]) : '');
      var bs = dbStuNormalizeYmd_(b[idx.start] != null ? String(b[idx.start]) : '');
      if (as !== bs) {
        return as.localeCompare(bs);
      }
      var ao = dbStuNormalizeYmd_(a[3] != null ? String(a[3]) : '');
      var bo = dbStuNormalizeYmd_(b[3] != null ? String(b[3]) : '');
      if (ao !== bo) {
        return ao.localeCompare(bo);
      }
      var aCode = String(a[0] != null ? a[0] : '');
      var bCode = String(b[0] != null ? b[0] : '');
      return aCode.localeCompare(bCode);
    });
    var j;
    for (j = 0; j < arr.length; j++) {
      var cur = rows[arr[j]] || [];
      if (j === 0) {
        cur[idx.status] = '신규';
        cur[idx.baseDate] = '';
        continue;
      }
      var prev = rows[arr[j - 1]] || [];
      var prevEndDt = dbStuDateFromAny_(prev[idx.end]);
      var curStartDt = dbStuDateFromAny_(cur[idx.start]);
      var gapDays = 9999;
      if (prevEndDt && curStartDt) {
        gapDays = Math.floor((curStartDt.getTime() - prevEndDt.getTime()) / 86400000);
        if (gapDays < 0) {
          gapDays = 0;
        }
      }
      cur[idx.status] = gapDays <= 14 ? '재등록' : '다시옴';
      cur[idx.baseDate] = dbStuNormalizeYmd_(prev[idx.end] != null ? String(prev[idx.end]) : '');
    }
  }
}

/**
 * 멤버 자동 상태(today 기준)
 * - 최신 수강 완료일(가장 늦은 종료일) +14일 < today: 이탈
 * - 수강 완료일 다음 날 ~ 완료+14일(이탈 기준일)까지: 주의 필요
 * - 그 외(완료일 당일까지): 수강중
 * @param {Array<Array<*>>} rows
 * @param {{ memberCode: number, category: number, end: number, start: number }} idx
 * @return {Object<string, { statusAuto: string, lastEndYmd: string }>}
 */
function dbStuBuildMemberStatusAutoMap_(rows, idx) {
  var latestEndByMember = {};
  var i;
  for (i = 0; i < rows.length; i++) {
    var r = rows[i] || [];
    var mc = String(r[idx.memberCode] != null ? r[idx.memberCode] : '').trim();
    var cat = String(r[idx.category] != null ? r[idx.category] : '').trim().toLowerCase();
    if (!mc.length || cat === 'jasoseo') {
      continue;
    }
    var endYmd = dbStuNormalizeYmd_(r[idx.end] != null ? String(r[idx.end]) : '');
    var startYmd = dbStuNormalizeYmd_(r[idx.start] != null ? String(r[idx.start]) : '');
    var key = endYmd || startYmd;
    if (!key.length) {
      continue;
    }
    if (!latestEndByMember[mc] || key > latestEndByMember[mc]) {
      latestEndByMember[mc] = key;
    }
  }
  var out = {};
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var codes = Object.keys(latestEndByMember);
  var ci;
  for (ci = 0; ci < codes.length; ci++) {
    var c = codes[ci];
    var ymd = latestEndByMember[c];
    var d = dbStuDateFromAny_(ymd);
    if (!d) {
      out[c] = { statusAuto: '이탈', lastEndYmd: '' };
      continue;
    }
    var lastEnd = new Date(d.getTime());
    lastEnd.setHours(0, 0, 0, 0);
    var exitDate = new Date(lastEnd.getTime());
    exitDate.setDate(exitDate.getDate() + 14);

    var st;
    if (today.getTime() > exitDate.getTime()) {
      st = '이탈';
    } else if (today.getTime() > lastEnd.getTime()) {
      st = '주의 필요';
    } else {
      st = '수강중';
    }
    out[c] = { statusAuto: st, lastEndYmd: ymd };
  }
  return out;
}

/**
 * 멤버별로 order_time 기준 **가장 최신** 이벤트 1건을 고른 뒤, 그게 환불(`claim_status=cancel`)이면 이탈 처리.
 * (날짜 편집 목록과 동일하게 cancel 행은 제외하지 않고 후보에 넣어 “최신이 환불”인지 본다.)
 * @param {Array<Array<*>>} rows
 * @param {{ memberCode: number, orderTime: number, claimStatus: number, orderItemCode: number, internalCategory: number }} idx
 * @return {Object<string, boolean>} member_code → true면 자동 상태를 이탈로 강제
 */
function dbStuMemberLatestOrderIsRefundChurn_(rows, idx) {
  if (idx.memberCode < 0 || idx.orderTime < 0 || idx.claimStatus < 0) {
    return {};
  }
  var bestKeyByMc = {};
  var latestIsRefund = {};
  var i;
  for (i = 0; i < rows.length; i++) {
    var r = rows[i] || [];
    var mc = String(r[idx.memberCode] != null ? r[idx.memberCode] : '').trim();
    if (!mc.length) {
      continue;
    }
    var cat = String(r[idx.internalCategory] != null ? r[idx.internalCategory] : '').trim().toLowerCase();
    if (cat === 'jasoseo' || !dbStuIsAllowedCategory_(cat)) {
      continue;
    }
    var ot = String(r[idx.orderTime] != null ? r[idx.orderTime] : '').trim();
    var itemCode = idx.orderItemCode >= 0 ? String(r[idx.orderItemCode] != null ? r[idx.orderItemCode] : '').trim() : '';
    var sortKey = dbStuNormalizeYmd_(ot) + '\t' + ot + '\t' + itemCode;
    var claimLo = String(r[idx.claimStatus] != null ? r[idx.claimStatus] : '').trim().toLowerCase();
    var isRefund = claimLo === 'cancel';
    if (!bestKeyByMc[mc] || sortKey > bestKeyByMc[mc]) {
      bestKeyByMc[mc] = sortKey;
      latestIsRefund[mc] = isRefund;
    }
  }
  var out = {};
  var codes = Object.keys(latestIsRefund);
  var j;
  for (j = 0; j < codes.length; j++) {
    var c = codes[j];
    if (latestIsRefund[c]) {
      out[c] = true;
    }
  }
  return out;
}

/**
 * 시트 셀에서 읽은 상태 문자열 정규화 (NBSP·제로폭·연속 공백 제거)
 * @param {string} s
 * @return {string}
 */
function dbStuNormalizeMemberStatusCell_(s) {
  var t = s != null ? String(s) : '';
  t = t.replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/**
 * 멤버 상태 override 유효값 검증. 빈 값은 허용(자동 사용).
 * @param {string} s
 * @return {string}
 */
function dbStuNormalizeMemberStatusOverride_(s) {
  var t = dbStuNormalizeMemberStatusCell_(s != null ? String(s) : '');
  if (!t) {
    return '';
  }
  if (t === '수강중' || t === '주의 필요' || t === '이탈' || t === '복귀 예정') {
    return t;
  }
  return '';
}

/**
 * @param {string} raw
 * @return {Array<{title: string, body: string, updatedAt: string}>}
 */
function dbStuParseRemarksJson_(raw) {
  var t = raw != null ? String(raw).trim() : '';
  if (!t.length) {
    return [];
  }
  var j = null;
  try {
    j = JSON.parse(t);
  } catch (_e) {
    j = null;
  }
  if (!Array.isArray(j)) {
    return [];
  }
  var out = [];
  var i;
  for (i = 0; i < j.length; i++) {
    var it = j[i] || {};
    out.push({
      title: it.title != null ? String(it.title) : '',
      body: it.body != null ? String(it.body) : '',
      updatedAt: it.updatedAt != null ? String(it.updatedAt) : ''
    });
  }
  return out;
}

/**
 * @param {Array<{title: string, body: string, updatedAt: string}>} items
 * @return {string}
 */
function dbStuStringifyRemarksJson_(items) {
  try {
    return JSON.stringify(items || []);
  } catch (_e) {
    return '[]';
  }
}

/**
 * @param {Date} d
 * @return {string}
 */
function dbStuYmdKst_(d) {
  var dt = d || new Date();
  var kst = new Date(dt.getTime() + 9 * 60 * 60000);
  var y = kst.getUTCFullYear();
  var m = ('0' + String(kst.getUTCMonth() + 1)).slice(-2);
  var dd = ('0' + String(kst.getUTCDate())).slice(-2);
  return String(y) + '-' + m + '-' + dd;
}

/**
 * @param {string} s
 * @return {string}
 */
function dbStuNormalizeProdNameKey_(s) {
  var t = s != null ? String(s) : '';
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/**
 * @param {string} s
 * @return {string}
 */
function dbStuNormalizeEnrollStatus_(s) {
  var t = s != null ? String(s).trim() : '';
  if (t === '신규' || t === '재등록' || t === '다시옴') {
    return t;
  }
  return '';
}

/**
 * @param {string} a
 * @param {string} b
 * @return {string}
 */
function dbStuMemberProdKey_(a, b) {
  return String(a != null ? a : '').trim() + '|' + String(b != null ? b : '').trim();
}

/**
 * @param {string} status
 * @return {number}
 */
function dbStuEnrollStatusPriority_(status) {
  if (status === '신규') return 3;
  if (status === '재등록') return 2;
  if (status === '다시옴') return 1;
  return 0;
}

/**
 * 일자별 수강 인원(상품명 기준) 리포트
 * payload:
 * - ymd: yyyy-MM-dd
 * @param {Object} payload
 * @return {{ ok: true, data: { ymd: string, rows: Object[], totals: Object, uniqueTotals: Object } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbStudentMgmtDailyPeopleReport_(payload) {
  payload = payload || {};
  var ymd = payload.ymd != null ? dbStuNormalizeYmd_(String(payload.ymd)) : '';
  if (!ymd) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'ymd(yyyy-MM-dd)가 필요합니다.' } };
  }
  var dayDt = dbStuDateFromAny_(ymd);
  if (!dayDt) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'ymd 형식이 올바르지 않습니다.' } };
  }
  dayDt.setHours(0, 0, 0, 0);

  var ssStu = dbStuOpen_();
  if (!ssStu) {
    return { ok: false, error: { code: 'NO_STUDENT_SHEET', message: '수강생 DB가 없습니다.' } };
  }
  var shE = ssStu.getSheetByName(DB_SHEET_STUDENT_ORDER_EVENTS);
  if (!shE || shE.getLastRow() < 2) {
    return { ok: false, error: { code: 'NO_EVENT_ROWS', message: '수강생 이벤트 데이터가 없습니다.' } };
  }
  var wE = DB_STUDENT_ORDER_EVENT_HEADERS.length;
  var eIdx = dbStuHeaderIndexMap_(shE, DB_STUDENT_ORDER_EVENT_HEADERS);
  var eVals = shE.getRange(2, 1, shE.getLastRow() - 1, wE).getValues();

  /** (prodKey, member)별로 오늘 기준 활성인 이벤트 중 "가장 최신 시작일"만 남김 */
  var bestByMemberProd = {};
  var i;
  for (i = 0; i < eVals.length; i++) {
    var r = eVals[i] || [];
    var mc = String(r[eIdx.member_code] != null ? r[eIdx.member_code] : '').trim();
    if (!mc.length) {
      continue;
    }
    var cat = String(r[eIdx.internal_category] != null ? r[eIdx.internal_category] : '').trim().toLowerCase();
    if (!cat.length || cat === 'unmapped' || cat === 'textbook' || cat === 'jasoseo') {
      continue;
    }
    var startYmd = dbStuNormalizeYmd_(r[eIdx.product_start_date] != null ? String(r[eIdx.product_start_date]) : '');
    var endYmd = dbStuNormalizeYmd_(r[eIdx.product_end_date] != null ? String(r[eIdx.product_end_date]) : '');
    if (!startYmd || !endYmd) {
      continue;
    }
    var stDt = dbStuDateFromAny_(startYmd);
    var enDt = dbStuDateFromAny_(endYmd);
    if (!stDt || !enDt) {
      continue;
    }
    stDt.setHours(0, 0, 0, 0);
    enDt.setHours(0, 0, 0, 0);
    if (dayDt.getTime() < stDt.getTime() || dayDt.getTime() > enDt.getTime()) {
      continue;
    }
    var prodName = String(r[eIdx.prod_name] != null ? r[eIdx.prod_name] : '').trim();
    var prodKey = dbStuNormalizeProdNameKey_(prodName);
    if (!prodKey.length) {
      continue;
    }
    var mpk = dbStuMemberProdKey_(mc, prodKey);
    var cur = bestByMemberProd[mpk];
    if (!cur) {
      bestByMemberProd[mpk] = {
        memberCode: mc,
        prodKey: prodKey,
        prodName: prodName,
        startYmd: startYmd,
        enrollStatus: dbStuNormalizeEnrollStatus_(r[eIdx.enroll_status])
      };
      continue;
    }
    /** 최신 시작일 우선, 같으면 문자열 비교로 안정 */
    if (startYmd > cur.startYmd) {
      cur.startYmd = startYmd;
      cur.enrollStatus = dbStuNormalizeEnrollStatus_(r[eIdx.enroll_status]);
      cur.prodName = prodName;
      cur.prodKey = prodKey;
    }
  }

  var byProd = {};
  var memberBestStatus = {};
  var keys = Object.keys(bestByMemberProd);
  var k;
  for (k = 0; k < keys.length; k++) {
    var it = bestByMemberProd[keys[k]];
    var pk = it.prodKey;
    if (!byProd[pk]) {
      byProd[pk] = {
        prodKey: pk,
        prodName: it.prodName,
        total: 0,
        신규: 0,
        재등록: 0,
        다시옴: 0
      };
    }
    byProd[pk].total += 1;
    if (it.enrollStatus && byProd[pk][it.enrollStatus] != null) {
      byProd[pk][it.enrollStatus] += 1;
    }
    var mc2 = it.memberCode;
    var curP = dbStuEnrollStatusPriority_(memberBestStatus[mc2] || '');
    var nextP = dbStuEnrollStatusPriority_(it.enrollStatus || '');
    if (nextP > curP) {
      memberBestStatus[mc2] = it.enrollStatus || '';
    }
  }

  var outRows = [];
  var prodKeys = Object.keys(byProd);
  prodKeys.sort(function (a, b) {
    return String(byProd[a].prodName || a).localeCompare(String(byProd[b].prodName || b));
  });
  var tot = { total: 0, 신규: 0, 재등록: 0, 다시옴: 0 };
  for (i = 0; i < prodKeys.length; i++) {
    var pr = byProd[prodKeys[i]];
    outRows.push({
      prodKey: pr.prodKey,
      prodName: pr.prodName,
      total: pr.total,
      신규: pr.신규,
      재등록: pr.재등록,
      다시옴: pr.다시옴
    });
    tot.total += pr.total;
    tot.신규 += pr.신규;
    tot.재등록 += pr.재등록;
    tot.다시옴 += pr.다시옴;
  }

  var uniqCodes = Object.keys(memberBestStatus);
  var uniq = { total: uniqCodes.length, 신규: 0, 재등록: 0, 다시옴: 0 };
  for (i = 0; i < uniqCodes.length; i++) {
    var st = memberBestStatus[uniqCodes[i]] || '';
    if (st === '신규') uniq.신규 += 1;
    else if (st === '재등록') uniq.재등록 += 1;
    else if (st === '다시옴') uniq.다시옴 += 1;
  }
  return { ok: true, data: { ymd: ymd, rows: outRows, totals: tot, uniqueTotals: uniq } };
}

/**
 * 상품(상품명 키) 클릭 시, 해당 날짜에 수강중인 학생 목록 반환(보기용)
 * payload:
 * - ymd: yyyy-MM-dd
 * - prodKey: normalize 된 상품명 키
 * @param {Object} payload
 * @return {{ ok: true, data: { ymd: string, prodKey: string, prodName: string, members: Object[] } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbStudentMgmtDailyPeopleProductMembers_(payload) {
  payload = payload || {};
  var ymd = payload.ymd != null ? dbStuNormalizeYmd_(String(payload.ymd)) : '';
  var prodKey = payload.prodKey != null ? dbStuNormalizeProdNameKey_(String(payload.prodKey)) : '';
  if (!ymd || !prodKey) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'ymd, prodKey가 필요합니다.' } };
  }
  var dayDt = dbStuDateFromAny_(ymd);
  if (!dayDt) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'ymd 형식이 올바르지 않습니다.' } };
  }
  dayDt.setHours(0, 0, 0, 0);

  var ssStu = dbStuOpen_();
  if (!ssStu) {
    return { ok: false, error: { code: 'NO_STUDENT_SHEET', message: '수강생 DB가 없습니다.' } };
  }
  var shE = ssStu.getSheetByName(DB_SHEET_STUDENT_ORDER_EVENTS);
  var shM = ssStu.getSheetByName(DB_SHEET_STUDENT_MEMBER_MASTER);
  if (!shE || shE.getLastRow() < 2) {
    return { ok: false, error: { code: 'NO_EVENT_ROWS', message: '수강생 이벤트 데이터가 없습니다.' } };
  }
  if (!shM || shM.getLastRow() < 2) {
    return { ok: false, error: { code: 'NO_MEMBER_ROWS', message: '수강생 멤버 데이터가 없습니다.' } };
  }

  var wE = DB_STUDENT_ORDER_EVENT_HEADERS.length;
  var eIdx = dbStuHeaderIndexMap_(shE, DB_STUDENT_ORDER_EVENT_HEADERS);
  var eVals = shE.getRange(2, 1, shE.getLastRow() - 1, wE).getValues();

  var memberSet = {};
  var prodNameBest = '';
  var i;
  for (i = 0; i < eVals.length; i++) {
    var r = eVals[i] || [];
    var mc = String(r[eIdx.member_code] != null ? r[eIdx.member_code] : '').trim();
    if (!mc.length) continue;
    var cat = String(r[eIdx.internal_category] != null ? r[eIdx.internal_category] : '').trim().toLowerCase();
    if (!cat.length || cat === 'unmapped' || cat === 'textbook' || cat === 'jasoseo') continue;
    var pn = String(r[eIdx.prod_name] != null ? r[eIdx.prod_name] : '').trim();
    var pk = dbStuNormalizeProdNameKey_(pn);
    if (pk !== prodKey) continue;
    var startYmd = dbStuNormalizeYmd_(r[eIdx.product_start_date] != null ? String(r[eIdx.product_start_date]) : '');
    var endYmd = dbStuNormalizeYmd_(r[eIdx.product_end_date] != null ? String(r[eIdx.product_end_date]) : '');
    if (!startYmd || !endYmd) continue;
    var stDt = dbStuDateFromAny_(startYmd);
    var enDt = dbStuDateFromAny_(endYmd);
    if (!stDt || !enDt) continue;
    stDt.setHours(0, 0, 0, 0);
    enDt.setHours(0, 0, 0, 0);
    if (dayDt.getTime() < stDt.getTime() || dayDt.getTime() > enDt.getTime()) continue;
    memberSet[mc] = 1;
    if (!prodNameBest && pn) prodNameBest = pn;
  }

  var mIdx = dbStuHeaderIndexMap_(shM, DB_STUDENT_MEMBER_HEADERS);
  var wM = DB_STUDENT_MEMBER_HEADERS.length;
  var mVals = shM.getRange(2, 1, shM.getLastRow() - 1, wM).getValues();
  var members = [];
  for (i = 0; i < mVals.length; i++) {
    var row = mVals[i] || [];
    var mc0 = String(row[mIdx.member_code] != null ? row[mIdx.member_code] : '').trim();
    if (!mc0.length || !memberSet[mc0]) continue;
    /** member_code, fetched_at, source_sync_id 제외 */
    members.push({
      uid: mIdx.uid >= 0 ? row[mIdx.uid] : '',
      name: mIdx.name >= 0 ? row[mIdx.name] : '',
      callnum: mIdx.callnum >= 0 ? row[mIdx.callnum] : '',
      last_login_time: mIdx.last_login_time >= 0 ? row[mIdx.last_login_time] : '',
      group_titles: mIdx.group_titles >= 0 ? row[mIdx.group_titles] : '',
      member_status_auto: mIdx.member_status_auto >= 0 ? row[mIdx.member_status_auto] : '',
      member_status_override: mIdx.member_status_override >= 0 ? row[mIdx.member_status_override] : '',
      member_status: mIdx.member_status >= 0 ? row[mIdx.member_status] : '',
      remarks_json: mIdx.remarks_json >= 0 ? row[mIdx.remarks_json] : ''
    });
  }
  members.sort(function (a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  return { ok: true, data: { ymd: ymd, prodKey: prodKey, prodName: prodNameBest || prodKey, members: members } };
}

/**
 * @return {{ id: string, url: string, already: boolean, createdNew: boolean }|{ error: { code: string, message: string } }}
 */
function dbInitStudentMgmtSheets_() {
  try {
    var p = PropertiesService.getScriptProperties();
    var existing = p.getProperty(DB_PROP_SHEETS_STUDENT_ID);
    existing = existing != null ? String(existing).trim() : '';
    if (existing) {
      if (!dbDriveSpreadsheetIdIsUsableNow_(existing)) {
        existing = '';
      } else {
        try {
          var ss0 = SpreadsheetApp.openById(existing);
          dbGetOrCreateSheetWithHeaders_(ss0, DB_SHEET_STUDENT_MEMBER_MASTER, DB_STUDENT_MEMBER_HEADERS);
          dbGetOrCreateSheetWithHeaders_(ss0, DB_SHEET_STUDENT_ORDER_EVENTS, DB_STUDENT_ORDER_EVENT_HEADERS);
          dbSheetClearColumnsAfter_(ss0.getSheetByName(DB_SHEET_STUDENT_MEMBER_MASTER), DB_STUDENT_MEMBER_HEADERS.length);
          dbSheetClearColumnsAfter_(ss0.getSheetByName(DB_SHEET_STUDENT_ORDER_EVENTS), DB_STUDENT_ORDER_EVENT_HEADERS.length);
          try {
            dbStudentMgmtRebuildFromMaster_();
          } catch (eR) {
            Logger.log('dbInitStudentMgmtSheets_ rebuild: ' + (eR && eR.message));
          }
          return {
            id: existing,
            url: 'https://docs.google.com/spreadsheets/d/' + existing + '/edit',
            already: true,
            createdNew: false
          };
        } catch (e0) {
          Logger.log('dbInitStudentMgmtSheets_: existing open fail ' + (e0 && e0.message));
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
          code: 'STUDENT_NO_DRIVE_PARENT',
          message:
            '수강생 DB를 둘 Drive 위치를 정하지 못했습니다. 먼저 「데이터 동기화」로 마스터 파일을 만든 뒤 다시 시도하세요.'
        }
      };
    }

    if (!existing) {
      var reusedId = dbAnFindSpreadsheetIdByNamesInFolder_(folderId, [DB_STUDENT_SPREADSHEET_TITLE]);
      if (reusedId) {
        var ssReuse = SpreadsheetApp.openById(reusedId);
        dbGetOrCreateSheetWithHeaders_(ssReuse, DB_SHEET_STUDENT_MEMBER_MASTER, DB_STUDENT_MEMBER_HEADERS);
        dbGetOrCreateSheetWithHeaders_(ssReuse, DB_SHEET_STUDENT_ORDER_EVENTS, DB_STUDENT_ORDER_EVENT_HEADERS);
        p.setProperty(DB_PROP_SHEETS_STUDENT_ID, reusedId);
        dbDeleteOrphanDefaultSheetIfAny_(ssReuse);
        try {
          dbStudentMgmtRebuildFromMaster_();
        } catch (eRR) {
          Logger.log('dbInitStudentMgmtSheets_ reused rebuild: ' + (eRR && eRR.message));
        }
        return {
          id: reusedId,
          url: 'https://docs.google.com/spreadsheets/d/' + reusedId + '/edit',
          already: true,
          createdNew: false
        };
      }
    }

    var file = dbDriveCreateSpreadsheetInFolder_(DB_STUDENT_SPREADSHEET_TITLE, folderId);
    if (!file || !file.id) {
      return {
        error: {
          code: 'STUDENT_DRIVE_CREATE_FAILED',
          message:
            '수강생 DB 스프레드시트를 만들지 못했습니다. Drive 권한·할당량을 확인하세요.'
        }
      };
    }

    var id = String(file.id).trim();
    var ss = dbOpenNewSpreadsheetByIdWithRetry_(id);
    if (!ss) {
      return {
        error: {
          code: 'STUDENT_OPEN_AFTER_CREATE',
          message: '만든 수강생 시트를 열지 못했습니다. 잠시 뒤 다시 시도하세요.'
        }
      };
    }

    dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_STUDENT_MEMBER_MASTER, DB_STUDENT_MEMBER_HEADERS);
    dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_STUDENT_ORDER_EVENTS, DB_STUDENT_ORDER_EVENT_HEADERS);
    dbDeleteOrphanDefaultSheetIfAny_(ss);
    p.setProperty(DB_PROP_SHEETS_STUDENT_ID, id);
    try {
      dbStudentMgmtRebuildFromMaster_();
    } catch (eR2) {
      Logger.log('dbInitStudentMgmtSheets_ new file rebuild: ' + (eR2 && eR2.message));
    }

    return {
      id: id,
      url: 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
      already: false,
      createdNew: true
    };
  } catch (x) {
    Logger.log('dbInitStudentMgmtSheets_ exception: ' + (x && x.message != null ? x.message : String(x)));
    return {
      error: {
        code: 'STUDENT_INIT_EXCEPTION',
        message: '수강생 DB 준비 중 예외: ' + (x && x.message != null ? String(x.message) : String(x))
      }
    };
  }
}

/**
 * 이벤트·마스터 전면 재구축 (수동 동기화 마지막 단계에서 호출)
 * @return {{ ok: true, data: { writtenEvents: number, writtenMembers: number, excluded: number, batchId: string } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbStudentMgmtRebuildFromMaster_() {
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
  var ssStu = dbStuOpen_();
  if (!ssStu) {
    return {
      ok: false,
      error: {
        code: 'NO_STUDENT_SHEET',
        message: '수강생 DB가 없습니다. 수강생 탭에서 「데이터 초기화」로 먼저 만듭니다.'
      }
    };
  }

  var shI = master.getSheetByName(DB_SHEET_ORDER_ITEMS);
  if (!shI || shI.getLastRow() < 2) {
    return { ok: false, error: { code: 'NO_ORDER_DATA', message: 'order_items 이 비어 있습니다. 먼저 주문을 동기화하세요.' } };
  }

  var shO = master.getSheetByName(DB_SHEET_ORDERS);
  var orderMap = {};
  var orderToMember = {};
  var ordererNameMap = {};
  /** 회원 코드별 주문자 표시 이름 — `members`에 없는 비회원·게스트 마스터 `name` 보강용 (같은 코드 여러 주문이면 마지막 값) */
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
    var ixUid = DB_MEMBERS_HEADERS.indexOf('uid');
    var ixName = DB_MEMBERS_HEADERS.indexOf('name');
    var ixCall = DB_MEMBERS_HEADERS.indexOf('callnum');
    var ixLast = DB_MEMBERS_HEADERS.indexOf('last_login_time');
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
        uid: ixUid >= 0 ? mRow[ixUid] : '',
        name: ixName >= 0 ? mRow[ixName] : '',
        callnum: ixCall >= 0 ? mRow[ixCall] : '',
        last_login_time: ixLast >= 0 ? mRow[ixLast] : '',
        group_titles: ixGt >= 0 ? mRow[ixGt] : ''
      };
    }
  }

  var pmMap = dbPmReadMappingMap_();
  var wI = DB_ORDER_ITEMS_HEADERS.length;
  var iLr = shI.getLastRow();
  var iVals = shI.getRange(2, 1, iLr - 1, wI).getValues();

  var shEv = ssStu.getSheetByName(DB_SHEET_STUDENT_ORDER_EVENTS);
  if (!shEv) {
    shEv = dbGetOrCreateSheetWithHeaders_(ssStu, DB_SHEET_STUDENT_ORDER_EVENTS, DB_STUDENT_ORDER_EVENT_HEADERS);
  }
  var preserve = dbStuReadPreserveDates_(shEv);
  var shMemberExisting = ssStu.getSheetByName(DB_SHEET_STUDENT_MEMBER_MASTER);
  var preserveMemOps = dbStuReadPreserveMemberOps_(shMemberExisting);

  var evHeaders = DB_STUDENT_ORDER_EVENT_HEADERS;
  var ixEvStart = evHeaders.indexOf('product_start_date');
  var ixEvEnd = evHeaders.indexOf('product_end_date');
  var ixEvStatus = evHeaders.indexOf('enroll_status');
  var ixEvBase = evHeaders.indexOf('rereg_base_date');
  var ixEvUpdated = evHeaders.indexOf('updated_at');

  var outEv = [];
  var skipped = 0;
  var batchId = 'stu-' + new Date().getTime();
  var nowIso = new Date().toISOString();

  var j;
  for (j = 0; j < iVals.length; j++) {
    var L = iVals[j] || [];
    var itemSkip = String(L[1] != null ? L[1] : '').trim();
    if (itemSkip && DB_STU_FORCE_SKIP_ORDER_ITEM_CODES_[itemSkip]) {
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
    var memCode = ordNo && orderToMember[ordNo] != null ? String(orderToMember[ordNo]).trim() : '';
    var gTitles = memCode.length && memberToGroupTitles[memCode] ? memberToGroupTitles[memCode] : [];

    if (dbStuSkipByPurchaser_(ordNo, ordererNameMap)) {
      skipped++;
      continue;
    }
    if (!dbStuIsAllowedCategory_(cat) || cat === 'unmapped' || cat === 'textbook') {
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

    var orderTimeRaw = orderMap[ordNo] != null ? orderMap[ordNo] : '';
    var orderTimeStr = orderTimeRaw != null ? String(orderTimeRaw) : '';

    var pStart;
    var pEnd;
    var catLo = cat.toLowerCase();
    if (catLo === 'jasoseo') {
      pStart = orderTimeStr;
      pEnd = '';
    } else {
      pStart = dbStuNextDayMidnightSeoulString_(orderTimeRaw);
      var nd = dbStuDefaultDurationDaysForCategory_(cat);
      pEnd = dbStuEndDateFromStartYmd_(pStart, nd);
    }

    var rowEv = [
      L[1],
      ordNo,
      memCode,
      orderTimeStr,
      cat,
      life,
      pStart,
      pEnd,
      '',
      '',
      L[3],
      L[4],
      L[5],
      L[6],
      L[7],
      L[8],
      L[9],
      L[15],
      L[16],
      L[17],
      '',
      nowIso,
      batchId
    ];

    var itemCode = String(L[1] != null ? L[1] : '').trim();
    var prev = itemCode.length ? preserve[itemCode] : null;
    if (prev) {
      if (prev.start !== '' && prev.start != null) {
        rowEv[ixEvStart] = prev.start;
      }
      if (prev.end !== '' && prev.end != null) {
        rowEv[ixEvEnd] = prev.end;
      }
      if (prev.updated !== '' && prev.updated != null) {
        rowEv[ixEvUpdated] = prev.updated;
      }
    }
    if (catLo === 'jasoseo') {
      rowEv[ixEvEnd] = '';
    }

    outEv.push(rowEv);
  }
  var fixedPack = dbStuBuildFixedManualRows_(preserve, nowIso, batchId);
  var fixedRows = fixedPack.rows || [];
  var manualNameByMemberCode = fixedPack.manualNameByMemberCode || {};
  var fr;
  for (fr = 0; fr < fixedRows.length; fr++) {
    outEv.push(fixedRows[fr]);
  }
  dbStuApplyEnrollStatus_(outEv, {
    memberCode: 2,
    internalCategory: 4,
    start: ixEvStart,
    end: ixEvEnd,
    status: ixEvStatus,
    baseDate: ixEvBase
  });
  var memberAutoMap = dbStuBuildMemberStatusAutoMap_(outEv, {
    memberCode: 2,
    category: 4,
    start: ixEvStart,
    end: ixEvEnd
  });
  var ixEvClaim = evHeaders.indexOf('claim_status');
  var refundChurnByMember = dbStuMemberLatestOrderIsRefundChurn_(outEv, {
    memberCode: 2,
    orderTime: 3,
    claimStatus: ixEvClaim,
    orderItemCode: 0,
    internalCategory: 4
  });

  var memberCodes = {};
  var k;
  for (k = 0; k < outEv.length; k++) {
    var mc = String(outEv[k][2] != null ? outEv[k][2] : '').trim();
    if (mc.length) {
      memberCodes[mc] = 1;
    }
  }
  var outMem = [];
  var mcList = Object.keys(memberCodes);
  var mi;
  for (mi = 0; mi < mcList.length; mi++) {
    var code = mcList[mi];
    var mr = memberRowByCode[code];
    var ops = preserveMemOps[code] || { statusOverride: '', remarksJson: '' };
    var ov = dbStuNormalizeMemberStatusOverride_(ops.statusOverride);
    var autoPack = memberAutoMap[code] || { statusAuto: '이탈', lastEndYmd: '' };
    var autoStatus = autoPack.statusAuto || '이탈';
    if (refundChurnByMember[code]) {
      autoStatus = '이탈';
    }
    var finalStatus = ov ? ov : autoStatus;
    var remarksJson = ops.remarksJson != null ? String(ops.remarksJson) : '';
    if (!mr) {
      var nmGuest =
        manualNameByMemberCode[code] != null
          ? String(manualNameByMemberCode[code]).trim()
          : ordererNameByMemberCode[code] != null ? String(ordererNameByMemberCode[code]).trim() : '';
      var nameGuest = nmGuest.length ? nmGuest + '(비회원)' : '';
      var groupTitlesGuest = JSON.stringify(['비회원']);
      outMem.push([
        code,
        '',
        nameGuest,
        '',
        '',
        groupTitlesGuest,
        autoStatus,
        ov,
        finalStatus,
        remarksJson,
        nowIso,
        batchId
      ]);
    } else {
      outMem.push([
        code,
        mr.uid,
        mr.name,
        mr.callnum,
        mr.last_login_time,
        mr.group_titles,
        autoStatus,
        ov,
        finalStatus,
        remarksJson,
        nowIso,
        batchId
      ]);
    }
  }
  outMem.sort(function (a, b) {
    return String(a[0]).localeCompare(String(b[0]));
  });

  var shM = ssStu.getSheetByName(DB_SHEET_STUDENT_MEMBER_MASTER);
  if (!shM) {
    shM = dbGetOrCreateSheetWithHeaders_(ssStu, DB_SHEET_STUDENT_MEMBER_MASTER, DB_STUDENT_MEMBER_HEADERS);
  }
  dbEnsureHeaderRow1_(shEv, DB_STUDENT_ORDER_EVENT_HEADERS);
  dbEnsureHeaderRow1_(shM, DB_STUDENT_MEMBER_HEADERS);
  dbSheetClearColumnsAfter_(shEv, DB_STUDENT_ORDER_EVENT_HEADERS.length);
  dbSheetClearColumnsAfter_(shM, DB_STUDENT_MEMBER_HEADERS.length);

  var wE = DB_STUDENT_ORDER_EVENT_HEADERS.length;
  var wM = DB_STUDENT_MEMBER_HEADERS.length;
  dbClearDataRows2Plus_(shEv, wE);
  dbClearDataRows2Plus_(shM, wM);
  if (outEv.length) {
    shEv.getRange(2, 1, outEv.length, wE).setValues(outEv);
  }
  if (outMem.length) {
    shM.getRange(2, 1, outMem.length, wM).setValues(outMem);
  }

  if (outEv.length) {
    var nEv = outEv.length;
    shEv.getRange(2, 4, nEv, 1).setNumberFormat('@');
    shEv.getRange(2, 7, nEv, 2).setNumberFormat('@');
    if (ixEvBase >= 0) {
      shEv.getRange(2, ixEvBase + 1, nEv, 1).setNumberFormat('@');
    }
    shEv.getRange(2, evHeaders.indexOf('claim_event_time') + 1, nEv, 1).setNumberFormat('@');
  }

  return {
    ok: true,
    data: {
      writtenEvents: outEv.length,
      writtenMembers: outMem.length,
      excluded: skipped,
      batchId: batchId
    }
  };
}

/**
 * 멤버 상태/메모 리스트 조회(프론트용)
 * @return {{ ok: true, data: { rows: Object[], warnCount: number, warnRows: Object[] } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbStudentMgmtMemberList_() {
  var ssStu = dbStuOpen_();
  if (!ssStu) {
    return { ok: false, error: { code: 'NO_STUDENT_SHEET', message: '수강생 DB가 없습니다.' } };
  }
  var shM = ssStu.getSheetByName(DB_SHEET_STUDENT_MEMBER_MASTER);
  var shE = ssStu.getSheetByName(DB_SHEET_STUDENT_ORDER_EVENTS);
  if (!shM || shM.getLastRow() < 2) {
    return { ok: false, error: { code: 'NO_MEMBER_ROWS', message: '수강생 멤버 데이터가 없습니다.' } };
  }
  var mIdx = dbStuHeaderIndexMap_(shM, DB_STUDENT_MEMBER_HEADERS);
  var wM = DB_STUDENT_MEMBER_HEADERS.length;
  var mVals = shM.getRange(2, 1, shM.getLastRow() - 1, wM).getValues();

  var subjectsByMember = {};
  if (shE && shE.getLastRow() >= 2) {
    var wE = DB_STUDENT_ORDER_EVENT_HEADERS.length;
    var eIdx = dbStuHeaderIndexMap_(shE, DB_STUDENT_ORDER_EVENT_HEADERS);
    var eVals = shE.getRange(2, 1, shE.getLastRow() - 1, wE).getValues();
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    /** 멤버·카테고리별 가장 최신 주문 1건이 환불이면 과목 표시에서 제외 */
    var latestByMcCat = {};
    var i0;
    for (i0 = 0; i0 < eVals.length; i0++) {
      var r0 = eVals[i0] || [];
      var mc0 = String(r0[eIdx.member_code] != null ? r0[eIdx.member_code] : '').trim();
      if (!mc0.length) {
        continue;
      }
      var cat0 = String(r0[eIdx.internal_category] != null ? r0[eIdx.internal_category] : '').trim().toLowerCase();
      if (!cat0.length || cat0 === 'jasoseo' || cat0 === 'textbook' || cat0 === 'unmapped') {
        continue;
      }
      var ot0 = String(r0[eIdx.order_time] != null ? r0[eIdx.order_time] : '').trim();
      var item0 = String(r0[eIdx.order_item_code] != null ? r0[eIdx.order_item_code] : '').trim();
      var sk0 = dbStuNormalizeYmd_(ot0) + '\t' + ot0 + '\t' + item0;
      var k0 = mc0 + '\t' + cat0;
      var cl0 = String(r0[eIdx.claim_status] != null ? r0[eIdx.claim_status] : '').trim().toLowerCase();
      var can0 = cl0 === 'cancel';
      if (!latestByMcCat[k0] || sk0 > latestByMcCat[k0].sortKey) {
        latestByMcCat[k0] = { sortKey: sk0, isCancel: can0 };
      }
    }
    var i;
    for (i = 0; i < eVals.length; i++) {
      var r = eVals[i] || [];
      var mc = String(r[eIdx.member_code] != null ? r[eIdx.member_code] : '').trim();
      if (!mc.length) {
        continue;
      }
      var cat = String(r[eIdx.internal_category] != null ? r[eIdx.internal_category] : '').trim().toLowerCase();
      if (!cat.length || cat === 'jasoseo' || cat === 'textbook' || cat === 'unmapped') {
        continue;
      }
      var lk = mc + '\t' + cat;
      var le = latestByMcCat[lk];
      if (le && le.isCancel) {
        continue;
      }
      var endDt = dbStuDateFromAny_(r[eIdx.product_end_date]);
      if (!endDt) {
        continue;
      }
      endDt.setHours(0, 0, 0, 0);
      endDt.setDate(endDt.getDate() + 14);
      if (endDt.getTime() < today.getTime()) {
        continue;
      }
      if (!subjectsByMember[mc]) {
        subjectsByMember[mc] = {};
      }
      subjectsByMember[mc][cat] = 1;
    }
  }

  var out = [];
  var warn = [];
  var j;
  for (j = 0; j < mVals.length; j++) {
    var row = mVals[j] || [];
    var mc0 = String(row[mIdx.member_code] != null ? row[mIdx.member_code] : '').trim();
    if (!mc0.length) {
      continue;
    }
    var name0 = mIdx.name >= 0 ? String(row[mIdx.name] != null ? row[mIdx.name] : '').trim() : '';
    var stAuto =
      mIdx.member_status_auto >= 0
        ? dbStuNormalizeMemberStatusCell_(String(row[mIdx.member_status_auto] != null ? row[mIdx.member_status_auto] : ''))
        : '';
    var stOv = mIdx.member_status_override >= 0 ? dbStuNormalizeMemberStatusOverride_(row[mIdx.member_status_override]) : '';
    var stFinal =
      mIdx.member_status >= 0
        ? dbStuNormalizeMemberStatusCell_(String(row[mIdx.member_status] != null ? row[mIdx.member_status] : ''))
        : '';
    var remarksRaw = mIdx.remarks_json >= 0 ? String(row[mIdx.remarks_json] != null ? row[mIdx.remarks_json] : '') : '';

    var subMap = subjectsByMember[mc0] || {};
    var subKeys = Object.keys(subMap);
    subKeys.sort();
    var subjects = subKeys.join(', ');

    var rec = {
      memberCode: mc0,
      name: name0,
      subjects: subjects,
      statusAuto: stAuto,
      statusOverride: stOv,
      statusFinal: stFinal,
      remarksJson: remarksRaw
    };
    out.push(rec);
    if (stFinal === '주의 필요') {
      warn.push({ memberCode: mc0, name: name0, subjects: subjects });
    }
  }
  out.sort(function (a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  warn.sort(function (a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  return { ok: true, data: { rows: out, warnCount: warn.length, warnRows: warn } };
}

/**
 * 멤버 상태 override/메모 저장(프론트용)
 * payload:
 * - memberCode (필수)
 * - statusOverride (선택: '', '수강중', '주의 필요', '이탈', '복귀 예정')
 * - appendRemark (선택: boolean)
 * - remarkBody (선택: string; 비어도 appendRemark면 저장됨)
 * @param {Object} payload
 * @return {{ ok: true, data: { memberCode: string } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbStudentMgmtMemberSave_(payload) {
  payload = payload || {};
  var mc = payload.memberCode != null ? String(payload.memberCode).trim() : '';
  if (!mc.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'memberCode가 필요합니다.' } };
  }
  var ssStu = dbStuOpen_();
  if (!ssStu) {
    return { ok: false, error: { code: 'NO_STUDENT_SHEET', message: '수강생 DB가 없습니다.' } };
  }
  var shM = ssStu.getSheetByName(DB_SHEET_STUDENT_MEMBER_MASTER);
  if (!shM || shM.getLastRow() < 2) {
    return { ok: false, error: { code: 'NO_MEMBER_ROWS', message: '수강생 멤버 데이터가 없습니다.' } };
  }
  var idx = dbStuHeaderIndexMap_(shM, DB_STUDENT_MEMBER_HEADERS);
  if (idx.member_code == null) {
    return { ok: false, error: { code: 'BAD_SCHEMA', message: 'member_code 헤더가 없습니다.' } };
  }
  var w = DB_STUDENT_MEMBER_HEADERS.length;
  var vals = shM.getRange(2, 1, shM.getLastRow() - 1, w).getValues();
  var rowNo = -1;
  var found = null;
  var i;
  for (i = 0; i < vals.length; i++) {
    var r = vals[i] || [];
    if (String(r[idx.member_code] != null ? r[idx.member_code] : '').trim() === mc) {
      rowNo = i + 2;
      found = r;
      break;
    }
  }
  if (rowNo < 2 || !found) {
    return { ok: false, error: { code: 'NOT_FOUND', message: '해당 멤버를 찾지 못했습니다.' } };
  }

  var nextOverride =
    payload.statusOverride != null ? dbStuNormalizeMemberStatusOverride_(String(payload.statusOverride)) : null;
  var appendRemark = Boolean(payload.appendRemark);
  var remarkBody = payload.remarkBody != null ? String(payload.remarkBody) : '';

  var nowIso = new Date().toISOString();

  if (nextOverride !== null && idx.member_status_override != null && idx.member_status_override >= 0) {
    shM.getRange(rowNo, idx.member_status_override + 1, 1, 1).setValue(nextOverride);
  }

  if (appendRemark && idx.remarks_json != null && idx.remarks_json >= 0) {
    var curRaw = found[idx.remarks_json] != null ? String(found[idx.remarks_json]) : '';
    var items = dbStuParseRemarksJson_(curRaw);
    var ymd = dbStuYmdKst_(new Date());
    var title = ymd + ' 메모';
    items.unshift({ title: title, body: remarkBody, updatedAt: nowIso });
    if (items.length > 50) {
      items = items.slice(0, 50);
    }
    shM.getRange(rowNo, idx.remarks_json + 1, 1, 1).setValue(dbStuStringifyRemarksJson_(items));
  }

  return { ok: true, data: { memberCode: mc } };
}
