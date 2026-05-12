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
 * members.callnum 등 → 숫자만 (플래너 매칭용). 10~11자리만 허용.
 * @param {unknown} raw
 * @return {string}
 */
function dbPlannerNormalizePhoneFromCallnum_(raw) {
  var d = String(raw != null ? raw : '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) {
    return d;
  }
  return '';
}

/**
 * 원천 마스터 `order_items` + `product_mapping`에서 **솔패스** 구매 이력이 있는 회원만 모아 `planner_registry`를 덮어쓴다.
 * 제외 규칙은 `dbStudentMgmtRebuildFromMaster_`와 동일(구매자 이름·`dbAnOrderLineSkipForAnalytics_` 등), 단 **internal_category === solpass** 인 라인만 집계한다.
 *
 * @return {{ ok: true, data: { written: number, skippedLines: number, skippedNoPhone: number } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbPlannerRebuildRegistryFromMaster_() {
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
        callnum: ixCall >= 0 ? mRow[ixCall] : ''
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

  var nowIso = Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss");
  var out = [];
  var skippedNoPhone = 0;
  var codes = Object.keys(firstSol);
  codes.sort();
  var ci;
  for (ci = 0; ci < codes.length; ci++) {
    var mc = codes[ci];
    var phone = '';
    var disp = '';
    var mr = memberRowByCode[mc];
    if (mr) {
      phone = dbPlannerNormalizePhoneFromCallnum_(mr.callnum);
      disp = String(mr.name != null ? mr.name : '').trim();
    }
    if (!disp.length && ordererNameByMemberCode[mc]) {
      disp = String(ordererNameByMemberCode[mc]).trim();
    }
    if (!phone.length) {
      skippedNoPhone++;
      continue;
    }
    out.push([mc, phone, disp, firstSol[mc].item || '', nowIso]);
  }

  var shReg = dbGetOrCreateSheetWithHeaders_(ssPl, DB_SHEET_PLANNER_REGISTRY, DB_PLANNER_REGISTRY_HEADERS);
  var nCol = DB_PLANNER_REGISTRY_HEADERS.length;
  dbClearDataRows2Plus_(shReg, nCol);
  if (out.length) {
    dbSetValuesFromRow2_(shReg, out, nCol);
  }

  var prov = dbPlannerProvisionStudentsFromRegistry_(ssPl);
  return {
    ok: true,
    data: {
      written: out.length,
      skippedLines: skipped,
      skippedNoPhone: skippedNoPhone,
      provisioned: prov.provisioned,
      reusedStudentFiles: prov.reused,
      trashedBrokenLinks: prov.trashedBroken,
      trashedOrphanLinks: prov.trashedOrphans,
      provisionErrors: prov.provisionErrors
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
 * @param {string} memberCode
 * @return {string}
 */
