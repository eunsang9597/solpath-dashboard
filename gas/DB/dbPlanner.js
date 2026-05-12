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
 * @return {unknown[]}
 */
function dbPlannerReadPersonalStub_(spreadsheetId) {
  var sid = String(spreadsheetId != null ? spreadsheetId : '').trim();
  if (!sid.length) {
    return [];
  }
  return [];
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
