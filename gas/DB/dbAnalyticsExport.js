/**
 * 매출·구매 건수 화면의 "표별 내보내기" — 서식 포함 구글 스프레드시트 생성.
 * 저장 위치: <베이스>/DB/지표_표다운로드/<표종류별 폴더>
 */

var DB_ANALYTICS_EXPORT_ROOT_FOLDER = '지표_표다운로드';
var DB_ANALYTICS_EXPORT_TYPE_FOLDER = {
  kpi_goals: '실적목표표',
  viz_daily_sales: '일별순매출표',
  people_daily_count: '구매건수_일별상품표',
  people_year_matrix: '구매건수_연도월합계표',
  analytics_bundle: '통합리포트'
};

/**
 * @param {Object} payload
 * @return {{ ok: true, data: { spreadsheetId: string, spreadsheetUrl: string, fileName: string, folderId: string, folderUrl: string } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbAnalyticsExportTableToSheet_(payload) {
  payload = payload || {};
  var tableType = payload.tableType != null ? String(payload.tableType).trim() : '';
  var title = payload.title != null ? String(payload.title).trim() : '';
  var rows = payload.rows;
  var merges = payload.merges;
  if (!tableType.length || !DB_ANALYTICS_EXPORT_TYPE_FOLDER[tableType]) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'tableType이 올바르지 않습니다.' } };
  }
  if (tableType === 'analytics_bundle') {
    return dbAnalyticsExportBundleToSheet_(payload);
  }
  if (!Array.isArray(rows) || !rows.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'rows 배열이 필요합니다.' } };
  }
  var width = 0;
  var r;
  for (r = 0; r < rows.length; r++) {
    var rr = rows[r];
    if (!Array.isArray(rr)) {
      return { ok: false, error: { code: 'BAD_REQUEST', message: 'rows 형식이 올바르지 않습니다.' } };
    }
    if (rr.length > width) {
      width = rr.length;
    }
  }
  if (width < 1) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: '내보낼 열이 없습니다.' } };
  }
  var safeRows = [];
  for (r = 0; r < rows.length; r++) {
    var src = rows[r];
    var rowOut = [];
    var c;
    for (c = 0; c < width; c++) {
      var v = c < src.length ? src[c] : '';
      rowOut.push(v == null ? '' : String(v));
    }
    safeRows.push(rowOut);
  }

  var folderInfo = dbAnalyticsEnsureExportTypeFolder_(tableType);
  if (!folderInfo || !folderInfo.id) {
    return { ok: false, error: { code: 'NO_EXPORT_FOLDER', message: '내보내기 폴더를 만들지 못했습니다.' } };
  }
  var fileName = dbAnalyticsBuildExportFileName_(tableType, title);
  var ss = dbAnalyticsCreateSpreadsheetInFolder_(fileName, folderInfo.id);
  if (!ss) {
    return { ok: false, error: { code: 'EXPORT_CREATE_FAILED', message: '시트 파일 생성에 실패했습니다.' } };
  }
  var sh = ss.getSheets()[0];
  sh.setName('데이터');
  sh.clear();
  sh.getRange(1, 1, safeRows.length, width).setValues(safeRows);
  dbAnalyticsApplyExportSheetStyle_(sh, safeRows.length, width);
  dbAnalyticsApplyExportMerges_(sh, merges, safeRows.length, width);
  if (title.length) {
    var titleRow = sh.insertRowBefore(1);
    titleRow.setHeight(28);
    sh.getRange(1, 1, 1, width).merge().setValue(title).setFontWeight('bold').setFontSize(12).setBackground('#eef6ff').setHorizontalAlignment('left');
    sh.setFrozenRows(2);
  } else {
    sh.setFrozenRows(1);
  }
  return {
    ok: true,
    data: {
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      fileName: fileName,
      folderId: folderInfo.id,
      folderUrl: folderInfo.url
    }
  };
}

function dbAnalyticsExportBundleToSheet_(payload) {
  var tableType = 'analytics_bundle';
  var title = payload.title != null ? String(payload.title).trim() : '';
  var summaryRows = Array.isArray(payload.summaryRows) ? payload.summaryRows : [];
  var tables = Array.isArray(payload.tables) ? payload.tables : [];
  if (!tables.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'tables 배열이 필요합니다.' } };
  }
  var folderInfo = dbAnalyticsEnsureExportTypeFolder_(tableType);
  if (!folderInfo || !folderInfo.id) {
    return { ok: false, error: { code: 'NO_EXPORT_FOLDER', message: '내보내기 폴더를 만들지 못했습니다.' } };
  }
  var fileName = dbAnalyticsBuildExportFileName_(tableType, title);
  var ss = dbAnalyticsCreateSpreadsheetInFolder_(fileName, folderInfo.id);
  if (!ss) {
    return { ok: false, error: { code: 'EXPORT_CREATE_FAILED', message: '시트 파일 생성에 실패했습니다.' } };
  }
  var sh0 = ss.getSheets()[0];
  sh0.clear();
  sh0.setName('요약');
  if (summaryRows.length) {
    var sumSafe = dbAnalyticsExportRowsNormalized_(summaryRows);
    sh0.getRange(1, 1, sumSafe.length, sumSafe[0].length).setValues(sumSafe);
    dbAnalyticsApplyExportSheetStyle_(sh0, sumSafe.length, sumSafe[0].length);
  } else {
    sh0.getRange(1, 1).setValue('요약 데이터 없음');
  }
  var i;
  for (i = 0; i < tables.length; i++) {
    var t = tables[i] || {};
    var name = t.name != null ? String(t.name).trim() : '표' + String(i + 1);
    var tRows = Array.isArray(t.rows) ? t.rows : [];
    if (!tRows.length) {
      continue;
    }
    var safeRows = dbAnalyticsExportRowsNormalized_(tRows);
    var sh = ss.insertSheet();
    sh.setName(dbAnalyticsClipSheetName_(name, i + 2));
    sh.getRange(1, 1, safeRows.length, safeRows[0].length).setValues(safeRows);
    dbAnalyticsApplyExportSheetStyle_(sh, safeRows.length, safeRows[0].length);
    dbAnalyticsApplyExportMerges_(sh, Array.isArray(t.merges) ? t.merges : [], safeRows.length, safeRows[0].length);
    sh.setFrozenRows(1);
  }
  return {
    ok: true,
    data: {
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      fileName: fileName,
      folderId: folderInfo.id,
      folderUrl: folderInfo.url
    }
  };
}

function dbAnalyticsExportRowsNormalized_(rows) {
  var width = 0;
  var r;
  for (r = 0; r < rows.length; r++) {
    var rr = Array.isArray(rows[r]) ? rows[r] : [];
    if (rr.length > width) {
      width = rr.length;
    }
  }
  if (width < 1) {
    width = 1;
  }
  var out = [];
  for (r = 0; r < rows.length; r++) {
    var src = Array.isArray(rows[r]) ? rows[r] : [];
    var rowOut = [];
    var c;
    for (c = 0; c < width; c++) {
      rowOut.push(c < src.length && src[c] != null ? String(src[c]) : '');
    }
    out.push(rowOut);
  }
  return out;
}

function dbAnalyticsClipSheetName_(name, seq) {
  var t = String(name || '').replace(/[\\/?*\[\]:]/g, ' ').trim();
  if (!t.length) {
    t = '표' + String(seq != null ? seq : '');
  }
  if (t.length > 95) {
    t = t.slice(0, 95);
  }
  return t;
}

function dbAnalyticsApplyExportSheetStyle_(sh, rowCount, colCount) {
  if (rowCount < 1 || colCount < 1) {
    return;
  }
  sh.getRange(1, 1, rowCount, colCount).setWrap(true).setVerticalAlignment('middle');
  sh.getRange(1, 1, 1, colCount).setFontWeight('bold').setBackground('#f5f7fa').setHorizontalAlignment('center');
  sh.getRange(1, 1, rowCount, colCount).setBorder(true, true, true, true, true, true, '#d0d7de', SpreadsheetApp.BorderStyle.SOLID);
  sh.autoResizeColumns(1, colCount);
}

function dbAnalyticsApplyExportMerges_(sh, merges, rowCount, colCount) {
  if (!Array.isArray(merges) || !merges.length) {
    return;
  }
  var i;
  for (i = 0; i < merges.length; i++) {
    var m = merges[i] || {};
    var r0 = Number(m.row);
    var c0 = Number(m.col);
    var rs = Number(m.rowspan);
    var cs = Number(m.colspan);
    if (!isFinite(r0) || !isFinite(c0) || !isFinite(rs) || !isFinite(cs)) {
      continue;
    }
    var rr = Math.floor(r0);
    var cc = Math.floor(c0);
    var rrs = Math.floor(rs);
    var ccs = Math.floor(cs);
    if (rr < 1 || cc < 1 || rrs < 1 || ccs < 1) {
      continue;
    }
    if (rr + rrs - 1 > rowCount || cc + ccs - 1 > colCount) {
      continue;
    }
    if (rrs > 1 || ccs > 1) {
      sh.getRange(rr, cc, rrs, ccs).merge();
    }
  }
}

function dbAnalyticsBuildExportFileName_(tableType, title) {
  var d = new Date();
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  var hh = d.getHours();
  var mm = d.getMinutes();
  function p2(n) { return n < 10 ? '0' + n : String(n); }
  var base = DB_ANALYTICS_EXPORT_TYPE_FOLDER[tableType] || tableType;
  var t = title.length ? title.replace(/[\\/:*?"<>|]/g, ' ').trim() : '';
  return base + (t.length ? '_' + t : '') + '_' + y + p2(m) + p2(day) + '_' + p2(hh) + p2(mm);
}

function dbAnalyticsCreateSpreadsheetInFolder_(title, folderId) {
  var created = dbDriveCreateSpreadsheetInFolder_(title, folderId);
  if (created && created.id) {
    var opened = dbOpenNewSpreadsheetByIdWithRetry_(created.id);
    if (opened) {
      return opened;
    }
  }
  var ss = SpreadsheetApp.create(title);
  try {
    dbMoveMasterSpreadsheetUnderDbFolderIfNeeded_(ss.getId(), folderId);
  } catch (e) {}
  return ss;
}

function dbAnalyticsEnsureExportTypeFolder_(tableType) {
  var baseId = dbResolveMasterParentFolderId_();
  if (!baseId) {
    return { id: '', url: '' };
  }
  var dbId = dbGetOrCreateDbSubfolder_(baseId);
  if (!dbId) {
    return { id: '', url: '' };
  }
  var rootId = dbGetOrCreateChildFolderByName_(dbId, DB_ANALYTICS_EXPORT_ROOT_FOLDER);
  if (!rootId) {
    return { id: '', url: '' };
  }
  var typeName = DB_ANALYTICS_EXPORT_TYPE_FOLDER[tableType];
  var typeId = dbGetOrCreateChildFolderByName_(rootId, typeName);
  return { id: typeId, url: typeId ? 'https://drive.google.com/drive/folders/' + typeId : '' };
}

function dbGetOrCreateChildFolderByName_(parentFolderId, name) {
  try {
    var p = DriveApp.getFolderById(String(parentFolderId).trim());
    var it = p.getFoldersByName(String(name));
    if (it.hasNext()) {
      return it.next().getId();
    }
    return p.createFolder(String(name)).getId();
  } catch (e) {
    Logger.log('dbGetOrCreateChildFolderByName_: ' + (e && e.message != null ? e.message : String(e)));
    return '';
  }
}

/** JSONP GET URL 길이 한도 대비 — 조각 저장 후 커밋 */
var DB_ANALYTICS_EXPORT_STAGING_PREFIX = 'anexst_';
var DB_ANALYTICS_EXPORT_STAGING_TTL_SEC = 600;