function dbPlannerSanitizeMemberCodeForFileName_(memberCode) {
  var raw = String(memberCode != null ? memberCode : '').trim();
  if (!raw.length) {
    return 'unknown';
  }
  var t = raw.replace(/[^a-zA-Z0-9._-]+/g, '_');
  if (t.length > 64) {
    t = t.slice(0, 64);
  }
  return t.length ? t : 'unknown';
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function dbPlannerEnsurePersonalTodoSheet_(ss) {
  dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_PLANNER_PERSONAL_TODOS, DB_PLANNER_PERSONAL_TODO_HEADERS);
  dbDeleteOrphanDefaultSheetIfAny_(ss);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs
 * @param {string} memberCode
 * @return {string} 새 스프레드시트 ID 또는 실패 시 ''
 */
function dbPlannerCreateStudentPlannerSpreadsheet_(masterSs, memberCode) {
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
  var title = DB_PLANNER_STUDENT_FILE_TITLE_PREFIX + dbPlannerSanitizeMemberCodeForFileName_(memberCode);
  var file = dbDriveCreateSpreadsheetInFolder_(title, folderId);
  if (!file || !file.id) {
    return '';
  }
  var id = String(file.id).trim();
  var ss = dbOpenNewSpreadsheetByIdWithRetry_(id);
  if (!ss) {
    return '';
  }
  dbPlannerEnsurePersonalTodoSheet_(ss);
  return id;
}

/**
 * `planner_registry`에 있는 `member_code`마다 학생 파일이 있게 맞춘다. 레지스트리에 없는 링크 행은 제거하고 해당 파일은 휴지통으로 보낸다.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} masterSs
 * @return {{ provisioned: number, reused: number, trashedBroken: number, trashedOrphans: number, provisionErrors: number, error?: { code: string, message: string } }}
 */
function dbPlannerProvisionStudentsFromRegistry_(masterSs) {
  var nowIso = Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss");
  var out = {
    provisioned: 0,
    reused: 0,
    trashedBroken: 0,
    trashedOrphans: 0,
    provisionErrors: 0
  };
  var shLinks = dbGetOrCreateSheetWithHeaders_(masterSs, DB_SHEET_PLANNER_STUDENT_LINKS, DB_PLANNER_STUDENT_LINK_HEADERS);
  var wL = DB_PLANNER_STUDENT_LINK_HEADERS.length;

  var regCodes = dbPlannerReadRegistryMemberCodesOrdered_(masterSs);
  var regSet = {};
  var ri;
  for (ri = 0; ri < regCodes.length; ri++) {
    regSet[regCodes[ri]] = true;
  }

  /** @type {Object<string, { sid: string, prov: string }>} */
  var linkByMc = {};
  if (shLinks.getLastRow() >= 2) {
    var lr0 = shLinks.getLastRow();
    var n0 = lr0 - 2 + 1;
    var lv = shLinks.getRange(2, 1, n0, wL).getValues();
    var li;
    for (li = 0; li < lv.length; li++) {
      var rowL = lv[li] || [];
      var mc0 = String(rowL[0] != null ? rowL[0] : '').trim();
      if (!mc0.length) {
        continue;
      }
      linkByMc[mc0] = {
        sid: String(rowL[1] != null ? rowL[1] : '').trim(),
        prov: String(rowL[2] != null ? rowL[2] : '').trim()
      };
    }
  }

  var mcOrphan;
  for (mcOrphan in linkByMc) {
    if (!Object.prototype.hasOwnProperty.call(linkByMc, mcOrphan)) {
      continue;
    }
    if (regSet[mcOrphan]) {
      continue;
    }
    var sidO = linkByMc[mcOrphan].sid;
    if (sidO) {
      dbPlannerTrashFileBestEffort_(sidO);
      out.trashedOrphans++;
    }
  }

  var newRows = [];
  var ci;
  for (ci = 0; ci < regCodes.length; ci++) {
    var mc = regCodes[ci];
    var prev = linkByMc[mc];
    var sid = prev && prev.sid ? prev.sid : '';
    var provOld = prev && prev.prov ? prev.prov : '';
    var usable = sid.length > 0 && dbDriveSpreadsheetIdIsUsableNow_(sid);
    if (usable) {
      try {
        var ssSt = SpreadsheetApp.openById(sid);
        dbPlannerEnsurePersonalTodoSheet_(ssSt);
        newRows.push([mc, sid, provOld.length ? provOld : nowIso]);
        out.reused++;
        continue;
      } catch (e1) {
        Logger.log('dbPlannerProvisionStudentsFromRegistry_: open fail ' + sid + ' ' + (e1 && e1.message != null ? e1.message : String(e1)));
        usable = false;
      }
    }
    if (sid.length) {
      dbPlannerTrashFileBestEffort_(sid);
      out.trashedBroken++;
    }
    var nid = dbPlannerCreateStudentPlannerSpreadsheet_(masterSs, mc);
    if (!nid.length) {
      out.provisionErrors++;
      continue;
    }
    newRows.push([mc, nid, nowIso]);
    out.provisioned++;
  }

  dbClearDataRows2Plus_(shLinks, wL);
  if (newRows.length) {
    dbSetValuesFromRow2_(shLinks, newRows, wL);
  }
  return out;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {string[]}
 */
function dbPlannerReadRegistryMemberCodesOrdered_(ss) {
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_REGISTRY);
  if (!sh || sh.getLastRow() < 2) {
    return [];
  }
  var lr = sh.getLastRow();
  var n = lr - 2 + 1;
  var vals = sh.getRange(2, 1, n, 1).getValues();
  var out = [];
  var seen = {};
  var i;
  for (i = 0; i < vals.length; i++) {
    var mc = String(vals[i][0] != null ? vals[i][0] : '').trim();
    if (!mc.length || seen[mc]) {
      continue;
    }
    seen[mc] = true;
    out.push(mc);
  }
  return out;
}

/**
 * 제작용: 연결된 **모든** 학생 플래너 스프레드시트를 휴지통으로 보내고, 마스터의 `planner_registry`·`planner_member_records`·`planner_student_links` 본문(2행~)을 비운다.
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
  var shMr = ss.getSheetByName(DB_SHEET_PLANNER_MEMBER_RECORDS);
  if (shMr) {
    dbClearDataRows2Plus_(shMr, DB_PLANNER_MEMBER_RECORD_HEADERS.length);
  }
  if (shLinks) {
    dbClearDataRows2Plus_(shLinks, DB_PLANNER_STUDENT_LINK_HEADERS.length);
  }
  return {
    ok: true,
    data: {
      trashedStudentFiles: trashed,
      clearedTabs: [DB_SHEET_PLANNER_REGISTRY, DB_SHEET_PLANNER_MEMBER_RECORDS, DB_SHEET_PLANNER_STUDENT_LINKS]
    }
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {{ member_code: string, phone_normalized: string, display_name: string }[]}
 */
function dbPlannerReadRegistryRows_(ss) {
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_REGISTRY);
  if (!sh || sh.getLastRow() < 2) {
    return [];
  }
  var lr = sh.getLastRow();
  var nCols = DB_PLANNER_REGISTRY_HEADERS.length;
  var numRows = lr - 2 + 1;
  if (numRows < 1) {
    return [];
  }
  var vals = sh.getRange(2, 1, numRows, nCols).getValues();
  var out = [];
  var i;
  for (i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    var mc = String(row[0] != null ? row[0] : '').trim();
    var ph = String(row[1] != null ? row[1] : '').replace(/\D/g, '');
    var dn = String(row[2] != null ? row[2] : '').trim();
    if (!ph.length) {
      continue;
    }
    out.push({ member_code: mc, phone_normalized: ph, display_name: dn });
  }
  return out;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} phone
 * @param {string} nameEntered
 * @param {string} outcome
 * @param {string} memberCode
 */
