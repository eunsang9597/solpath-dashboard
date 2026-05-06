import { GAS_BASE_URL, GAS_MODE } from './config.js';

/**
 * @param {string} baseUrl
 * @param {string} action
 * @param {number} timeoutMs
 * @returns {Promise<Object>}
 */
function gasJsonp_(baseUrl, action, timeoutMs) {
  return gasJsonpWithParams_(baseUrl, action, null, timeoutMs);
}

/**
 * @param {string} baseUrl
 * @param {string} action
 * @param {Object<string, string>|null} extraParams
 * @param {number} timeoutMs
 * @returns {Promise<Object>}
 */
function gasJsonpWithParams_(baseUrl, action, extraParams, timeoutMs) {
  return new Promise(function (resolve, reject) {
    const cb =
      '_solpath_jp_' + String(Date.now()) + '_' + String(Math.floor(Math.random() * 1e9));
    const lim = timeoutMs != null ? timeoutMs : 360000;
    const t = window.setTimeout(function () {
      cleanup();
      reject(new Error('timeout'));
    }, lim);
    const s = document.createElement('script');
    const g = globalThis;
    function cleanup() {
      window.clearTimeout(t);
      try {
        delete g[cb];
      } catch (_e) {
        g[cb] = undefined;
      }
      if (s.parentNode) {
        s.parentNode.removeChild(s);
      }
    }
    g[cb] = function (/** @type {object} */ data) {
      cleanup();
      resolve(data);
    };
    let u;
    try {
      u = new URL(baseUrl);
    } catch (_e) {
      cleanup();
      reject(new Error('bad url'));
      return;
    }
    u.searchParams.set('format', 'jsonp');
    u.searchParams.set('callback', cb);
    u.searchParams.set('action', action);
    if (extraParams) {
      Object.keys(extraParams).forEach(function (k) {
        u.searchParams.set(k, extraParams[k]);
      });
    }
    s.async = true;
    s.src = u.toString();
    s.onerror = function () {
      cleanup();
      reject(new Error('script error'));
    };
    document.head.appendChild(s);
  });
}

/**
 * @param {string} v
 * @returns {string}
 */
function ymdFromDateTime_(v) {
  const s = String(v != null ? v : '').trim();
  if (!s) {
    return '';
  }
  const m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  }
  return s.slice(0, 10).replace(/[./]/g, '-');
}

/**
 * 브라우저 로컬 날짜 기준 yyyy-MM-dd (일자별 수강 인원 기본값)
 * @returns {string}
 */
function todayYmdLocal_() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 시트·JSON에서 온 상태 문자열 (NBSP·제로폭 등) 정규화 — 배지 클래스·비교용
 * @param {string} s
 * @returns {string}
 */