/**
 * @param {string} sid
 * @param {number} seq
 * @param {number} total
 * @param {string} bodyFragment
 * @return {{ ok: true, data: { seq: number } }|{ ok: false, error: { code: string, message: string } }}
 */
function dbAnalyticsExportStagingPut_(sid, seq, total, bodyFragment) {
  sid = sid != null ? String(sid).trim() : '';
  if (!sid.length || sid.length > 96) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'sid가 올바르지 않습니다.' } };
  }
  if (!isFinite(seq) || seq < 0 || seq >= 4000) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'seq 범위 오류' } };
  }
  if (!isFinite(total) || total < 1 || total > 4000) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'total 범위 오류' } };
  }
  var frag = bodyFragment != null ? String(bodyFragment) : '';
  if (frag.length > 95000) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: '조각이 너무 깁니다.' } };
  }
  var cache = CacheService.getScriptCache();
  var key = DB_ANALYTICS_EXPORT_STAGING_PREFIX + sid + '_' + seq;
  cache.put(key, frag, DB_ANALYTICS_EXPORT_STAGING_TTL_SEC);
  var metaKey = DB_ANALYTICS_EXPORT_STAGING_PREFIX + sid + '_meta';
  cache.put(metaKey, String(total), DB_ANALYTICS_EXPORT_STAGING_TTL_SEC);
  return { ok: true, data: { seq: seq } };
}