function dbPlannerAppendMemberRecord_(ss, phone, nameEntered, outcome, memberCode) {
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_MEMBER_RECORDS);
  if (!sh) {
    return;
  }
  var rid = 'pmr_' + String(Utilities.getUuid()).replace(/-/g, '');
  var ts = Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss");
  sh.appendRow([
    rid,
    ts,
    String(phone != null ? phone : ''),
    String(nameEntered != null ? nameEntered : ''),
    String(outcome != null ? outcome : ''),
    String(memberCode != null ? memberCode : '')
  ]);
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
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} memberCode
 * @return {string}
 */
function dbPlannerStudentSpreadsheetId_(ss, memberCode) {
  var mc = String(memberCode != null ? memberCode : '').trim();
  if (!mc.length) {
    return '';
  }
  var sh = ss.getSheetByName(DB_SHEET_PLANNER_STUDENT_LINKS);
  if (!sh || sh.getLastRow() < 2) {
    return '';
  }
  var lr = sh.getLastRow();
  var numRows = lr - 2 + 1;
  if (numRows < 1) {
    return '';
  }
  var vals = sh.getRange(2, 1, numRows, 2).getValues();
  var i;
  for (i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    if (String(row[0] != null ? row[0] : '').trim() === mc) {
      return String(row[1] != null ? row[1] : '').trim();
    }
  }
  return '';
}

/**
 * @param {string} spreadsheetId
 * @return {{ title: string, start_date: string, end_date: string, sort_key: number }[]}
 */