function normalizeMemberStatus_(s) {
  let t = String(s != null ? s : '');
  t = t.replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {string}
 */
function pickMemberFieldStr_(a, b) {
  const x = a != null ? String(a) : '';
  if (x.trim().length) {
    return x;
  }
  return b != null ? String(b) : '';
}

/**
 * API 행 → 프론트 표준 필드 (snake_case 폴백)
 * @param {Record<string, unknown>} r
 * @returns {Record<string, unknown>}
 */
function mapMemberApiRow_(r) {
  if (!r || typeof r !== 'object') {
    return /** @type {Record<string, unknown>} */ ({});
  }
  return {
    memberCode: pickMemberFieldStr_(r.memberCode, r.member_code),
    name: pickMemberFieldStr_(r.name, r.member_name),
    subjects: r.subjects != null ? String(r.subjects) : '',
    statusAuto: pickMemberFieldStr_(r.statusAuto, r.status_auto),
    statusOverride: pickMemberFieldStr_(r.statusOverride, r.status_override),
    statusFinal: pickMemberFieldStr_(r.statusFinal, r.status_final),
    remarksJson: r.remarksJson != null ? r.remarksJson : r.remarks_json
  };
}

/**
 * @param {Record<string, unknown>} w
 * @returns {{ memberCode: string, name: string, subjects: string }}
 */
function mapWarnApiRow_(w) {
  if (!w || typeof w !== 'object') {
    return { memberCode: '', name: '', subjects: '' };
  }
  return {
    memberCode: pickMemberFieldStr_(w.memberCode, w.member_code),
    name: pickMemberFieldStr_(w.name, w.member_name),
    subjects: pickMemberFieldStr_(w.subjects, w.subjects)
  };
}

const STU_CAT_LABEL = {
  solpass: '솔패스',
  solutine: '솔루틴',
  challenge: '챌린지'
};

const STU_STATUS_LABEL = {
  '수강중': '수강중',
  '주의 필요': '주의 필요',
  '이탈': '이탈',
  '복귀 예정': '복귀 예정'
};

/**
 * @param {string} s
 * @returns {string}
 */
function statusBadgeClass_(s) {
  const t = normalizeMemberStatus_(s);
  if (t === '주의 필요') return 'sp-stu-status-badge sp-stu-status-badge--warn';
  if (t === '이탈') return 'sp-stu-status-badge sp-stu-status-badge--out';
  if (t === '복귀 예정') return 'sp-stu-status-badge sp-stu-status-badge--plan';
  return 'sp-stu-status-badge sp-stu-status-badge--ok';
}

/**
 * @param {string} s
 * @returns {string}
 */
function memberStatusDisplayLabel_(s) {
  const k = normalizeMemberStatus_(s);
  if (STU_STATUS_LABEL[k]) {
    return STU_STATUS_LABEL[k];
  }
  return k || '-';
}

/**
 * @param {any} raw
 * @returns {Array<{title:string, body:string, updatedAt:string}>}
 */
function parseRemarks_(raw) {
  const t = String(raw != null ? raw : '').trim();
  if (!t) return [];
  try {
    const j = JSON.parse(t);
    if (!Array.isArray(j)) return [];
    return j.map((x) => ({
      title: x && x.title != null ? String(x.title) : '',
      body: x && x.body != null ? String(x.body) : '',
      updatedAt: x && x.updatedAt != null ? String(x.updatedAt) : ''
    }));
  } catch (_e) {
    return [];
  }
}

/** @type {Array<Record<string, string>>} */
let _dateEditorRows = [];
/** @type {'none'|'asc'|'desc'} */
let _dateSortStart = 'none';
/** @type {'none'|'asc'|'desc'} */
let _dateSortEnd = 'none';

/** @type {Array<any>} */
let _memberRows = [];
/** @type {'active'|'churn'} */
let _memberTab = 'active';
let _warnRows = [];
let _warnListOpen = false;
let _dailyLastYmd = '';
let _dailyLastRows = [];

/**
 * @param {string} c
 * @returns {string}
 */
function stuCatLabel_(c) {
  const k = String(c || '').trim().toLowerCase();
  return STU_CAT_LABEL[k] || k || '-';
}

/**
 * 과목 셀 표시용 — API는 영문 키를 콤마로 넘김
 * @param {string} subjects
 * @returns {string}
 */
function formatSubjectsCell_(subjects) {
  const s = String(subjects != null ? subjects : '').trim();
  if (!s) {
    return '-';
  }
  return s
    .split(',')
    .map((x) => stuCatLabel_(x.trim()))
    .filter(Boolean)
    .join(', ');
}

/**
 * 정렬용 — 과목 토큰을 정규화해 안정적으로 비교
 * @param {string} subjects
 * @returns {string}
 */
function subjectSortKey_(subjects) {
  const s = String(subjects != null ? subjects : '').trim().toLowerCase();
  if (!s) {
    return '';
  }
  const parts = s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  parts.sort();
  return parts.join('\t');
}

/**
 * @param {HTMLElement | null} mount
 * @param {boolean} busy
 * @param {string} title
 * @param {string} sub
 */
function setStuOverlay_(mount, busy, title, sub) {
  const el = mount && mount.querySelector('#sp-stu-overlay');
  const tEl = mount && mount.querySelector('#sp-stu-overlay-title');
  const sEl = mount && mount.querySelector('#sp-stu-overlay-desc');
  if (!el) {
    return;
  }
  if (tEl) {
    tEl.textContent = title || '처리 중';
  }
  if (sEl) {
    sEl.textContent = sub || '잠시만 기다려 주세요.';
  }
  if (busy) {
    el.removeAttribute('hidden');
    el.setAttribute('aria-hidden', 'false');
  } else {
    el.setAttribute('hidden', '');
    el.setAttribute('aria-hidden', 'true');
  }
}

/**
 * @param {Record<string, unknown>} d
 */
export function applyStudentMgmtStateFromData(mount, d) {
  if (!mount || !d) {
    return;
  }
  const link = /** @type {HTMLAnchorElement | null} */ (mount.querySelector('#sp-stu-linkDrive'));
  const status = /** @type {HTMLElement | null} */ (mount.querySelector('#sp-stu-status'));
  const hint = /** @type {HTMLElement | null} */ (mount.querySelector('#sp-stu-hint'));
  const ready = Boolean(d.studentMgmtReady);
  const url = d.studentMgmtSpreadsheetUrl != null ? String(d.studentMgmtSpreadsheetUrl).trim() : '';
  const mCount = d.studentMemberRowCount != null ? d.studentMemberRowCount : '—';
  const eCount = d.studentEventRowCount != null ? d.studentEventRowCount : '—';
  if (hint) {
    hint.textContent = '';
    hint.setAttribute('hidden', '');
  }
  if (link) {
    if (ready && url) {
      link.href = url;
      link.removeAttribute('hidden');
    } else {
      link.setAttribute('hidden', '');
      link.href = '#';
    }
  }
  if (status) {
    if (!GAS_MODE.canSync) {
      status.textContent = '연결 프로그램이 없어 상태를 불러오지 않습니다.';
    } else if (ready) {
      status.textContent =
        '수강생 DB 연결됨 · 회원 ' + String(mCount) + '명 · 주문 이벤트 ' + String(eCount) + '건';
    } else {
      const reason = d.studentMgmtReason != null ? String(d.studentMgmtReason) : '';
      status.textContent =
        '수강생 DB가 아직 없습니다. 오른쪽 「데이터 초기화」로 파일을 만든 뒤 다시 「상태 새로고침」을 누릅니다.' +
        (reason && reason !== 'NO_STUDENT_SHEET' ? ' (' + reason + ')' : '');
    }
  }
}

/**
 * @param {HTMLElement | null} mount
 */
export function initStudentMgmt(mount) {
  const btnInit = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-btnInit'));
  const btnRefresh = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-btnRefresh'));
  const btnDateLoad = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-btnDateLoad'));
  const btnDateSaveAll = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-btnDateSaveAll'));
  const btnMemberLoad = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-btnMemberLoad'));
  const memberSearch = /** @type {HTMLInputElement | null} */ (mount && mount.querySelector('#sp-stu-memberSearch'));
  const memberFilterCat = /** @type {HTMLSelectElement | null} */ (mount && mount.querySelector('#sp-stu-memberFilterCat'));
  const tabMemberActive = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-tabMemberActive'));
  const tabMemberChurn = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-tabMemberChurn'));
  const btnWarnToggle = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-btnWarnToggle'));
  const dailyDate = /** @type {HTMLInputElement | null} */ (mount && mount.querySelector('#sp-stu-dailyDate'));
  const btnDailyLoad = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-btnDailyLoad'));
  const modal = /** @type {HTMLElement | null} */ (document.querySelector('#sp-stu-modal'));
  const modalBackdrop = /** @type {HTMLElement | null} */ (document.querySelector('#sp-stu-modalBackdrop'));
  const modalClose = /** @type {HTMLButtonElement | null} */ (document.querySelector('#sp-stu-modalClose'));
  const filterCat = /** @type {HTMLSelectElement | null} */ (mount && mount.querySelector('#sp-stu-dateFilterCat'));
  const sortBtns = mount ? Array.from(mount.querySelectorAll('.sp-stu-sort-btn')) : [];
  if (!mount) {
    return;
  }
  if (!GAS_MODE.canSync || GAS_MODE.useMock) {
    if (btnInit) {
      btnInit.disabled = true;
    }
    if (btnRefresh) {
      btnRefresh.disabled = true;
    }
    if (btnDateLoad) {
      btnDateLoad.disabled = true;
    }
    if (btnDateSaveAll) {
      btnDateSaveAll.disabled = true;
    }
    if (btnMemberLoad) {
      btnMemberLoad.disabled = true;
    }
    if (btnDailyLoad) {
      btnDailyLoad.disabled = true;
    }
    applyStudentMgmtStateFromData(mount, {});
    return;
  }
  if (btnInit) {
    btnInit.disabled = false;
    btnInit.addEventListener('click', function () {
      void onInitClick_(mount);
    });
  }
  if (btnRefresh) {
    btnRefresh.disabled = false;
    btnRefresh.addEventListener('click', function () {
      void refreshStudentPanel_(mount);
    });
  }
  if (btnDateLoad) {
    btnDateLoad.disabled = false;
    btnDateLoad.addEventListener('click', function () {
      void loadDateEditorList_(mount);
    });
  }
  if (btnDateSaveAll) {
    btnDateSaveAll.disabled = false;
    btnDateSaveAll.addEventListener('click', function () {
      void saveDateEditorAll_(mount);
    });
  }
  if (btnMemberLoad) {
    btnMemberLoad.disabled = false;
    btnMemberLoad.addEventListener('click', function () {
      void loadMemberEditorList_(mount);
    });
  }
  if (memberSearch) {
    memberSearch.addEventListener('input', function () {
      renderMemberEditorRows_(mount);
    });
  }
  if (memberFilterCat) {
    memberFilterCat.addEventListener('change', function () {
      renderMemberEditorRows_(mount);
    });
  }
  const setMemberTabUi_ = function () {
    if (tabMemberActive) {
      tabMemberActive.classList.toggle('is-active', _memberTab === 'active');
      tabMemberActive.setAttribute('aria-selected', _memberTab === 'active' ? 'true' : 'false');
    }
    if (tabMemberChurn) {
      tabMemberChurn.classList.toggle('is-active', _memberTab === 'churn');
      tabMemberChurn.setAttribute('aria-selected', _memberTab === 'churn' ? 'true' : 'false');
    }
  };
  if (tabMemberActive) {
    tabMemberActive.addEventListener('click', function () {
      _memberTab = 'active';
      setMemberTabUi_();
      renderMemberEditorRows_(mount);
    });
  }
  if (tabMemberChurn) {
    tabMemberChurn.addEventListener('click', function () {
      _memberTab = 'churn';
      setMemberTabUi_();
      renderMemberEditorRows_(mount);
    });
  }
  if (btnWarnToggle) {
    btnWarnToggle.addEventListener('click', function () {
      _warnListOpen = !_warnListOpen;
      renderWarnBox_(mount);
    });
  }
  if (dailyDate) {
    dailyDate.value = todayYmdLocal_();
  }
  if (btnDailyLoad) {
    btnDailyLoad.addEventListener('click', function () {
      const ymd = dailyDate ? String(dailyDate.value || '').trim() : '';
      void loadDailyPeopleReport_(mount, ymd);
    });
  }
  const closeModal = function () {
    if (!modal) return;
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
  };
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeModal);
  }
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  document.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape') {
      closeModal();
    }
  });
  if (filterCat) {
    filterCat.addEventListener('change', function () {
      renderDateEditorRows_(mount);
    });
  }
  sortBtns.forEach(function (btnEl) {
    if (!(btnEl instanceof HTMLButtonElement)) {
      return;
    }
    btnEl.addEventListener('click', function () {
      const k = String(btnEl.getAttribute('data-sort-key') || '');
      if (k === 'start') {
        _dateSortStart = _dateSortStart === 'none' ? 'asc' : _dateSortStart === 'asc' ? 'desc' : 'none';
        _dateSortEnd = 'none';
      } else if (k === 'end') {
        _dateSortEnd = _dateSortEnd === 'none' ? 'asc' : _dateSortEnd === 'asc' ? 'desc' : 'none';
        _dateSortStart = 'none';
      }
      renderDateEditorRows_(mount);
    });
  });
}