/**
 * @param {string} sid
 * @return {{ ok: true, data: Object }|{ ok: false, error: { code: string, message: string } }}
 */
function dbAnalyticsExportStagingCommit_(sid) {
  sid = sid != null ? String(sid).trim() : '';
  if (!sid.length) {
    return { ok: false, error: { code: 'BAD_REQUEST', message: 'sid가 필요합니다.' } };
  }
  var cache = CacheService.getScriptCache();
  var metaKey = DB_ANALYTICS_EXPORT_STAGING_PREFIX + sid + '_meta';
  var totalStr = cache.get(metaKey);
  var total = parseInt(String(totalStr != null ? totalStr : ''), 10);
  if (!isFinite(total) || total < 1 || total > 4000) {
    return { ok: false, error: { code: 'BAD_STAGING', message: '스테이징이 없거나 만료되었습니다. 다시 내보내기를 눌러 주세요.' } };
  }
  var parts = [];
  var i;
  for (i = 0; i < total; i++) {
    var k = DB_ANALYTICS_EXPORT_STAGING_PREFIX + sid + '_' + i;
    var part = cache.get(k);
    if (part == null) {
      return { ok: false, error: { code: 'BAD_STAGING', message: '일부 조각이 없습니다: ' + i } };
    }
    parts.push(part);
  }
  var jsonStr = parts.join('');
  var payload;
  try {
    payload = JSON.parse(jsonStr);
  } catch (e0) {
    return { ok: false, error: { code: 'BAD_STAGING', message: '조합 JSON 파싱 실패' } };
  }
  cache.remove(metaKey);
  for (i = 0; i < total; i++) {
    cache.remove(DB_ANALYTICS_EXPORT_STAGING_PREFIX + sid + '_' + i);
  }
  return dbAnalyticsExportTableToSheet_(payload);
}