function dbPlannerReadPersonalStub_(spreadsheetId) {
  var sid = String(spreadsheetId != null ? spreadsheetId : '').trim();
  if (!sid.length || !dbDriveSpreadsheetIdIsUsableNow_(sid)) {
    return [];
  }
  try {
    var ss = SpreadsheetApp.openById(sid);
    var sh = ss.getSheetByName(DB_SHEET_PLANNER_PERSONAL_TODOS);
    if (!sh || sh.getLastRow() < 2) {
      return [];
    }
    var lr = sh.getLastRow();
    var nCols = DB_PLANNER_PERSONAL_TODO_HEADERS.length;
    var n = lr - 2 + 1;
    var vals = sh.getRange(2, 1, n, nCols).getValues();
    var ixTitle = DB_PLANNER_PERSONAL_TODO_HEADERS.indexOf('title');
    var ixDue = DB_PLANNER_PERSONAL_TODO_HEADERS.indexOf('due_date');
    var ixStart = DB_PLANNER_PERSONAL_TODO_HEADERS.indexOf('start_date');
    var ixSort = DB_PLANNER_PERSONAL_TODO_HEADERS.indexOf('sort_key');
    var out = [];
    var i;
    for (i = 0; i < vals.length; i++) {
      var row = vals[i] || [];
      var title = String(row[ixTitle] != null ? row[ixTitle] : '').trim();
      if (!title.length) {
        title = '(제목 없음)';
      }
      var due = ixDue >= 0 ? String(row[ixDue] != null ? row[ixDue] : '').trim() : '';
      var start = ixStart >= 0 ? String(row[ixStart] != null ? row[ixStart] : '').trim() : '';
      var sd = due.length ? due : start;
      var sk = row[ixSort];
      var skn = sk != null && String(sk).trim() !== '' ? Number(sk) : 0;
      if (!isFinite(skn)) {
        skn = 0;
      }
      out.push({
        title: title,
        start_date: sd,
        end_date: '',
        sort_key: skn
      });
    }
    out.sort(function (a, b) {
      var da = String(a.start_date || '');
      var db = String(b.start_date || '');
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
    dbPlannerAppendMemberRecord_(ss, '', nameIn, 'bad_phone', '');
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
  var memberCode = '';
  var displayName = null;
  var needName = false;
  if (hits.length === 0) {
    outcome = 'no_match';
  } else if (hits.length === 1) {
    outcome = 'matched';
    memberCode = hits[0].member_code;
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
        memberCode = narrowed[0].member_code;
        displayName = narrowed[0].display_name || null;
      } else {
        outcome = 'name_mismatch';
      }
    }
  }
  dbPlannerAppendMemberRecord_(ss, phone, nameIn, outcome, memberCode);
  return {
    ok: true,
    data: {
      outcome: outcome,
      needName: needName,
      memberCode: memberCode.length ? memberCode : null,
      displayName: displayName
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
  var memberCodeReq = String(body.memberCode != null ? body.memberCode : '').trim();
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
  if (!memberCodeReq.length) {
    return { ok: true, data: { role: 'guest', common: common, personal: null } };
  }
  var rows = dbPlannerReadRegistryRows_(ss);
  var hits = [];
  var hi;
  for (hi = 0; hi < rows.length; hi++) {
    if (rows[hi].phone_normalized === phone) {
      hits.push(rows[hi]);
    }
  }
  var picked = [];
  for (hi = 0; hi < hits.length; hi++) {
    if (hits[hi].member_code === memberCodeReq) {
      picked.push(hits[hi]);
    }
  }
  if (picked.length !== 1) {
    return { ok: false, error: { code: 'PLANNER_VERIFY_FAILED', message: '회원 정보를 다시 확인할 수 없습니다.' } };
  }
  if (hits.length > 1) {
    if (dbPlannerNameNorm_(nameIn) !== dbPlannerNameNorm_(picked[0].display_name)) {
      return { ok: false, error: { code: 'PLANNER_VERIFY_FAILED', message: '이름이 목록과 일치하지 않습니다.' } };
    }
  }
  var sid = dbPlannerStudentSpreadsheetId_(ss, memberCodeReq);
  var personal = dbPlannerReadPersonalStub_(sid);
  return { ok: true, data: { role: 'member', common: common, personal: personal } };
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
          dbGetOrCreateSheetWithHeaders_(ss0, DB_SHEET_PLANNER_MEMBER_RECORDS, DB_PLANNER_MEMBER_RECORD_HEADERS);
          dbGetOrCreateSheetWithHeaders_(ss0, DB_SHEET_PLANNER_STUDENT_LINKS, DB_PLANNER_STUDENT_LINK_HEADERS);
          dbGetOrCreateSheetWithHeaders_(ss0, DB_SHEET_PLANNER_COMMON_CALENDAR, DB_PLANNER_COMMON_CALENDAR_HEADERS);
          dbDeleteOrphanDefaultSheetIfAny_(ss0);
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
        dbGetOrCreateSheetWithHeaders_(ssReuse, DB_SHEET_PLANNER_MEMBER_RECORDS, DB_PLANNER_MEMBER_RECORD_HEADERS);
        dbGetOrCreateSheetWithHeaders_(ssReuse, DB_SHEET_PLANNER_STUDENT_LINKS, DB_PLANNER_STUDENT_LINK_HEADERS);
        dbGetOrCreateSheetWithHeaders_(ssReuse, DB_SHEET_PLANNER_COMMON_CALENDAR, DB_PLANNER_COMMON_CALENDAR_HEADERS);
        p.setProperty(DB_PROP_SHEETS_PLANNER_MASTER_ID, reusedId);
        dbDeleteOrphanDefaultSheetIfAny_(ssReuse);
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
    dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_PLANNER_MEMBER_RECORDS, DB_PLANNER_MEMBER_RECORD_HEADERS);
    dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_PLANNER_STUDENT_LINKS, DB_PLANNER_STUDENT_LINK_HEADERS);
    dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_PLANNER_COMMON_CALENDAR, DB_PLANNER_COMMON_CALENDAR_HEADERS);
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
