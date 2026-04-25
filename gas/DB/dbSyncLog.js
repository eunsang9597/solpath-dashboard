/**
 * sync_log 1행 append (GAS만 쓰기)
 * @param {{ syncId: string, entity: string, status: string, rowsWritten: number, message: string, started: Date, ended: Date }} o
 */
function dbAppendSyncLog_(o) {
  var ss = dbOpenMaster_();
  var sh = ss.getSheetByName(DB_SHEET_SYNC_LOG);
  if (!sh) {
    sh = dbGetOrCreateSheetWithHeaders_(ss, DB_SHEET_SYNC_LOG, DB_SYNC_LOG_HEADERS);
  }
  sh.appendRow([
    o.syncId,
    o.started && o.started.toISOString ? o.started.toISOString() : String(o.started),
    o.ended && o.ended.toISOString ? o.ended.toISOString() : String(o.ended),
    o.entity,
    o.status,
    o.rowsWritten,
    o.message != null ? String(o.message) : ''
  ]);
}