/**
 * @param {HTMLElement | null} mount
 */
export async function refreshStudentPanel_(mount) {
  const url = String(GAS_BASE_URL).trim();
  const hint = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-hint'));
  if (!url || !mount) {
    return;
  }
  setStuOverlay_(mount, true, '불러오는 중', '수강생 DB 상태를 확인합니다.');
  if (hint) {
    hint.setAttribute('hidden', '');
  }
  try {
    const st = await gasJsonp_(url, 'productMappingState', 90000);
    if (st && st.ok && st.data) {
      applyStudentMgmtStateFromData(mount, st.data);
    } else {
      if (hint) {
        const em =
          st && st.message
            ? String(st.message)
            : st && st.error && st.error.message
              ? String(st.error.message)
              : '';
        hint.textContent = em || '상태를 가져오지 못했습니다.';
        hint.removeAttribute('hidden');
      }
    }
  } catch (e) {
    if (hint) {
      hint.textContent = e && e.message != null ? String(e.message) : '요청 실패';
      hint.removeAttribute('hidden');
    }
  } finally {
    setStuOverlay_(mount, false, '', '');
  }
}

/**
 * @param {HTMLElement | null} mount
 */
async function onInitClick_(mount) {
  const url = String(GAS_BASE_URL).trim();
  const hint = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-hint'));
  if (!url || !mount) {
    return;
  }
  const ok = window.confirm(
    '드라이브에 「솔루션편입_수강생_마스터」 파일을 만들거나 연결하고, 원천 주문을 기준으로 수강생 시트를 채웁니다.\n\n' +
      '이미 만든 파일이 있으면 같은 폴더에서 다시 잡습니다. 계속할까요?'
  );
  if (!ok) {
    return;
  }
  setStuOverlay_(mount, true, '수강생 DB 준비 중', '수 분 걸릴 수 있습니다.');
  if (hint) {
    hint.setAttribute('hidden', '');
  }
  try {
    const r = await gasJsonp_(url, 'initStudentMgmtSheets', 360000);
    if (!r || !r.ok) {
      if (hint) {
        const em =
          r && r.message
            ? String(r.message)
            : r && r.error && r.error.message
              ? String(r.error.message)
              : '';
        hint.textContent = em || '초기화에 실패했습니다.';
        hint.removeAttribute('hidden');
      }
      return;
    }
    await refreshStudentPanel_(mount);
  } catch (e) {
    if (hint) {
      hint.textContent = e && e.message != null ? String(e.message) : '요청 실패';
      hint.removeAttribute('hidden');
    }
  } finally {
    setStuOverlay_(mount, false, '', '');
  }
}

/**
 * @param {HTMLElement | null} mount
 * @param {string} msg
 * @param {boolean} show
 */
function setDateEditorHint_(mount, msg, show) {
  const hint = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-dateHint'));
  if (!hint) {
    return;
  }
  hint.textContent = msg || '';
  if (show) {
    hint.removeAttribute('hidden');
  } else {
    hint.setAttribute('hidden', '');
  }
}

/**
 * @param {HTMLElement | null} mount
 * @param {string} msg
 * @param {boolean} show
 */
function setMemberEditorHint_(mount, msg, show) {
  const hint = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-memberHint'));
  if (!hint) return;
  hint.textContent = msg || '';
  if (show) hint.removeAttribute('hidden');
  else hint.setAttribute('hidden', '');
}

/**
 * @param {HTMLElement | null} mount
 * @param {string} msg
 * @param {boolean} show
 */
function setDailyHint_(mount, msg, show) {
  const hint = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-dailyHint'));
  if (!hint) return;
  hint.textContent = msg || '';
  if (show) hint.removeAttribute('hidden');
  else hint.setAttribute('hidden', '');
}

/**
 * @param {HTMLElement | null} mount
 */
function renderDailyReport_(mount) {
  const tbody = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-dailyTbody'));
  if (!tbody) return;
  if (!_dailyLastRows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="sp-stu-member-editor__empty">표시할 항목이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  _dailyLastRows.forEach(function (r) {
    const tr = document.createElement('tr');
    const prodKey = String(r.prodKey || '');
    const prodName = String(r.prodName || '');
    tr.innerHTML =
      `<td><button type="button" class="sp-stu-daily__prod-btn" data-prod-key="${prodKey}">${prodName}</button></td>` +
      `<td>${String(r.total != null ? r.total : 0)}</td>` +
      `<td>${String(r['신규'] != null ? r['신규'] : 0)}</td>` +
      `<td>${String(r['재등록'] != null ? r['재등록'] : 0)}</td>` +
      `<td>${String(r['다시옴'] != null ? r['다시옴'] : 0)}</td>`;
    tbody.appendChild(tr);
  });
  wireDailyProductButtons_(mount);
}

/**
 * @param {HTMLElement | null} mount
 */
function wireDailyProductButtons_(mount) {
  const root = mount;
  if (!root) return;
  const btns = Array.from(root.querySelectorAll('.sp-stu-daily__prod-btn'));
  btns.forEach(function (b) {
    if (!(b instanceof HTMLButtonElement)) return;
    b.onclick = function () {
      const pk = String(b.getAttribute('data-prod-key') || '');
      if (!pk || !_dailyLastYmd) return;
      void openProductMembersModal_(pk);
    };
  });
}

/**
 * @param {Object} totals
 * @param {Object} uniq
 * @param {HTMLElement|null} mount
 */
function applyDailyTotals_(mount, totals, uniq) {
  const set = (id, v) => {
    const el = mount && mount.querySelector(id);
    if (el) el.textContent = String(v != null ? v : '—');
  };
  set('#sp-stu-dailySumTotal', totals && totals.total != null ? totals.total : '—');
  set('#sp-stu-dailySumNew', totals && totals['신규'] != null ? totals['신규'] : '—');
  set('#sp-stu-dailySumRe', totals && totals['재등록'] != null ? totals['재등록'] : '—');
  set('#sp-stu-dailySumBack', totals && totals['다시옴'] != null ? totals['다시옴'] : '—');
  set('#sp-stu-dailyUniqTotal', uniq && uniq.total != null ? uniq.total : '—');
  set('#sp-stu-dailyUniqNew', uniq && uniq['신규'] != null ? uniq['신규'] : '—');
  set('#sp-stu-dailyUniqRe', uniq && uniq['재등록'] != null ? uniq['재등록'] : '—');
  set('#sp-stu-dailyUniqBack', uniq && uniq['다시옴'] != null ? uniq['다시옴'] : '—');
}

/**
 * @param {HTMLElement | null} mount
 * @param {string} ymd
 */
async function loadDailyPeopleReport_(mount, ymd) {
  const url = String(GAS_BASE_URL).trim();
  if (!url || !mount) return;
  if (!ymd) {
    setDailyHint_(mount, '날짜를 선택해 주세요.', true);
    return;
  }
  setDailyHint_(mount, '표 만드는 중…', true);
  try {
    const r = await gasJsonpWithParams_(
      url,
      'studentMgmtDailyPeopleReport',
      { payload: JSON.stringify({ ymd }) },
      180000
    );
    if (!r || !r.ok) {
      const em =
        r && r.error && r.error.message
          ? String(r.error.message)
          : r && r.message
            ? String(r.message)
            : '표를 만들지 못했습니다.';
      setDailyHint_(mount, em, true);
      _dailyLastYmd = '';
      _dailyLastRows = [];
      renderDailyReport_(mount);
      applyDailyTotals_(mount, null, null);
      return;
    }
    _dailyLastYmd = String(r.data && r.data.ymd ? r.data.ymd : ymd);
    _dailyLastRows = r.data && Array.isArray(r.data.rows) ? r.data.rows : [];
    renderDailyReport_(mount);
    applyDailyTotals_(mount, r.data ? r.data.totals : null, r.data ? r.data.uniqueTotals : null);
    setDailyHint_(mount, `기준일: ${_dailyLastYmd}`, true);
  } catch (e) {
    setDailyHint_(mount, e && e.message != null ? String(e.message) : '요청 실패', true);
  }
}

/**
 * @param {string} prodKey
 */
async function openProductMembersModal_(prodKey) {
  const url = String(GAS_BASE_URL).trim();
  const modal = /** @type {HTMLElement | null} */ (document.querySelector('#sp-stu-modal'));
  const titleEl = /** @type {HTMLElement | null} */ (document.querySelector('#sp-stu-modalTitle'));
  const subEl = /** @type {HTMLElement | null} */ (document.querySelector('#sp-stu-modalSub'));
  const bodyEl = /** @type {HTMLElement | null} */ (document.querySelector('#sp-stu-modalBody'));
  if (!url || !modal || !bodyEl) return;
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');
  if (titleEl) titleEl.textContent = '학생 목록';
  if (subEl) subEl.textContent = '불러오는 중…';
  bodyEl.innerHTML = '';
  try {
    const r = await gasJsonpWithParams_(
      url,
      'studentMgmtDailyPeopleProductMembers',
      { payload: JSON.stringify({ ymd: _dailyLastYmd, prodKey }) },
      180000
    );
    if (!r || !r.ok) {
      const em =
        r && r.error && r.error.message
          ? String(r.error.message)
          : r && r.message
            ? String(r.message)
            : '목록을 불러오지 못했습니다.';
      if (subEl) subEl.textContent = em;
      bodyEl.innerHTML = '';
      return;
    }
    const prodName = String(r.data && r.data.prodName ? r.data.prodName : prodKey);
    const ymd = String(r.data && r.data.ymd ? r.data.ymd : _dailyLastYmd);
    const members = r.data && Array.isArray(r.data.members) ? r.data.members : [];
    if (titleEl) titleEl.textContent = prodName;
    if (subEl) subEl.textContent = `${ymd} 수강중 · ${members.length}명`;

    if (!members.length) {
      bodyEl.innerHTML = '<div class="sp-stu-member-editor__empty">표시할 학생이 없습니다.</div>';
      return;
    }
    bodyEl.innerHTML = renderMembersTable_(members);
  } catch (e) {
    if (subEl) subEl.textContent = e && e.message != null ? String(e.message) : '요청 실패';
    bodyEl.innerHTML = '';
  }
}

/**
 * @param {Array<any>} members
 * @returns {string}
 */
function renderMembersTable_(members) {
  const cols = [
    ['uid', 'uid'],
    ['name', 'name'],
    ['callnum', 'callnum'],
    ['last_login_time', 'last_login_time'],
    ['group_titles', 'group_titles'],
    ['member_status_auto', 'member_status_auto'],
    ['member_status_override', 'member_status_override'],
    ['member_status', 'member_status'],
    ['remarks_json', 'remarks_json']
  ];
  const th = cols.map((c) => `<th>${c[1]}</th>`).join('');
  const rows = members
    .map((m) => {
      const tds = cols
        .map((c) => {
          const v = m && m[c[0]] != null ? String(m[c[0]]) : '';
          const safe = v.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<td>${safe}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');
  return `<table class="sp-stu-modal-table"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`;
}

/**
 * @param {HTMLElement | null} mount
 */
function renderWarnBox_(mount) {
  const countEl = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-warnCount'));
  const listEl = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-warnList'));
  const btn = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-btnWarnToggle'));
  if (countEl) countEl.textContent = String(_warnRows.length);
  if (!listEl) return;
  if (!_warnRows.length) {
    listEl.innerHTML = '<div class="sp-stu-member-editor__empty">주의 필요 학생이 없습니다.</div>';
    listEl.setAttribute('hidden', '');
    if (btn) btn.textContent = '목록 펼치기';
    return;
  }
  if (!_warnListOpen) {
    listEl.setAttribute('hidden', '');
    if (btn) btn.textContent = '목록 펼치기';
    return;
  }
  if (btn) btn.textContent = '목록 접기';
  listEl.removeAttribute('hidden');
  listEl.innerHTML = '';
  _warnRows.forEach(function (r) {
    const el = document.createElement('div');
    el.className = 'sp-stu-member-warn__item';
    el.innerHTML =
      `<div class="sp-stu-member-warn__item-name">${String(r.name || '')}</div>` +
      `<div class="sp-stu-member-warn__item-subjects">${String(r.subjects || '') || '-'}</div>`;
    listEl.appendChild(el);
  });
}

/**
 * @param {HTMLElement | null} mount
 * @returns {Array<any>}
 */
function getMemberViewRows_(mount) {
  const qEl = /** @type {HTMLInputElement | null} */ (mount && mount.querySelector('#sp-stu-memberSearch'));
  const catEl = /** @type {HTMLSelectElement | null} */ (mount && mount.querySelector('#sp-stu-memberFilterCat'));
  const q = qEl ? String(qEl.value || '').trim().toLowerCase() : '';
  const catFilter = catEl ? String(catEl.value || '').trim().toLowerCase() : '';
  let rows = _memberRows.slice();
  rows = rows.filter((r) => {
    const st = normalizeMemberStatus_(String(r.statusFinal || ''));
    if (_memberTab === 'churn') {
      return st === '이탈';
    }
    return st !== '이탈';
  });
  if (catFilter) {
    rows = rows.filter((r) => {
      const sub = String(r.subjects || '')
        .toLowerCase()
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      return sub.indexOf(catFilter) >= 0;
    });
  }
  if (q) {
    rows = rows.filter((r) => {
      const nm = String(r.name || '').toLowerCase();
      const mc = String(r.memberCode || '').toLowerCase();
      return nm.includes(q) || mc.includes(q);
    });
  }
  rows.sort((a, b) => {
    const c1 = subjectSortKey_(String(a.subjects || '')).localeCompare(subjectSortKey_(String(b.subjects || '')));
    if (c1 !== 0) {
      return c1;
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  return rows;
}

/**
 * @param {HTMLElement | null} mount
 */
function updateMemberChurnCount_(mount) {
  const n = _memberRows.filter((r) => normalizeMemberStatus_(String(r.statusFinal || '')) === '이탈').length;
  const el = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-memberChurnCount'));
  if (el) {
    el.textContent = String(n);
  }
}

/**
 * @param {HTMLElement | null} mount
 */
function renderMemberEditorRows_(mount) {
  const tbody = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-memberTbody'));
  if (!tbody) return;
  const rows = getMemberViewRows_(mount);
  if (!rows.length) {
    const emptyMsg =
      _memberTab === 'churn' ? '이탈 학생이 없습니다.' : '표시할 항목이 없습니다. (필터·검색을 확인해 주세요.)';
    tbody.innerHTML = `<tr><td colspan="6" class="sp-stu-member-editor__empty">${emptyMsg}</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  rows.forEach(function (r) {
    const tr = document.createElement('tr');
    const mc = String(r.memberCode || '');
    const stAuto = normalizeMemberStatus_(String(r.statusAuto || ''));
    const stOv = normalizeMemberStatus_(String(r.statusOverride || ''));
    const stFinal = normalizeMemberStatus_(String(r.statusFinal || ''));
    const remarks = parseRemarks_(r.remarksJson);
    const remarkList = remarks.slice(0, 3).map((x) => `<div class="sp-stu-remark__item">${String(x.title || '')}</div>`).join('');
    tr.setAttribute('data-member-code', mc);
    tr.innerHTML =
      `<td><strong>${String(r.name || '')}</strong><div class="sp-muted">#${mc}</div></td>` +
      `<td>${formatSubjectsCell_(String(r.subjects || ''))}</td>` +
      `<td><span class="${statusBadgeClass_(stAuto)}">${memberStatusDisplayLabel_(stAuto)}</span></td>` +
      `<td>${renderOverrideSelectHtml_(mc, stOv)}</td>` +
      `<td><span class="${statusBadgeClass_(stFinal)}">${memberStatusDisplayLabel_(stFinal)}</span></td>` +
      `<td>${renderRemarkBoxHtml_(mc, remarkList)}</td>`;
    tbody.appendChild(tr);
  });
  wireMemberRowEvents_(mount);
}

/**
 * @param {string} memberCode
 * @param {string} current
 * @returns {string}
 */
function renderOverrideSelectHtml_(memberCode, current) {
  const cur = normalizeMemberStatus_(String(current || ''));
  const opts = ['', '수강중', '주의 필요', '이탈', '복귀 예정'];
  const o = opts
    .map((x) => {
      const lbl = x === '' ? '(자동 사용)' : x;
      const sel = x === cur ? ' selected' : '';
      return `<option value="${x}"${sel}>${lbl}</option>`;
    })
    .join('');
  return `<div class="sp-stu-remark__row"><select class="sp-confirm sp-stu-ov-select" data-member-code="${memberCode}">${o}</select><button type="button" class="btn btn--primary sp-stu-remark__btn sp-stu-ov-save" data-member-code="${memberCode}">저장</button></div>`;
}

/**
 * @param {string} memberCode
 * @param {string} remarkListHtml
 * @returns {string}
 */
function renderRemarkBoxHtml_(memberCode, remarkListHtml) {
  return (
    `<div class="sp-stu-remark">` +
    `<textarea class="sp-stu-remark-in" data-member-code="${memberCode}" placeholder="비고(메모) — 비워도 저장하면 날짜가 남습니다."></textarea>` +
    `<div class="sp-stu-remark__row">` +
    `<button type="button" class="btn btn--secondary sp-stu-remark__btn sp-stu-remark-add" data-member-code="${memberCode}">메모 추가</button>` +
    `</div>` +
    `<div class="sp-stu-remark__list">${remarkListHtml || '<div class="sp-stu-remark__item">메모 없음</div>'}</div>` +
    `</div>`
  );
}

/**
 * @param {HTMLElement | null} mount
 */
function wireMemberRowEvents_(mount) {
  const root = mount;
  if (!root) return;
  const saves = Array.from(root.querySelectorAll('.sp-stu-ov-save'));
  saves.forEach((b) => {
    if (!(b instanceof HTMLButtonElement)) return;
    b.onclick = function () {
      const mc = String(b.getAttribute('data-member-code') || '');
      const sel = /** @type {HTMLSelectElement | null} */ (root.querySelector(`.sp-stu-ov-select[data-member-code="${mc}"]`));
      const v = sel ? String(sel.value || '') : '';
      void saveMemberOverride_(mount, mc, v);
    };
  });
  const adds = Array.from(root.querySelectorAll('.sp-stu-remark-add'));
  adds.forEach((b) => {
    if (!(b instanceof HTMLButtonElement)) return;
    b.onclick = function () {
      const mc = String(b.getAttribute('data-member-code') || '');
      const ta = /** @type {HTMLTextAreaElement | null} */ (root.querySelector(`.sp-stu-remark-in[data-member-code="${mc}"]`));
      const body = ta ? String(ta.value || '') : '';
      if (ta) ta.value = '';
      void appendMemberRemark_(mount, mc, body);
    };
  });
}

/**
 * @param {HTMLElement | null} mount
 */
async function loadMemberEditorList_(mount) {
  const url = String(GAS_BASE_URL).trim();
  if (!url || !mount) return;
  setMemberEditorHint_(mount, '', false);
  try {
    const r = await gasJsonp_(url, 'studentMgmtMemberList', 120000);
    if (!r || !r.ok) {
      const em =
        r && r.error && r.error.message
          ? String(r.error.message)
          : r && r.message
            ? String(r.message)
            : '목록을 불러오지 못했습니다.';
      setMemberEditorHint_(mount, em, true);
      _memberRows = [];
      _warnRows = [];
      renderWarnBox_(mount);
      updateMemberChurnCount_(mount);
      renderMemberEditorRows_(mount);
      return;
    }
    const rawRows = r.data && Array.isArray(r.data.rows) ? r.data.rows : [];
    const rawWarn = r.data && Array.isArray(r.data.warnRows) ? r.data.warnRows : [];
    _memberRows = rawRows.map((x) => mapMemberApiRow_(/** @type {Record<string, unknown>} */ (x)));
    _warnRows = rawWarn.map((x) => mapWarnApiRow_(/** @type {Record<string, unknown>} */ (x)));
    _warnListOpen = false;
    renderWarnBox_(mount);
    updateMemberChurnCount_(mount);
    renderMemberEditorRows_(mount);
  } catch (e) {
    setMemberEditorHint_(mount, e && e.message != null ? String(e.message) : '요청 실패', true);
  }
}

/**
 * @param {HTMLElement | null} mount
 * @param {string} memberCode
 * @param {string} statusOverride
 */
async function saveMemberOverride_(mount, memberCode, statusOverride) {
  const url = String(GAS_BASE_URL).trim();
  if (!url || !mount) return;
  setMemberEditorHint_(mount, '저장 중…', true);
  try {
    const r = await gasJsonpWithParams_(
      url,
      'studentMgmtMemberSave',
      { payload: JSON.stringify({ memberCode, statusOverride }) },
      120000
    );
    if (!r || !r.ok) {
      const em =
        r && r.error && r.error.message
          ? String(r.error.message)
          : r && r.message
            ? String(r.message)
            : '저장하지 못했습니다.';
      setMemberEditorHint_(mount, em, true);
      return;
    }
    await loadMemberEditorList_(mount);
    setMemberEditorHint_(mount, '저장 완료', true);
  } catch (e) {
    setMemberEditorHint_(mount, e && e.message != null ? String(e.message) : '요청 실패', true);
  }
}

/**
 * @param {HTMLElement | null} mount
 * @param {string} memberCode
 * @param {string} remarkBody
 */
async function appendMemberRemark_(mount, memberCode, remarkBody) {
  const url = String(GAS_BASE_URL).trim();
  if (!url || !mount) return;
  setMemberEditorHint_(mount, '메모 저장 중…', true);
  try {
    const r = await gasJsonpWithParams_(
      url,
      'studentMgmtMemberSave',
      { payload: JSON.stringify({ memberCode, appendRemark: true, remarkBody }) },
      120000
    );
    if (!r || !r.ok) {
      const em =
        r && r.error && r.error.message
          ? String(r.error.message)
          : r && r.message
            ? String(r.message)
            : '메모를 저장하지 못했습니다.';
      setMemberEditorHint_(mount, em, true);
      return;
    }
    await loadMemberEditorList_(mount);
    setMemberEditorHint_(mount, '메모 저장 완료', true);
  } catch (e) {
    setMemberEditorHint_(mount, e && e.message != null ? String(e.message) : '요청 실패', true);
  }
}

/**
 * @param {HTMLElement | null} mount
 * @param {HTMLElement | null} mount
 * @returns {Array<Record<string, string>>}
 */
function getDateEditorViewRows_(mount) {
  const sel = /** @type {HTMLSelectElement | null} */ (mount && mount.querySelector('#sp-stu-dateFilterCat'));
  const catFilter = sel ? String(sel.value || '').trim().toLowerCase() : '';
  let rows = _dateEditorRows.slice();
  if (catFilter) {
    rows = rows.filter(function (r) {
      return String(r.internalCategory || '').trim().toLowerCase() === catFilter;
    });
  }
  const cmpDate = function (a, b, key) {
    const av = ymdFromDateTime_(String(a[key] || ''));
    const bv = ymdFromDateTime_(String(b[key] || ''));
    return av.localeCompare(bv);
  };
  rows.sort(function (a, b) {
    if (_dateSortStart !== 'none') {
      const c1 = cmpDate(a, b, 'productStartDate');
      if (c1 !== 0) {
        return _dateSortStart === 'asc' ? c1 : -c1;
      }
    } else if (_dateSortEnd !== 'none') {
      const c2 = cmpDate(a, b, 'productEndDate');
      if (c2 !== 0) {
        return _dateSortEnd === 'asc' ? c2 : -c2;
      }
    }
    const ac = String(a.internalCategory || '');
    const bc = String(b.internalCategory || '');
    if (ac !== bc) {
      return ac.localeCompare(bc);
    }
    return String(a.memberName || '').localeCompare(String(b.memberName || ''));
  });
  return rows;
}

/**
 * @param {HTMLElement | null} mount
 */
function applyDateEditorSortIndicators_(mount) {
  const startEl = /** @type {HTMLElement | null} */ (mount && mount.querySelector('[data-sort-dir-for="start"]'));
  const endEl = /** @type {HTMLElement | null} */ (mount && mount.querySelector('[data-sort-dir-for="end"]'));
  if (startEl) {
    startEl.textContent = _dateSortStart === 'asc' ? '▲' : _dateSortStart === 'desc' ? '▼' : '-';
  }
  if (endEl) {
    endEl.textContent = _dateSortEnd === 'asc' ? '▲' : _dateSortEnd === 'desc' ? '▼' : '-';
  }
}

/**
 * @param {HTMLElement | null} mount
 */
function renderDateEditorRows_(mount) {
  const tbody = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-dateTbody'));
  if (!tbody) {
    return;
  }
  const rows = getDateEditorViewRows_(mount);
  applyDateEditorSortIndicators_(mount);
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="sp-stu-date-editor__empty">표시할 항목이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  rows.forEach(function (r) {
    const tr = document.createElement('tr');
    const orderItemCode = String(r.orderItemCode || '');
    const startYmd = ymdFromDateTime_(String(r.productStartDate || ''));
    const endYmd = ymdFromDateTime_(String(r.productEndDate || ''));
    tr.setAttribute('data-order-item-code', orderItemCode);
    tr.setAttribute('data-orig-start', startYmd);
    tr.setAttribute('data-orig-end', endYmd);
    tr.innerHTML =
      `<td>${String(r.memberName || '')}</td>` +
      `<td><span class="sp-stu-cat-badge sp-stu-cat-badge--${String(r.internalCategory || '').trim().toLowerCase()}">${stuCatLabel_(String(r.internalCategory || ''))}</span></td>` +
      `<td>${String(r.prodName || '')}</td>` +
      `<td class="sp-stu-date-order-time">${String(r.orderTime || '')}</td>` +
      `<td><input type="date" class="sp-stu-date-start" value="${startYmd}" /></td>` +
      `<td><input type="date" class="sp-stu-date-end" value="${endYmd}" /></td>` +
      `<td class="sp-stu-date-updated">${String(r.updatedAt || '')}</td>`;
    tbody.appendChild(tr);
  });
}

/**
 * @param {HTMLElement | null} mount
 */
async function loadDateEditorList_(mount) {
  const url = String(GAS_BASE_URL).trim();
  if (!url || !mount) {
    return;
  }
  setDateEditorHint_(mount, '', false);
  try {
    const r = await gasJsonp_(url, 'studentMgmtDateEditorList', 120000);
    if (!r || !r.ok) {
      const em =
        r && r.error && r.error.message
          ? String(r.error.message)
          : r && r.message
            ? String(r.message)
            : '목록을 불러오지 못했습니다.';
      setDateEditorHint_(mount, em, true);
      _dateEditorRows = [];
      renderDateEditorRows_(mount);
      return;
    }
    const rows = r.data && Array.isArray(r.data.rows) ? r.data.rows : [];
    _dateEditorRows = rows;
    _dateSortStart = 'none';
    _dateSortEnd = 'none';
    renderDateEditorRows_(mount);
  } catch (e) {
    setDateEditorHint_(mount, e && e.message != null ? String(e.message) : '요청 실패', true);
  }
}

/**
 * @param {HTMLElement | null} mount
 * @returns {Array<Record<string, string|boolean>>}
 */
function collectDateEditorChangedRows_(mount) {
  const tbody = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-dateTbody'));
  if (!tbody) {
    return [];
  }
  const trs = Array.from(tbody.querySelectorAll('tr'));
  const out = [];
  trs.forEach(function (row) {
    if (!(row instanceof HTMLTableRowElement)) {
      return;
    }
    const startInput = /** @type {HTMLInputElement|null} */ (row.querySelector('.sp-stu-date-start'));
    const endInput = /** @type {HTMLInputElement|null} */ (row.querySelector('.sp-stu-date-end'));
    const orderItemCode = String(row.getAttribute('data-order-item-code') || '');
    if (!orderItemCode.length) {
      return;
    }
    const origStart = String(row.getAttribute('data-orig-start') || '');
    const origEnd = String(row.getAttribute('data-orig-end') || '');
    const nextStart = startInput ? String(startInput.value || '').trim() : '';
    const nextEnd = endInput ? String(endInput.value || '').trim() : '';
    const changedStart = nextStart !== origStart;
    const changedEnd = nextEnd !== origEnd;
    if (!changedStart && !changedEnd) {
      return;
    }
    out.push({
      orderItemCode: orderItemCode,
      productStartDate: nextStart,
      productEndDate: nextEnd,
      changedStart: changedStart,
      changedEnd: changedEnd
    });
  });
  return out;
}

/**
 * @param {HTMLElement | null} mount
 * @param {Array<Record<string, string>>} savedRows
 */
function applyDateEditorSavedRows_(mount, savedRows) {
  const tbody = /** @type {HTMLElement | null} */ (mount && mount.querySelector('#sp-stu-dateTbody'));
  if (!tbody || !savedRows || !savedRows.length) {
    return;
  }
  savedRows.forEach(function (d) {
    const code = String(d.orderItemCode || '');
    if (!code) {
      return;
    }
    const tr = tbody.querySelector(`tr[data-order-item-code="${code}"]`);
    if (!(tr instanceof HTMLTableRowElement)) {
      return;
    }
    const startInput = /** @type {HTMLInputElement|null} */ (tr.querySelector('.sp-stu-date-start'));
    const endInput = /** @type {HTMLInputElement|null} */ (tr.querySelector('.sp-stu-date-end'));
    const savedStart = ymdFromDateTime_(String(d.productStartDate || ''));
    const savedEnd = ymdFromDateTime_(String(d.productEndDate || ''));
    if (startInput) {
      startInput.value = savedStart;
    }
    if (endInput) {
      endInput.value = savedEnd;
    }
    tr.setAttribute('data-orig-start', savedStart);
    tr.setAttribute('data-orig-end', savedEnd);
    const up = tr.querySelector('.sp-stu-date-updated');
    if (up) {
      up.textContent = String(d.updatedAt || '');
    }
    const code0 = String(d.orderItemCode || '');
    _dateEditorRows = _dateEditorRows.map(function (x) {
      if (String(x.orderItemCode || '') !== code0) {
        return x;
      }
      return {
        ...x,
        productStartDate: String(d.productStartDate || x.productStartDate || ''),
        productEndDate: String(d.productEndDate || x.productEndDate || ''),
        updatedAt: String(d.updatedAt || x.updatedAt || '')
      };
    });
  });
  renderDateEditorRows_(mount);
}

/**
 * @param {HTMLElement | null} mount
 */
async function saveDateEditorAll_(mount) {
  const url = String(GAS_BASE_URL).trim();
  const btnDateSaveAll = /** @type {HTMLButtonElement | null} */ (mount && mount.querySelector('#sp-stu-btnDateSaveAll'));
  if (!url || !mount) {
    return;
  }
  const changedRows = collectDateEditorChangedRows_(mount);
  if (!changedRows.length) {
    setDateEditorHint_(mount, '변경된 값이 없습니다.', true);
    return;
  }
  if (btnDateSaveAll) {
    btnDateSaveAll.disabled = true;
  }
  try {
    const r = await gasJsonpWithParams_(
      url,
      'studentMgmtDateEditorSaveBatch',
      { payload: JSON.stringify({ rows: changedRows }) },
      180000
    );
    if (!r || !r.ok) {
      const em =
        r && r.error && r.error.message
          ? String(r.error.message)
          : r && r.message
            ? String(r.message)
            : '저장하지 못했습니다.';
      setDateEditorHint_(mount, em, true);
      return;
    }
    const rows = r.data && Array.isArray(r.data.rows) ? r.data.rows : [];
    applyDateEditorSavedRows_(mount, rows);
    setDateEditorHint_(mount, '전체 수정 반영 완료', true);
  } catch (e) {
    setDateEditorHint_(mount, e && e.message != null ? String(e.message) : '요청 실패', true);
  } finally {
    if (btnDateSaveAll) {
      btnDateSaveAll.disabled = false;
    }
  }
}

/**
 * 수강생 관리 탭 진입 시: 상태 새로고침 후 당일 기준 일자별 표·특이사항 목록 자동 로드
 * @param {HTMLElement | null} mount
 */
export async function studentMgmtOnTabActivate(mount) {
  await refreshStudentPanel_(mount);
  if (!mount || !GAS_MODE.canSync || GAS_MODE.useMock) {
    return;
  }
  const ymd = todayYmdLocal_();
  const dailyDateEl = /** @type {HTMLInputElement | null} */ (mount.querySelector('#sp-stu-dailyDate'));
  if (dailyDateEl) {
    dailyDateEl.value = ymd;
  }
  void loadDailyPeopleReport_(mount, ymd);
  await loadMemberEditorList_(mount);
}
