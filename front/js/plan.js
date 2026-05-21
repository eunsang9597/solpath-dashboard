/**
 * 플래너 임웹 전용 — 전화 확인 후 공통·개인 일정 표시 (드라이브 링크 없음).
 * GAS: 전 action `doPost` + JSON 본문(커스텀 headers 없음, `redirect: follow`).
 * 스니펫에서 먼저 `window.__SOLPATH__ = { gasBaseUrl: "…/exec", … }` 를 둔다.
 */
function spReadPlanInjected_() {
  if (typeof globalThis === 'undefined') {
    return { url: '' };
  }
  const o = globalThis.__SOLPATH__;
  if (!o || typeof o !== 'object') {
    return { url: '' };
  }
  return {
    url: String(
      o.gasBaseUrl != null
        ? o.gasBaseUrl
        : o.GAS_BASE_URL != null
          ? o.GAS_BASE_URL
          : o.execUrl != null
            ? o.execUrl
            : ''
    ).trim()
  };
}

const _planInj = spReadPlanInjected_();
const GAS_BASE_URL = _planInj.url || '';
const GAS_MODE = {
  get useMock() {
    return !String(GAS_BASE_URL).trim();
  },
  get canSync() {
    return Boolean(String(GAS_BASE_URL).trim());
  }
};

const MOUNT_ID = 'solpath-plan-root';

/** `styles.css`가 막혀도 게이트 한 줄·가운데 유지 */
const PLAN_GATE_FALLBACK_CSS = `#solpath-plan-root .sp-plan-gate{display:flex!important;flex-direction:column!important;align-items:center!important;margin-left:auto!important;margin-right:auto!important;width:100%!important;max-width:min(100%,52rem)!important;box-sizing:border-box!important;padding:1rem clamp(0.75rem,3vw,1.75rem) 1.25rem!important}#solpath-plan-root .sp-plan-gate__lead,#solpath-plan-root .sp-plan-gate__privacy{width:100%;max-width:100%;text-align:center;margin:0 0 0.5rem}#solpath-plan-root .sp-plan-gate__privacy{margin-bottom:1rem;color:#64748b;font-size:0.85rem}#solpath-plan-root .sp-plan-gate__pair{display:flex!important;flex-wrap:wrap!important;align-items:flex-start!important;justify-content:center!important;gap:0.75rem 2rem!important;width:100%!important;max-width:100%!important;margin-left:auto!important;margin-right:auto!important;padding-left:0.25rem!important;padding-right:0.25rem!important;overflow:visible!important;box-sizing:border-box!important}#solpath-plan-root .sp-plan-gate__stack{display:flex!important;flex-direction:column!important;gap:0.28rem!important;flex:0 0 auto!important}#solpath-plan-root .sp-plan-gate__stack--tel{align-items:flex-start!important}#solpath-plan-root .sp-plan-gate__lbl{font-size:0.75rem;font-weight:600;color:#1e293b;text-align:left;align-self:stretch}#solpath-plan-root .sp-plan-gate__tel{display:inline-flex!important;flex-wrap:nowrap!important;align-items:center!important;gap:0.35rem!important}#solpath-plan-root .sp-plan-gate__dash{color:#94a3b8;font-weight:600;flex-shrink:0}#solpath-plan-root .sp-plan-gate__input{box-sizing:border-box;padding:0.45rem 0.35rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem}#solpath-plan-root .sp-plan-gate__input--seg3{width:6.5rem!important;min-width:6.5rem!important;max-width:7.5rem!important;padding:0.5rem 0.65rem!important;text-align:center;flex-shrink:0;box-sizing:border-box!important}#solpath-plan-root .sp-plan-gate__input--seg4{width:8rem!important;min-width:8rem!important;max-width:9rem!important;padding:0.5rem 0.65rem!important;text-align:center;flex-shrink:0;box-sizing:border-box!important}#solpath-plan-root .sp-plan-gate__input--name{width:min(100%,14rem);min-width:6.5rem;max-width:20rem;text-align:left;padding-left:0.45rem;padding-right:0.45rem}#solpath-plan-root .sp-plan-gate__err{margin:0.5rem 0 0;width:100%;max-width:100%;text-align:center;color:#b71c1c;font-size:0.8rem}#solpath-plan-root .sp-plan-gate__btn{margin-top:0.85rem;align-self:center}`;

function injectPlanGateFallbackCss_() {
  if (document.getElementById('sp-plan-gate-fallback-css')) return;
  const el = document.createElement('style');
  el.id = 'sp-plan-gate-fallback-css';
  el.textContent = PLAN_GATE_FALLBACK_CSS;
  document.head.appendChild(el);
}

const PLAN_SESSION_ADMIN_KEY = 'sp_plan_admin_mode';

/**
 * 어드민: 제작용 바 · 할 일 등록(빠른·고정·개별·POST 미리보기) 표시.
 * @param {HTMLElement} root `#solpath-plan-root`
 */
function plannerApplyAdminVisibility_(root) {
  const admin = Boolean(root.__spPlanAdminMode);
  root.classList.toggle('is-plan-admin', admin);
  const dev = root.querySelector('#sp-plan-devbar');
  const reg = root.querySelector('#sp-plan-quick-reg');
  const tap = root.querySelector('#sp-plan-admin-tap');
  if (tap) {
    tap.setAttribute('aria-label', '솔루션 학습 플래너');
    if (admin) tap.setAttribute('aria-pressed', 'true');
    else tap.removeAttribute('aria-pressed');
  }
  const profileTitle = root.querySelector('#sp-plan-student-info-title');
  if (profileTitle) profileTitle.removeAttribute('title');
  if (dev) {
    if (admin) {
      dev.removeAttribute('hidden');
      dev.removeAttribute('aria-hidden');
    } else {
      dev.setAttribute('hidden', 'hidden');
      dev.setAttribute('aria-hidden', 'true');
    }
  }
  if (reg) {
    if (admin) {
      reg.removeAttribute('hidden');
      reg.removeAttribute('aria-hidden');
    } else {
      reg.setAttribute('hidden', 'hidden');
      reg.setAttribute('aria-hidden', 'true');
    }
  }
}

/**
 * 게이트 통과 전: 학생 정보·월간 플랜·달력(`#sp-plan-app-main`) 전부 숨김.
 * @param {HTMLElement} root
 */
function plannerSetGatePending_(root) {
  root.classList.add('is-plan-gate-pending');
  const main = root.querySelector('#sp-plan-app-main');
  if (main) {
    main.setAttribute('hidden', 'hidden');
    main.setAttribute('aria-hidden', 'true');
  }
}

/**
 * 확인·원페이지만 후: 게이트 아래 본문(학생 정보·달력) 표시.
 * @param {HTMLElement} root
 */
function plannerRevealPlanMain_(root) {
  root.classList.remove('is-plan-gate-pending');
  const main = root.querySelector('#sp-plan-app-main');
  if (main) {
    main.removeAttribute('hidden');
    main.removeAttribute('aria-hidden');
  }
}

/**
 * @param {HTMLElement} root
 */
function plannerSetAdminMode_(root, on) {
  root.__spPlanAdminMode = Boolean(on);
  try {
    sessionStorage.setItem(PLAN_SESSION_ADMIN_KEY, root.__spPlanAdminMode ? '1' : '0');
  } catch (_e) {
    /* ignore */
  }
  plannerApplyAdminVisibility_(root);
  const prof =
    root.__spPlanStudentProfileInitial && typeof root.__spPlanStudentProfileInitial === 'object'
      ? root.__spPlanStudentProfileInitial
      : null;
  if (prof) {
    renderPlannerStudentProfile_(root, prof);
  }
}

/**
 * @param {HTMLElement} root
 */
function plannerMountAdminSecretInput_(root) {
  const slot = root.querySelector('#sp-plan-admin-secret-slot');
  if (!slot || slot.querySelector('#sp-plan-admin-secret')) return;
  const inp = document.createElement('input');
  inp.type = 'password';
  inp.id = 'sp-plan-admin-secret';
  inp.className = 'sp-plan-admin-modal__input';
  inp.setAttribute('autocomplete', 'new-password');
  inp.setAttribute('name', 'sp-planner-admin-verify');
  inp.setAttribute('spellcheck', 'false');
  inp.maxLength = 80;
  slot.appendChild(inp);
}

/**
 * @param {HTMLElement} root
 */
function plannerUnmountAdminSecretInput_(root) {
  const slot = root.querySelector('#sp-plan-admin-secret-slot');
  if (slot) slot.innerHTML = '';
}

/**
 * @param {HTMLElement} root
 */
function plannerShowAdminUnlockModal_(root) {
  const modal = root.querySelector('#sp-plan-admin-modal');
  const err = root.querySelector('#sp-plan-admin-modal-err');
  if (!modal) return;
  plannerMountAdminSecretInput_(root);
  const inp = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-admin-secret'));
  if (err) {
    err.textContent = '';
    err.setAttribute('hidden', 'hidden');
  }
  if (inp) {
    inp.value = '';
  }
  modal.removeAttribute('hidden');
  modal.removeAttribute('aria-hidden');
  if (inp) {
    window.setTimeout(function () {
      inp.focus();
    }, 0);
  }
}

/**
 * @param {HTMLElement} root
 */
function plannerHideAdminUnlockModal_(root) {
  const modal = root.querySelector('#sp-plan-admin-modal');
  if (!modal) return;
  modal.setAttribute('hidden', 'hidden');
  modal.setAttribute('aria-hidden', 'true');
  plannerUnmountAdminSecretInput_(root);
}

/**
 * @param {HTMLElement} root
 */
async function plannerAdminUnlockSubmit_(root) {
  const inp = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-admin-secret'));
  const err = root.querySelector('#sp-plan-admin-modal-err');
  const submitBtn = root.querySelector('#sp-plan-admin-modal-submit');
  const secret = inp ? String(inp.value || '').trim() : '';
  if (!secret.length) {
    if (err) {
      err.textContent = '암호를 입력해 주세요.';
      err.removeAttribute('hidden');
    }
    return;
  }
  if (GAS_MODE.useMock) {
    if (err) {
      err.textContent = 'gasBaseUrl이 없어 서버 확인을 할 수 없습니다.';
      err.removeAttribute('hidden');
    }
    return;
  }
  if (submitBtn) submitBtn.setAttribute('disabled', 'disabled');
  if (err) {
    err.textContent = '확인 중…';
    err.removeAttribute('hidden');
  }
  const res = await plannerGasCall_({ action: 'plannerAdminVerify', admin_secret: secret });
  if (submitBtn) submitBtn.removeAttribute('disabled');
  if (!res || !res.ok) {
    const m = res && res.error && res.error.message != null ? String(res.error.message) : '확인에 실패했습니다.';
    if (err) err.textContent = m;
    return;
  }
  const data = /** @type {{ outcome?: string }} */ (res.data || {});
  if (String(data.outcome || '') === 'ok') {
    plannerSetAdminMode_(root, true);
    plannerHideAdminUnlockModal_(root);
    return;
  }
  if (err) {
    err.textContent = '암호가 올바르지 않습니다.';
    err.removeAttribute('hidden');
  }
  if (inp) {
    inp.focus();
    inp.select();
  }
}

/**
 * @param {HTMLElement} el
 * @param {HTMLElement} root
 * @param {{ count: number, lastAt: number }} st
 */
function plannerAdminUnlockOnFiveTap_(el, root, st) {
  const resetMs = 2600;
  el.addEventListener('click', function (e) {
    e.preventDefault();
    const now = Date.now();
    if (now - st.lastAt > resetMs) st.count = 0;
    st.lastAt = now;
    st.count++;
    if (st.count < 5) return;
    st.count = 0;
    st.lastAt = 0;
    if (root.__spPlanAdminMode) {
      plannerSetAdminMode_(root, false);
      plannerHideAdminUnlockModal_(root);
      return;
    }
    plannerShowAdminUnlockModal_(root);
  });
}

/**
 * 헤더 로고·「학생 정보」제목 5회 연속 클릭 → 암호 모달(게이트에서도 표시). 켜진 뒤 5회면 해제.
 * @param {HTMLElement} root
 */
function wirePlannerAdminUnlockOnce_(root) {
  if (root.__spPlanAdminUnlockWired) return;
  root.__spPlanAdminUnlockWired = true;
  const tap = root.querySelector('#sp-plan-admin-tap');
  const modal = root.querySelector('#sp-plan-admin-modal');
  const profileTitle = root.querySelector('#sp-plan-student-info-title');
  /** @type {{ count: number, lastAt: number }} */
  const st = { count: 0, lastAt: 0 };
  if (tap) plannerAdminUnlockOnFiveTap_(tap, root, st);
  if (profileTitle) plannerAdminUnlockOnFiveTap_(profileTitle, root, st);
  if (!tap && !profileTitle) return;

  if (!modal) return;
  modal.addEventListener('click', function (e) {
    const t = e.target instanceof HTMLElement ? e.target : null;
    if (!t) return;
    if (t.getAttribute('data-sp-admin-close') === '1' || t.closest('[data-sp-admin-close="1"]')) {
      plannerHideAdminUnlockModal_(root);
    }
  });
  const submitBtn = root.querySelector('#sp-plan-admin-modal-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', function (e) {
      e.preventDefault();
      void plannerAdminUnlockSubmit_(root);
    });
  }
  const inp = root.querySelector('#sp-plan-admin-secret');
  if (inp) {
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        void plannerAdminUnlockSubmit_(root);
      }
    });
  }
}

/**
 * 관리자 `app.js` / `studentMgmt.js` 와 동일: `GET` JSONP.
 * @param {string} baseUrl
 * @param {string} action
 * @param {Record<string, string>|null} extraParams
 * @param {number} timeoutMs
 * @returns {Promise<Record<string, unknown>>}
 */
function plannerGasJsonpWithParams_(baseUrl, action, extraParams, timeoutMs) {
  return new Promise(function (resolve, reject) {
    const cb = '_solpath_jp_' + String(Date.now()) + '_' + String(Math.floor(Math.random() * 1e9));
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
    g[cb] = function (/** @type {Record<string, unknown>} */ data) {
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
 * 로컬 달 기준 `yyyy-MM` (`plannerBootstrap` · `year_month`).
 * @param {Date} d
 * @returns {string}
 */
function plannerYearMonthFromDate_(d) {
  if (!(d instanceof Date) || isNaN(Number(d.getTime()))) {
    d = new Date();
  }
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return String(y) + '-' + (m < 10 ? '0' : '') + String(m);
}

/**
 * GAS `dbPlannerReadCommonEvents_` · `DB_PLANNER_COMMON_CALENDAR_HEADERS` 와 동일 키.
 * @typedef {{ event_id: string, start_date: string, end_date: string, title: string, description: string, category: string, sort_key: number }} PlannerCommonEvent
 */

/**
 * @param {unknown} v
 * @returns {string} `yyyy-MM-dd` 또는 빈 문자열
 */
function plannerCommonEventDateString_(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date && !isNaN(Number(v.getTime()))) {
    return plannerYmdFromParts_(v.getFullYear(), v.getMonth(), v.getDate());
  }
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return iso[1] + '-' + iso[2] + '-' + iso[3];
  }
  return '';
}

/**
 * @param {unknown} ev
 * @returns {PlannerCommonEvent}
 */
function plannerNormalizeCommonEventFromApi_(ev) {
  const o = ev && typeof ev === 'object' ? /** @type {Record<string, unknown>} */ (ev) : {};
  const sk = o.sort_key;
  let skn = sk != null && String(sk).trim() !== '' ? Number(sk) : 0;
  if (!isFinite(skn)) {
    skn = 0;
  }
  const start0 = plannerCommonEventDateString_(o.start_date);
  let end0 = plannerCommonEventDateString_(o.end_date);
  if (start0 && (!end0 || end0 < start0)) {
    end0 = start0;
  }
  return {
    event_id: String(o.event_id != null ? o.event_id : '').trim(),
    start_date: start0,
    end_date: end0,
    title: String(o.title != null ? o.title : '').trim(),
    description: String(o.description != null ? o.description : '').trim(),
    category: String(o.category != null ? o.category : '').trim(),
    sort_key: skn
  };
}

/**
 * @param {unknown} arr
 * @returns {PlannerCommonEvent[]}
 */
function plannerNormalizeCommonEventsFromApi_(arr) {
  if (!Array.isArray(arr)) {
    return [];
  }
  const list = arr.map(plannerNormalizeCommonEventFromApi_).filter(function (e) {
    return e.start_date.length > 0;
  });
  list.sort(function (a, b) {
    if (a.sort_key !== b.sort_key) {
      return a.sort_key - b.sort_key;
    }
    if (a.start_date !== b.start_date) {
      return a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0;
    }
    if (a.event_id !== b.event_id) {
      return a.event_id < b.event_id ? -1 : 1;
    }
    return 0;
  });
  return list;
}

/**
 * 공통 일정: `start_date`~`end_date`(포함) 각 날에 배지 합산.
 * @param {Record<string, number>} byDate
 * @param {PlannerCommonEvent[]} events
 */
function plannerCommonEventsMergeIntoByDate_(byDate, events) {
  events.forEach(function (ev) {
    const start = ev.start_date;
    const end = ev.end_date || start;
    if (!start) {
      return;
    }
    const ps = start.split('-');
    const pe = end.split('-');
    if (ps.length !== 3 || pe.length !== 3) {
      byDate[start] = (byDate[start] || 0) + 1;
      return;
    }
    const y1 = Number(ps[0]);
    const m1 = Number(ps[1]);
    const d1 = Number(ps[2]);
    const y2 = Number(pe[0]);
    const m2 = Number(pe[1]);
    const d2 = Number(pe[2]);
    if (![y1, m1, d1, y2, m2, d2].every(isFinite)) {
      byDate[start] = (byDate[start] || 0) + 1;
      return;
    }
    let cur = new Date(y1, m1 - 1, d1);
    const last = new Date(y2, m2 - 1, d2);
    let guard = 0;
    while (guard < 400 && cur <= last) {
      const key = plannerYmdFromParts_(cur.getFullYear(), cur.getMonth(), cur.getDate());
      byDate[key] = (byDate[key] || 0) + 1;
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      guard++;
    }
  });
}

/**
 * bootstrap `curriculum` → 상태에 둘 `{ courses, lectures }`.
 * @param {unknown} raw
 * @returns {{ courses: object[], lectures: object[] }}
 */
function plannerNormalizeCurriculumFromBootstrap_(raw) {
  const o = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
  const courses = o.courses;
  const lectures = o.lectures;
  return {
    courses: Array.isArray(courses) ? /** @type {object[]} */ (courses) : [],
    lectures: Array.isArray(lectures) ? /** @type {object[]} */ (lectures) : []
  };
}

/**
 * 게이트 통과 후 저장된 연락처로 `viewMonth` 해당 달 bootstrap만 다시 읽기 (§8.5 구역 C).
 * @param {HTMLElement} root
 * @returns {Promise<void>}
 */
function plannerRefetchBootstrapForViewMonth_(root) {
  const ctx = root.__spPlannerBootstrapCtx;
  const st = root.__spPlanState;
  if (
    !ctx ||
    typeof ctx !== 'object' ||
    !st ||
    typeof st !== 'object' ||
    !Array.isArray(ctx.phoneSegments)
  ) {
    return Promise.resolve();
  }
  const segs = ctx.phoneSegments;
  if (segs[0].length !== 3 || segs[1].length !== 4 || segs[2].length !== 4) {
    return Promise.resolve();
  }
  const view = st.viewMonth instanceof Date && !isNaN(st.viewMonth.getTime()) ? st.viewMonth : new Date();
  const rid = (root.__spPlannerMonthFetchId = (root.__spPlannerMonthFetchId || 0) + 1);
  return plannerGasCall_({
    action: 'plannerBootstrap',
    phoneSegments: segs,
    name: ctx.name != null ? ctx.name : '',
    memberCode: ctx.memberCode != null ? ctx.memberCode : '',
    year_month: plannerYearMonthFromDate_(view)
  }).then(function (boot) {
    if (root.__spPlannerMonthFetchId !== rid) return;
    if (!boot || !boot.ok) return;
    const d = /** @type {{ role?: string, common?: object[], personal?: object[] | null, student_profile?: Record<string, unknown>, curriculum?: unknown }} */ (
      boot.data || {}
    );
    plannerMergeBootstrapMonthData_(root, {
      role: d.role || 'guest',
      common: d.common || [],
      personal: d.personal != null ? d.personal : null,
      student_profile: d.student_profile,
      curriculum: d.curriculum
    });
  });
}

/**
 * 월 이동 재조회 결과만 상태·달력 격자에 반영 (`renderCalendar_` 전체 생략 — 등록 폼 유지).
 * @param {HTMLElement} root
 * @param {{ role: string, common: object[], personal: object[] | null, student_profile?: Record<string, unknown>, curriculum?: unknown }} pack
 */
function plannerMergeBootstrapMonthData_(root, pack) {
  const st = root.__spPlanState;
  if (!st || typeof st !== 'object') return;
  const roleNext = pack.role === 'member' ? 'member' : 'guest';
  st.role = roleNext;
  if (st.planGuestUnlockMock) {
    st.role = 'member';
  }
  st.plannerCurriculum = plannerNormalizeCurriculumFromBootstrap_(pack.curriculum);
  const common = plannerNormalizeCommonEventsFromApi_(pack.common);
  const personal = pack.personal != null && Array.isArray(pack.personal) ? pack.personal : [];
  st.plannerCommonEvents = common;
  /** @type {Record<string, number>} */
  const byDate = {};
  plannerCommonEventsMergeIntoByDate_(byDate, common);
  personal.forEach(function (ev) {
    const d0 = String((ev && ev.date) || '').trim();
    if (!d0) return;
    byDate[d0] = (byDate[d0] || 0) + 1;
  });
  st.byDate = byDate;
  st.apiHadCalendarRows = common.length > 0 || personal.length > 0;
  const ban = root.querySelector('#sp-plan-banner');
  if (ban) {
    if (st.role === 'guest') {
      ban.textContent = '수강 확인이 되지 않아 학원 공통 일정만 표시됩니다. 문의가 필요하면 담당자에게 연락해 주세요.';
      ban.removeAttribute('hidden');
    } else {
      ban.setAttribute('hidden', 'hidden');
    }
  }
  renderPlannerStudentProfile_(root, pack.student_profile);
  plannerApplyBootstrapPersonal_(st, pack.personal, st.role);
  const slotMerge = root.querySelector('#sp-plan-calendar-slot');
  if (slotMerge && st.manualRegMode === 'curriculum') {
    plannerCurriculumRefreshCascade_(slotMerge, st, 'all');
  }
  if (typeof root.__spPlanRerenderMonth === 'function') {
    root.__spPlanRerenderMonth();
  }
  plannerRefreshPostPreview_(root);
  if (typeof root.__spPlanRefreshOpenDayModal === 'function') {
    root.__spPlanRefreshOpenDayModal();
  }
}

const PLANNER_GAS_POST_TIMEOUT_MS = 360000;

/**
 * GAS JSONP는 `{ error: { message } }` 와 `{ error: 'X', message: '…' }` 를 섞어 쓴다. 플래너 UI는 여기서 통일한다.
 * @param {unknown} data
 * @return {Record<string, unknown>}
 */
function plannerGasNormalizeResult_(data) {
  if (data == null || typeof data !== 'object') {
    return {
      ok: false,
      error: { code: 'INVALID_RESPONSE', message: '서버 응답이 비어 있거나 JSON이 아닙니다. Executions·Network에서 script 응답을 확인하세요.' }
    };
  }
  const o = /** @type {Record<string, unknown>} */ (data);
  if (o.ok === true) {
    return o;
  }
  const err = o.error;
  let msg = '';
  let code = '';
  if (err != null && typeof err === 'object' && 'message' in err && (/** @type {{ message?: unknown }} */ (err).message != null)) {
    msg = String(/** @type {{ message?: unknown }} */ (err).message);
    code =
      'code' in err && (/** @type {{ code?: unknown }} */ (err).code != null)
        ? String(/** @type {{ code?: unknown }} */ (err).code)
        : '';
  } else if (typeof err === 'string') {
    code = err;
    msg = o.message != null ? String(o.message) : err;
  } else if (o.message != null) {
    msg = String(o.message);
  }
  if (!msg.length) {
    if (err === 'UNKNOWN_ACTION' || code === 'UNKNOWN_ACTION') {
      msg =
        '배포된 Web App에 이 action이 없습니다. clasp push 후 **새 버전으로 배포**했는지 확인하세요. (UNKNOWN_ACTION)';
    } else {
      try {
        msg = JSON.stringify(o).slice(0, 900);
      } catch (_e) {
        msg = 'ok=false 이지만 상세 메시지를 꺼내지 못했습니다.';
      }
    }
  }
  return { ok: false, error: { code: code || 'GAS_ERROR', message: msg } };
}

/**
 * GAS Web App POST — 본문만 `JSON.stringify` (커스텀 헤더 없음 → OPTIONS 프리플라이트 없음).
 * `redirect: "follow"` — exec 302 → googleusercontent 최종 JSON 응답.
 * @see https://stackoverflow.com/questions/53433938/how-do-i-allow-a-cors-requests-in-my-google-script
 * @param {string} url
 * @param {Record<string, unknown>} bodyObj
 * @return {Promise<unknown>}
 */
async function plannerGasJsonPost_(url, bodyObj, timeoutMs) {
  const lim = timeoutMs != null ? timeoutMs : PLANNER_GAS_POST_TIMEOUT_MS;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer =
    ctrl &&
    window.setTimeout(function () {
      try {
        ctrl.abort();
      } catch (_e) {}
    }, lim);
  try {
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      mode: 'cors',
      body: JSON.stringify(bodyObj),
      credentials: 'omit',
      signal: ctrl ? ctrl.signal : undefined
    });
    const text = await res.text();
    if (!res.ok) {
      const code = res.status === 401 ? 'UNAUTHORIZED' : 'HTTP_' + String(res.status);
      let msg =
        'HTTP ' +
        String(res.status) +
        (text.length ? ': ' + text.slice(0, 280) : '');
      if (res.status === 401) {
        msg =
          'GAS Web App 401 — 배포「액세스: 누구나(익명)」+ Execute as Me + **새 버전** URL을 gasBaseUrl에 넣었는지 확인하세요. (Google 계정 필요/옛 배포 URL이면 401+CORS로 보입니다.)';
      }
      return { ok: false, error: { code: code, message: msg } };
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch (_e) {
      return {
        ok: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'JSON 파싱 실패(HTTP ' + String(res.status) + '): ' + text.slice(0, 400)
        }
      };
    }
    return data;
  } finally {
    if (timer) {
      window.clearTimeout(timer);
    }
  }
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {string[]}
 */
function plannerPhoneSegmentsFromPayload_(payload) {
  const segs = /** @type {unknown[]} */ (Array.isArray(payload.phoneSegments) ? payload.phoneSegments : []);
  return [
    String(segs[0] != null ? segs[0] : '').replace(/\D/g, ''),
    String(segs[1] != null ? segs[1] : '').replace(/\D/g, ''),
    String(segs[2] != null ? segs[2] : '').replace(/\D/g, '')
  ];
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {string}
 */
function plannerLinkKeyFromPayload_(payload) {
  return String(
    payload.memberCode != null
      ? payload.memberCode
      : payload.link_key != null
        ? payload.link_key
        : ''
  ).trim();
}

/**
 * `HttpOpenSync.js` `doPost` — JSON 본문 `action` + 필드 (`phoneSegments` 배열, `todos` 배열 등).
 * @param {string} url
 * @param {Record<string, unknown>} bodyObj
 * @return {Promise<Record<string, unknown>>}
 */
async function plannerGasPostAction_(url, bodyObj) {
  try {
    const raw = await plannerGasJsonPost_(url, bodyObj, PLANNER_GAS_POST_TIMEOUT_MS);
    return plannerGasNormalizeResult_(raw);
  } catch (e) {
    const m = e && typeof e === 'object' && 'message' in e ? String(/** @type {{ message?: string }} */ (e).message) : String(e);
    return {
      ok: false,
      error: {
        code: 'NETWORK',
        message: m
      }
    };
  }
}

/**
 * 플래너 GAS — 전부 `doPost` JSON 본문.
 * @param {Record<string, unknown>} payload
 * @return {Promise<Record<string, unknown>>}
 */
async function plannerGasCall_(payload) {
  const url = String(GAS_BASE_URL || '').trim();
  if (!url) {
    return { ok: false, error: { code: 'NO_GAS_URL', message: 'gasBaseUrl이 없습니다.' } };
  }
  const action = String(payload.action != null ? payload.action : '');
  if (action === 'plannerRegistryRebuild' || action === 'plannerDevFullReset' || action === 'initPlannerMasterSheets') {
    return plannerGasPostAction_(url, { action: action });
  }
  if (action === 'plannerMatch' || action === 'plannerBootstrap') {
    const body = {
      action: action,
      phoneSegments: plannerPhoneSegmentsFromPayload_(payload),
      name: String(payload.name != null ? payload.name : ''),
      memberCode: plannerLinkKeyFromPayload_(payload),
      link_key: plannerLinkKeyFromPayload_(payload)
    };
    const ym = String(payload.year_month != null ? payload.year_month : payload.yearMonth != null ? payload.yearMonth : '').trim();
    if (ym.length) {
      body.year_month = ym;
    }
    return plannerGasPostAction_(url, body);
  }
  if (action === 'plannerAdminVerify') {
    return plannerGasPostAction_(url, {
      action: action,
      admin_secret: String(payload.admin_secret != null ? payload.admin_secret : '').trim()
    });
  }
  if (action === 'plannerRegistryProfileSave') {
    const prof =
      payload.student_profile != null && typeof payload.student_profile === 'object'
        ? payload.student_profile
        : {};
    return plannerGasPostAction_(url, {
      action: action,
      phoneSegments: plannerPhoneSegmentsFromPayload_(payload),
      name: String(payload.name != null ? payload.name : ''),
      memberCode: plannerLinkKeyFromPayload_(payload),
      link_key: plannerLinkKeyFromPayload_(payload),
      student_profile: prof
    });
  }
  if (action === 'plannerPersonalTodosApply') {
    const ym = String(payload.year_month != null ? payload.year_month : payload.yearMonth != null ? payload.yearMonth : '').trim();
    const todos = Array.isArray(payload.todos) ? payload.todos : [];
    return plannerGasPostAction_(url, {
      action: action,
      phoneSegments: plannerPhoneSegmentsFromPayload_(payload),
      name: String(payload.name != null ? payload.name : ''),
      memberCode: plannerLinkKeyFromPayload_(payload),
      link_key: plannerLinkKeyFromPayload_(payload),
      year_month: ym,
      todos: todos
    });
  }
  return { ok: false, error: { code: 'BAD_ACTION', message: '지원하지 않는 action: ' + action } };
}

/** 부트스트랩 `student_profile` / registry 저장에 쓰는 키 (`phone_display` 제외). */
const PLANNER_STUDENT_PROFILE_KEYS_FOR_SAVE = [
  'display_name',
  'track',
  'admission_type',
  'prev_university',
  'prev_major_gpa',
  'goal_university',
  'goal_department',
  'study_status'
];

/**
 * @param {string} s
 * @returns {string}
 */
function escAttr(s) {
  return String(s != null ? s : '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** @param {unknown} v */
function plannerStudentFieldIsEmpty_(v) {
  return !String(v != null ? v : '').trim();
}

/**
 * @param {Record<string, unknown>|null|undefined} profile
 * @returns {Record<string, string>}
 */
function plannerNormalizeStudentProfileFromApi_(profile) {
  const o = profile && typeof profile === 'object' ? /** @type {Record<string, unknown>} */ (profile) : {};
  /** @type {Record<string, string>} */
  const out = { phone_display: '' };
  PLANNER_STUDENT_PROFILE_KEYS_FOR_SAVE.forEach(function (k) {
    out[k] = o[k] != null ? String(o[k]).trim() : '';
  });
  out.phone_display = o.phone_display != null ? String(o.phone_display).trim() : '';
  return out;
}

/**
 * @param {HTMLElement} root
 * @returns {boolean}
 */
function plannerStudentProfileIsMemberView_(root) {
  const st = root.__spPlanState;
  if (!st || typeof st !== 'object') return false;
  if (st.planGuestUnlockMock) return true;
  return st.role === 'member';
}

/**
 * 회원 화면에서 학생 정보 빈 칸 입력·저장 — 관리자 모드(암호 해제)일 때만.
 * @param {HTMLElement} root
 * @returns {boolean}
 */
function plannerStudentProfileCanEdit_(root) {
  return plannerStudentProfileIsMemberView_(root) && Boolean(root.__spPlanAdminMode);
}

/**
 * 월간 「일정 저장·삭제」·할 일 등록 POST — 관리자 모드(암호 해제)일 때만.
 * @param {HTMLElement} root
 * @returns {boolean}
 */
function plannerPlanAdminBulkScheduleAllowed_(root) {
  return Boolean(root.__spPlanAdminMode);
}

/**
 * @param {HTMLElement} root
 * @returns {Record<string, string>}
 */
function plannerCollectStudentProfilePayloadForSave_(root) {
  const tbody = root.querySelector('#sp-plan-student-tbody');
  const initial = root.__spPlanStudentProfileInitial && typeof root.__spPlanStudentProfileInitial === 'object'
    ? root.__spPlanStudentProfileInitial
    : {};
  /** @type {Record<string, string>} */
  const out = {};
  PLANNER_STUDENT_PROFILE_KEYS_FOR_SAVE.forEach(function (k) {
    if (!tbody) {
      out[k] = initial[k] != null ? String(initial[k]) : '';
      return;
    }
    const inp = tbody.querySelector('[data-sp-plan-student-input="' + escAttr(k) + '"]');
    if (!inp) {
      out[k] = initial[k] != null ? String(initial[k]) : '';
      return;
    }
    if ('value' in inp) {
      out[k] = String(/** @type {HTMLInputElement | HTMLTextAreaElement} */ (inp).value).trim();
    } else {
      out[k] = initial[k] != null ? String(initial[k]) : '';
    }
  });
  return out;
}

/**
 * @param {HTMLElement} root
 */
async function plannerStudentProfileSaveClick_(root) {
  const msgEl = root.querySelector('#sp-plan-student-save-msg');
  const ctx = root.__spPlannerBootstrapCtx;
  const st = root.__spPlanState;
  if (!ctx || !st || !plannerStudentProfileCanEdit_(root)) {
    if (msgEl) {
      msgEl.textContent = '저장할 수 없습니다.';
      msgEl.removeAttribute('hidden');
    }
    return;
  }
  const payload = plannerCollectStudentProfilePayloadForSave_(root);
  if (msgEl) {
    msgEl.textContent = '저장 중…';
    msgEl.removeAttribute('hidden');
  }
  const res = await plannerGasCall_({
    action: 'plannerRegistryProfileSave',
    phoneSegments: ctx.phoneSegments,
    name: ctx.name || '',
    memberCode: ctx.memberCode || '',
    student_profile: payload
  });
  if (!res || !res.ok) {
    const m = res && res.error && res.error.message != null ? String(res.error.message) : '저장에 실패했습니다.';
    if (msgEl) msgEl.textContent = m;
    return;
  }
  const ymDate = st.viewMonth instanceof Date && !isNaN(st.viewMonth.getTime()) ? st.viewMonth : new Date();
  const boot = await plannerGasCall_({
    action: 'plannerBootstrap',
    phoneSegments: ctx.phoneSegments,
    name: ctx.name || '',
    memberCode: ctx.memberCode || '',
    year_month: plannerYearMonthFromDate_(ymDate)
  });
  if (boot && boot.ok && boot.data) {
    const d = /** @type {{ student_profile?: Record<string, unknown> }} */ (boot.data);
    renderPlannerStudentProfile_(root, d.student_profile);
    if (msgEl) {
      msgEl.textContent = '저장했습니다.';
      window.setTimeout(function () {
        msgEl.setAttribute('hidden', 'hidden');
      }, 2200);
    }
  } else if (msgEl) {
    msgEl.textContent = '저장은 반영되었을 수 있습니다. 달력 월을 한 번 바꿔 새로고침해 보세요.';
  }
}

function wirePlannerStudentProfileSaveOnce_(root) {
  if (root.__spPlanStudentSaveWired) return;
  root.__spPlanStudentSaveWired = true;
  root.addEventListener('click', function (e) {
    const t = e.target instanceof HTMLElement ? e.target : null;
    if (!t) return;
    const btn = t.id === 'sp-plan-student-save' ? t : t.closest ? t.closest('#sp-plan-student-save') : null;
    if (!btn) return;
    e.preventDefault();
    void plannerStudentProfileSaveClick_(root);
  });
}

const PLANNER_PDF_LIB_HTML2CANVAS = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
const PLANNER_PDF_LIB_JSPDF = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';

/**
 * @param {string} src
 * @returns {Promise<void>}
 */
function plannerLoadScriptOnce_(src) {
  return new Promise(function (resolve, reject) {
    const prev = document.querySelector('script[data-sp-plan-pdf-src="' + src + '"]');
    if (prev) {
      if (prev.getAttribute('data-sp-plan-pdf-ready') === '1') {
        resolve();
        return;
      }
      prev.addEventListener('load', function () {
        resolve();
      });
      prev.addEventListener('error', function () {
        reject(new Error('script load failed'));
      });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-sp-plan-pdf-src', src);
    s.onload = function () {
      s.setAttribute('data-sp-plan-pdf-ready', '1');
      resolve();
    };
    s.onerror = function () {
      reject(new Error('script load failed'));
    };
    document.head.appendChild(s);
  });
}

/**
 * @returns {Promise<void>}
 */
async function plannerEnsurePdfLibs_() {
  await plannerLoadScriptOnce_(PLANNER_PDF_LIB_HTML2CANVAS);
  await plannerLoadScriptOnce_(PLANNER_PDF_LIB_JSPDF);
  if (typeof globalThis.html2canvas !== 'function') {
    throw new Error('html2canvas unavailable');
  }
  const jspdfNs = globalThis.jspdf;
  if (!jspdfNs || typeof jspdfNs.jsPDF !== 'function') {
    throw new Error('jsPDF unavailable');
  }
}

/**
 * @param {HTMLTableCellElement|null} td
 * @returns {string}
 */
function plannerStudentProfileCellTextForExport_(td) {
  if (!td) return '—';
  const inp = td.querySelector('input, textarea');
  if (inp && 'value' in inp) {
    const v = String(/** @type {HTMLInputElement | HTMLTextAreaElement} */ (inp).value).trim();
    return v.length ? v : '—';
  }
  const t = String(td.textContent || '').trim();
  return t.length ? t : '—';
}

/**
 * PDF/PNG 파일명 베이스 (`솔패스플래너-…`).
 * @param {HTMLElement} root
 * @returns {string}
 */
function plannerExportDownloadBasename_(root) {
  const st = root.__spPlanState;
  const tbody = root.querySelector('#sp-plan-student-tbody');
  let name = '';
  if (tbody) {
    const nameInp = tbody.querySelector('[data-sp-plan-student-input="display_name"]');
    if (nameInp && 'value' in nameInp) {
      name = String(/** @type {HTMLInputElement} */ (nameInp).value || '').trim();
    } else {
      const nameTd = tbody.querySelector('[data-sp-plan-student="display_name"]');
      if (nameTd) name = plannerStudentProfileCellTextForExport_(/** @type {HTMLTableCellElement} */ (nameTd));
    }
  }
  if (!name || name === '—') name = '플래너';
  let ymLabel = '';
  if (st && st.viewMonth instanceof Date && !isNaN(st.viewMonth.getTime())) {
    ymLabel = st.viewMonth.getFullYear() + '년' + (st.viewMonth.getMonth() + 1) + '월';
  }
  const base = '솔패스플래너-' + ymLabel + '-' + name;
  return base.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
}

/**
 * @param {HTMLElement} root
 * @param {string} ext `.pdf` | `.png`
 * @returns {string}
 */
function plannerExportDownloadFilename_(root, ext) {
  const base = plannerExportDownloadBasename_(root);
  const e = String(ext || '.pdf');
  return base + (e.charAt(0) === '.' ? e : '.' + e);
}

/**
 * 캡처 직전에만 숨김(화면과 동일·버튼 바 제외).
 * @param {HTMLElement} root
 * @returns {{ els: HTMLElement[], hiddenAttr: (string|null)[] }}
 */
function plannerExportCaptureHideChrome_(root) {
  /** @type {HTMLElement[]} */
  const els = [];
  /** @type {(string|null)[]} */
  const hiddenAttr = [];
  const bar = root.querySelector('#sp-plan-export-bar');
  if (bar instanceof HTMLElement) {
    els.push(bar);
    hiddenAttr.push(bar.hasAttribute('hidden') ? '' : null);
    bar.setAttribute('hidden', 'hidden');
    bar.setAttribute('aria-hidden', 'true');
  }
  return { els: els, hiddenAttr: hiddenAttr };
}

/**
 * @param {{ els: HTMLElement[], hiddenAttr: (string|null)[] }} snap
 */
function plannerExportCaptureRestoreChrome_(snap) {
  snap.els.forEach(function (el, i) {
    if (snap.hiddenAttr[i] === null) {
      el.removeAttribute('hidden');
      el.removeAttribute('aria-hidden');
    }
  });
}

/**
 * `#sp-plan-app-main` WYSIWYG — html2canvas(화면 그대로).
 * @param {HTMLElement} main
 * @returns {Promise<HTMLCanvasElement>}
 */
async function plannerCaptureAppMainCanvas_(main) {
  const html2canvas = globalThis.html2canvas;
  await new Promise(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(resolve);
    });
  });
  return html2canvas(main, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
    useCORS: true,
    width: main.scrollWidth,
    height: main.scrollHeight,
    windowWidth: main.scrollWidth,
    windowHeight: main.scrollHeight,
    scrollX: 0,
    scrollY: 0
  });
}

/**
 * 캔버스 → A4 여러 장(한 장에 축소하지 않음, 가로만 맞춤).
 * @param {HTMLCanvasElement} canvas
 * @param {string} filename
 */
function plannerSaveCanvasMultiPagePdf_(canvas, filename) {
  const jsPDF = globalThis.jspdf.jsPDF;
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 6;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const imgH = (canvas.height * contentW) / canvas.width;
  let heightLeft = imgH;
  let position = margin;
  pdf.addImage(imgData, 'JPEG', margin, position, contentW, imgH);
  heightLeft -= contentH;
  while (heightLeft > 0) {
    pdf.addPage();
    position = margin - (imgH - heightLeft);
    pdf.addImage(imgData, 'JPEG', margin, position, contentW, imgH);
    heightLeft -= contentH;
  }
  pdf.save(filename);
}

/**
 * @param {HTMLElement} root
 */
async function plannerExportPdfClick_(root) {
  const btn = root.querySelector('#sp-plan-pdf-export');
  const msgEl = root.querySelector('#sp-plan-pdf-export-msg');
  const main = root.querySelector('#sp-plan-app-main');
  if (!btn || !main || main.hasAttribute('hidden')) {
    if (msgEl) {
      msgEl.textContent = '게이트 확인 후 이용할 수 있습니다.';
      msgEl.removeAttribute('hidden');
    }
    return;
  }
  if (!root.querySelector('#sp-plan-month-wrap')) {
    if (msgEl) {
      msgEl.textContent = '달력을 불러온 뒤 다시 시도해 주세요.';
      msgEl.removeAttribute('hidden');
    }
    return;
  }
  btn.setAttribute('disabled', 'disabled');
  if (msgEl) {
    msgEl.textContent = 'PDF 생성 중…';
    msgEl.removeAttribute('hidden');
  }

  const chrome = plannerExportCaptureHideChrome_(root);
  try {
    await plannerEnsurePdfLibs_();
    const canvas = await plannerCaptureAppMainCanvas_(main);
    plannerSaveCanvasMultiPagePdf_(canvas, plannerExportDownloadFilename_(root, '.pdf'));
    if (msgEl) {
      msgEl.textContent = '저장했습니다.';
      window.setTimeout(function () {
        msgEl.setAttribute('hidden', 'hidden');
      }, 2200);
    }
  } catch (e) {
    const m = e && e.message != null ? String(e.message) : String(e);
    if (msgEl) msgEl.textContent = 'PDF 생성 실패: ' + m;
  } finally {
    plannerExportCaptureRestoreChrome_(chrome);
    btn.removeAttribute('disabled');
  }
}

function wirePlannerPdfExportOnce_(root) {
  if (root.__spPlanPdfExportWired) return;
  root.__spPlanPdfExportWired = true;
  root.addEventListener('click', function (e) {
    const t = e.target instanceof HTMLElement ? e.target : null;
    if (!t) return;
    const btn = t.id === 'sp-plan-pdf-export' ? t : t.closest ? t.closest('#sp-plan-pdf-export') : null;
    if (!btn) return;
    e.preventDefault();
    void plannerExportPdfClick_(root);
  });
}

/**
 * 저장 직전: 열린 일일 모달의 메모·타임라인을 `monthTodos`에 반영.
 * @param {HTMLElement} root
 */
function plannerPrepareClientStateBeforeApply_(root) {
  const st = root.__spPlanState;
  if (!st || !st.selectedDate) return;
  const day = String(st.selectedDate).trim();
  if (!day) return;
  const modal = root.querySelector('#sp-plan-day-modal');
  if (!modal || modal.hasAttribute('hidden')) return;
  const memoTa = modal.querySelector('#sp-plan-day-memo');
  if (memoTa instanceof HTMLTextAreaElement) {
    if (!st.dayMemoByDate) st.dayMemoByDate = {};
    st.dayMemoByDate[day] = memoTa.value;
    plannerSyncDayMemoToMonthTodo_(st, day);
  }
  plannerPersistTimelineSlotMapToMonthTodos_(st, day);
}

/**
 * `plannerPersonalTodosApply` — 현재 보는 달(`viewMonth`)의 todo 페이로드를 학생 월 시트에 덮어쓴다.
 * @param {HTMLElement} root
 * @param {{ msgEl?: HTMLElement|null }} [opts]
 */
async function plannerPersonalTodosApplyClick_(root, opts) {
  const msgEl =
    (opts && opts.msgEl) ||
    root.querySelector('#sp-plan-todos-apply-msg') ||
    root.querySelector('#sp-plan-month-apply-msg') ||
    root.querySelector('#sp-plan-day-apply-msg');
  const ctx = root.__spPlannerBootstrapCtx;
  const st = root.__spPlanState;
  const memberUi = st && (st.role === 'member' || st.planGuestUnlockMock);
  if (opts && opts.requireAdmin && !plannerPlanAdminBulkScheduleAllowed_(root)) {
    if (msgEl) {
      msgEl.textContent = '관리자 모드에서만 할 수 있습니다.';
      msgEl.removeAttribute('hidden');
    }
    return false;
  }
  if (!ctx || !st || !memberUi) {
    if (msgEl) {
      msgEl.textContent = '회원 확인 후에만 저장할 수 있습니다.';
      msgEl.removeAttribute('hidden');
    }
    return false;
  }
  plannerPrepareClientStateBeforeApply_(root);
  plannerRebuildQuickPostPayload_(st);
  const ymDate = st.viewMonth instanceof Date && !isNaN(st.viewMonth.getTime()) ? st.viewMonth : new Date();
  const ym = plannerYearMonthFromDate_(ymDate);
  const todos =
    st.plannerQuickPostBody && Array.isArray(st.plannerQuickPostBody.todos) ? st.plannerQuickPostBody.todos : [];
  if (msgEl) {
    msgEl.textContent = '저장 중…';
    msgEl.removeAttribute('hidden');
  }
  const res = await plannerGasCall_({
    action: 'plannerPersonalTodosApply',
    phoneSegments: ctx.phoneSegments,
    name: ctx.name || '',
    memberCode: ctx.memberCode || '',
    year_month: ym,
    todos: todos
  });
  if (!res || !res.ok) {
    const m = res && res.error && res.error.message != null ? String(res.error.message) : '저장에 실패했습니다.';
    if (msgEl) msgEl.textContent = m;
    return false;
  }
  const boot = await plannerGasCall_({
    action: 'plannerBootstrap',
    phoneSegments: ctx.phoneSegments,
    name: ctx.name || '',
    memberCode: ctx.memberCode || '',
    year_month: ym
  });
  if (boot && boot.ok && boot.data) {
    const d = /** @type {{ role?: string, common?: object[], personal?: object[] | null, student_profile?: Record<string, unknown>, curriculum?: unknown }} */ (
      boot.data || {}
    );
    plannerMergeBootstrapMonthData_(root, {
      role: d.role || 'guest',
      common: d.common || [],
      personal: d.personal != null ? d.personal : null,
      student_profile: d.student_profile,
      curriculum: d.curriculum
    });
  }
  if (msgEl) {
    msgEl.textContent = '저장했습니다.';
    window.setTimeout(function () {
      msgEl.setAttribute('hidden', 'hidden');
    }, 2200);
  }
  return true;
}

function wirePlannerPersonalTodosApplyOnce_(root) {
  if (root.__spPlanTodosApplyWired) return;
  root.__spPlanTodosApplyWired = true;
  root.addEventListener('click', function (e) {
    const t = e.target instanceof HTMLElement ? e.target : null;
    if (!t) return;
    const saveBtn =
      t.id === 'sp-plan-todos-apply' || t.id === 'sp-plan-month-save' || t.id === 'sp-plan-day-save'
        ? t
        : t.closest
          ? t.closest('#sp-plan-todos-apply, #sp-plan-month-save, #sp-plan-day-save')
          : null;
    if (saveBtn instanceof HTMLElement) {
      e.preventDefault();
      let msgEl = null;
      if (saveBtn.id === 'sp-plan-month-save') msgEl = root.querySelector('#sp-plan-month-apply-msg');
      else if (saveBtn.id === 'sp-plan-day-save') msgEl = root.querySelector('#sp-plan-day-apply-msg');
      else msgEl = root.querySelector('#sp-plan-todos-apply-msg');
      const requireAdmin =
        saveBtn.id === 'sp-plan-month-save' || saveBtn.id === 'sp-plan-todos-apply';
      void plannerPersonalTodosApplyClick_(root, { msgEl: msgEl, requireAdmin: requireAdmin });
      return;
    }
    const clearBtn =
      t.id === 'sp-plan-month-clear' ? t : t.closest ? t.closest('#sp-plan-month-clear') : null;
    if (clearBtn) {
      e.preventDefault();
      void plannerClearMonthScheduleClick_(root);
    }
  });
}

/**
 * 해당 날·보는 달 타임라인 페인트 캐시 제거 → 다음 모달/b bootstrap 시 `monthTodos`에서 재구축.
 * @param {object} st
 * @param {string} ymd
 */
function plannerInvalidateDayTimelineCache_(st, ymd) {
  if (!st || !st.dayTimelineTodoByDate) return;
  const day = String(ymd || '').trim();
  if (!day) return;
  try {
    delete st.dayTimelineTodoByDate[day];
  } catch (_e) {
    st.dayTimelineTodoByDate[day] = {};
  }
}

/**
 * @param {object} st
 * @param {Date} viewMonth
 */
function plannerInvalidateTimelineCacheForViewMonth_(st, viewMonth) {
  if (!st || !st.dayTimelineTodoByDate) return;
  const pfx = plannerMonthYmdPrefix_(viewMonth);
  Object.keys(st.dayTimelineTodoByDate).forEach(function (k) {
    if (k.indexOf(pfx) !== 0) return;
    try {
      delete st.dayTimelineTodoByDate[k];
    } catch (_e) {
      st.dayTimelineTodoByDate[k] = {};
    }
  });
}

/**
 * 「일정 삭제하기」 실패 시 복구용 — 해당 월 `monthTodos`·일별 캐시 스냅샷.
 * @param {object} st
 * @param {Date} viewMonth
 * @returns {{ monthTodos: object[], dayTimelineTodoByDate: Record<string, Record<string, string>>, dayFixedBlockSlotsByDate: Record<string, Record<string, boolean>>, dayMemoByDate: Record<string, string> }}
 */
function plannerSnapshotViewMonthPlannerState_(st, viewMonth) {
  plannerEnsureMonthTodos_(st);
  const pfx = plannerMonthYmdPrefix_(viewMonth);
  /** @type {object[]} */
  const monthTodos = [];
  st.monthTodos.forEach(function (r) {
    if (!r || typeof r !== 'object') return;
    if (String(r.date != null ? r.date : '').trim().indexOf(pfx) !== 0) return;
    const copy = Object.assign({}, r);
    if (r._fromServer) copy._fromServer = true;
    monthTodos.push(copy);
  });
  /** @type {Record<string, Record<string, string>>} */
  const dayTimelineTodoByDate = {};
  if (st.dayTimelineTodoByDate) {
    Object.keys(st.dayTimelineTodoByDate).forEach(function (k) {
      if (k.indexOf(pfx) !== 0) return;
      dayTimelineTodoByDate[k] = Object.assign({}, st.dayTimelineTodoByDate[k]);
    });
  }
  /** @type {Record<string, Record<string, boolean>>} */
  const dayFixedBlockSlotsByDate = {};
  if (st.dayFixedBlockSlotsByDate) {
    Object.keys(st.dayFixedBlockSlotsByDate).forEach(function (k) {
      if (k.indexOf(pfx) !== 0) return;
      dayFixedBlockSlotsByDate[k] = Object.assign({}, st.dayFixedBlockSlotsByDate[k]);
    });
  }
  /** @type {Record<string, string>} */
  const dayMemoByDate = {};
  if (st.dayMemoByDate) {
    Object.keys(st.dayMemoByDate).forEach(function (k) {
      if (k.indexOf(pfx) !== 0) return;
      dayMemoByDate[k] = String(st.dayMemoByDate[k]);
    });
  }
  return {
    monthTodos: monthTodos,
    dayTimelineTodoByDate: dayTimelineTodoByDate,
    dayFixedBlockSlotsByDate: dayFixedBlockSlotsByDate,
    dayMemoByDate: dayMemoByDate
  };
}

/**
 * @param {object} st
 * @param {Date} viewMonth
 * @param {{ monthTodos: object[], dayTimelineTodoByDate: Record<string, Record<string, string>>, dayFixedBlockSlotsByDate: Record<string, Record<string, boolean>>, dayMemoByDate: Record<string, string> }} snap
 */
function plannerRestoreViewMonthPlannerState_(st, viewMonth, snap) {
  if (!st || !snap) return;
  const pfx = plannerMonthYmdPrefix_(viewMonth);
  plannerEnsureMonthTodos_(st);
  st.monthTodos = st.monthTodos.filter(function (r) {
    if (!r || typeof r !== 'object') return false;
    return String(r.date != null ? r.date : '').trim().indexOf(pfx) !== 0;
  });
  snap.monthTodos.forEach(function (r) {
    st.monthTodos.push(Object.assign({}, r));
  });
  if (!st.dayTimelineTodoByDate) st.dayTimelineTodoByDate = {};
  Object.keys(st.dayTimelineTodoByDate).forEach(function (k) {
    if (k.indexOf(pfx) === 0) {
      try {
        delete st.dayTimelineTodoByDate[k];
      } catch (_e) {
        st.dayTimelineTodoByDate[k] = {};
      }
    }
  });
  Object.keys(snap.dayTimelineTodoByDate).forEach(function (k) {
    st.dayTimelineTodoByDate[k] = Object.assign({}, snap.dayTimelineTodoByDate[k]);
  });
  if (!st.dayFixedBlockSlotsByDate) st.dayFixedBlockSlotsByDate = {};
  Object.keys(st.dayFixedBlockSlotsByDate).forEach(function (k) {
    if (k.indexOf(pfx) === 0) {
      try {
        delete st.dayFixedBlockSlotsByDate[k];
      } catch (_e) {
        st.dayFixedBlockSlotsByDate[k] = {};
      }
    }
  });
  Object.keys(snap.dayFixedBlockSlotsByDate).forEach(function (k) {
    st.dayFixedBlockSlotsByDate[k] = Object.assign({}, snap.dayFixedBlockSlotsByDate[k]);
  });
  if (!st.dayMemoByDate) st.dayMemoByDate = {};
  Object.keys(st.dayMemoByDate).forEach(function (k) {
    if (k.indexOf(pfx) === 0) {
      try {
        delete st.dayMemoByDate[k];
      } catch (_e) {
        st.dayMemoByDate[k] = '';
      }
    }
  });
  Object.keys(snap.dayMemoByDate).forEach(function (k) {
    st.dayMemoByDate[k] = snap.dayMemoByDate[k];
  });
  plannerRebuildFixedBlockSlotsForMonth_(st, viewMonth);
  plannerRebuildQuickPostPayload_(st);
}

/**
 * 보는 달 `monthTodos` 전부 제거(로컬·서버 행 구분 없음) + 캐시 정리.
 * @param {object} st
 * @param {Date} viewMonth
 */
function plannerClearAllTodosForViewMonth_(st, viewMonth) {
  plannerEnsureMonthTodos_(st);
  const pfx = plannerMonthYmdPrefix_(viewMonth);
  st.monthTodos = st.monthTodos.filter(function (r) {
    if (!r || typeof r !== 'object') return false;
    return String(r.date != null ? r.date : '').trim().indexOf(pfx) !== 0;
  });
  [st.dayTimelineTodoByDate, st.dayFixedBlockSlotsByDate, st.dayMemoByDate].forEach(function (bag) {
    if (!bag || typeof bag !== 'object') return;
    Object.keys(bag).forEach(function (k) {
      if (k.indexOf(pfx) === 0) {
        try {
          delete bag[k];
        } catch (_e) {
          if (bag === st.dayMemoByDate) bag[k] = '';
          else bag[k] = {};
        }
      }
    });
  });
  plannerRebuildFixedBlockSlotsForMonth_(st, viewMonth);
  plannerRebuildQuickPostPayload_(st);
}

/**
 * 달력 「일정 삭제하기」— 해당 월 todo 전부 지운 뒤 시트에 덮어쓰기.
 * @param {HTMLElement} root
 */
async function plannerClearMonthScheduleClick_(root) {
  const msgEl = root.querySelector('#sp-plan-month-apply-msg');
  const ctx = root.__spPlannerBootstrapCtx;
  const st = root.__spPlanState;
  if (!plannerPlanAdminBulkScheduleAllowed_(root)) {
    if (msgEl) {
      msgEl.textContent = '관리자 모드에서만 삭제할 수 있습니다.';
      msgEl.removeAttribute('hidden');
    }
    return;
  }
  const memberUi = st && (st.role === 'member' || st.planGuestUnlockMock);
  if (!ctx || !st || !memberUi) {
    if (msgEl) {
      msgEl.textContent = '회원 확인 후에만 삭제할 수 있습니다.';
      msgEl.removeAttribute('hidden');
    }
    return;
  }
  const vm = st.viewMonth instanceof Date && !isNaN(st.viewMonth.getTime()) ? st.viewMonth : new Date();
  const snap = plannerSnapshotViewMonthPlannerState_(st, vm);
  plannerClearAllTodosForViewMonth_(st, vm);
  plannerRefreshPostPreview_(root);
  if (typeof root.__spPlanRerenderMonth === 'function') {
    root.__spPlanRerenderMonth();
  }
  const modal = root.querySelector('#sp-plan-day-modal');
  if (modal && st.selectedDate && !modal.hasAttribute('hidden') && typeof root.__spPlanRefreshOpenDayModal === 'function') {
    root.__spPlanRefreshOpenDayModal();
  }
  const ok = await plannerPersonalTodosApplyClick_(root, { msgEl: msgEl });
  if (!ok) {
    plannerRestoreViewMonthPlannerState_(st, vm, snap);
    plannerRefreshPostPreview_(root);
    if (typeof root.__spPlanRerenderMonth === 'function') {
      root.__spPlanRerenderMonth();
    }
    if (modal && st.selectedDate && !modal.hasAttribute('hidden') && typeof root.__spPlanRefreshOpenDayModal === 'function') {
      root.__spPlanRefreshOpenDayModal();
    }
    if (msgEl) {
      msgEl.textContent = '서버에 삭제를 반영하지 못했습니다. 화면을 이전 상태로 되돌렸습니다.';
      msgEl.removeAttribute('hidden');
    }
  }
}

/** @param {string} s */
function esc(s) {
  return String(s != null ? s : '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * `prev_major_gpa` 문자열(예: `국어국문학과 · 평점 3.82 / 4.5`)에서 학과·평점만 분리한다.
 * @param {string} raw
 * @returns {{ major: string, gpa: string }}
 */
function plannerPrevMajorGpaParts_(raw) {
  const s = String(raw != null ? raw : '').trim();
  if (!s) return { major: '—', gpa: '—' };
  const chunks = s
    .split(/\s*·\s*/)
    .map(function (x) {
      return String(x || '').trim();
    })
    .filter(Boolean);
  let major = '';
  let gpa = '';
  chunks.forEach(function (chunk) {
    const m = chunk.match(/^평점\s*(.*)$/i);
    if (m) {
      const rest = String(m[1] != null ? m[1] : '').trim();
      gpa = rest || '—';
    } else if (!major) {
      major = chunk;
    }
  });
  if (!major) major = '—';
  if (!gpa) gpa = '—';
  return { major: major, gpa: gpa };
}

/**
 * 학생 정보 표 — bootstrap `student_profile`. 회원·관리자 모드에서만 **비어 있는 칸** 입력(저장 후 이 화면에서 수정 UI 없음).
 * @param {HTMLElement} root
 * @param {Record<string, unknown>|null|undefined} profile
 */
function renderPlannerStudentProfile_(root, profile) {
  const tbody = root.querySelector('#sp-plan-student-tbody');
  if (!tbody) return;
  const canEdit = plannerStudentProfileCanEdit_(root);
  const p = plannerNormalizeStudentProfileFromApi_(profile);
  root.__spPlanStudentProfileInitial = {};
  PLANNER_STUDENT_PROFILE_KEYS_FOR_SAVE.forEach(function (k) {
    root.__spPlanStudentProfileInitial[k] = p[k];
  });

  function showVal(key) {
    const v = p[key];
    if (plannerStudentFieldIsEmpty_(v)) return '—';
    return String(v);
  }

  function tdReadCell(key) {
    return '<td data-sp-plan-student="' + escAttr(key) + '">' + esc(showVal(key)) + '</td>';
  }

  function tdInp(key) {
    return (
      '<td><input type="text" class="sp-plan-student__input" data-sp-plan-student-input="' +
      escAttr(key) +
      '" value="" maxlength="2000" autocomplete="off" spellcheck="true" /></td>'
    );
  }

  function tdTxtArea(key) {
    return (
      '<td colspan="3" class="sp-plan-student__td--text"><textarea class="sp-plan-student__input sp-plan-student__textarea" rows="3" data-sp-plan-student-input="' +
      escAttr(key) +
      '" maxlength="3000" spellcheck="true"></textarea></td>'
    );
  }

  const hintEl = root.querySelector('.sp-plan-student__hint');
  if (hintEl) {
    if (canEdit) {
      hintEl.textContent =
        '비어 있는 항목만 입력할 수 있습니다. 저장한 내용은 이 화면에서 다시 수정할 수 없습니다.';
    } else if (plannerStudentProfileIsMemberView_(root)) {
      hintEl.textContent = '학생 정보는 조회만 가능합니다. 항목 입력은 관리자 모드에서만 할 수 있습니다.';
    } else {
      hintEl.textContent = '학생 정보는 조회만 가능합니다.';
    }
  }

  /** @param {string} key */
  const ed = function (key) {
    return canEdit && plannerStudentFieldIsEmpty_(p[key]);
  };

  let h = '';
  h += '<tr>';
  h += '<th scope="row">이름</th>';
  h += ed('display_name') ? tdInp('display_name') : tdReadCell('display_name');
  h += '<th scope="row">휴대전화</th>';
  h += '<td data-sp-plan-student="phone_display">' + esc(showVal('phone_display')) + '</td>';
  h += '</tr>';

  h += '<tr>';
  h += '<th scope="row">계열</th>';
  h += ed('track') ? tdInp('track') : tdReadCell('track');
  h += '<th scope="row">편입 구분</th>';
  h += ed('admission_type') ? tdInp('admission_type') : tdReadCell('admission_type');
  h += '</tr>';

  h += '<tr>';
  h += '<th scope="row">전적대</th>';
  h += ed('prev_university') ? tdInp('prev_university') : tdReadCell('prev_university');
  if (ed('prev_major_gpa')) {
    h += '<th scope="row">학과·평점</th>';
    h += tdInp('prev_major_gpa');
  } else {
    const pm = plannerPrevMajorGpaParts_(p.prev_major_gpa);
    h += '<th scope="row">학과</th>';
    h += '<td data-sp-plan-student="prev_major">' + esc(pm.major) + '</td>';
  }
  h += '</tr>';

  if (!ed('prev_major_gpa')) {
    const pmB = plannerPrevMajorGpaParts_(p.prev_major_gpa);
    h += '<tr>';
    h += '<th scope="row">평점</th>';
    h += '<td colspan="3" data-sp-plan-student="prev_major_gpa">' + esc(pmB.gpa) + '</td>';
    h += '</tr>';
  }

  h += '<tr>';
  h += '<th scope="row">목표대학</th>';
  h += ed('goal_university') ? tdInp('goal_university') : tdReadCell('goal_university');
  h += '<th scope="row">목표 학과</th>';
  h += ed('goal_department') ? tdInp('goal_department') : tdReadCell('goal_department');
  h += '</tr>';

  h += '<tr class="sp-plan-student__tr--study">';
  h += '<th scope="row">공부 현황</th>';
  if (ed('study_status')) {
    h += tdTxtArea('study_status');
  } else {
    h += '<td colspan="3" class="sp-plan-student__td--text" data-sp-plan-student="study_status">' + esc(showVal('study_status')) + '</td>';
  }
  h += '</tr>';

  tbody.innerHTML = h;

  const saveRow = root.querySelector('#sp-plan-student-save-row');
  if (saveRow) {
    if (canEdit) saveRow.removeAttribute('hidden');
    else saveRow.setAttribute('hidden', 'hidden');
  }
}

/**
 * 주간 커리큘럼 한 블록 — API에서 내려올 **JSON 형태** (`rows[]`).
 * @typedef {{ subject: string, subject_code?: string, textbook_goal: string, lesson_outline: string, link_url?: string }} PlannerCurriculumRowPayload
 * @typedef {{ source: string, week_index: number, focus_phase: string, rows: PlannerCurriculumRowPayload[] }} PlannerCurriculumWeekPayload
 */

/**
 * `monthTodos` 해당 주 날짜에서 과목별 강 범위(제목 `· N강` 파싱).
 * @param {object} st
 * @param {string[]} weekDateKeys YYYY-MM-DD 7일
 * @returns {Record<string, { min: number, max: number }>}
 */
function plannerCurriculumWeekLessonRangeFromQuickPlan_(st, weekDateKeys) {
  /** @type {Record<string, { min: number, max: number }>} */
  const out = {};
  if (!st) return out;
  (weekDateKeys || []).forEach(function (key) {
    plannerMonthTodosForDay_(st, key).forEach(function (t) {
      if (!t || plannerIsTraceGhostDisplay_(t)) return;
      const subj = String(t.category != null ? t.category : '').trim();
      if (!/^(grammar|logic|read|vocab|misc)$/.test(subj)) return;
      const lessons = plannerLessonsFromStudyTitle_(String(t.title != null ? t.title : ''));
      lessons.forEach(function (L) {
        if (!isFinite(L) || L <= 0) return;
        if (!out[subj]) out[subj] = { min: L, max: L };
        else {
          if (L < out[subj].min) out[subj].min = L;
          if (L > out[subj].max) out[subj].max = L;
        }
      });
    });
  });
  return out;
}

/**
 * @param {{ min: number, max: number }|null|undefined} r
 * @returns {string}
 */
function plannerCurriculumLessonOutlineFromRange_(r) {
  if (!r || !isFinite(r.min) || !isFinite(r.max) || r.min <= 0 || r.max <= 0) return '';
  const lo = Math.min(r.min, r.max);
  const hi = Math.max(r.min, r.max);
  if (lo === hi) return String(lo) + '강';
  return String(lo) + '강~' + String(hi) + '강';
}

/**
 * 강좌 행(`subject`·`course_name`) → 빠른등록 코드 `grammar`|`logic`|`read`|`vocab` (없으면 빈 문자열).
 * @param {object} course
 * @returns {string}
 */
function plannerSubjectCodeFromCatalogCourse_(course) {
  const c = course && typeof course === 'object' ? course : {};
  const subj = String(c.subject != null ? c.subject : '').trim().toLowerCase();
  const cn = String(c.course_name != null ? c.course_name : '').trim().toLowerCase();
  const blob = subj + ' ' + cn;
  if (/\bgrammar\b|문법/.test(blob)) return 'grammar';
  if (/\blogic\b|논리/.test(blob)) return 'logic';
  if (/\bread\b|독해/.test(blob)) return 'read';
  if (/\bvocab\b|어휘/.test(blob)) return 'vocab';
  if (/\bmisc\b|기타/.test(blob)) return 'misc';
  return 'misc';
}

/**
 * @param {object[]} courses
 * @param {string} code
 * @returns {object|null}
 */
function plannerFindCatalogCourseForSubjectCode_(courses, code) {
  if (!Array.isArray(courses) || !code) return null;
  for (let i = 0; i < courses.length; i++) {
    const row = courses[i];
    if (row && typeof row === 'object' && plannerSubjectCodeFromCatalogCourse_(row) === code) {
      return row;
    }
  }
  return null;
}

/**
 * todo `title`·긴 라벨에서 강좌명만 (`[Day1]`·`N교시`·`N강` 구간 전까지).
 * @param {string} title
 * @returns {string}
 */
function plannerCurriculumCourseNameFromTodoTitle_(title) {
  const s = String(title != null ? title : '').trim();
  if (!s.length) return '';
  const daySplit = s.split(/\s·\s*(?=\[Day\s*\d+)/i);
  if (daySplit[0] && daySplit[0].trim().length) {
    return daySplit[0].trim();
  }
  const segs = s.split(' · ').map(function (p) {
    return p.trim();
  }).filter(Boolean);
  const keep = [];
  for (let i = 0; i < segs.length; i++) {
    const p = segs[i];
    if (/^\[Day\s*\d+/i.test(p) || /^\d+교시\b/.test(p)) break;
    if (/^\d+강$/.test(p) && keep.length > 0) break;
    keep.push(p);
  }
  if (keep.length) return keep.join(' · ');
  return s.length > 72 ? s.slice(0, 72) + '…' : s;
}

/**
 * 주차 표 교재명 칸 — 강좌명만 (강사명·회차 상세 제외).
 * @param {string} _instructor
 * @param {string} courseName
 * @param {string} [fallbackTodoTitle]
 * @returns {string}
 */
function plannerCurriculumCourseNameOnly_(_instructor, courseName, fallbackTodoTitle) {
  const cname = String(courseName != null ? courseName : '').trim();
  if (cname.length) return cname;
  return plannerCurriculumCourseNameFromTodoTitle_(fallbackTodoTitle);
}

/**
 * @param {object[]} lectures
 * @param {unknown} courseId
 * @param {{ min: number, max: number }|null|undefined} range
 * @returns {string}
 */
function plannerLectureTitlesInRangeForCourse_(lectures, courseId, range) {
  if (courseId === '' || courseId == null || !Array.isArray(lectures)) return '';
  const idStr = String(courseId);
  const lo =
    range && isFinite(range.min) && isFinite(range.max) ? Math.min(range.min, range.max) : NaN;
  const hi =
    range && isFinite(range.min) && isFinite(range.max) ? Math.max(range.min, range.max) : NaN;
  const list = lectures.filter(function (L) {
    if (!L || String(L.course_id) !== idStr) return false;
    const no = Number(L.lecture_no);
    if (!isFinite(no)) return false;
    if (isFinite(lo) && isFinite(hi)) return no >= lo && no <= hi;
    return true;
  });
  list.sort(function (a, b) {
    return (Number(a.lecture_no) || 0) - (Number(b.lecture_no) || 0);
  });
  return list
    .map(function (L) {
      return String(L.lecture_name != null ? L.lecture_name : '').trim();
    })
    .filter(Boolean)
    .join(' · ');
}

/**
 * @param {object[]} lectures
 * @param {string} lectureId
 * @returns {object|null}
 */
function plannerFindCatalogLectureById_(lectures, lectureId) {
  const id = String(lectureId != null ? lectureId : '').trim();
  if (!id.length || !Array.isArray(lectures)) return null;
  for (let i = 0; i < lectures.length; i++) {
    const L = lectures[i];
    if (L && String(L.lecture_id != null ? L.lecture_id : '').trim() === id) return L;
  }
  return null;
}

/**
 * @param {object[]} courses
 * @param {unknown} courseId
 * @returns {object|null}
 */
function plannerFindCatalogCourseById_(courses, courseId) {
  if (courseId === '' || courseId == null || !Array.isArray(courses)) return null;
  const idStr = String(courseId);
  for (let i = 0; i < courses.length; i++) {
    const c = courses[i];
    if (c && String(c.course_id != null ? c.course_id : '') === idStr) return c;
  }
  return null;
}

/**
 * 해당 주 `monthTodos`만으로 주간 커리큘럼 표 payload (할 일 없으면 빈 `rows`).
 * @param {object} st
 * @param {number} weekIndex
 * @param {string[]} weekDateKeys
 * @param {{ courses?: object[], lectures?: object[] }|null|undefined} curriculum
 * @returns {PlannerCurriculumWeekPayload}
 */
function plannerCurriculumWeekPayloadFromMonthTodos_(st, weekIndex, weekDateKeys, curriculum) {
  const pack = plannerNormalizeCurriculumFromBootstrap_(curriculum);
  const ranges = plannerCurriculumWeekLessonRangeFromQuickPlan_(st, weekDateKeys);
  /** @type {Record<string, { titles: string[], lectureIds: string[] }>} */
  const bySubj = {};
  (weekDateKeys || []).forEach(function (key) {
    plannerMonthTodosForDay_(st, key).forEach(function (t) {
      if (!t || plannerIsTraceGhostDisplay_(t)) return;
      const cat = String(t.category != null ? t.category : '').trim();
      if (!cat || cat === PLAN_CATEGORY_FIXED || cat === 'memo' || cat === PLAN_CATEGORY_ROUTINE) return;
      if (plannerIsRoutineExcludedFromStudyTotals_(t.task_id, cat)) return;
      const subj = /^(grammar|logic|read|vocab|misc)$/.test(cat) ? cat : 'misc';
      if (!bySubj[subj]) bySubj[subj] = { titles: [], lectureIds: [] };
      const title = String(t.title != null ? t.title : '').trim();
      if (title && bySubj[subj].titles.indexOf(title) < 0) bySubj[subj].titles.push(title);
      const lid = String(t.lecture_id != null ? t.lecture_id : '').trim();
      if (lid && bySubj[subj].lectureIds.indexOf(lid) < 0) bySubj[subj].lectureIds.push(lid);
    });
  });
  /** @type {PlannerCurriculumRowPayload[]} */
  const rows = [];
  PLANNER_STUDY_CATEGORY_ORDER.forEach(function (code) {
    const bucket = bySubj[code];
    if (!bucket || !bucket.titles.length) {
      if (code === 'misc') {
        rows.push({
          subject: plannerCategoryLabelKo_('misc'),
          subject_code: 'misc',
          textbook_goal: '—',
          lesson_outline: '—',
          link_url: ''
        });
      }
      return;
    }
    const r = ranges[code];
    let outline = plannerCurriculumLessonOutlineFromRange_(r) || '';
    if (!outline.length) {
      /** @type {number[]} */
      const lessonNums = [];
      bucket.titles.forEach(function (tit) {
        plannerLessonsFromStudyTitle_(tit).forEach(function (n) {
          lessonNums.push(n);
        });
      });
      outline = plannerLessonsToOutline_(lessonNums) || '';
    }
    if (!outline.length) outline = '—';
    let textbook_goal = '';
    let link_url = '';
    bucket.lectureIds.some(function (lid) {
      const lec = plannerFindCatalogLectureById_(pack.lectures, lid);
      if (!lec) return false;
      const cid = lec.course_id;
      const course = plannerFindCatalogCourseById_(pack.courses, cid);
      if (course) {
        textbook_goal = plannerCurriculumCourseNameOnly_(
          course.instructor,
          course.course_name,
          ''
        );
        link_url = String(course.link_url != null ? course.link_url : '').trim();
      }
      return Boolean(textbook_goal.length);
    });
    if (!textbook_goal.length && bucket.titles.length) {
      textbook_goal = plannerCurriculumCourseNameFromTodoTitle_(bucket.titles[0]);
    }
    if (!textbook_goal.length) textbook_goal = '—';
    rows.push({
      subject: plannerCategoryLabelKo_(code),
      subject_code: code,
      textbook_goal: textbook_goal,
      lesson_outline: outline,
      link_url: link_url
    });
  });
  return {
    source: rows.length ? 'todos' : 'empty',
    week_index: weekIndex,
    focus_phase: '',
    rows: rows
  };
}

/**
 * 주간 커리큘럼 표 — 해당 주 실제 todo만 (없으면 빈 표).
 * @param {number} weekIndex
 * @param {string[]} weekDateKeys
 * @param {{ courses?: object[], lectures?: object[] }|null|undefined} curriculum
 * @param {object} st
 * @returns {PlannerCurriculumWeekPayload}
 */
function plannerCurriculumWeekPayloadForRender_(weekIndex, weekDateKeys, curriculum, st) {
  return plannerCurriculumWeekPayloadFromMonthTodos_(st, weekIndex, weekDateKeys, curriculum);
}

/**
 * 주차 표 링크 — 시트에 `https://` 없이 넣은 값도 열리게.
 * @param {string} href
 * @returns {string}
 */
function plannerNormalizeCurriculumLinkUrl_(href) {
  const s = String(href != null ? href : '').trim();
  if (!s.length) return '';
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  return 'https://' + s;
}

/**
 * `PlannerCurriculumWeekPayload` → 표 HTML (내용은 전부 `esc` / 링크는 `escAttr`).
 * @param {PlannerCurriculumWeekPayload} payload
 * @returns {string}
 */
function plannerCurriculumWeekTableHtml_(payload) {
  if (!payload || !payload.rows || !payload.rows.length) {
    return (
      '<div class="sp-plan-cur sp-plan-cur--empty" data-sp-plan-cur-source="empty" data-sp-plan-cur-week="' +
      String(payload && payload.week_index != null ? payload.week_index : '') +
      '">' +
      '<p class="sp-plan-cur__empty" role="status">이번 주 등록된 할 일이 없습니다.</p>' +
      '</div>'
    );
  }
  let body = '';
  (payload.rows || []).forEach(function (r) {
    if (!r || typeof r !== 'object') return;
    const subj = String(r.subject != null ? r.subject : '').trim();
    const goal = String(r.textbook_goal != null ? r.textbook_goal : '').trim();
    const outl = String(r.lesson_outline != null ? r.lesson_outline : '').trim();
    const href = plannerNormalizeCurriculumLinkUrl_(r.link_url);
    const linkInner = href.length
      ? '<a class="sp-plan-cur__a" href="' +
        escAttr(href) +
        '" target="_blank" rel="noopener noreferrer">열기</a>'
      : '<span class="sp-plan-cur__noLink">—</span>';
    body +=
      '<tr><th scope="row">' +
      esc(subj) +
      '</th><td class="sp-plan-cur__goal">' +
      esc(goal) +
      '</td><td class="sp-plan-cur__outline">' +
      esc(outl) +
      '</td><td class="sp-plan-cur__link">' +
      linkInner +
      '</td></tr>';
  });
  return (
    '<div class="sp-plan-cur" data-sp-plan-cur-source="' +
    esc(payload.source) +
    '" data-sp-plan-cur-week="' +
    String(payload.week_index) +
    '">' +
    '<table class="sp-plan-cur__tbl">' +
    '<thead><tr>' +
    '<th scope="col" class="sp-plan-cur__thCat">구분</th>' +
    '<th scope="col">교재명 · 학습 목표</th>' +
    '<th scope="col" class="sp-plan-cur__thOut">목차</th>' +
    '<th scope="col" class="sp-plan-cur__thLink">링크</th>' +
    '</tr></thead><tbody>' +
    body +
    '</tbody></table></div>'
  );
}

const PLAN_DEV_HTML = `<div class="sp-plan-devbar" id="sp-plan-devbar" role="region" aria-label="제작용 도구" hidden aria-hidden="true">
  <span class="sp-plan-devbar__label">제작용</span>
  <button type="button" class="btn btn--ghost sp-plan-devbar__btn" id="sp-plan-dev-skip-gate" title="전화·이름 확인 없이 메인 화면만 표시합니다. (추적·GAS 호출 없음)">원페이지만(게이트 생략)</button>
  <button type="button" class="btn btn--ghost sp-plan-devbar__btn" id="sp-plan-dev-init" title="Drive에 플래너 마스터 스프레드시트가 없으면 새로 만들고, 필요한 시트·헤더를 맞춥니다.">마스터 준비(파일·탭)</button>
  <button type="button" class="btn btn--ghost sp-plan-devbar__btn" id="sp-plan-dev-sync">동기화(레지스트리+학생파일)</button>
  <button type="button" class="btn btn--ghost sp-plan-devbar__btn" id="sp-plan-dev-reset">DB 초기화(학생파일 포함)</button>
  <span class="sp-plan-devbar__msg" id="sp-plan-dev-msg" aria-live="polite"></span>
</div>`;

const PLAN_APP_SHELL_START = `<div class="app-shell app-shell--plan">
  <header class="app-header">
    <div class="brand">
      <button type="button" class="brand-mark sp-plan-adminTap" id="sp-plan-admin-tap" aria-label="플래너"></button>
      <div>
        <div class="brand__title" style="color:#4a148c">솔루션 학습 플래너</div>
        <p class="sp-plan-desc">한 달 학습 일정과 할 일을 달력에서 확인하고 기록합니다.</p>
      </div>
    </div>
  </header>
</div>`;

const PLAN_APP_MAIN_AND_CLOSE = `<main class="app-main sp-plan-app-main app-shell app-shell--plan sp-plan-shell-body" id="sp-plan-app-main" hidden>
    <p class="sp-plan-banner" id="sp-plan-banner" hidden></p>
    <div class="panel panel--hero sp-plan-body">
      <section class="sp-plan-student" id="sp-plan-student-info" aria-labelledby="sp-plan-student-info-title">
        <h2 class="sp-plan-student__title" id="sp-plan-student-info-title">학생 정보</h2>
        <p class="sp-plan-student__hint">비어 있는 항목만 입력할 수 있습니다. 저장한 내용은 이 화면에서 다시 수정할 수 없습니다.</p>
        <div class="sp-plan-student__wrap">
          <table class="sp-plan-student__tbl">
            <tbody id="sp-plan-student-tbody"></tbody>
          </table>
          <div class="sp-plan-student__saveRow" id="sp-plan-student-save-row" hidden>
            <button type="button" class="btn btn--primary" id="sp-plan-student-save">프로필 저장</button>
            <span class="sp-plan-student__saveMsg" id="sp-plan-student-save-msg" hidden></span>
          </div>
        </div>
      </section>
      <div class="sp-plan-exportBar" id="sp-plan-export-bar">
        <button type="button" class="btn btn--ghost sp-plan-exportBar__btn" id="sp-plan-pdf-export" title="화면에 보이는 학생 정보·달력을 그대로 캡처해 PDF로 저장합니다(여러 페이지)">PDF로 저장</button>
        <span class="sp-plan-exportBar__msg" id="sp-plan-pdf-export-msg" hidden aria-live="polite"></span>
      </div>
      <div class="sp-plan-monthly-title" id="sp-plan-monthly-label">월간 학습 달력</div>
      <div class="sp-plan-calendar-slot" id="sp-plan-calendar-slot" role="region" aria-labelledby="sp-plan-monthly-label"></div>
    </div>
  </main>`;

/** 게이트·본문과 분리 — `#sp-plan-app-main[hidden]` 안에 두면 모달이 안 보임 */
const PLAN_ADMIN_MODAL_HTML = `<div class="sp-plan-modal sp-plan-modal--admin" id="sp-plan-admin-modal" hidden aria-hidden="true">
      <div class="sp-plan-modal__backdrop" data-sp-admin-close="1"></div>
      <div class="sp-plan-modal__panel" role="dialog" aria-modal="true" aria-labelledby="sp-plan-admin-modal-title">
        <div class="sp-plan-modal__head">
          <div class="sp-plan-modal__title" id="sp-plan-admin-modal-title">관리자 모드</div>
          <button type="button" class="btn btn--ghost sp-plan-modal__close" data-sp-admin-close="1">닫기</button>
        </div>
        <div class="sp-plan-modal__body sp-plan-admin-modal__body">
          <p class="sp-plan-admin-modal__hint">운영자 암호를 입력해 주세요.</p>
          <label class="sp-plan-admin-modal__lbl">
            <span class="sp-plan-admin-modal__lblText">암호</span>
            <span id="sp-plan-admin-secret-slot" class="sp-plan-admin-modal__inputSlot"></span>
          </label>
          <p class="sp-plan-admin-modal__err" id="sp-plan-admin-modal-err" hidden role="alert"></p>
          <div class="sp-plan-admin-modal__actions">
            <button type="button" class="btn btn--primary" id="sp-plan-admin-modal-submit">확인</button>
          </div>
        </div>
      </div>
    </div>`;

const GATE_HTML = `<div class="sp-plan-gate">
  <p class="sp-plan-gate__lead">솔패스 수강 확인을 위해 휴대전화 번호를 입력해 주세요.</p>
  <p class="sp-plan-gate__privacy">입력하신 정보는 본인 확인과 플래너 이용에만 사용됩니다.</p>
  <div class="sp-plan-gate__pair" role="group" aria-label="이름 및 휴대전화">
    <div class="sp-plan-gate__stack">
      <label class="sp-plan-gate__lbl" for="sp-plan-name">이름</label>
      <input
        class="sp-plan-gate__input sp-plan-gate__input--name"
        id="sp-plan-name"
        type="text"
        maxlength="40"
        autocomplete="off"
        name="sp-plan-gate-display-name"
        placeholder="동일 번호가 여러 명일 때만 입력"
      />
    </div>
    <div class="sp-plan-gate__stack sp-plan-gate__stack--tel">
      <span class="sp-plan-gate__lbl" id="sp-plan-phone-legend">휴대전화</span>
      <div class="sp-plan-gate__tel" role="group" aria-labelledby="sp-plan-phone-legend" autocomplete="off">
        <input
          class="sp-plan-gate__input sp-plan-gate__input--seg3"
          id="sp-plan-p0"
          type="tel"
          inputmode="numeric"
          maxlength="3"
          autocomplete="one-time-code"
          name="sp-plan-gate-tel-a"
          aria-label="휴대전화 앞자리 세 자리"
        />
        <span class="sp-plan-gate__dash" aria-hidden="true">-</span>
        <input
          class="sp-plan-gate__input sp-plan-gate__input--seg4"
          id="sp-plan-p1"
          type="tel"
          inputmode="numeric"
          maxlength="4"
          autocomplete="one-time-code"
          name="sp-plan-gate-tel-b"
          aria-label="휴대전화 중간 네 자리"
        />
        <span class="sp-plan-gate__dash" aria-hidden="true">-</span>
        <input
          class="sp-plan-gate__input sp-plan-gate__input--seg4"
          id="sp-plan-p2"
          type="tel"
          inputmode="numeric"
          maxlength="4"
          autocomplete="one-time-code"
          name="sp-plan-gate-tel-c"
          aria-label="휴대전화 끝 네 자리"
        />
      </div>
      <p class="sp-plan-gate__telhint">숫자만 입력해 주세요. (010-0000-0000 형식)</p>
    </div>
  </div>
  <p class="sp-plan-gate__status" id="sp-plan-gate-status" hidden aria-live="polite" aria-busy="false"></p>
  <p class="sp-plan-gate__err" id="sp-plan-gate-err" hidden></p>
  <button type="button" class="btn btn--primary sp-plan-gate__btn" id="sp-plan-gate-submit">확인</button>
</div>`;

/** @param {string[]} segs */
function readPhoneSegments_(segs) {
  return [
    String(segs[0] != null ? segs[0] : '').replace(/\D/g, ''),
    String(segs[1] != null ? segs[1] : '').replace(/\D/g, ''),
    String(segs[2] != null ? segs[2] : '').replace(/\D/g, '')
  ];
}

/**
 * 휴대전화 세 칸: input·붙여넣기에서 숫자만 유지, 3·4·4. 긴 번호 붙여넣기 시 한 번에 나눔.
 * @param {HTMLElement} root
 */
function wirePlanPhoneDigitsOnly_(root) {
  const p0 = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-p0'));
  const p1 = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-p1'));
  const p2 = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-p2'));
  if (!p0 || !p1 || !p2) return;

  const MAXL = [3, 4, 4];

  function digitsOnly(s) {
    return String(s != null ? s : '').replace(/\D/g, '');
  }

  function setSeg(el, max, raw) {
    const d = digitsOnly(raw).slice(0, max);
    if (el.value !== d) {
      el.value = d;
    }
    return d.length;
  }

  /** 짧은 붙여넣기: 0번 칸부터 순서대로 채움 */
  function fillFromStart(d) {
    const x = digitsOnly(d);
    if (!x.length) return;
    p0.value = x.slice(0, 3);
    var rest = x.slice(3);
    p1.value = rest.slice(0, 4);
    rest = rest.slice(4);
    p2.value = rest.slice(0, 4);
    if (p2.value.length < 4) p2.focus();
    else if (p1.value.length < 4) p1.focus();
    else p0.focus();
  }

  /**
   * @param {HTMLInputElement} el
   * @param {number} idx
   */
  function onInputCell(el, idx) {
    const max = MAXL[idx];
    const len = setSeg(el, max, el.value);
    if (len >= max && idx < 2) {
      const next = idx === 0 ? p1 : p2;
      window.setTimeout(function () {
        next.focus();
        try {
          next.setSelectionRange(0, next.value.length);
        } catch (_e) {}
      }, 0);
    }
  }

  [p0, p1, p2].forEach(function (el, idx) {
    el.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const okNav = [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End'
      ];
      if (okNav.indexOf(e.key) >= 0) {
        if (e.key === 'Backspace' && el.value.length === 0) {
          if (idx > 0) {
            const prev = idx === 1 ? p0 : p1;
            prev.focus();
            const pl = prev.value.length;
            prev.setSelectionRange(pl, pl);
          }
        }
        return;
      }
      /* 숫자 정리는 input(setSeg)만 — keydown에서 막으면 글자 조합 중 입력이 잘릴 수 있음 */
    });

    el.addEventListener('input', function () {
      onInputCell(el, idx);
    });

    el.addEventListener('paste', function (e) {
      e.preventDefault();
      const d = digitsOnly(e.clipboardData && e.clipboardData.getData('text'));
      if (!d.length) return;
      if (d.length >= 10) {
        p0.value = d.slice(0, 3);
        p1.value = d.slice(3, 7);
        p2.value = d.slice(7, 11);
        p2.focus();
        return;
      }
      if (idx === 0) {
        fillFromStart(d);
      } else if (idx === 1) {
        p1.value = d.slice(0, 4);
        p2.value = d.slice(4, 8);
        p2.focus();
      } else {
        p2.value = d.slice(0, 4);
        p2.focus();
      }
    });
  });
}

/** 일일 타임라인 행 순서(6…23, 0…5) · `시_칸` 키 · 프론트만 */
const PLAN_TIMELINE_HOURS_ORDERED = Object.freeze([
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5
]);
const PLAN_TIMELINE_CELLS_PER_HOUR = 6;
const PLAN_TIMELINE_CELL_MIN = 10;
/** 타임라인 막대 칸 라벨 — 제목(공백 제거)을 칸마다 이 글자 수만큼 */
const PLAN_TIMELINE_BAR_LABEL_CHUNK_LEN = 4;
/** 예전 30분 슬롯 마이그레이션용 */
const PLAN_TIMELINE_LEGACY_START_H = 6;
const PLAN_TIMELINE_LEGACY_STEP_MIN = 30;

/** 일일 목록에 항상 노출. 타임라인 과목별 합계·달력 ‘시간표’ 분 배지에서는 제외 */
const PLAN_FIXED_SLEEP_TODO_ID = '__sp_routine_sleep';
const PLAN_FIXED_MEAL_TODO_ID = '__sp_routine_meal';
/** DB `category` — 고정 일정(합산·배지 제외) */
const PLAN_CATEGORY_FIXED = 'fixed';
/** DB `category` — 일일 모달 루틴(취침·식사). `timeline_slots` 칠한 뒤에만 POST */
const PLAN_CATEGORY_ROUTINE = 'routine';

/** 같은 날 표시·`sort_key` 부여: 어휘 → 문법 → 논리 → 독해 → 기타 (드래그 순서 없음). */
const PLANNER_STUDY_CATEGORY_ORDER = ['vocab', 'grammar', 'logic', 'read', 'misc'];

/**
 * @param {object|null|undefined} row
 * @returns {boolean} `trace_dates`만으로 그날에 보이는 회색 흔적(본행 아님)
 */
function plannerIsTraceGhostDisplay_(row) {
  return Boolean(row && typeof row === 'object' && row._spTraceGhost === true);
}

/**
 * 취침·식사·고정일정 — 월간 합산·배지·과목별 공부 시간에 넣지 않음.
 * @param {string} taskId
 * @param {string} [category]
 * @returns {boolean}
 */
function plannerIsExcludedFromStudyTotals_(taskId, category) {
  if (plannerIsRoutineExcludedFromStudyTotals_(taskId)) return true;
  const c = String(category != null ? category : '').trim();
  if (c === PLAN_CATEGORY_FIXED || c === 'memo') return true;
  return false;
}

/**
 * @param {string} taskId
 * @returns {boolean}
 */
function plannerIsRoutineTaskId_(taskId) {
  const id = String(taskId != null ? taskId : '').trim();
  return id === PLAN_FIXED_SLEEP_TODO_ID || id === PLAN_FIXED_MEAL_TODO_ID;
}

/**
 * @param {string} taskId
 * @param {string} [category]
 * @returns {boolean}
 */
function plannerIsRoutineExcludedFromStudyTotals_(taskId, category) {
  if (plannerIsRoutineTaskId_(taskId)) return true;
  return String(category != null ? category : '').trim() === PLAN_CATEGORY_ROUTINE;
}

/**
 * @param {string} dateYmd
 * @returns {{ task_id: string, title: string, date: string, category: string, lecture_id: string, timeline_slots: string, sort_key: number, mark: string, trace_dates: string, created_date: string, updated_date: string }[]}
 */
function plannerFixedRoutineTodoRows_(dateYmd) {
  const y = String(dateYmd || '').trim();
  const today = plannerTodayYmdSeoul_();
  /**
   * @param {string} taskId
   * @param {string} title
   * @param {number} sortKey
   */
  function row(taskId, title, sortKey) {
    return {
      task_id: taskId,
      title: title,
      date: y,
      category: PLAN_CATEGORY_ROUTINE,
      lecture_id: '',
      timeline_slots: '[]',
      sort_key: sortKey,
      mark: 'none',
      trace_dates: '[]',
      created_date: today,
      updated_date: today
    };
  }
  return [
    row(PLAN_FIXED_SLEEP_TODO_ID, '취침시간', -1000),
    row(PLAN_FIXED_MEAL_TODO_ID, '식사시간', -999)
  ];
}

/**
 * 루틴 행은 타임라인을 칠한 경우에만 월 apply 본문에 포함.
 * @param {object|null} row
 * @returns {boolean}
 */
function plannerShouldIncludeRowInMonthApply_(row) {
  if (!row || typeof row !== 'object') return false;
  const cat = String(row.category != null ? row.category : '').trim();
  const tid = String(row.task_id != null ? row.task_id : '').trim();
  if (cat !== PLAN_CATEGORY_ROUTINE && !plannerIsRoutineTaskId_(tid)) return true;
  const raw = String(row.timeline_slots != null ? row.timeline_slots : '').trim();
  if (!raw.length || raw === '[]') return false;
  try {
    const j = JSON.parse(raw);
    return Array.isArray(j) && j.length > 0;
  } catch (_e) {
    return false;
  }
}

/**
 * @param {string} dateYmd
 * @param {{ task_id: string, title: string, date: string, category: string, lecture_id: string, timeline_slots: string, sort_key: number, mark: string, trace_dates: string, created_date: string, updated_date: string }[]} list
 */
function plannerWithFixedRoutineTodosFirst_(dateYmd, list) {
  const idSeen = {};
  (list || []).forEach(function (r) {
    if (r && r.task_id) idSeen[String(r.task_id)] = true;
  });
  const prefix = [];
  plannerFixedRoutineTodoRows_(dateYmd).forEach(function (fr) {
    if (!idSeen[String(fr.task_id)]) prefix.push(fr);
  });
  return prefix.concat(list || []);
}

/**
 * @param {string} cat
 * @returns {string}
 */
function plannerCategoryLabelKo_(cat) {
  const c = String(cat != null ? cat : '').trim() || 'misc';
  const m = {
    grammar: '문법',
    logic: '논리',
    read: '독해',
    vocab: '어휘',
    misc: '기타',
    fixed: '고정일정',
    routine: '루틴'
  };
  return m[c] != null ? m[c] : c;
}

/**
 * @param {string} cat
 * @returns {number}
 */
function plannerStudyCategoryRank_(cat) {
  const c = String(cat != null ? cat : '').trim() || 'misc';
  if (c === PLAN_CATEGORY_FIXED) return -9000;
  if (c === PLAN_CATEGORY_ROUTINE) return -8000;
  if (c === 'memo') return 9000;
  const ix = PLANNER_STUDY_CATEGORY_ORDER.indexOf(c);
  return ix >= 0 ? ix : PLANNER_STUDY_CATEGORY_ORDER.length;
}

/**
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
function plannerCompareMonthTodoDisplay_(a, b) {
  const ga = plannerIsTraceGhostDisplay_(a) ? 1 : 0;
  const gb = plannerIsTraceGhostDisplay_(b) ? 1 : 0;
  if (ga !== gb) return ga - gb;
  const ra = plannerStudyCategoryRank_(String(a.category != null ? a.category : ''));
  const rb = plannerStudyCategoryRank_(String(b.category != null ? b.category : ''));
  if (ra !== rb) return ra - rb;
  return (Number(a.sort_key) || 0) - (Number(b.sort_key) || 0);
}

/**
 * 보는 달 각 날짜별 `sort_key`를 과목 순서(어휘→…→기타)로 맞춤.
 * @param {object} st
 */
function plannerAssignCategorySortKeysForViewMonth_(st) {
  plannerEnsureMonthTodos_(st);
  const view = st.viewMonth instanceof Date && !isNaN(st.viewMonth.getTime()) ? st.viewMonth : new Date();
  const pfx = plannerMonthYmdPrefix_(view);
  /** @type {Record<string, object[]>} */
  const byDay = {};
  st.monthTodos.forEach(function (r) {
    if (!r || typeof r !== 'object') return;
    const d = String(r.date != null ? r.date : '').trim();
    if (d.indexOf(pfx) !== 0) return;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(r);
  });
  Object.keys(byDay).forEach(function (ymd) {
    const rows = byDay[ymd].slice().sort(plannerCompareMonthTodoDisplay_);
    rows.forEach(function (row, ix) {
      row.sort_key = ix;
    });
  });
}

/**
 * 왼쪽 표에서 **과목 열 rowspan** 기준: 루틴(취침·식사)은 각각 분리, 그 외는 같은 category 연속만 병합.
 * @param {{ task_id?: string, category?: string }|null} r
 * @returns {string}
 */
function plannerTodoSideMergeKey_(r) {
  if (!r) return '';
  if (plannerIsTraceGhostDisplay_(r)) {
    return '\0trace\0' + String(r.task_id != null ? r.task_id : '') + '\0' + String(r._spTraceOnDate || '');
  }
  const id = String(r.task_id != null ? r.task_id : '').trim();
  if (plannerIsRoutineExcludedFromStudyTotals_(id)) return '\0routine\0' + id;
  if (String(r.category != null ? r.category : '').trim() === PLAN_CATEGORY_FIXED) return '\0fixed\0' + id;
  return '\0cat\0' + (String(r.category != null ? r.category : '').trim() || 'misc');
}

/**
 * @param {{ task_id?: string, category?: string }|null} r
 * @returns {string}
 */
function plannerTodoSideSubjectLabel_(r) {
  if (!r) return '';
  if (plannerIsTraceGhostDisplay_(r)) return '밀림';
  const id = String(r.task_id != null ? r.task_id : '').trim();
  if (id === PLAN_FIXED_SLEEP_TODO_ID) return '취침';
  if (id === PLAN_FIXED_MEAL_TODO_ID) return '식사';
  if (String(r.category != null ? r.category : '').trim() === PLAN_CATEGORY_FIXED) return '고정';
  return plannerCategoryLabelKo_(r.category);
}

function plannerPad2_(n) {
  return String(n < 10 ? '0' : '') + String(n);
}

function plannerYmdFromParts_(y, m0, day) {
  return String(y) + '-' + plannerPad2_(m0 + 1) + '-' + plannerPad2_(day);
}

/** @returns {string} 서울 기준 오늘 `YYYY-MM-DD` */
function plannerTodayYmdSeoul_() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch (_e) {
    const d = new Date();
    return plannerYmdFromParts_(d.getFullYear(), d.getMonth(), d.getDate());
  }
}

/**
 * @param {unknown} v `YYYY-MM-DD` 또는 ISO 시각 문자열
 * @returns {string}
 */
function plannerYmdFromDateField_(v) {
  const s = String(v != null ? v : '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return '';
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function plannerParseTraceDatesJson_(raw) {
  const s = String(raw != null ? raw : '').trim();
  if (!s.length) return [];
  try {
    const j = JSON.parse(s);
    if (!Array.isArray(j)) return [];
    const out = [];
    j.forEach(function (d) {
      const y = plannerYmdFromDateField_(d);
      if (y && out.indexOf(y) < 0) out.push(y);
    });
    out.sort();
    return out;
  } catch (_e) {
    return [];
  }
}

/**
 * @param {string[]} list
 * @returns {string}
 */
function plannerTraceDatesToJson_(list) {
  const arr = Array.isArray(list) ? list.slice() : [];
  arr.sort();
  return JSON.stringify(arr);
}

/**
 * @param {object} row
 * @param {string} ymd
 * @returns {boolean}
 */
function plannerTraceDatesIncludes_(row, ymd) {
  const d = String(ymd || '').trim();
  if (!d) return false;
  return plannerParseTraceDatesJson_(row && row.trace_dates).indexOf(d) >= 0;
}

/**
 * @param {string} fromDateYmd
 * @param {string} toDateYmd
 * @returns {boolean} `to`가 `from`보다 뒤(밀림)이면 true — `trace_dates`에만 기록
 */
function plannerIsPostponeMove_(fromDateYmd, toDateYmd) {
  const a = String(fromDateYmd || '').trim();
  const b = String(toDateYmd || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return false;
  return b > a;
}

/**
 * 같은 `task_id` 행: `date`만 변경. 밀림이면 떠난 날을 `trace_dates`에 append (행 추가 없음).
 * @param {object} row
 * @param {string} toDateYmd
 */
function plannerApplyTodoDateMove_(row, toDateYmd) {
  if (!row || typeof row !== 'object') return;
  const fromD = String(row.date != null ? row.date : '').trim();
  const toD = String(toDateYmd || '').trim();
  if (!fromD || !toD || fromD === toD) return;
  if (plannerIsPostponeMove_(fromD, toD)) {
    const list = plannerParseTraceDatesJson_(row.trace_dates);
    if (list.indexOf(fromD) < 0) list.push(fromD);
    row.trace_dates = plannerTraceDatesToJson_(list);
  }
  row.date = toD;
  row.updated_date = plannerTodayYmdSeoul_();
}

function plannerMonthYmdPrefix_(viewMonth) {
  return String(viewMonth.getFullYear()) + '-' + plannerPad2_(viewMonth.getMonth() + 1) + '-';
}

/**
 * @param {object} st
 * @param {Date} viewMonth
 */
function plannerMonthHasQuickPlan_(st, viewMonth) {
  const pfx = plannerMonthYmdPrefix_(viewMonth);
  plannerEnsureMonthTodos_(st);
  return st.monthTodos.some(function (r) {
    return r && !r._fromServer && String(r.date || '').trim().indexOf(pfx) === 0;
  });
}

/**
 * @param {object} st
 * @param {Date} viewMonth
 */
function plannerClearQuickPlanForMonth_(st, viewMonth) {
  plannerClearLocalTodosForMonth_(st, viewMonth);
}

/**
 * API/시트 `timeline_slots` 한 요소 → `시_칸` 키 (`8_3`). `0830` 형태는 시·분에서 10분 칸으로 변환.
 * @param {unknown} slot
 * @returns {string}
 */
function plannerNormalizeTimelineSlotKeyFromApi_(slot) {
  const s = String(slot != null ? slot : '').trim();
  if (!s) return '';
  if (/^\d+_[0-5]$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) {
    const hour = parseInt(s.slice(0, 2), 10);
    const min = parseInt(s.slice(2, 4), 10);
    if (!isFinite(hour) || !isFinite(min)) return '';
    const sub = Math.floor(min / 10);
    if (sub < 0 || sub > 5) return '';
    return plannerTimelineSlotKey_(hour, sub);
  }
  return '';
}

/**
 * bootstrap `personal` 한 줄 → 페이로드용( `task_id` 문자열 ).
 * @param {object} row
 * @returns {{ task_id: string, title: string, date: string, category: string, lecture_id: string, timeline_slots: string, sort_key: number, mark: string, trace_dates: string, created_date: string, updated_date: string }}
 */
function plannerNormalizeServerTodoRowForPayload_(row) {
  const r = row && typeof row === 'object' ? row : {};
  const tidRaw = r.task_id;
  const task_id = tidRaw != null && String(tidRaw).trim() !== '' ? String(tidRaw).trim() : '';
  const ts0 = String(r.timeline_slots != null ? r.timeline_slots : '').trim();
  const dateStr = String(r.date != null ? r.date : '').trim();
  const today = plannerTodayYmdSeoul_();
  let created_date = plannerYmdFromDateField_(r.created_date);
  if (!created_date) created_date = plannerYmdFromDateField_(r.created_at);
  if (!created_date) created_date = today;
  let updated_date = plannerYmdFromDateField_(r.updated_date);
  if (!updated_date) updated_date = plannerYmdFromDateField_(r.updated_at);
  if (!updated_date) updated_date = today;
  const timeline_slots = ts0.length ? ts0 : '[]';
  const mark = String(r.mark != null ? r.mark : 'none').trim() || 'none';
  const trace_dates = plannerTraceDatesToJson_(plannerParseTraceDatesJson_(r.trace_dates));
  return {
    task_id: task_id,
    title: String(r.title != null ? r.title : '').trim() || '(제목 없음)',
    date: dateStr,
    category: String(r.category != null ? r.category : 'misc').trim() || 'misc',
    lecture_id: String(r.lecture_id != null ? r.lecture_id : ''),
    timeline_slots: timeline_slots,
    sort_key: Number(r.sort_key) || 0,
    mark: mark,
    trace_dates: trace_dates,
    created_date: created_date,
    updated_date: updated_date
  };
}

/**
 * @param {object} st
 */
function plannerEnsureMonthTodos_(st) {
  if (!st || typeof st !== 'object') return;
  if (!Array.isArray(st.monthTodos)) st.monthTodos = [];
}

/**
 * @param {object} row
 * @returns {object}
 */
function plannerTodoRowFromServer_(row) {
  const n = plannerNormalizeServerTodoRowForPayload_(row);
  n._fromServer = true;
  return n;
}

/**
 * @param {object} row
 * @returns {object}
 */
function plannerTodoRowLocal_(row) {
  const n = plannerNormalizeServerTodoRowForPayload_(row);
  n._fromServer = false;
  return n;
}

/**
 * POST 본문용 — `_fromServer` 제거.
 * @param {object} row
 * @returns {object}
 */
function plannerTodoRowForPost_(row) {
  return plannerNormalizeServerTodoRowForPayload_(row);
}

/**
 * @param {object} st
 * @param {string} ymd
 * @returns {number}
 */
function plannerNextSortKeyForDate_(st, ymd) {
  plannerEnsureMonthTodos_(st);
  let max = -1;
  st.monthTodos.forEach(function (r) {
    if (!r || String(r.date || '').trim() !== ymd) return;
    const sk = Number(r.sort_key) || 0;
    if (sk > max) max = sk;
  });
  return max + 1;
}

/**
 * @param {object} st
 * @param {object} row
 */
function plannerPushMonthTodo_(st, row, skipRebuild) {
  plannerEnsureMonthTodos_(st);
  const d = String(row.date != null ? row.date : '').trim();
  if (!d) return;
  if (row.sort_key == null || row.sort_key === '' || !isFinite(Number(row.sort_key))) {
    row.sort_key = plannerNextSortKeyForDate_(st, d);
  }
  st.monthTodos.push(row);
  if (!skipRebuild) plannerRebuildQuickPostPayload_(st);
}

/**
 * @param {object} st
 * @param {Date} viewMonth
 */
function plannerClearLocalTodosForMonth_(st, viewMonth) {
  plannerEnsureMonthTodos_(st);
  const pfx = plannerMonthYmdPrefix_(viewMonth);
  st.monthTodos = st.monthTodos.filter(function (r) {
    if (!r || typeof r !== 'object') return false;
    if (r._fromServer) return true;
    const d = String(r.date != null ? r.date : '').trim();
    return d.indexOf(pfx) !== 0;
  });
  if (st.dayFixedBlockSlotsByDate) {
    Object.keys(st.dayFixedBlockSlotsByDate).forEach(function (k) {
      if (k.indexOf(pfx) === 0) {
        try {
          delete st.dayFixedBlockSlotsByDate[k];
        } catch (_e) {
          st.dayFixedBlockSlotsByDate[k] = {};
        }
      }
    });
  }
  plannerRebuildQuickPostPayload_(st);
}

/**
 * @param {object} st
 * @param {string} ymd
 * @returns {Record<string, string>}
 */
function plannerBuildTimelineSlotMapForDayFromMonthTodos_(st, ymd) {
  const rows = plannerMonthTodosForDay_(st, ymd);
  /** @type {Record<string, string>} */
  const map = {};
  rows.forEach(function (row) {
    if (!row || plannerIsTraceGhostDisplay_(row)) return;
    const cat = String(row.category != null ? row.category : '').trim();
    if (cat === PLAN_CATEGORY_FIXED || cat === 'memo') return;
    if (plannerIsRoutineExcludedFromStudyTotals_(row.task_id, cat)) return;
    const tid = String(row.task_id != null ? row.task_id : '').trim();
    if (!tid) return;
    let arr = [];
    try {
      const j = JSON.parse(String(row.timeline_slots != null ? row.timeline_slots : '[]'));
      if (Array.isArray(j)) arr = j;
    } catch (_e) {}
    arr.forEach(function (slot) {
      const sk = plannerNormalizeTimelineSlotKeyFromApi_(slot);
      if (sk) map[sk] = tid;
    });
  });
  return map;
}

/**
 * 일일 모달 타임라인 맵 → 해당 날 `monthTodos` 행의 `timeline_slots`.
 * @param {object} st
 * @param {string} ymd
 */
function plannerPersistTimelineSlotMapToMonthTodos_(st, ymd) {
  const map = st.dayTimelineTodoByDate && st.dayTimelineTodoByDate[ymd];
  if (!map || typeof map !== 'object') return;
  /** @type {Record<string, string[]>} */
  const byTask = {};
  Object.keys(map).forEach(function (sk) {
    const tid = String(map[sk] != null ? map[sk] : '').trim();
    if (!tid) return;
    if (!byTask[tid]) byTask[tid] = [];
    byTask[tid].push(sk);
  });
  plannerEnsureMonthTodos_(st);
  const today = plannerTodayYmdSeoul_();
  st.monthTodos.forEach(function (row) {
    if (!row || String(row.date || '').trim() !== ymd) return;
    if (plannerIsTraceGhostDisplay_(row)) return;
    const tid = String(row.task_id != null ? row.task_id : '').trim();
    const keys = byTask[tid] ? byTask[tid].slice().sort() : [];
    row.timeline_slots = JSON.stringify(keys);
    if (!row._fromServer) row.updated_date = today;
  });
  plannerUpsertRoutineMonthTodosFromDayMap_(st, ymd, byTask);
  plannerRebuildQuickPostPayload_(st);
}

/**
 * 일일 모달에서 취침·식사 칠함 → `monthTodos`에 `category:routine` 행 upsert(칸 없으면 제거).
 * @param {object} st
 * @param {string} ymd
 * @param {Record<string, string[]>} byTask
 */
function plannerUpsertRoutineMonthTodosFromDayMap_(st, ymd, byTask) {
  plannerEnsureMonthTodos_(st);
  const day = String(ymd || '').trim();
  if (!day) return;
  const today = plannerTodayYmdSeoul_();
  /** @type {{ id: string, title: string, sort: number }[]} */
  const specs = [
    { id: PLAN_FIXED_SLEEP_TODO_ID, title: '취침시간', sort: -1000 },
    { id: PLAN_FIXED_MEAL_TODO_ID, title: '식사시간', sort: -999 }
  ];
  specs.forEach(function (spec) {
    const keys = byTask[spec.id] ? byTask[spec.id].slice().sort() : [];
    let ix = -1;
    let i;
    for (i = 0; i < st.monthTodos.length; i++) {
      const r = st.monthTodos[i];
      if (r && String(r.date || '').trim() === day && String(r.task_id || '').trim() === spec.id) {
        ix = i;
        break;
      }
    }
    if (!keys.length) {
      if (ix >= 0) st.monthTodos.splice(ix, 1);
      return;
    }
    const payload = {
      task_id: spec.id,
      title: spec.title,
      date: day,
      category: PLAN_CATEGORY_ROUTINE,
      lecture_id: '',
      timeline_slots: JSON.stringify(keys),
      sort_key: spec.sort,
      mark: 'none',
      trace_dates: '[]',
      created_date: today,
      updated_date: today
    };
    if (ix >= 0) {
      const prev = st.monthTodos[ix];
      const fromSrv = prev && prev._fromServer;
      st.monthTodos[ix] = plannerTodoRowLocal_(payload);
      if (fromSrv) st.monthTodos[ix]._fromServer = true;
    } else {
      plannerPushMonthTodo_(st, plannerTodoRowLocal_(payload), true);
    }
  });
}

/**
 * @param {object} st
 * @param {string} dateYmd
 * @returns {object[]}
 */
function plannerMonthTodosForDay_(st, dateYmd) {
  plannerEnsureMonthTodos_(st);
  const day = String(dateYmd || '').trim();
  /** @type {object[]} */
  const rows = [];
  st.monthTodos.forEach(function (t) {
    if (!t || typeof t !== 'object') return;
    if (String(t.date || '') === day) {
      rows.push(t);
      return;
    }
    if (plannerTraceDatesIncludes_(t, day)) {
      rows.push(Object.assign({}, t, { _spTraceGhost: true, _spTraceOnDate: day }));
    }
  });
  rows.sort(plannerCompareMonthTodoDisplay_);
  return rows;
}

/**
 * @param {object} st
 * @param {string} taskId
 * @returns {object|null}
 */
function plannerFindMonthTodoByTaskId_(st, taskId) {
  plannerEnsureMonthTodos_(st);
  const id = String(taskId || '').trim();
  if (!id) return null;
  for (let i = 0; i < st.monthTodos.length; i++) {
    const r = st.monthTodos[i];
    if (r && String(r.task_id) === id) return r;
  }
  return null;
}

/**
 * n빵: M일에 N강을 균등 분배.
 * @param {number} dayCount
 * @param {number} totalLessons
 * @returns {number[]}
 */
function plannerNbungCounts_(dayCount, totalLessons) {
  const M = Math.max(0, Math.floor(Number(dayCount) || 0));
  const N = Math.max(0, Math.floor(Number(totalLessons) || 0));
  if (M <= 0 || N <= 0) return [];
  const base = Math.floor(N / M);
  const rem = N % M;
  /** @type {number[]} */
  const out = [];
  let i;
  for (i = 0; i < M; i++) {
    out.push(base + (i < rem ? 1 : 0));
  }
  return out;
}

/**
 * 서버에서 읽은 `personal` 이 월 todo 스키마인지(`task_id` 키 유무).
 * @param {object|null|undefined} row
 * @returns {boolean}
 */
function plannerBootstrapPersonalIsFullSchema_(row) {
  return Boolean(row && typeof row === 'object' && Object.prototype.hasOwnProperty.call(row, 'task_id'));
}

/**
 * `renderCalendar_` 직후: 회원 bootstrap `personal` → `monthTodos`·POST 페이로드.
 * @param {object} st
 * @param {object[]|null} personal
 * @param {'member'|'guest'} role
 */
function plannerApplyBootstrapPersonal_(st, personal, role) {
  if (!st || typeof st !== 'object') return;
  plannerEnsureMonthTodos_(st);
  if (role !== 'member') {
    st.monthTodos = [];
    plannerRebuildQuickPostPayload_(st);
    return;
  }
  const list = personal != null && Array.isArray(personal) ? personal : [];
  if (!list.length) {
    st.monthTodos = [];
    plannerRebuildQuickPostPayload_(st);
    return;
  }
  const first = list[0];
  if (!plannerBootstrapPersonalIsFullSchema_(first)) {
    st.monthTodos = [];
    plannerRebuildQuickPostPayload_(st);
    return;
  }
  st.monthTodos = list.map(plannerTodoRowFromServer_);
  plannerSyncDayMemoByDateFromMonthTodos_(st);
  if (st.viewMonth instanceof Date && !isNaN(st.viewMonth.getTime())) {
    plannerRebuildFixedBlockSlotsForMonth_(st, st.viewMonth);
    plannerInvalidateTimelineCacheForViewMonth_(st, st.viewMonth);
  }
  plannerRebuildQuickPostPayload_(st);
}

/**
 * `monthTodos`의 `category:memo` → `dayMemoByDate` (일일 모달 textarea).
 * @param {object} st
 */
function plannerSyncDayMemoByDateFromMonthTodos_(st) {
  if (!st || typeof st !== 'object') return;
  if (!st.dayMemoByDate) st.dayMemoByDate = {};
  plannerEnsureMonthTodos_(st);
  /** @type {Record<string, string>} */
  const byDay = {};
  st.monthTodos.forEach(function (row) {
    if (!row || String(row.category || '').trim() !== 'memo') return;
    const ymd = String(row.date != null ? row.date : '').trim();
    if (!ymd) return;
    const text = String(row.title != null ? row.title : '').trim();
    if (text) byDay[ymd] = text;
  });
  Object.keys(byDay).forEach(function (ymd) {
    st.dayMemoByDate[ymd] = byDay[ymd];
  });
}

/**
 * 일일 메모 textarea → 해당 날 `monthTodos` memo 행 1건(없으면 제거, 있으면 upsert).
 * @param {object} st
 * @param {string} ymd
 */
function plannerSyncDayMemoToMonthTodo_(st, ymd) {
  if (!st || typeof st !== 'object') return;
  const day = String(ymd || '').trim();
  if (!day) return;
  plannerEnsureMonthTodos_(st);
  const text = st.dayMemoByDate && st.dayMemoByDate[day] != null ? String(st.dayMemoByDate[day]).trim() : '';
  const today = plannerTodayYmdSeoul_();
  let existingIx = -1;
  let existingTid = '';
  let i;
  for (i = 0; i < st.monthTodos.length; i++) {
    const r = st.monthTodos[i];
    if (r && String(r.date || '').trim() === day && String(r.category || '').trim() === 'memo') {
      existingIx = i;
      existingTid = String(r.task_id != null ? r.task_id : '').trim();
      break;
    }
  }
  if (!text.length) {
    if (existingIx >= 0) st.monthTodos.splice(existingIx, 1);
    plannerRebuildQuickPostPayload_(st);
    return;
  }
  const task_id = existingTid.length ? existingTid : '__sp_memo_' + day;
  const payload = {
    task_id: task_id,
    title: text,
    date: day,
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: today,
    updated_date: today
  };
  if (existingIx >= 0) {
    const fromSrv = st.monthTodos[existingIx] && st.monthTodos[existingIx]._fromServer;
    st.monthTodos[existingIx] = plannerTodoRowLocal_(payload);
    if (fromSrv) st.monthTodos[existingIx]._fromServer = true;
  } else {
    plannerPushMonthTodo_(st, plannerTodoRowLocal_(payload), true);
  }
  plannerRebuildQuickPostPayload_(st);
}

/**
 * 고정 일정이 막는 칸 키를 공부·루틴 todo의 `timeline_slots`에서 제거(저장 데이터 정합).
 * @param {object} st
 * @param {string} ymd
 * @param {string[]} slotKeys
 */
function plannerStripStudyTimelineSlotsOnDay_(st, ymd, slotKeys) {
  if (!st || !slotKeys || !slotKeys.length) return;
  /** @type {Record<string, boolean>} */
  const blocked = {};
  slotKeys.forEach(function (k) {
    const sk = plannerNormalizeTimelineSlotKeyFromApi_(k);
    if (sk) blocked[sk] = true;
  });
  if (!Object.keys(blocked).length) return;
  const day = String(ymd || '').trim();
  const today = plannerTodayYmdSeoul_();
  plannerEnsureMonthTodos_(st);
  st.monthTodos.forEach(function (row) {
    if (!row || String(row.date || '').trim() !== day) return;
    if (plannerIsTraceGhostDisplay_(row)) return;
    const cat = String(row.category || '').trim();
    if (cat === PLAN_CATEGORY_FIXED || cat === 'memo') return;
    if (plannerIsRoutineExcludedFromStudyTotals_(row.task_id, cat)) return;
    let arr = [];
    try {
      const j = JSON.parse(String(row.timeline_slots != null ? row.timeline_slots : '[]'));
      if (Array.isArray(j)) arr = j;
    } catch (_e) {}
    const next = [];
    arr.forEach(function (slot) {
      const sk = plannerNormalizeTimelineSlotKeyFromApi_(slot);
      if (sk && blocked[sk]) return;
      next.push(slot);
    });
    if (next.length === arr.length) return;
    row.timeline_slots = JSON.stringify(next);
    if (!row._fromServer) row.updated_date = today;
  });
}

/**
 * `monthTodos` → POST 미리보기·`plannerPersonalTodosApply` 본문.
 * @param {object} st
 */
function plannerRebuildQuickPostPayload_(st) {
  plannerEnsureMonthTodos_(st);
  const view = st.viewMonth instanceof Date && !isNaN(st.viewMonth.getTime()) ? st.viewMonth : new Date();
  plannerAssignCategorySortKeysForViewMonth_(st);
  const pfx = plannerMonthYmdPrefix_(view);
  const ym = plannerYearMonthFromDate_(view);
  const todos = st.monthTodos
    .filter(function (r) {
      return (
        r &&
        String(r.date || '').trim().indexOf(pfx) === 0 &&
        plannerShouldIncludeRowInMonthApply_(r)
      );
    })
    .map(plannerTodoRowForPost_);
  st.plannerQuickPostBody = {
    action: 'plannerPersonalTodosApply',
    year_month: ym,
    todos: todos
  };
}

/** 커리큘럼 개별 등록 — 과목 코드(마스터 `courses.subject` 매칭용). */
const PLANNER_CURR_SUBJECT_OPTS = [
  { code: 'vocab', label: '어휘' },
  { code: 'grammar', label: '문법' },
  { code: 'logic', label: '논리' },
  { code: 'read', label: '독해' },
  { code: 'misc', label: '기타' }
];

/**
 * 커리큘럼 등록 과목 셀렉트 옵션 — `기타`는 카탈로그 없어도 항상 노출.
 * @param {object[]} courses
 * @returns {{ value: string, label: string }[]}
 */
function plannerCurriculumSubjectSelectItems_(courses) {
  const out = [];
  PLANNER_CURR_SUBJECT_OPTS.forEach(function (o) {
    if (o.code === 'misc') {
      out.push({ value: o.code, label: o.label });
      return;
    }
    const rows = plannerCurriculumCoursesForSubject_(courses, o.code);
    if (rows.length) out.push({ value: o.code, label: o.label });
  });
  return out;
}

/**
 * @param {object} st
 * @returns {{ courses: object[], lectures: object[] }}
 */
function plannerCurriculumCatalog_(st) {
  const pack = st && st.plannerCurriculum ? st.plannerCurriculum : { courses: [], lectures: [] };
  return {
    courses: Array.isArray(pack.courses) ? pack.courses : [],
    lectures: Array.isArray(pack.lectures) ? pack.lectures : []
  };
}

/**
 * @param {object} st
 * @returns {boolean}
 */
function plannerCurriculumHasCatalog_(st) {
  const c = plannerCurriculumCatalog_(st);
  return c.courses.length > 0 && c.lectures.length > 0;
}

/**
 * todo `title` — 강좌명 · N강 (`lecture_name` 미사용).
 * @param {string} courseName
 * @param {number} lectureNo
 * @returns {string}
 */
function plannerCurriculumTodoTitle_(courseName, lectureNo) {
  const name = String(courseName != null ? courseName : '').trim();
  const no = Number(lectureNo);
  if (!name.length) return isFinite(no) && no > 0 ? String(no) + '강' : '';
  if (!isFinite(no) || no <= 0) return name;
  return name + ' · ' + String(no) + '강';
}

/** @type {HTMLSpanElement|null} */
let plannerControlFitMeasureEl_ = null;

/**
 * @param {string} text
 * @param {HTMLElement} refEl
 * @returns {number}
 */
function plannerControlFitMeasureWidth_(text, refEl) {
  if (!plannerControlFitMeasureEl_) {
    plannerControlFitMeasureEl_ = document.createElement('span');
    plannerControlFitMeasureEl_.setAttribute('aria-hidden', 'true');
    plannerControlFitMeasureEl_.style.cssText =
      'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;pointer-events:none;';
    document.body.appendChild(plannerControlFitMeasureEl_);
  }
  const cs = getComputedStyle(refEl);
  plannerControlFitMeasureEl_.style.font = cs.font;
  plannerControlFitMeasureEl_.textContent = text || '';
  return plannerControlFitMeasureEl_.offsetWidth;
}

/**
 * 기본(첫 측정) 너비는 유지하고, 선택·표시 텍스트 길이에 맞춰 가로 확장.
 * @param {HTMLSelectElement|HTMLInputElement} el
 * @param {string} [textOverride]
 */
function plannerControlFitSyncWidth_(el, textOverride) {
  if (!el || !el.classList || !el.classList.contains('sp-plan-manual__control--fit')) {
    return;
  }
  const padKey = 'data-sp-fit-pad';
  let pad = Number(el.getAttribute(padKey));
  if (!pad) {
    pad = el instanceof HTMLSelectElement ? 38 : 24;
    el.setAttribute(padKey, String(pad));
  }
  const minKey = 'data-sp-fit-min-px';
  let minPx = Number(el.getAttribute(minKey));
  if (!minPx) {
    const ph =
      el.getAttribute('data-sp-fit-ph') ||
      (el instanceof HTMLSelectElement && el.options[0] ? String(el.options[0].textContent || '') : '') ||
      (el instanceof HTMLInputElement ? String(el.placeholder || '') : '') ||
      '선택';
    minPx = plannerControlFitMeasureWidth_(ph, el) + pad;
    el.setAttribute(minKey, String(Math.ceil(minPx)));
    el.style.setProperty('--sp-plan-control-fit-min', minPx + 'px');
  }
  let text = textOverride != null ? String(textOverride) : '';
  if (!text.length) {
    if (el instanceof HTMLSelectElement) {
      const opt = el.options[el.selectedIndex];
      text = opt ? String(opt.textContent || '').trim() : '';
    } else if (el instanceof HTMLInputElement) {
      text = String(el.value || el.placeholder || '').trim();
    }
  }
  const contentW = text.length ? plannerControlFitMeasureWidth_(text, el) + pad : minPx;
  el.style.width = Math.ceil(Math.max(minPx, contentW)) + 'px';
}

/**
 * @param {HTMLElement} slot
 */
function plannerControlFitSyncWidthsIn_(slot) {
  slot.querySelectorAll('.sp-plan-manual__control--fit').forEach(function (node) {
    if (node instanceof HTMLSelectElement || node instanceof HTMLInputElement) {
      plannerControlFitSyncWidth_(node);
    }
  });
}

/**
 * @param {HTMLSelectElement} sel
 * @param {{ value: string, label: string }[]} items
 * @param {string} [placeholder]
 */
function plannerSelectFillOptions_(sel, items, placeholder) {
  const prev = sel.value;
  sel.innerHTML = '';
  if (placeholder) {
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholder;
    sel.appendChild(ph);
  }
  items.forEach(function (it) {
    const o = document.createElement('option');
    o.value = String(it.value);
    o.textContent = String(it.label);
    sel.appendChild(o);
  });
  if (prev) {
    const ok = Array.prototype.some.call(sel.options, function (opt) {
      return opt.value === prev;
    });
    if (ok) sel.value = prev;
  }
  if (sel.classList.contains('sp-plan-manual__control--fit')) {
    plannerControlFitSyncWidth_(sel);
  }
}

/**
 * @param {object[]} courses
 * @param {string} subjectCode
 * @returns {object[]}
 */
function plannerCurriculumCoursesForSubject_(courses, subjectCode) {
  const code = String(subjectCode || '').trim();
  if (!code) return [];
  return courses.filter(function (c) {
    return c && typeof c === 'object' && plannerSubjectCodeFromCatalogCourse_(c) === code;
  });
}

/**
 * @param {HTMLElement} slot
 * @param {object} st
 * @param {'all'|'subject'|'instructor'|'course'|'preview'} fromLevel
 */
function plannerCurriculumRefreshCascade_(slot, st, fromLevel) {
  const subjEl = slot.querySelector('#sp-curr-subj');
  const instEl = slot.querySelector('#sp-curr-instructor');
  const courseEl = slot.querySelector('#sp-curr-course');
  const lecEl = slot.querySelector('#sp-curr-lecture');
  const titleEl = slot.querySelector('#sp-curr-title-preview');
  const hintEl = slot.querySelector('#sp-curr-catalog-hint');
  if (
    !(subjEl instanceof HTMLSelectElement) ||
    !(instEl instanceof HTMLSelectElement) ||
    !(courseEl instanceof HTMLSelectElement) ||
    !(lecEl instanceof HTMLSelectElement)
  ) {
    return;
  }
  if (fromLevel === 'preview') {
    plannerCurriculumUpdateTitlePreview_(slot, st, lecEl, titleEl);
    return;
  }
  const cat = plannerCurriculumCatalog_(st);
  const has = plannerCurriculumHasCatalog_(st);
  if (hintEl) {
    if (!has) {
      hintEl.textContent = '등록된 강좌가 없습니다. 담당자에게 문의해 주세요.';
      hintEl.removeAttribute('hidden');
    } else {
      hintEl.textContent = '';
      hintEl.setAttribute('hidden', 'hidden');
    }
  }
  subjEl.disabled = !has;
  instEl.disabled = !has;
  courseEl.disabled = !has;
  lecEl.disabled = !has;

  if (fromLevel === 'all') {
    const subjItems = plannerCurriculumSubjectSelectItems_(cat.courses);
    plannerSelectFillOptions_(subjEl, subjItems, '과목 선택');
    subjEl.value = subjItems.length ? subjItems[0].value : '';
    fromLevel = 'subject';
  }

  const subjectCode = String(subjEl.value || '').trim();
  if (fromLevel === 'subject') {
    const coursesSub = plannerCurriculumCoursesForSubject_(cat.courses, subjectCode);
    /** @type {Record<string, boolean>} */
    const seenInst = {};
    const instItems = [];
    coursesSub.forEach(function (c) {
      const inst = String(c.instructor != null ? c.instructor : '').trim() || '(선생님 미입력)';
      if (seenInst[inst]) return;
      seenInst[inst] = true;
      instItems.push({ value: inst, label: inst });
    });
    instItems.sort(function (a, b) {
      return a.label.localeCompare(b.label, 'ko');
    });
    plannerSelectFillOptions_(instEl, instItems, '선생님 선택');
    fromLevel = 'instructor';
  }

  const instructor = String(instEl.value || '').trim();
  if (fromLevel === 'instructor') {
    const coursesSub = plannerCurriculumCoursesForSubject_(cat.courses, subjectCode);
    const coursesInst = coursesSub.filter(function (c) {
      const inst = String(c.instructor != null ? c.instructor : '').trim() || '(선생님 미입력)';
      return inst === instructor;
    });
    const courseItems = coursesInst.map(function (c) {
      const cid = c.course_id != null ? String(c.course_id) : '';
      const cname = String(c.course_name != null ? c.course_name : '').trim() || '(강좌명 없음)';
      return { value: cid, label: cname };
    });
    courseItems.sort(function (a, b) {
      return a.label.localeCompare(b.label, 'ko');
    });
    plannerSelectFillOptions_(courseEl, courseItems, '강좌명 선택');
    fromLevel = 'course';
  }

  const courseId = String(courseEl.value || '').trim();
  if (fromLevel === 'course') {
    const courseRow = cat.courses.find(function (c) {
      return c && String(c.course_id) === courseId;
    });
    const cname = courseRow ? String(courseRow.course_name != null ? courseRow.course_name : '').trim() : '';
    const lecRows = cat.lectures
      .filter(function (L) {
        return L && String(L.course_id) === courseId;
      })
      .sort(function (a, b) {
        return (Number(a.lecture_no) || 0) - (Number(b.lecture_no) || 0);
      });
    const lecItems = lecRows.map(function (L) {
      const lid = L.lecture_id != null ? String(L.lecture_id) : '';
      const no = Number(L.lecture_no);
      const label = plannerCurriculumTodoTitle_(cname, no);
      return { value: lid, label: label };
    });
    plannerSelectFillOptions_(lecEl, lecItems, '회차 선택');
  }

  plannerCurriculumUpdateTitlePreview_(slot, st, lecEl, titleEl);
  plannerControlFitSyncWidthsIn_(slot);
}

/**
 * @param {HTMLElement} slot
 * @param {object} st
 * @param {HTMLSelectElement} lecEl
 * @param {HTMLElement|null} titleEl
 */
function plannerCurriculumUpdateTitlePreview_(slot, st, lecEl, titleEl) {
  const cat = plannerCurriculumCatalog_(st);
  let preview = '';
  const lecId = String(lecEl.value || '').trim();
  if (lecId) {
    const lec = cat.lectures.find(function (L) {
      return L && String(L.lecture_id) === lecId;
    });
    const courseRow = cat.courses.find(function (c) {
      return c && String(c.course_id) === String(lec && lec.course_id);
    });
    if (lec && courseRow) {
      preview = plannerCurriculumTodoTitle_(courseRow.course_name, lec.lecture_no);
    }
  }
  if (titleEl && 'value' in titleEl) {
    const inp = /** @type {HTMLInputElement} */ (titleEl);
    inp.value = preview;
    if (inp.classList.contains('sp-plan-manual__control--fit')) {
      plannerControlFitSyncWidth_(inp, preview);
    }
  }
}

/**
 * @param {HTMLElement} slot
 * @param {object} st
 */
function plannerSetManualRegMode_(slot, st, mode) {
  const direct = slot.querySelector('#sp-plan-manual-direct');
  const curr = slot.querySelector('#sp-plan-manual-curriculum');
  const btnD = slot.querySelector('#sp-manual-mode-direct');
  const btnC = slot.querySelector('#sp-manual-mode-curriculum');
  const next = mode === 'curriculum' ? 'curriculum' : 'direct';
  if (st && typeof st === 'object') st.manualRegMode = next;
  if (direct) direct.toggleAttribute('hidden', next !== 'direct');
  if (curr) curr.toggleAttribute('hidden', next !== 'curriculum');
  if (btnD) {
    btnD.setAttribute('aria-pressed', next === 'direct' ? 'true' : 'false');
    btnD.classList.toggle('is-active', next === 'direct');
  }
  if (btnC) {
    btnC.setAttribute('aria-pressed', next === 'curriculum' ? 'true' : 'false');
    btnC.classList.toggle('is-active', next === 'curriculum');
  }
  if (next === 'curriculum') plannerCurriculumRefreshCascade_(slot, st, 'all');
}

/**
 * 커리큘럼 개별 등록 → `monthTodos` append.
 * @param {HTMLElement} slot
 * @param {object} st
 * @returns {string}
 */
function plannerAppendCurriculumTodoFromForm_(slot, st) {
  if (!plannerCurriculumHasCatalog_(st)) {
    return '커리큘럼 마스터가 없어 등록할 수 없습니다.';
  }
  const dueEl = slot.querySelector('#sp-curr-due');
  const lecEl = slot.querySelector('#sp-curr-lecture');
  const due = dueEl && 'value' in dueEl ? String(/** @type {HTMLInputElement} */ (dueEl).value).trim() : '';
  const lecId = lecEl && 'value' in lecEl ? String(/** @type {HTMLSelectElement} */ (lecEl).value).trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return '날짜를 선택해 주세요.';
  if (!lecId.length) return '회차(강의)를 선택해 주세요.';

  const cat = plannerCurriculumCatalog_(st);
  const lec = cat.lectures.find(function (L) {
    return L && String(L.lecture_id) === lecId;
  });
  if (!lec) return '선택한 강의를 찾을 수 없습니다. 다시 고르거나 새로고침해 주세요.';
  const courseRow = cat.courses.find(function (c) {
    return c && String(c.course_id) === String(lec.course_id);
  });
  if (!courseRow) return '강좌 정보를 찾을 수 없습니다.';

  const category = plannerSubjectCodeFromCatalogCourse_(courseRow);
  if (!category) return '이 강좌의 과목(문법·논리·독해·어휘)을 확인할 수 없습니다. 마스터 시트 subject를 맞춰 주세요.';

  const title = plannerCurriculumTodoTitle_(courseRow.course_name, lec.lecture_no);
  if (!title.length) return '제목을 만들 수 없습니다. 강좌명·회차를 확인해 주세요.';

  const task_id = 'lec_' + lecId + '_' + due;
  const todayCur = plannerTodayYmdSeoul_();
  plannerEnsureMonthTodos_(st);
  const dup = st.monthTodos.some(function (m) {
    return m && String(m.task_id) === task_id;
  });
  if (dup) return '같은 날짜에 이미 추가한 회차입니다.';

  plannerPushMonthTodo_(
    st,
    plannerTodoRowLocal_({
      task_id: task_id,
      title: title,
      date: due,
      category: category,
      lecture_id: lecId,
      timeline_slots: '[]',
      sort_key: 0,
      mark: 'none',
      trace_dates: '[]',
      created_date: todayCur,
      updated_date: todayCur
    })
  );
  if (lecEl instanceof HTMLSelectElement) lecEl.value = '';
  plannerCurriculumRefreshCascade_(slot, st, 'course');
  return '';
}

/**
 * 일반 등록 폼 → `monthTodos`에 append 후 페이로드 재생성.
 * @param {HTMLElement} slot `#sp-plan-calendar-slot`
 * @param {object} st
 * @returns {string} 빈 문자열 = 성공, 아니면 에러 메시지
 */
function plannerAppendManualTodoFromForm_(slot, st) {
  plannerEnsureMonthTodos_(st);
  const titleEl = slot.querySelector('#sp-manual-title');
  const dueEl = slot.querySelector('#sp-manual-due');
  const catEl = slot.querySelector('#sp-manual-cat');
  const title = titleEl && 'value' in titleEl ? String(/** @type {HTMLInputElement} */ (titleEl).value).trim() : '';
  const due = dueEl && 'value' in dueEl ? String(/** @type {HTMLInputElement} */ (dueEl).value).trim() : '';
  const category = catEl && 'value' in catEl ? String(/** @type {HTMLSelectElement} */ (catEl).value).trim() : 'misc';
  if (!title.length) return '할 일 제목을 입력해 주세요.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return '날짜를 선택해 주세요.';
  const allowedC = { grammar: true, logic: true, read: true, vocab: true, misc: true };
  const c = allowedC[category] ? category : 'misc';
  let task_id = '';
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      task_id = 'man_' + due + '_' + globalThis.crypto.randomUUID();
    }
  } catch (_e) {
    task_id = '';
  }
  if (!task_id) task_id = 'man_' + due + '_' + String(Date.now()) + '_' + String(Math.floor(Math.random() * 1e6));
  const todayMan = plannerTodayYmdSeoul_();
  plannerPushMonthTodo_(
    st,
    plannerTodoRowLocal_({
      task_id: task_id,
      title: title,
      date: due,
      category: c,
      lecture_id: '',
      timeline_slots: '[]',
      sort_key: 0,
      mark: 'none',
      trace_dates: '[]',
      created_date: todayMan,
      updated_date: todayMan
    })
  );
  if (titleEl) /** @type {HTMLInputElement} */ (titleEl).value = '';
  return '';
}

/**
 * @param {object} st
 * @param {string} dateYmd
 * @returns {{ task_id: string, title: string, date: string, category: string, sort_key: number, created_date: string, updated_date: string }[]}
 */
function plannerOrderedDayTodos_(st, dateYmd) {
  const day = String(dateYmd || '').trim();
  const rows = plannerMonthTodosForDay_(st, day)
    .filter(function (r) {
      return r && String(r.category || '').trim() !== 'memo';
    })
    .slice();
  rows.sort(plannerCompareMonthTodoDisplay_);
  return plannerWithFixedRoutineTodosFirst_(day, rows);
}

/**
 * @param {HTMLElement} root
 */
function plannerRefreshPostPreview_(root) {
  const pre = root.querySelector('#sp-plan-post-preview');
  if (!pre) return;
  const st = root.__spPlanState;
  const body = st && st.plannerQuickPostBody ? st.plannerQuickPostBody : { action: 'plannerPersonalTodosApply', todos: [] };
  try {
    pre.textContent = JSON.stringify(body, null, 2);
  } catch (_e) {
    pre.textContent = '';
  }
}

/**
 * 해당 날짜 타임라인에서 `taskId`에 칠해진 10분 칸 합(분).
 * @param {object} st
 * @param {string} ymd
 * @param {string} taskId
 * @returns {number}
 */
function plannerTaskTimelineMinutesForDay_(st, ymd, taskId) {
  const slots = st.dayTimelineTodoByDate && st.dayTimelineTodoByDate[ymd];
  if (!slots || typeof slots !== 'object') return 0;
  const tid = String(taskId || '').trim();
  if (!tid) return 0;
  const map = plannerDayTodoIdMapForDay_(ymd, st);
  const row = map[tid];
  if (plannerIsExcludedFromStudyTotals_(tid, row && row.category)) return 0;
  let n = 0;
  Object.keys(slots).forEach(function (k) {
    if (!plannerTimelineSlotKeyParse_(k)) return;
    if (plannerFixedSlotBlocked_(st, ymd, k)) return;
    if (String(slots[k] != null ? slots[k] : '').trim() === tid) n++;
  });
  return n * PLAN_TIMELINE_CELL_MIN;
}

/**
 * 일일 모달 왼쪽: 과목(연속 동일 과목 rowspan) · 할 일 · 달성도(select) · 공부시간 체크.
 * @param {string} dateYmd
 * @param {object} st
 * @returns {string}
 */
function plannerDayTodosFromPayloadHtml_(dateYmd, st) {
  const rows = plannerOrderedDayTodos_(st, dateYmd);
  const brush = st.modalBrushTodoId ? String(st.modalBrushTodoId) : '';
  if (!rows.length) {
    return (
      '<p class="sp-plan-todoSideEmpty" role="status">이 날짜에 표시할 할 일이 없습니다.</p>'
    );
  }
  let body = '';
  let i = 0;
  while (i < rows.length) {
    const r0 = rows[i];
    const mk = plannerTodoSideMergeKey_(r0);
    let j = i + 1;
    while (j < rows.length && plannerTodoSideMergeKey_(rows[j]) === mk) {
      j++;
    }
    const rowspan = j - i;
    const subjHead = esc(plannerTodoSideSubjectLabel_(r0));
    for (let k = i; k < j; k++) {
      const r = rows[k];
      const id = String(r.task_id || '');
      let rowKind = '';
      if (id === PLAN_FIXED_SLEEP_TODO_ID) rowKind = ' sp-plan-todoSide__row--sleep';
      else if (id === PLAN_FIXED_MEAL_TODO_ID) rowKind = ' sp-plan-todoSide__row--meal';
      else if (String(r.category || '').trim() === PLAN_CATEGORY_FIXED) rowKind = ' sp-plan-todoSide__row--fixed';
      else if (plannerIsTraceGhostDisplay_(r)) rowKind = ' sp-plan-todoSide__row--trace';
      let title = esc(String(r.title || '').trim() || id);
      if (plannerIsTraceGhostDisplay_(r)) {
        const toD = String(r.date != null ? r.date : '').trim();
        if (toD) title += esc(' → ' + toD);
      }
      const isTrace = plannerIsTraceGhostDisplay_(r);
      const isFixedSched = String(r.category || '').trim() === PLAN_CATEGORY_FIXED;
      const isB = !isTrace && !isFixedSched && Boolean(brush && brush === id);
      const comp = plannerTodoCompletionGet_(st, dateYmd, id);
      const selNone = comp === 'none' ? ' selected' : '';
      const selO = comp === 'circle' ? ' selected' : '';
      const selTri = comp === 'triangle' ? ' selected' : '';
      const selX = comp === 'x' ? ' selected' : '';
      const hueCls =
        isTrace || rowKind ? '' : ' sp-plan-todoCat--' + plannerTodoPaintColorClass_(st, dateYmd, id, r);
      body +=
        '<tr class="sp-plan-todoSide__row' +
        rowKind +
        hueCls +
        (isB ? ' is-brushRow' : '') +
        '" data-todo-id="' +
        esc(id) +
        '"' +
        (isTrace ? ' data-sp-plan-trace="1"' : '') +
        '>';
      if (k === i) {
        body +=
          '<th class="sp-plan-todoSide__thSubj" scope="row" rowspan="' +
          String(rowspan) +
          '">' +
          subjHead +
          '</th>';
      }
      body += '<td class="sp-plan-todoSide__tdTodo"><span class="sp-plan-todoSide__title">' + title + '</span>';
      if (!isTrace && isFixedSched) {
        body +=
          '<button type="button" class="sp-plan-todoSide__brushBtn is-fixedNoBrush" disabled aria-disabled="true" title="고정 일정은 시간표에 칠 수 없습니다">체크</button>';
      } else if (!isTrace) {
        body +=
          '<button type="button" class="sp-plan-todoSide__brushBtn' +
          (isB ? ' is-brush' : '') +
          '" data-action="todo-brush" aria-pressed="' +
          (isB ? 'true' : 'false') +
          '" aria-label="이 할 일로 시간표에 표시">' +
          (isB ? '체크 ✓' : '체크') +
          '</button>';
      }
      body += '</td><td class="sp-plan-todoSide__tdMark">';
      if (isTrace) {
        body += '<span class="sp-plan-todoSide__traceMark" aria-hidden="true">—</span>';
      } else {
        body +=
          '<label class="sp-plan-todoSide__markLbl"><span class="sp-plan-vh">달성도</span>' +
          '<select class="sp-plan-todoSide__markSel" data-todo-id="' +
          esc(id) +
          '" aria-label="' +
          esc(String(r.title || '').trim() || id) +
          ' 달성도">' +
          '<option value="none"' +
          selNone +
          '>선택</option>' +
          '<option value="circle"' +
          selO +
          '>○</option>' +
          '<option value="triangle"' +
          selTri +
          '>△</option>' +
          '<option value="x"' +
          selX +
          '>×</option>' +
          '</select></label>';
      }
      body += '</td></tr>';
    }
    i = j;
  }
  return (
    '<div class="sp-plan-todoSideWrap">' +
    '<table class="sp-plan-todoSideTable">' +
    '<thead><tr>' +
    '<th scope="col" class="sp-plan-todoSide__colSubj">과목</th>' +
    '<th scope="col" class="sp-plan-todoSide__colTodo">할 일</th>' +
    '<th scope="col" class="sp-plan-todoSide__colMark">달성도</th>' +
    '</tr></thead><tbody>' +
    body +
    '</tbody></table></div>'
  );
}

/**
 * @param {object} st
 * @param {string} ymd
 */
function plannerAssignedMinutesForDay_(st, ymd) {
  const slots = st.dayTimelineTodoByDate && st.dayTimelineTodoByDate[ymd];
  if (!slots) return 0;
  const map = plannerDayTodoIdMapForDay_(ymd, st);
  let n = 0;
  Object.keys(slots).forEach(function (k) {
    if (plannerFixedSlotBlocked_(st, ymd, k)) return;
    const tid = String(slots[k] != null ? slots[k] : '').trim();
    if (!tid) return;
    const row = map[tid];
    if (plannerIsExcludedFromStudyTotals_(tid, row && row.category)) return;
    n++;
  });
  return n * PLAN_TIMELINE_CELL_MIN;
}

/**
 * 빠른 등록: 커리큘럼 강좌·회차 구간을 선택 요일에 그리디 배치 → `monthTodos`에 추가.
 * @param {object} st
 * @param {Date} viewMonth
 * @param {number[]} weekdays 0=일 … 6=토
 * @param {string} courseId
 * @param {number} fromNo
 * @param {number} toNo
 * @param {Record<number, string>} countByDow 요일별 강 수(빈 문자열이면 n빵)
 * @returns {string} 에러 문구 또는 ''
 */
function plannerApplyQuickCurriculumToMonthTodos_(st, viewMonth, weekdays, courseId, fromNo, toNo, countByDow) {
  const cat = plannerCurriculumCatalog_(st);
  const courseRow = cat.courses.find(function (c) {
    return c && String(c.course_id) === String(courseId);
  });
  if (!courseRow) return '강좌를 선택해 주세요.';
  const category = plannerSubjectCodeFromCatalogCourse_(courseRow);
  if (!category) return '이 강좌의 과목(문법·논리·독해·어휘)을 확인할 수 없습니다.';
  const cname = String(courseRow.course_name != null ? courseRow.course_name : '').trim();
  const lecList = cat.lectures
    .filter(function (L) {
      return L && String(L.course_id) === String(courseId);
    })
    .sort(function (a, b) {
      return (Number(a.lecture_no) || 0) - (Number(b.lecture_no) || 0);
    });
  const lo = Math.min(Number(fromNo) || 1, Number(toNo) || 1);
  const hi = Math.max(Number(fromNo) || 1, Number(toNo) || 1);
  const inRange = lecList.filter(function (L) {
    const no = Number(L.lecture_no);
    return isFinite(no) && no >= lo && no <= hi;
  });
  if (!inRange.length) return '선택한 회차가 없습니다.';
  const y = viewMonth.getFullYear();
  const m0 = viewMonth.getMonth();
  const last = new Date(y, m0 + 1, 0).getDate();
  /** @type {{ ymd: string, dow: number }[]} */
  const dateSlots = [];
  let day;
  for (day = 1; day <= last; day++) {
    const dd = new Date(y, m0, day);
    if (weekdays.indexOf(dd.getDay()) >= 0) {
      dateSlots.push({ ymd: plannerYmdFromParts_(y, m0, day), dow: dd.getDay() });
    }
  }
  if (!dateSlots.length) return '요일을 한 개 이상 선택해 주세요.';
  const N = inRange.length;
  const nbung = plannerNbungCounts_(dateSlots.length, N);
  let lecIx = 0;
  const todayQ = plannerTodayYmdSeoul_();
  let di;
  for (di = 0; di < dateSlots.length; di++) {
    const ymd = dateSlots[di].ymd;
    const dowFix = dateSlots[di].dow;
    const rawCnt = countByDow && countByDow[dowFix] != null ? String(countByDow[dowFix]).trim() : '';
    let cnt = rawCnt.length ? Math.max(0, Math.floor(Number(rawCnt))) : nbung[di] || 0;
    if (!isFinite(cnt)) cnt = nbung[di] || 0;
    let k;
    for (k = 0; k < cnt && lecIx < inRange.length; k++) {
      const L = inRange[lecIx];
      lecIx++;
      const lecId = L.lecture_id != null ? String(L.lecture_id) : '';
      const title = plannerCurriculumTodoTitle_(cname, L.lecture_no);
      const task_id = 'lec_' + lecId + '_' + ymd;
      plannerPushMonthTodo_(
        st,
        plannerTodoRowLocal_({
          task_id: task_id,
          title: title,
          date: ymd,
          category: category,
          lecture_id: lecId,
          timeline_slots: '[]',
          sort_key: 0,
          mark: 'none',
          trace_dates: '[]',
          created_date: todayQ,
          updated_date: todayQ
        }),
        true
      );
    }
  }
  plannerRebuildQuickPostPayload_(st);
  return '';
}

/**
 * @param {HTMLElement} slot
 */
function plannerQuickSyncDowCountInputs_(slot) {
  slot.querySelectorAll('input[name="sp-dow"]').forEach(function (cb) {
    const el = /** @type {HTMLInputElement} */ (cb);
    const inp = slot.querySelector('.sp-plan-quick__dowCnt[data-dow="' + el.value + '"]');
    if (!(inp instanceof HTMLInputElement)) return;
    if (el.checked) inp.removeAttribute('hidden');
    else {
      inp.setAttribute('hidden', 'hidden');
      inp.value = '';
    }
  });
}

/**
 * @param {HTMLElement} slot
 * @param {object} st
 * @param {'all'|'subject'|'instructor'|'course'} fromLevel
 */
function plannerQuickCurriculumRefreshCascade_(slot, st, fromLevel) {
  const subjEl = slot.querySelector('#sp-quick-subj');
  const instEl = slot.querySelector('#sp-quick-instructor');
  const courseEl = slot.querySelector('#sp-quick-course');
  const fromEl = slot.querySelector('#sp-quick-lec-from');
  const toEl = slot.querySelector('#sp-quick-lec-to');
  const hintEl = slot.querySelector('#sp-quick-catalog-hint');
  if (
    !(subjEl instanceof HTMLSelectElement) ||
    !(instEl instanceof HTMLSelectElement) ||
    !(courseEl instanceof HTMLSelectElement) ||
    !(fromEl instanceof HTMLSelectElement) ||
    !(toEl instanceof HTMLSelectElement)
  ) {
    return;
  }
  const cat = plannerCurriculumCatalog_(st);
  const has = plannerCurriculumHasCatalog_(st);
  if (hintEl) {
    if (!has) {
      hintEl.textContent = '등록된 강좌가 없습니다.';
      hintEl.removeAttribute('hidden');
    } else {
      hintEl.textContent = '';
      hintEl.setAttribute('hidden', 'hidden');
    }
  }
  subjEl.disabled = !has;
  instEl.disabled = !has;
  courseEl.disabled = !has;
  fromEl.disabled = !has;
  toEl.disabled = !has;
  if (fromLevel === 'all') {
    const subjItems = plannerCurriculumSubjectSelectItems_(cat.courses);
    plannerSelectFillOptions_(subjEl, subjItems, '과목 선택');
    subjEl.value = subjItems.length ? subjItems[0].value : '';
    fromLevel = 'subject';
  }
  const subjectCode = String(subjEl.value || '').trim();
  if (fromLevel === 'subject') {
    const coursesSub = plannerCurriculumCoursesForSubject_(cat.courses, subjectCode);
    const seenInst = {};
    const instItems = [];
    coursesSub.forEach(function (c) {
      const inst = String(c.instructor != null ? c.instructor : '').trim() || '(선생님 미입력)';
      if (seenInst[inst]) return;
      seenInst[inst] = true;
      instItems.push({ value: inst, label: inst });
    });
    instItems.sort(function (a, b) {
      return a.label.localeCompare(b.label, 'ko');
    });
    plannerSelectFillOptions_(instEl, instItems, '선생님 선택');
    fromLevel = 'instructor';
  }
  const instructor = String(instEl.value || '').trim();
  if (fromLevel === 'instructor') {
    const coursesSub = plannerCurriculumCoursesForSubject_(cat.courses, subjectCode);
    const coursesInst = coursesSub.filter(function (c) {
      const inst = String(c.instructor != null ? c.instructor : '').trim() || '(선생님 미입력)';
      return inst === instructor;
    });
    const courseItems = coursesInst.map(function (c) {
      const cid = c.course_id != null ? String(c.course_id) : '';
      const cname = String(c.course_name != null ? c.course_name : '').trim() || '(강좌명 없음)';
      return { value: cid, label: cname };
    });
    courseItems.sort(function (a, b) {
      return a.label.localeCompare(b.label, 'ko');
    });
    plannerSelectFillOptions_(courseEl, courseItems, '강좌명 선택');
    fromLevel = 'course';
  }
  const courseId = String(courseEl.value || '').trim();
  if (fromLevel === 'course') {
    const courseRow = cat.courses.find(function (c) {
      return c && String(c.course_id) === courseId;
    });
    const cname = courseRow ? String(courseRow.course_name != null ? courseRow.course_name : '').trim() : '';
    const lecRows = cat.lectures
      .filter(function (L) {
        return L && String(L.course_id) === courseId;
      })
      .sort(function (a, b) {
        return (Number(a.lecture_no) || 0) - (Number(b.lecture_no) || 0);
      });
    const lecItems = lecRows.map(function (L) {
      const no = Number(L.lecture_no);
      return {
        value: String(isFinite(no) ? no : ''),
        label: plannerCurriculumTodoTitle_(cname, no)
      };
    });
    plannerSelectFillOptions_(fromEl, lecItems, '시작 회차');
    plannerSelectFillOptions_(toEl, lecItems, '끝 회차');
    if (lecItems.length) {
      fromEl.value = lecItems[0].value;
      toEl.value = lecItems[lecItems.length - 1].value;
    }
  }
  plannerControlFitSyncWidthsIn_(slot);
}

/**
 * @param {HTMLElement} slot
 * @returns {Record<number, string>}
 */
function plannerQuickReadCountByDow_(slot) {
  /** @type {Record<number, string>} */
  const out = {};
  slot.querySelectorAll('.sp-plan-quick__dowCnt').forEach(function (inp) {
    if (!(inp instanceof HTMLInputElement)) return;
    const d = inp.getAttribute('data-dow');
    if (d == null || d === '') return;
    out[Number(d)] = String(inp.value != null ? inp.value : '').trim();
  });
  return out;
}

/**
 * 달력 일자 칸 할 일 뱃지 한 줄.
 * @param {string} mod grammar|logic|read|vocab|misc
 * @param {string} label
 * @returns {string}
 */
/**
 * @param {string} mod
 * @param {string} label
 * @param {{ taskId?: string }} [attrs]
 * @returns {string}
 */
function plannerCurBadgeSpan_(mod, label, attrs) {
  const body = String(label != null ? label : '').trim();
  if (!body) return '';
  const modStr = String(mod != null ? mod : '').trim();
  const m = /^(grammar|logic|read|vocab|misc|fixed)$/.test(modStr) ? modStr : 'misc';
  const tid = attrs && attrs.taskId ? String(attrs.taskId).trim() : '';
  const data =
    tid.length > 0
      ? ' data-sp-task-id="' + esc(tid) + '" data-sp-ymd-parent="1"'
      : '';
  return (
    '<span class="sp-plan-curBadge sp-plan-curBadge--' +
    esc(m) +
    '"' +
    data +
    ' title="' +
    esc(body) +
    '">' +
    esc(body) +
    '</span>'
  );
}

/**
 * 제목 문자열에서 `· 3강`, `1~3강` 등 **강 번호** 나열.
 * @param {string} title
 * @returns {number[]}
 */
function plannerLessonsFromStudyTitle_(title) {
  const s = String(title != null ? title : '').trim();
  if (!s.length) return [];
  /** @type {number[]} */
  const nums = [];
  const re = /(\d+)(?:~(\d+))?강/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const a = Number(m[1]);
    const b = m[2] != null ? Number(m[2]) : a;
    if (!isFinite(a) || a <= 0) continue;
    if (isFinite(b) && b >= a) {
      for (let k = a; k <= b; k++) {
        nums.push(k);
      }
    } else {
      nums.push(a);
    }
  }
  return nums;
}

/**
 * 강 번호 배열 → `1`, `1~3`, `1, 4~6` (중복 제거·연속 구간 묶음).
 * @param {number[]} nums
 * @returns {string}
 */
function plannerLessonsToOutline_(nums) {
  const u = nums
    .slice()
    .sort(function (a, b) {
      return a - b;
    })
    .filter(function (v, i, a) {
      return i === 0 || v !== a[i - 1];
    });
  if (!u.length) return '';
  const parts = [];
  let runStart = u[0];
  let prev = u[0];
  for (let i = 1; i <= u.length; i++) {
    const cur = u[i];
    if (i === u.length || cur !== prev + 1) {
      parts.push(runStart === prev ? String(runStart) : runStart + '~' + prev);
      if (i < u.length) {
        runStart = cur;
        prev = cur;
      }
    } else {
      prev = cur;
    }
  }
  return parts.join(', ');
}

/**
 * 달력 칸 todo 칩 1개 (과목색 `sp-plan-curBadge`).
 * @param {{ title: string, task_id: string }} item
 * @param {string} [mod] grammar|logic|read|vocab|misc
 * @returns {string}
 */
function plannerDayCellTodoChipHtml_(item, mod) {
  const t = String(item && item.title != null ? item.title : '').trim();
  const tid = String(item && item.task_id != null ? item.task_id : '').trim();
  if (!t || !tid) return '';
  const m =
    mod && /^(grammar|logic|read|vocab|misc)$/.test(mod)
      ? mod
      : plannerTodoCategoryToken_(tid);
  return plannerCurBadgeSpan_(m, t, { taskId: tid });
}

/**
 * 과목별 그룹 — 할 일마다 칩을 항상 표시(접기 없음).
 * @param {string} mod
 * @param {string} _headLabel unused (호환)
 * @param {{ title: string, task_id: string }[]} items
 * @returns {string}
 */
function plannerDayCellGroupHtml_(mod, _headLabel, items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return '';
  const m = /^(grammar|logic|read|vocab)$/.test(mod) ? mod : 'misc';
  const chips = list
    .map(function (it) {
      return plannerDayCellTodoChipHtml_(it, m);
    })
    .filter(Boolean)
    .join('');
  if (!chips) return '';
  return (
    '<div class="sp-plan-dayCellGroup sp-plan-dayCellGroup--' +
    esc(m) +
    (list.length === 1 ? ' sp-plan-dayCellGroup--solo' : '') +
    '">' +
    chips +
    '</div>'
  );
}

/**
 * 해당 날 메모 본문(없으면 빈 문자열).
 * @param {object} st
 * @param {string} ymd
 * @returns {string}
 */
function plannerDayMemoText_(st, ymd) {
  const day = String(ymd || '').trim();
  let text = '';
  plannerMonthTodosForDay_(st, day).forEach(function (r) {
    if (!r || String(r.category || '').trim() !== 'memo') return;
    const t = String(r.title != null ? r.title : '').trim();
    if (t) text = t;
  });
  if (!text && st.dayMemoByDate && st.dayMemoByDate[day] != null) {
    text = String(st.dayMemoByDate[day]).trim();
  }
  return text;
}

/**
 * 달력 일자 칸 — 메모 있으면 연필 아이콘만(칩·본문 미표시).
 * @param {object} st
 * @param {string} ymd
 * @returns {string}
 */
function plannerDayMemoIconHtml_(st, ymd) {
  const text = plannerDayMemoText_(st, ymd);
  if (!text) return '';
  return (
    '<span role="button" tabindex="0" class="sp-plan-day__memoIcon" data-sp-open-memo="1" data-sp-ymd-parent="1" title="' +
    esc(text) +
    '" aria-label="메모 있음">✏️</span>'
  );
}

/**
 * 달력 일자 칸 **요약 표시**: 과목별 할 일 칩(메모는 날짜 옆 ✏️만 — `plannerDayMemoIconHtml_`).
 * @param {object} st
 * @param {string} key ymd
 * @returns {string}
 */
function plannerQuickPlanCellSummaryHtml_(st, key) {
  const subjName = { vocab: '어휘', grammar: '문법', logic: '논리', read: '독해', misc: '기타' };
  const order = PLANNER_STUDY_CATEGORY_ORDER.slice();
  /** @type {Record<string, { title: string, task_id: string }[]>} */
  const byCat = {};
  const rows = plannerMonthTodosForDay_(st, key);
  rows.forEach(function (t) {
    if (!t || typeof t !== 'object') return;
    const tid = String(t.task_id != null ? t.task_id : '').trim();
    if (!tid || plannerIsTraceGhostDisplay_(t)) return;
    if (plannerIsRoutineExcludedFromStudyTotals_(tid, t.category)) return;
    const cat = String(t.category != null ? t.category : 'misc').trim() || 'misc';
    if (cat === PLAN_CATEGORY_FIXED || cat === 'memo') return;
    const title = String(t.title != null ? t.title : '').trim();
    if (!title) return;
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push({ title: title, task_id: tid });
  });

  const blocks = [];
  function pushGroup_(code) {
    const items = byCat[code];
    delete byCat[code];
    if (!items || !items.length) return;
    const name = subjName[code] != null ? subjName[code] : code;
    /** @type {number[]} */
    const lessonNums = [];
    items.forEach(function (it) {
      plannerLessonsFromStudyTitle_(it.title).forEach(function (n) {
        lessonNums.push(n);
      });
    });
    let headLabel = name;
    if (lessonNums.length === items.length && lessonNums.length > 0) {
      const outline = plannerLessonsToOutline_(lessonNums);
      if (outline) headLabel = name + ' ' + outline + '강';
    } else if (items.length === 1) {
      headLabel = items[0].title;
    } else {
      headLabel = name + ' ' + items.length + '건';
    }
    const block = plannerDayCellGroupHtml_(code, headLabel, items);
    if (block) blocks.push(block);
  }

  order.forEach(pushGroup_);
  Object.keys(byCat).forEach(function (code) {
    pushGroup_(code);
  });

  if (!blocks.length) return '';
  return '<div class="sp-plan-dayCellSum">' + blocks.join('') + '</div>';
}

/** @param {Record<string, unknown>} legacy */
function plannerMigrateLegacySlotsToTodo_(legacy) {
  const out = {};
  if (!legacy || typeof legacy !== 'object') return out;
  Object.keys(legacy).forEach(function (k) {
    const v = legacy[k];
    if (typeof v === 'boolean') {
      if (v) out[k] = '';
    } else if (typeof v === 'string') {
      out[k] = v;
    }
  });
  return out;
}

/** 과목 합산·레거시: task_id 문자열에서 grammar|logic|… 토큰 */
function plannerTodoCategoryToken_(id) {
  const s = String(id != null ? id : '');
  if (/^(grammar|logic|read|vocab)$/.test(s)) return s;
  const m = s.match(/(grammar|logic|read|vocab)/);
  return m ? m[1] : 'misc';
}

/**
 * @param {object} [st]
 * @param {string} [dateYmd]
 * @param {string} taskId
 * @param {{ category?: string }|null} [rowOpt]
 * @returns {string} grammar|logic|read|vocab|misc|…
 */
function plannerTodoPaintColorClass_(st, dateYmd, taskId, rowOpt) {
  const tid = String(taskId != null ? taskId : '').trim();
  if (!tid) return 'misc';
  let cat = rowOpt && rowOpt.category != null ? String(rowOpt.category).trim() : '';
  if (!cat && st && dateYmd) {
    const map = plannerDayTodoIdMapForDay_(String(dateYmd), st);
    if (map[tid]) cat = String(map[tid].category || '').trim();
  }
  return plannerCategoryHueClassForTodo_(tid, cat);
}

/** @param {string} id @returns {string} */
function plannerTodoHueClass_(id) {
  return plannerCategoryHueClassForTodo_(id, '');
}

/** 타임라인 10분 칸 키 — 6시~23시 순서 고정 */
function plannerTimelineOrderedSlotKeys_() {
  /** @type {string[]} */
  const keys = [];
  let hi;
  for (hi = 0; hi < PLAN_TIMELINE_HOURS_ORDERED.length; hi++) {
    const h = PLAN_TIMELINE_HOURS_ORDERED[hi];
    let sub;
    for (sub = 0; sub < PLAN_TIMELINE_CELLS_PER_HOUR; sub++) {
      keys.push(plannerTimelineSlotKey_(h, sub));
    }
  }
  return keys;
}

/**
 * 같은 할 일이 이어진 구간 — 막대 모양 (`solo`|`start`|`mid`|`end`).
 * @param {Record<string, string>} slots
 * @param {string} slotKey
 * @param {string} todoId
 * @returns {string}
 */
function plannerTimelineBarRole_(slots, slotKey, todoId) {
  const tid = String(todoId != null ? todoId : '').trim();
  if (!tid.length) {
    return '';
  }
  const order = plannerTimelineOrderedSlotKeys_();
  const ix = order.indexOf(String(slotKey));
  if (ix < 0) {
    return 'solo';
  }
  const prevT = ix > 0 ? String(slots[order[ix - 1]] != null ? slots[order[ix - 1]] : '').trim() : '';
  const nextT =
    ix < order.length - 1 ? String(slots[order[ix + 1]] != null ? slots[order[ix + 1]] : '').trim() : '';
  const prevSame = prevT === tid;
  const nextSame = nextT === tid;
  if (!prevSame && !nextSame) {
    return 'solo';
  }
  if (!prevSame && nextSame) {
    return 'start';
  }
  if (prevSame && nextSame) {
    return 'mid';
  }
  return 'end';
}

/**
 * 같은 할 일이 **연속**인 막대(run) 안에서 이 칸이 몇 번째 10분 칸인지(0부터). 끊기면 다시 0.
 * @param {Record<string, string>} slots
 * @param {string} slotKey
 * @param {string} todoId
 * @returns {number}
 */
function plannerTimelineBarChunkIndex_(slots, slotKey, todoId) {
  const order = plannerTimelineOrderedSlotKeys_();
  const tid = String(todoId != null ? todoId : '').trim();
  const ix = order.indexOf(String(slotKey));
  if (ix < 0) {
    return 0;
  }
  let runStart = ix;
  while (runStart > 0) {
    const prevT = String(slots[order[runStart - 1]] != null ? slots[order[runStart - 1]] : '').trim();
    if (prevT !== tid) {
      break;
    }
    runStart--;
  }
  return ix - runStart;
}

/**
 * 할 일 제목(공백 제거)을 막대 칸마다 N글자씩(`PLAN_TIMELINE_BAR_LABEL_CHUNK_LEN`). 한 바퀴 지나면 `----`.
 * @param {string} title
 * @param {number} chunkIndex run 내 0부터
 * @returns {string}
 */
function plannerTodoBarLabelChunk_(title, chunkIndex) {
  const w = PLAN_TIMELINE_BAR_LABEL_CHUNK_LEN;
  const padDash = '-'.repeat(w);
  const t = String(title != null ? title : '')
    .replace(/\s+/g, '')
    .trim();
  if (!t.length) {
    return padDash;
  }
  const n = Math.max(0, chunkIndex);
  const chunksInLap = Math.ceil(t.length / w);
  if (n >= chunksInLap) {
    return padDash;
  }
  const start = n * w;
  let chunk = t.slice(start, start + w);
  while (chunk.length < w) {
    chunk += ' ';
  }
  return chunk;
}

/**
 * @param {Record<string, string>} slots
 * @param {string} slotKey
 * @param {string} todoId
 * @param {Record<string, { task_id: string, title: string, category: string }>} todoMap
 * @returns {string}
 */
function plannerSlotBarChunkLabel_(slots, slotKey, todoId, todoMap) {
  const tid = String(todoId != null ? todoId : '').trim();
  if (!tid.length) {
    return '';
  }
  const row = todoMap[tid];
  let title = row && row.title ? String(row.title).trim() : '';
  if (!title.length) {
    title = tid;
  }
  const chunkIx = plannerTimelineBarChunkIndex_(slots, slotKey, tid);
  return plannerTodoBarLabelChunk_(title, chunkIx);
}

/**
 * 그날 할 일 → 과목(카테고리)별 색 클래스 — 타임라인·미러·필 공통.
 * @param {object} st
 * @param {string} dateYmd
 * @param {Record<string, string>} [slotsOpt]
 * @returns {Record<string, string>}
 */
function plannerDayTodoHueMapForDay_(st, dateYmd, slotsOpt) {
  const ymd = String(dateYmd || '').trim();
  const todoMap = plannerDayTodoIdMapForDay_(ymd, st);
  /** @type {Record<string, string>} */
  const map = {};
  Object.keys(todoMap).forEach(function (tid) {
    const row = todoMap[tid];
    map[tid] = plannerTodoPaintColorClass_(st, ymd, tid, row);
  });
  const slots = slotsOpt != null ? slotsOpt : plannerEnsureTimelineTodoSlots_(st, ymd);
  Object.keys(slots).forEach(function (k) {
    const tid = String(slots[k] != null ? slots[k] : '').trim();
    if (!tid.length || map[tid]) return;
    map[tid] = plannerTodoPaintColorClass_(st, ymd, tid, todoMap[tid] || null);
  });
  return map;
}

/**
 * @param {object} st
 * @param {string} dateYmd
 * @param {HTMLElement} timegrid
 */
function plannerRefreshTimegridSlotcellsUi_(st, dateYmd, timegrid) {
  if (!timegrid || !st) {
    return;
  }
  const ymd = String(dateYmd || '').trim();
  if (!ymd.length) {
    return;
  }
  const slots = plannerEnsureTimelineTodoSlots_(st, ymd);
  const hueMap = plannerDayTodoHueMapForDay_(st, ymd, slots);
  const todoMap = plannerDayTodoIdMapForDay_(ymd, st);
  timegrid.querySelectorAll('.sp-plan-slotcell').forEach(function (el) {
    if (!(el instanceof HTMLButtonElement)) {
      return;
    }
    const sk = el.getAttribute('data-slot') || '';
    if (!sk.length) {
      return;
    }
    if (plannerFixedSlotBlocked_(st, ymd, sk)) {
      el.className = 'sp-plan-slotcell sp-plan-slotcell--fixedBlock is-fixedBlock';
      el.setAttribute('aria-pressed', 'false');
      el.setAttribute('disabled', 'disabled');
      el.setAttribute('aria-disabled', 'true');
      el.removeAttribute('data-todo-id');
      const p0 = plannerTimelineSlotKeyParse_(sk);
      if (p0) {
        const m0 = p0.sub * PLAN_TIMELINE_CELL_MIN;
        const m1 = m0 + PLAN_TIMELINE_CELL_MIN;
        const lab =
          plannerPad2_(p0.hour) +
          ':' +
          plannerPad2_(m0) +
          '–' +
          plannerPad2_(p0.hour) +
          ':' +
          plannerPad2_(m1);
        el.setAttribute('aria-label', esc(lab + ' · 고정 일정(비활성)'));
      }
      return;
    }
    el.removeAttribute('disabled');
    el.removeAttribute('aria-disabled');
    const tidRaw = String(slots[sk] != null ? slots[sk] : '').trim();
    const tid = tidRaw && todoMap[tidRaw] ? tidRaw : '';
    const rowPaint = tid ? todoMap[tid] : null;
    const hue = tid ? hueMap[tid] || plannerTodoPaintColorClass_(st, ymd, tid, rowPaint) : '';
    const bar = tid ? plannerTimelineBarRole_(slots, sk, tid) : '';
    let cls = 'sp-plan-slotcell';
    if (tid) {
      cls += ' is-on sp-plan-slotcell--todo sp-plan-slotcell--todo--' + hue;
      if (bar) {
        cls += ' sp-plan-slotcell--bar-' + bar;
      }
      el.setAttribute('data-todo-id', tid);
      const chunk = plannerSlotBarChunkLabel_(slots, sk, tid, todoMap);
      if (chunk) {
        el.setAttribute('data-bar-chunk', chunk);
      } else {
        el.removeAttribute('data-bar-chunk');
      }
    } else {
      el.removeAttribute('data-todo-id');
      el.removeAttribute('data-bar-chunk');
    }
    el.className = cls;
    el.setAttribute('aria-pressed', tid ? 'true' : 'false');
    const p = plannerTimelineSlotKeyParse_(sk);
    if (p) {
      const m0 = p.sub * PLAN_TIMELINE_CELL_MIN;
      const m1 = m0 + PLAN_TIMELINE_CELL_MIN;
      const lab =
        plannerPad2_(p.hour) +
        ':' +
        plannerPad2_(m0) +
        '–' +
        plannerPad2_(p.hour) +
        ':' +
        plannerPad2_(m1);
      let title = tid;
      const row = tid && todoMap[tid] ? todoMap[tid] : null;
      if (row && row.title) {
        title = String(row.title).trim();
      }
      const chunkLbl = tid ? plannerSlotBarChunkLabel_(slots, sk, tid, todoMap) : '';
      el.setAttribute(
        'aria-label',
        esc(lab + (tid ? ' · ' + title + (chunkLbl ? ' · ' + chunkLbl : '') : '') + ' 칸')
      );
    }
  });
}

/**
 * 과목·루틴 기준 색 클래스 (`sp-plan-todoCat--*`) — 타임라인 외 레거시.
 * @param {string} taskId
 * @param {string} [category]
 * @returns {string}
 */
function plannerCategoryHueClassForTodo_(taskId, category) {
  const id = String(taskId != null ? taskId : '').trim();
  if (id === PLAN_FIXED_SLEEP_TODO_ID) return 'sleep';
  if (id === PLAN_FIXED_MEAL_TODO_ID) return 'meal';
  const c = String(category != null ? category : '').trim();
  if (c === PLAN_CATEGORY_FIXED) return 'fixed';
  if (c === PLAN_CATEGORY_ROUTINE) return 'routine';
  if (c === 'memo') return 'memo';
  if (/^(grammar|logic|read|vocab|misc)$/.test(c)) return c;
  return 'misc';
}

/**
 * 타임라인 칸 안 1글자 라벨.
 * @param {string} taskId
 * @param {string} [category]
 * @returns {string}
 */
function plannerCategoryShortLabelForTodo_(taskId, category) {
  const id = String(taskId != null ? taskId : '').trim();
  if (id === PLAN_FIXED_SLEEP_TODO_ID) return '취';
  if (id === PLAN_FIXED_MEAL_TODO_ID) return '식';
  const c = String(category != null ? category : '').trim();
  const m = {
    grammar: '문',
    logic: '논',
    read: '독',
    vocab: '어',
    misc: '기',
    fixed: '고',
    routine: '루',
    memo: '메'
  };
  return m[c] != null ? m[c] : '기';
}

/**
 * brush 없음 → 칸 변경 없음(클릭만으로 시간 취소 금지). brush 있음 → 빈 칸에 칠함.
 * 이미 다른 할 일이 있으면 덮어쓰지 않음. 같은 할 일 칸을 다시 적용하면 토글로 지움.
 * @param {Record<string, string>} slots
 * @param {string} slotKey
 * @param {string} brush
 * @param {object} [st]
 * @param {string} [ymd]
 * @returns {string} 반영 후 해당 칸의 todo id 또는 ''
 */
function plannerTimelineSlotApplyBrush_(slots, slotKey, brush, st, ymd) {
  const sk = String(slotKey);
  if (st && ymd && plannerFixedSlotBlocked_(st, String(ymd), sk)) {
    const cur0 = slots[sk] != null ? String(slots[sk]).trim() : '';
    return cur0;
  }
  const b = brush ? String(brush).trim() : '';
  if (b && st && ymd) {
    const todoMap = plannerDayTodoIdMapForDay_(String(ymd), st);
    const row = todoMap[b];
    if (row && String(row.category || '').trim() === PLAN_CATEGORY_FIXED) {
      const curFix = slots[sk] != null ? String(slots[sk]).trim() : '';
      return curFix;
    }
  }
  const cur = slots[sk] != null ? String(slots[sk]).trim() : '';
  if (!b) {
    return cur;
  }
  if (cur === b) {
    slots[sk] = '';
    return '';
  }
  if (cur && cur !== b) {
    return cur;
  }
  slots[sk] = b;
  return b;
}

/**
 * 타임라인 `시_칸` 키 → 0..143 순번(6시 첫 칸=0).
 * @param {string} slotKey
 * @returns {number}
 */
function plannerSlotKeyToOrderIndex_(slotKey) {
  const p = plannerTimelineSlotKeyParse_(String(slotKey));
  if (!p) return -1;
  const hi = PLAN_TIMELINE_HOURS_ORDERED.indexOf(p.hour);
  if (hi < 0) return -1;
  return hi * PLAN_TIMELINE_CELLS_PER_HOUR + p.sub;
}

/**
 * @param {number} ix
 * @returns {string}
 */
function plannerOrderIndexToSlotKey_(ix) {
  const n = Number(ix);
  const max = PLAN_TIMELINE_HOURS_ORDERED.length * PLAN_TIMELINE_CELLS_PER_HOUR;
  if (!isFinite(n) || n < 0 || n >= max) return '';
  const hi = Math.floor(n / PLAN_TIMELINE_CELLS_PER_HOUR);
  const sub = n % PLAN_TIMELINE_CELLS_PER_HOUR;
  const h = PLAN_TIMELINE_HOURS_ORDERED[hi];
  return plannerTimelineSlotKey_(h, sub);
}

/**
 * 타임라인 순번이 **정시 또는 :30** 시작(10분 격자상 `sub` 0 또는 3)인지.
 * @param {number} ix
 * @returns {boolean}
 */
function plannerFixedTimelineOrderIndexIsHalfHour_(ix) {
  const n = Number(ix);
  if (!isFinite(n) || n < 0) return false;
  const max = PLAN_TIMELINE_HOURS_ORDERED.length * PLAN_TIMELINE_CELLS_PER_HOUR;
  if (n >= max) return false;
  const sub = n % PLAN_TIMELINE_CELLS_PER_HOUR;
  return sub === 0 || sub === 3;
}

/**
 * @param {boolean} [includeEndBoundary] true면 value=max(배타적 끝) 한 줄 추가 — 끝 시각용
 * @returns {string}
 */
function plannerFixedTimelineSelectOptionsHtml_(includeEndBoundary) {
  let s = '';
  let ix;
  const max = PLAN_TIMELINE_HOURS_ORDERED.length * PLAN_TIMELINE_CELLS_PER_HOUR;
  for (ix = 0; ix < max; ix++) {
    if (!plannerFixedTimelineOrderIndexIsHalfHour_(ix)) continue;
    const k = plannerOrderIndexToSlotKey_(ix);
    const p = plannerTimelineSlotKeyParse_(k);
    if (!p) continue;
    const m0 = p.sub * PLAN_TIMELINE_CELL_MIN;
    const lab = plannerPad2_(p.hour) + ':' + plannerPad2_(m0);
    s += '<option value="' + String(ix) + '">' + esc(lab) + '</option>';
  }
  if (includeEndBoundary) {
    s += '<option value="' + String(max) + '">' + esc('타임라인 끝(24h)') + '</option>';
  }
  return s;
}

/**
 * @param {object} st
 * @param {string} ymd
 * @param {string} slotKey
 * @returns {boolean}
 */
function plannerFixedSlotBlocked_(st, ymd, slotKey) {
  const m = st.dayFixedBlockSlotsByDate && st.dayFixedBlockSlotsByDate[ymd];
  return Boolean(m && m[String(slotKey)]);
}

/**
 * `category:fixed` 행의 `timeline_slots` → `dayFixedBlockSlotsByDate` (bootstrap·삭제 후 재구축).
 * @param {object} st
 * @param {Date} viewMonth
 */
function plannerRebuildFixedBlockSlotsForMonth_(st, viewMonth) {
  if (!st || typeof st !== 'object') return;
  if (!st.dayFixedBlockSlotsByDate) st.dayFixedBlockSlotsByDate = {};
  const view = viewMonth instanceof Date && !isNaN(viewMonth.getTime()) ? viewMonth : new Date();
  const pfx = plannerMonthYmdPrefix_(view);
  Object.keys(st.dayFixedBlockSlotsByDate).forEach(function (k) {
    if (k.indexOf(pfx) === 0) {
      try {
        delete st.dayFixedBlockSlotsByDate[k];
      } catch (_e) {
        st.dayFixedBlockSlotsByDate[k] = {};
      }
    }
  });
  plannerEnsureMonthTodos_(st);
  st.monthTodos.forEach(function (row) {
    if (!row || String(row.category || '').trim() !== PLAN_CATEGORY_FIXED) return;
    const ymd = String(row.date != null ? row.date : '').trim();
    if (!ymd || ymd.indexOf(pfx) !== 0) return;
    let keys = [];
    try {
      const j = JSON.parse(String(row.timeline_slots != null ? row.timeline_slots : '[]'));
      if (Array.isArray(j)) keys = j;
    } catch (_e) {}
    if (!st.dayFixedBlockSlotsByDate[ymd]) st.dayFixedBlockSlotsByDate[ymd] = {};
    keys.forEach(function (slot) {
      const sk = plannerNormalizeTimelineSlotKeyFromApi_(slot);
      if (sk) st.dayFixedBlockSlotsByDate[ymd][sk] = true;
    });
  });
}

/**
 * @param {object} st
 * @param {string} ymd
 * @param {string} taskId
 */
function plannerScrubTimelineMapForTask_(st, ymd, taskId) {
  const map = st.dayTimelineTodoByDate && st.dayTimelineTodoByDate[ymd];
  if (!map || typeof map !== 'object') return;
  const tid = String(taskId || '').trim();
  if (!tid) return;
  Object.keys(map).forEach(function (k) {
    if (String(map[k] != null ? map[k] : '').trim() === tid) {
      try {
        delete map[k];
      } catch (_e) {
        map[k] = '';
      }
    }
  });
}

/**
 * `monthTodos`에서 한 건 제거 + 해당 날 타임라인·고정 막힘 정리.
 * @param {object} st
 * @param {string} ymd
 * @param {string} taskId
 * @returns {boolean} 제거했으면 true
 */
function plannerRemoveMonthTodo_(st, ymd, taskId) {
  plannerEnsureMonthTodos_(st);
  const day = String(ymd || '').trim();
  const tid = String(taskId || '').trim();
  if (!day || !tid) return false;
  /** @type {object|null} */
  let removed = null;
  let ri;
  for (ri = 0; ri < st.monthTodos.length; ri++) {
    const r = st.monthTodos[ri];
    if (r && String(r.date || '').trim() === day && String(r.task_id || '').trim() === tid) {
      removed = r;
      break;
    }
  }
  if (!removed) return false;
  if (String(removed.category || '').trim() === 'memo') return false;
  const before = st.monthTodos.length;
  st.monthTodos = st.monthTodos.filter(function (r) {
    return r !== removed;
  });
  if (st.monthTodos.length === before) return false;
  plannerScrubTimelineMapForTask_(st, day, tid);
  const cat = removed ? String(removed.category || '').trim() : '';
  if (cat === PLAN_CATEGORY_FIXED && st.viewMonth) {
    plannerRebuildFixedBlockSlotsForMonth_(st, st.viewMonth);
  }
  plannerRebuildQuickPostPayload_(st);
  return true;
}

/**
 * @param {object} st
 * @param {Date} viewMonth
 * @param {number[]} weekdays
 * @param {string} title
 * @param {number} startIx
 * @param {number} endIx
 * @returns {string} 빈 문자열=성공, 아니면 에러 문구
 */
function plannerApplyFixedScheduleForMonth_(st, viewMonth, weekdays, title, startIx, endIx) {
  const name = String(title != null ? title : '').trim();
  if (!name.length) return '일정 이름을 입력해 주세요.';
  if (!weekdays.length) return '요일을 한 개 이상 선택해 주세요.';
  const s0 = Number(startIx);
  const s1 = Number(endIx);
  if (!isFinite(s0) || !isFinite(s1)) return '시간을 선택해 주세요.';
  if (s1 <= s0) return '끝 시간은 시작 시간보다 뒤여야 합니다.';
  const maxIx = PLAN_TIMELINE_HOURS_ORDERED.length * PLAN_TIMELINE_CELLS_PER_HOUR;
  if (!plannerFixedTimelineOrderIndexIsHalfHour_(s0)) return '시작 시각은 30분 단위만 선택할 수 있습니다.';
  if (s1 !== maxIx && !plannerFixedTimelineOrderIndexIsHalfHour_(s1)) {
    return '끝 시각은 30분 단위 또는 「타임라인 끝」만 선택할 수 있습니다.';
  }
  if (s0 < 0 || s0 >= maxIx) return '시간 범위가 올바르지 않습니다.';
  if (s1 <= 0 || s1 > maxIx) return '시간 범위가 올바르지 않습니다.';
  const y = viewMonth.getFullYear();
  const m0 = viewMonth.getMonth();
  const last = new Date(y, m0 + 1, 0).getDate();
  const ruleId = 'fxr_' + String(Date.now()) + '_' + String(Math.floor(Math.random() * 1e6));
  plannerEnsureMonthTodos_(st);
  if (!st.dayFixedBlockSlotsByDate) st.dayFixedBlockSlotsByDate = {};
  /** @type {string[]} */
  const slotKeysForRows = [];
  for (let ix = s0; ix < s1; ix++) {
    const ks = plannerOrderIndexToSlotKey_(ix);
    if (ks) slotKeysForRows.push(ks);
  }
  const timeline_slots = JSON.stringify(slotKeysForRows);
  let d;
  let skdx;
  for (d = 1; d <= last; d++) {
    const dd = new Date(y, m0, d);
    if (weekdays.indexOf(dd.getDay()) < 0) continue;
    const ymd = plannerYmdFromParts_(y, m0, d);
    const task_id = '__sp_fix_' + ruleId + '_' + ymd;
    const todayFx = plannerTodayYmdSeoul_();
    plannerPushMonthTodo_(
      st,
      plannerTodoRowLocal_({
        task_id: task_id,
        title: name,
        date: ymd,
        category: PLAN_CATEGORY_FIXED,
        lecture_id: '',
        timeline_slots: timeline_slots,
        sort_key: -600,
        mark: 'none',
        trace_dates: '[]',
        created_date: todayFx,
        updated_date: todayFx
      }),
      true
    );
    if (!st.dayFixedBlockSlotsByDate[ymd]) st.dayFixedBlockSlotsByDate[ymd] = {};
    const slots = plannerEnsureTimelineTodoSlots_(st, ymd);
    for (skdx = s0; skdx < s1; skdx++) {
      const k = plannerOrderIndexToSlotKey_(skdx);
      if (!k) continue;
      st.dayFixedBlockSlotsByDate[ymd][k] = true;
      try {
        delete slots[k];
      } catch (_e) {
        slots[k] = '';
      }
    }
    plannerStripStudyTimelineSlotsOnDay_(st, ymd, slotKeysForRows);
    if (st.dayTimelineTodoByDate && st.dayTimelineTodoByDate[ymd]) {
      try {
        delete st.dayTimelineTodoByDate[ymd];
      } catch (_e) {
        st.dayTimelineTodoByDate[ymd] = {};
      }
    }
  }
  plannerRebuildQuickPostPayload_(st);
  return '';
}

/**
 * 달력 일자 칸 하단 고정 일정(빨간 텍스트만).
 * @param {object} st
 * @param {string} key ymd
 * @returns {string}
 */
function plannerFixedScheduleFooterHtml_(st, key) {
  const rows = plannerMonthTodosForDay_(st, key);
  const lines = [];
  rows.forEach(function (r) {
    if (!r || String(r.date || '').trim() !== key) return;
    if (String(r.category || '').trim() !== PLAN_CATEGORY_FIXED) return;
    const t = String(r.title || '').trim();
    const tid = String(r.task_id != null ? r.task_id : '').trim();
    if (t && tid) lines.push({ title: t, task_id: tid });
  });
  if (!lines.length) return '';
  return (
    '<div class="sp-plan-day__fixedFoot" aria-label="고정 일정">' +
    lines
      .map(function (item) {
        return plannerCurBadgeSpan_('fixed', item.title, { taskId: item.task_id });
      })
      .join('') +
    '</div>'
  );
}

/**
 * @param {number} hour
 * @param {number} sub 0..PLAN_TIMELINE_CELLS_PER_HOUR-1
 * @returns {string}
 */
function plannerTimelineSlotKey_(hour, sub) {
  return String(hour) + '_' + String(sub);
}

/**
 * @param {string} key
 * @returns {{ hour: number, sub: number }|null}
 */
function plannerTimelineSlotKeyParse_(key) {
  const s = String(key != null ? key : '');
  const m = s.match(/^(\d+)_([0-5])$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const sub = Number(m[2]);
  if (!isFinite(hour) || !isFinite(sub)) return null;
  return { hour: hour, sub: sub };
}

/**
 * @param {Record<string, string>} slots
 * @returns {boolean}
 */
function plannerTimelineNeedsLegacyNumericKeys_(slots) {
  return Object.keys(slots).some(function (k) {
    return /^\d+$/.test(k);
  });
}

/**
 * 예전 30분 단위 정수 키(0,1,…) → `시_칸` 10분 키
 * @param {Record<string, string>} slots
 * @returns {Record<string, string>}
 */
function plannerMigrateNumeric30SlotsToTenMin_(slots) {
  /** @type {Record<string, string>} */
  const out = {};
  Object.keys(slots).forEach(function (k) {
    const v = slots[k];
    if (v == null || String(v).trim() === '') return;
    if (!/^\d+_[0-5]$/.test(k)) return;
    out[k] = String(v);
  });
  Object.keys(slots).forEach(function (k) {
    const v = slots[k];
    if (v == null || String(v).trim() === '') return;
    if (!/^\d+$/.test(k)) return;
    const sv = String(v);
    const i = Number(k);
    if (!isFinite(i) || i < 0) return;
    const startMin = PLAN_TIMELINE_LEGACY_START_H * 60 + i * PLAN_TIMELINE_LEGACY_STEP_MIN;
    let m;
    for (m = 0; m < PLAN_TIMELINE_LEGACY_STEP_MIN; m += PLAN_TIMELINE_CELL_MIN) {
      const t = startMin + m;
      const h = Math.floor(t / 60);
      const sub = Math.floor((t % 60) / PLAN_TIMELINE_CELL_MIN);
      if (h < 0 || h > 23 || sub < 0 || sub >= PLAN_TIMELINE_CELLS_PER_HOUR) continue;
      out[plannerTimelineSlotKey_(h, sub)] = sv;
    }
  });
  return out;
}

/** @param {string} dateYmd
 * @param {object} st
 * @returns {Record<string, { task_id: string, title: string, category: string }>}
 */
function plannerDayTodoIdMapForDay_(dateYmd, st) {
  const rows = plannerOrderedDayTodos_(st, dateYmd);
  /** @type {Record<string, { task_id: string, title: string, category: string }>} */
  const o = {};
  rows.forEach(function (r) {
    if (!r || !r.task_id || plannerIsTraceGhostDisplay_(r)) return;
    o[String(r.task_id)] = {
      task_id: String(r.task_id),
      title: String(r.title != null ? r.title : ''),
      category: String(r.category != null ? r.category : '')
    };
  });
  return o;
}

/**
 * @param {Record<string, string>} slots
 * @param {string} dateYmd
 * @param {object} st
 * @param {number} hour
 * @returns {string}
 */
function plannerHourTodoColHtmlFromSlots_(slots, dateYmd, st, hour) {
  const seen = [];
  const order = [];
  let sub;
  for (sub = 0; sub < PLAN_TIMELINE_CELLS_PER_HOUR; sub++) {
    const tid = String(slots[plannerTimelineSlotKey_(hour, sub)] || '').trim();
    if (!tid) continue;
    if (seen.indexOf(tid) < 0) {
      seen.push(tid);
      order.push(tid);
    }
  }
  if (!order.length) {
    return '<span class="sp-plan-hourTodoEmpty" aria-hidden="true"> </span>';
  }
  const map = plannerDayTodoIdMapForDay_(dateYmd, st);
  let h = '';
  order.forEach(function (tid) {
    const row = map[tid];
    if (!row) return;
    const txt = row.title ? String(row.title).trim() : tid.length > 10 ? tid.slice(0, 10) + '…' : tid;
    const cat = plannerTodoPaintColorClass_(st, dateYmd, tid, row);
    const short = txt.length > 10 ? txt.slice(0, 10) + '…' : txt;
    h +=
      '<span class="sp-plan-hourTodoPill sp-plan-hourTodoPill--cat-' +
      esc(cat) +
      '" title="' +
      esc(row && row.title ? String(row.title).trim() : tid) +
      '">' +
      esc(short) +
      '</span>';
  });
  return h;
}

/**
 * @param {object} st
 * @param {string} ymd
 * @param {string} taskId
 * @returns {'none'|'circle'|'triangle'|'x'}
 */
function plannerTodoCompletionGet_(st, ymd, taskId) {
  const row = plannerFindMonthTodoByTaskId_(st, taskId);
  if (!row || String(row.date || '').trim() !== String(ymd || '').trim()) return 'none';
  const v = String(row.mark != null ? row.mark : 'none').trim();
  if (v === 'circle' || v === 'triangle' || v === 'x') return v;
  return 'none';
}

/**
 * @param {object} st
 * @param {string} ymd
 * @param {string} taskId
 * @param {'none'|'circle'|'triangle'|'x'} mark
 */
function plannerTodoCompletionSet_(st, ymd, taskId, mark) {
  const row = plannerFindMonthTodoByTaskId_(st, taskId);
  if (!row || String(row.date || '').trim() !== String(ymd || '').trim()) return;
  row.mark = mark === 'none' ? 'none' : mark;
  if (!row._fromServer) row.updated_date = plannerTodayYmdSeoul_();
  plannerRebuildQuickPostPayload_(st);
}

/**
 * 타임라인 10분 칸 기준 과목별 합계(분)
 * @param {object} st
 * @param {string} ymd
 * @returns {Record<string, number>}
 */
function plannerSubjectMinutesFromTimeline_(st, ymd) {
  const slots = st.dayTimelineTodoByDate && st.dayTimelineTodoByDate[ymd];
  /** @type {Record<string, number>} */
  const acc = { grammar: 0, logic: 0, read: 0, vocab: 0, misc: 0 };
  if (!slots || typeof slots !== 'object') return acc;
  const map = plannerDayTodoIdMapForDay_(ymd, st);
  Object.keys(slots).forEach(function (k) {
    if (!plannerTimelineSlotKeyParse_(k)) return;
    if (plannerFixedSlotBlocked_(st, ymd, k)) return;
    const tid = String(slots[k] != null ? slots[k] : '').trim();
    const row = map[tid];
    if (!tid || plannerIsExcludedFromStudyTotals_(tid, row && row.category)) return;
    const cat = row && row.category ? String(row.category).trim() : '';
    const suf = cat && acc[cat] != null ? cat : plannerTodoCategoryToken_(tid);
    const key = acc[suf] != null ? suf : 'misc';
    acc[key] = (acc[key] || 0) + PLAN_TIMELINE_CELL_MIN;
  });
  return acc;
}

/**
 * @param {number} minutes
 * @returns {string}
 */
function plannerFormatStudyDurationKo_(minutes) {
  const n = Math.max(0, Math.floor(Number(minutes) || 0));
  if (n <= 0) return '0분';
  if (n < 60) return String(n) + '분';
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (m === 0) return String(h) + '시간';
  return String(h) + '시간 ' + String(m) + '분';
}

/**
 * @param {object} st
 * @param {string} ymd
 * @returns {string}
 */
function plannerDayModalSubjectStatsHtml_(st, ymd) {
  const acc = plannerSubjectMinutesFromTimeline_(st, ymd);
  const labels = { vocab: '어휘', grammar: '문법', logic: '논리', read: '독해', misc: '기타' };
  const order = PLANNER_STUDY_CATEGORY_ORDER.slice();
  let sum = 0;
  const items = [];
  order.forEach(function (key) {
    const m = acc[key] || 0;
    if (m <= 0) return;
    sum += m;
    items.push(
      '<li class="sp-plan-studyFooter__item sp-plan-studyFooter__item--' +
        esc(key) +
        '"><span class="sp-plan-studyFooter__lab">' +
        esc(labels[key] || key) +
        '</span><span class="sp-plan-studyFooter__val">' +
        esc(plannerFormatStudyDurationKo_(m)) +
        '</span></li>'
    );
  });
  if (!items.length) {
    return (
      '<div class="sp-plan-studyFooter__inner">' +
      '<div class="sp-plan-studyFooter__title">타임라인 과목별 공부 시간</div>' +
      '<p class="sp-plan-studyFooter__empty">아직 표시한 10분 칸이 없습니다. 왼쪽 할 일 목록에서 「체크」로 할 일을 고른 뒤 시간표에 칠하면 여기에 합계가 나타납니다.</p>' +
      '</div>'
    );
  }
  return (
    '<div class="sp-plan-studyFooter__inner">' +
    '<div class="sp-plan-studyFooter__title">타임라인 과목별 공부 시간</div>' +
    '<ul class="sp-plan-studyFooter__list">' +
    items.join('') +
    '</ul>' +
    '<p class="sp-plan-studyFooter__sum">합계 <strong>' +
    esc(plannerFormatStudyDurationKo_(sum)) +
    '</strong></p>' +
    '</div>'
  );
}

/**
 * @param {HTMLElement} root
 */
function plannerRefreshDayModalStudyFooter_(root) {
  const el = root.querySelector('#sp-plan-day-study-footer');
  if (!el) return;
  const st = root.__spPlanState;
  if (!st || !st.selectedDate) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = plannerDayModalSubjectStatsHtml_(st, st.selectedDate);
}

/**
 * 일일 모달 왼쪽 열(할 일 요약)만 다시 그립니다.
 * @param {HTMLElement} root
 */
function plannerRefreshDayModalTodoSide_(root) {
  const m = root.querySelector('#sp-plan-day-modal');
  const side = m && m.querySelector('#sp-plan-day-todo-side');
  const st = root.__spPlanState;
  if (!side || !st || !st.selectedDate) return;
  side.innerHTML = plannerDayTodosFromPayloadHtml_(st.selectedDate, st);
}

/** @param {HTMLElement} timegrid */
function plannerRovingTabindexSlotcells_(timegrid) {
  if (!timegrid) return;
  const cells = timegrid.querySelectorAll('.sp-plan-slotcell');
  let placed = false;
  cells.forEach(function (el) {
    if (!(el instanceof HTMLElement)) return;
    const dis = el instanceof HTMLButtonElement && el.disabled;
    if (!dis && !placed) {
      el.setAttribute('tabindex', '0');
      placed = true;
    } else {
      el.setAttribute('tabindex', '-1');
    }
  });
}

/** @param {HTMLElement} timegrid
 * @param {HTMLButtonElement} btn */
function plannerFocusSlotcell_(timegrid, btn) {
  if (!timegrid || !(btn instanceof HTMLButtonElement)) return;
  timegrid.querySelectorAll('.sp-plan-slotcell').forEach(function (el) {
    if (el instanceof HTMLElement) el.setAttribute('tabindex', '-1');
  });
  btn.setAttribute('tabindex', '0');
  try {
    btn.focus();
  } catch (_e) {
    /* ignore */
  }
}

/**
 * @param {object} st
 * @param {string} d
 * @returns {Record<string, string>} `시_칸`(0~5) → todoId
 */
function plannerEnsureTimelineTodoSlots_(st, d) {
  if (!st.dayTimelineTodoByDate) st.dayTimelineTodoByDate = {};
  if (!st.dayTimelineTodoByDate[d]) {
    const leg = st.dayTimelineSlotsByDate && st.dayTimelineSlotsByDate[d];
    st.dayTimelineTodoByDate[d] = leg
      ? plannerMigrateLegacySlotsToTodo_(leg)
      : plannerBuildTimelineSlotMapForDayFromMonthTodos_(st, d);
    if (leg && st.dayTimelineSlotsByDate) {
      try {
        delete st.dayTimelineSlotsByDate[d];
      } catch (_e) {
        st.dayTimelineSlotsByDate[d] = {};
      }
    }
  }
  let slots = st.dayTimelineTodoByDate[d];
  if (slots && plannerTimelineNeedsLegacyNumericKeys_(slots)) {
    slots = plannerMigrateNumeric30SlotsToTenMin_(slots);
    st.dayTimelineTodoByDate[d] = slots;
  }
  return st.dayTimelineTodoByDate[d];
}

/**
 * @param {object} st
 * @param {string} dateYmd
 * @returns {string}
 */
function plannerDayTimelineHtml_(st, dateYmd) {
  const slots = plannerEnsureTimelineTodoSlots_(st, dateYmd);
  const hueMap = plannerDayTodoHueMapForDay_(st, dateYmd, slots);
  const todoMap = plannerDayTodoIdMapForDay_(dateYmd, st);
  let html = '';
  let idx;
  for (idx = 0; idx < PLAN_TIMELINE_HOURS_ORDERED.length; idx++) {
    const h = PLAN_TIMELINE_HOURS_ORDERED[idx];
    let cells = '';
    for (let sub = 0; sub < PLAN_TIMELINE_CELLS_PER_HOUR; sub++) {
      const k = plannerTimelineSlotKey_(h, sub);
      const blocked = plannerFixedSlotBlocked_(st, dateYmd, k);
      const tid = !blocked && slots[k] ? String(slots[k]).trim() : '';
      const row = tid && todoMap[tid] ? todoMap[tid] : null;
      const hue = tid ? hueMap[tid] || plannerTodoPaintColorClass_(st, dateYmd, tid, row) : '';
      const bar = tid ? plannerTimelineBarRole_(slots, k, tid) : '';
      const m0 = sub * PLAN_TIMELINE_CELL_MIN;
      const m1 = m0 + PLAN_TIMELINE_CELL_MIN;
      const lab = plannerPad2_(h) + ':' + plannerPad2_(m0) + '–' + plannerPad2_(h) + ':' + plannerPad2_(m1);
      let cls =
        'sp-plan-slotcell' +
        (blocked ? ' sp-plan-slotcell--fixedBlock is-fixedBlock' : '') +
        (tid ? ' is-on sp-plan-slotcell--todo sp-plan-slotcell--todo--' + hue : '');
      if (tid && bar) {
        cls += ' sp-plan-slotcell--bar-' + bar;
      }
      const chunkLbl = tid ? plannerSlotBarChunkLabel_(slots, k, tid, todoMap) : '';
      const titleFull = row && row.title ? String(row.title).trim() : tid;
      const al = blocked
        ? lab + ' · 고정 일정(비활성)'
        : lab + (tid ? ' · ' + titleFull + (chunkLbl ? ' · ' + chunkLbl : '') : '') + ' 칸';
      cells +=
        '<button type="button" tabindex="-1" class="' +
        cls +
        '" data-slot="' +
        esc(k) +
        '"' +
        (tid ? ' data-todo-id="' + esc(tid) + '"' : '') +
        (chunkLbl ? ' data-bar-chunk="' + esc(chunkLbl) + '"' : '') +
        (blocked ? ' disabled aria-disabled="true"' : '') +
        ' aria-pressed="' +
        (tid ? 'true' : 'false') +
        '" aria-label="' +
        esc(al) +
        '"></button>';
    }
    const hourLbl = plannerPad2_(h) + '시';
    html +=
      '<div class="sp-plan-hourRow" data-hour="' +
      String(h) +
      '">' +
      '<div class="sp-plan-hourRow__time" aria-hidden="true">' +
      esc(hourLbl) +
      '</div>' +
      '<div class="sp-plan-hourRow__cells" role="group" aria-label="' +
      esc(hourLbl) +
      ' 10분 칸">' +
      cells +
      '</div></div>' +
    '<nav id="sp-plan-todo-ctx-menu" class="sp-plan-todoCtx" hidden role="menu" aria-label="할 일 메뉴">' +
    '<button type="button" class="sp-plan-todoCtx__btn" data-sp-ctx-action="delete" role="menuitem">삭제</button>' +
    '</nav>';
  }
  return html;
}

/**
 * 슬롯 상태 → 버튼 DOM만 반영(브러시 적용 없음).
 * @param {HTMLButtonElement} btn
 * @param {Record<string, string>} slots
 * @param {string} slot
 * @param {object} [st]
 * @param {string} [ymd]
 */
function plannerSyncSlotcellUi_(btn, slots, slot, st, ymd, timegrid) {
  if (st && ymd && timegrid) {
    plannerRefreshTimegridSlotcellsUi_(st, String(ymd), timegrid);
    return;
  }
  const sk = String(slot);
  const tid = slots[sk] != null ? String(slots[sk]).trim() : '';
  const ymdStr = ymd != null ? String(ymd) : '';
  const hue = tid && st && ymdStr ? plannerTodoPaintColorClass_(st, ymdStr, tid, null) : '';
  const bar = tid ? plannerTimelineBarRole_(slots, sk, tid) : '';
  let cls = 'sp-plan-slotcell';
  if (tid) {
    cls += ' is-on sp-plan-slotcell--todo sp-plan-slotcell--todo--' + hue;
    if (bar) {
      cls += ' sp-plan-slotcell--bar-' + bar;
    }
    btn.setAttribute('data-todo-id', tid);
  } else {
    btn.removeAttribute('data-todo-id');
  }
  btn.className = cls;
  btn.setAttribute('aria-pressed', tid ? 'true' : 'false');
}

/**
 * @param {HTMLElement} root
 * @param {HTMLButtonElement} btn
 * @param {HTMLElement|null} timegrid
 */
function plannerPaintSlotcellFromState_(root, btn, timegrid) {
  const st = root.__spPlanState;
  if (!st || !st.selectedDate) return;
  const slot = btn.getAttribute('data-slot');
  if (slot == null || String(slot).indexOf('_') < 0) return;
  if (plannerFixedSlotBlocked_(st, st.selectedDate, String(slot))) return;
  const slots = plannerEnsureTimelineTodoSlots_(st, st.selectedDate);
  const brush = st.modalBrushTodoId ? String(st.modalBrushTodoId) : '';
  plannerTimelineSlotApplyBrush_(slots, slot, brush, st, st.selectedDate);
  if (timegrid) {
    plannerRefreshTimegridSlotcellsUi_(st, st.selectedDate, timegrid);
  } else {
    plannerSyncSlotcellUi_(btn, slots, String(slot), st, st.selectedDate, null);
  }
  plannerRefreshDayModalTodoSide_(root);
}

/**
 * 일일 모달: 왼쪽 할 일 표(체크·달성도) · 오른쪽 10분 칸(POST 없음)
 * @param {HTMLElement} modalEl
 * @param {HTMLElement} root
 */
function wirePlannerDayModalUiOnce_(modalEl, root) {
  if (modalEl.__spPlanDayUiWired) return;
  modalEl.__spPlanDayUiWired = true;
  const todoSide = modalEl.querySelector('#sp-plan-day-todo-side');
  const timegrid = modalEl.querySelector('#sp-plan-day-timegrid');
  if (!todoSide || !timegrid) return;

  let painting = false;
  let lastPaintSlot = '';

  function syncBrushTable_(st) {
    const brush = st.modalBrushTodoId ? String(st.modalBrushTodoId) : '';
    const side = modalEl.querySelector('#sp-plan-day-todo-side');
    if (!side) return;
    side.querySelectorAll('.sp-plan-todoSide__row').forEach(function (tr) {
      if (!(tr instanceof HTMLElement)) return;
      const id = tr.getAttribute('data-todo-id') || '';
      const on = Boolean(brush && id === brush);
      tr.classList.toggle('is-brushRow', on);
      const b = tr.querySelector('[data-action="todo-brush"]');
      if (b instanceof HTMLElement) {
        b.classList.toggle('is-brush', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.textContent = on ? '체크 ✓' : '체크';
      }
    });
  }

  modalEl.addEventListener('click', function (e) {
    const side = modalEl.querySelector('#sp-plan-day-todo-side');
    if (!side || !e.target) return;
    const t = /** @type {HTMLElement} */ (e.target instanceof HTMLElement ? e.target : null);
    if (!t || !side.contains(t)) return;
    const brushBtn = t.closest ? t.closest('[data-action="todo-brush"]') : null;
    if (!brushBtn || !side.contains(brushBtn)) return;
    if (brushBtn instanceof HTMLButtonElement && brushBtn.disabled) return;
    const tr = brushBtn.closest ? brushBtn.closest('.sp-plan-todoSide__row') : null;
    if (!(tr instanceof HTMLElement)) return;
    if (tr.classList.contains('sp-plan-todoSide__row--fixed')) return;
    const st = root.__spPlanState;
    if (!st || !st.selectedDate) return;
    const id = tr.getAttribute('data-todo-id') || '';
    st.modalBrushTodoId = st.modalBrushTodoId === id ? '' : id;
    syncBrushTable_(st);
  });

  modalEl.addEventListener('change', function (e) {
    const sel = e.target;
    if (!(sel instanceof HTMLSelectElement)) return;
    if (!sel.classList.contains('sp-plan-todoSide__markSel')) return;
    const side = modalEl.querySelector('#sp-plan-day-todo-side');
    if (!side || !side.contains(sel)) return;
    const st = root.__spPlanState;
    if (!st || !st.selectedDate) return;
    const ymd = st.selectedDate;
    const taskId = sel.getAttribute('data-todo-id') || '';
    if (!taskId) return;
    const v = String(sel.value || 'none');
    if (v === 'circle' || v === 'triangle' || v === 'x') {
      plannerTodoCompletionSet_(st, ymd, taskId, /** @type {'circle'|'triangle'|'x'} */ (v));
    } else {
      plannerTodoCompletionSet_(st, ymd, taskId, 'none');
    }
  });

  function endPaintGlobal() {
    painting = false;
    lastPaintSlot = '';
    const st = root.__spPlanState;
    if (st && st.selectedDate) {
      plannerPersistTimelineSlotMapToMonthTodos_(st, st.selectedDate);
    }
    plannerRefreshDayModalStudyFooter_(root);
    plannerRefreshDayModalTodoSide_(root);
    window.removeEventListener('pointerup', endPaintGlobal);
    window.removeEventListener('pointercancel', endPaintGlobal);
  }

  timegrid.addEventListener('pointerdown', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('.sp-plan-slotcell') : null;
    if (!btn || !timegrid.contains(btn) || !(btn instanceof HTMLButtonElement)) return;
    if (btn.disabled) return;
    const stPaint = root.__spPlanState;
    const brushPaint =
      stPaint && stPaint.modalBrushTodoId ? String(stPaint.modalBrushTodoId).trim() : '';
    plannerFocusSlotcell_(timegrid, btn);
    if (!brushPaint) return;
    painting = true;
    lastPaintSlot = '';
    plannerPaintSlotcellFromState_(root, btn, timegrid);
    lastPaintSlot = btn.getAttribute('data-slot') || '';
    window.addEventListener('pointerup', endPaintGlobal);
    window.addEventListener('pointercancel', endPaintGlobal);
  });

  timegrid.addEventListener('pointermove', function (e) {
    if (!painting) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el && el.closest ? el.closest('.sp-plan-slotcell') : null;
    if (!btn || !timegrid.contains(btn) || !(btn instanceof HTMLButtonElement)) return;
    if (btn.disabled) return;
    const sk = btn.getAttribute('data-slot') || '';
    if (sk === lastPaintSlot) return;
    lastPaintSlot = sk;
    plannerPaintSlotcellFromState_(root, btn, timegrid);
  });

  timegrid.addEventListener('keydown', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('.sp-plan-slotcell') : null;
    if (!btn || !timegrid.contains(btn) || !(btn instanceof HTMLButtonElement)) return;
    const cells = Array.prototype.slice.call(timegrid.querySelectorAll('.sp-plan-slotcell'));
    const i = cells.indexOf(btn);
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      const st = root.__spPlanState;
      if (!st || !st.selectedDate) return;
      if (btn.disabled) return;
      const brush = st.modalBrushTodoId ? String(st.modalBrushTodoId).trim() : '';
      if (!brush) return;
      const slot = btn.getAttribute('data-slot');
      if (slot == null) return;
      const slots = plannerEnsureTimelineTodoSlots_(st, st.selectedDate);
      plannerTimelineSlotApplyBrush_(slots, String(slot), brush, st, st.selectedDate);
      plannerRefreshTimegridSlotcellsUi_(st, st.selectedDate, timegrid);
      plannerPersistTimelineSlotMapToMonthTodos_(st, st.selectedDate);
      plannerRefreshDayModalStudyFooter_(root);
      plannerRefreshDayModalTodoSide_(root);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      let j = i + 1;
      while (j < cells.length) {
        const next = cells[j];
        if (next instanceof HTMLButtonElement && !next.disabled) {
          plannerFocusSlotcell_(timegrid, next);
          break;
        }
        j++;
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      let j = i - 1;
      while (j >= 0) {
        const next = cells[j];
        if (next instanceof HTMLButtonElement && !next.disabled) {
          plannerFocusSlotcell_(timegrid, next);
          break;
        }
        j--;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      let j = i + PLAN_TIMELINE_CELLS_PER_HOUR;
      while (j < cells.length) {
        const next = cells[j];
        if (next instanceof HTMLButtonElement && !next.disabled) {
          plannerFocusSlotcell_(timegrid, next);
          break;
        }
        j++;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      let j = i - PLAN_TIMELINE_CELLS_PER_HOUR;
      while (j >= 0) {
        const next = cells[j];
        if (next instanceof HTMLButtonElement && !next.disabled) {
          plannerFocusSlotcell_(timegrid, next);
          break;
        }
        j--;
      }
    }
  });
  const memoTa = modalEl.querySelector('#sp-plan-day-memo');
  if (memoTa instanceof HTMLTextAreaElement) {
    memoTa.addEventListener('input', function () {
      const st = root.__spPlanState;
      if (!st || !st.selectedDate) return;
      if (!st.dayMemoByDate) st.dayMemoByDate = {};
      st.dayMemoByDate[st.selectedDate] = memoTa.value;
      plannerSyncDayMemoToMonthTodo_(st, st.selectedDate);
    });
  }
}

/**
 * `monthTodos` 중 해당 날짜 건수(고정·trace 제외).
 * @param {object} st
 * @param {string} ymd
 * @returns {number}
 */
function plannerManualTodosCountForDay_(st, ymd) {
  return plannerMonthTodosForDay_(st, ymd).filter(function (r) {
    if (!r || plannerIsTraceGhostDisplay_(r)) return false;
    return !plannerIsExcludedFromStudyTotals_(r.task_id, r.category);
  }).length;
}

/**
 * 달력 **배지 숫자** — 일일 모달 학습 할 일만(취침·식사·루틴·고정·메모·trace 제외).
 * @param {object} st
 * @param {string} ymd
 * @returns {number}
 */
function plannerCalendarUserTodoCountForBadge_(st, ymd) {
  return plannerMonthTodosForDay_(st, ymd).filter(function (r) {
    if (!r || plannerIsTraceGhostDisplay_(r)) return false;
    return !plannerIsExcludedFromStudyTotals_(r.task_id, r.category);
  }).length;
}

/**
 * @param {HTMLElement} slot
 */
function plannerHideTodoContextMenu_(slot) {
  const menu = slot.querySelector('#sp-plan-todo-ctx-menu');
  if (menu instanceof HTMLElement) {
    menu.setAttribute('hidden', 'hidden');
    menu.style.left = '';
    menu.style.top = '';
  }
  slot.__spPlanCtxMenu = null;
}

/**
 * @param {HTMLElement} el
 * @returns {string[]}
 */
function plannerResolveTodoIdsFromContextTarget_(el) {
  const one = el.getAttribute('data-sp-task-id');
  if (one && String(one).trim()) return [String(one).trim()];
  const many = el.getAttribute('data-sp-task-ids');
  if (many) {
    return String(many)
      .split(',')
      .map(function (s) {
        return String(s).trim();
      })
      .filter(Boolean);
  }
  return [];
}

/**
 * 달력 할 일 우클릭 삭제 — `monthTodos` 제거 후, 서버 행이었으면 `plannerPersonalTodosApply`로 월 덮어쓰기.
 * @param {HTMLElement} root
 * @param {string} ymd
 * @param {string[]} taskIds
 */
async function plannerDeleteTodosFromCalendar_(root, ymd, taskIds) {
  if (!root.__spPlanAdminMode) return;
  const st = root.__spPlanState;
  const slot = root.querySelector('#sp-plan-calendar-slot');
  if (!st || !taskIds.length) return;
  const day = String(ymd || '').trim();
  let hadServer = false;
  taskIds.forEach(function (tid) {
    const row = st.monthTodos.find(function (r) {
      return r && String(r.date || '').trim() === day && String(r.task_id || '').trim() === tid;
    });
    if (row && row._fromServer) hadServer = true;
    plannerRemoveMonthTodo_(st, day, tid);
  });
  plannerRefreshPostPreview_(root);
  if (typeof root.__spPlanRerenderMonth === 'function') {
    root.__spPlanRerenderMonth();
  }
  const modal = root.querySelector('#sp-plan-day-modal');
  if (modal && st.selectedDate === day && !modal.hasAttribute('hidden')) {
    if (st.dayTimelineTodoByDate) {
      try {
        delete st.dayTimelineTodoByDate[day];
      } catch (_e) {
        st.dayTimelineTodoByDate[day] = {};
      }
    }
    if (typeof root.__spPlanRefreshOpenDayModal === 'function') {
      root.__spPlanRefreshOpenDayModal();
    }
  }
  const memberUi = st.role === 'member' || st.planGuestUnlockMock;
  if (hadServer && memberUi) {
    await plannerPersonalTodosApplyClick_(root);
  }
  if (slot) plannerHideTodoContextMenu_(slot);
}

/**
 * @param {HTMLElement} root
 * @param {{ role: string, common: object[], personal: object[] | null, curriculum?: unknown }} boot
 */
function renderCalendar_(root, boot) {
  const slot = root.querySelector('#sp-plan-calendar-slot');
  const ban = root.querySelector('#sp-plan-banner');
  if (!slot) return;

  const role = boot && boot.role === 'member' ? 'member' : 'guest';

  const common = plannerNormalizeCommonEventsFromApi_(boot && boot.common);
  const personal = boot && boot.personal != null && Array.isArray(boot.personal) ? boot.personal : [];

  /** @type {Record<string, number>} */
  const byDate = {};
  plannerCommonEventsMergeIntoByDate_(byDate, common);
  personal.forEach(function (ev) {
    const d0 = String((ev && ev.date) || '').trim();
    if (!d0) return;
    byDate[d0] = (byDate[d0] || 0) + 1;
  });

  const apiHadCalendarRows = common.length > 0 || personal.length > 0;

  /** @type {{ role: 'member'|'guest', viewMonth: Date, byDate: Record<string, number>, selectedDate: string|null, apiHadCalendarRows: boolean, plannerCurriculum?: { courses: object[], lectures: object[] }, monthTodos?: object[], dayTimelineSlotsByDate?: Record<string, Record<string, boolean>>, dayTimelineTodoByDate?: Record<string, Record<string, string>>, dayFixedBlockSlotsByDate?: Record<string, Record<string, boolean>>, dayMemoByDate?: Record<string, string>, plannerQuickPostBody?: { action: string, todos: object[] }, modalBrushTodoId?: string, quickRegCollapsed?: boolean, planGuestUnlockMock?: boolean }} */
  const st = (root.__spPlanState =
    root.__spPlanState && typeof root.__spPlanState === 'object'
      ? root.__spPlanState
      : {
          role: role,
          viewMonth: new Date(),
          byDate: {},
          selectedDate: null,
          apiHadCalendarRows: false,
          dayTimelineSlotsByDate: {},
          dayTimelineTodoByDate: {},
          dayFixedBlockSlotsByDate: {},
          dayMemoByDate: {},
          monthTodos: [],
          plannerCurriculum: { courses: [], lectures: [] },
          plannerQuickPostBody: { action: 'plannerPersonalTodosApply', todos: [] },
          modalBrushTodoId: '',
          quickRegCollapsed: false,
          planGuestUnlockMock: false
        });
  st.role = role;
  /* 시연: 모달에서 '구매하기' 누른 뒤엔 재부트( renderCalendar_ ) 때도 API guest를 덮지 않음 */
  if (st.planGuestUnlockMock) {
    st.role = 'member';
  }
  st.byDate = byDate;
  st.apiHadCalendarRows = apiHadCalendarRows;
  st.plannerCommonEvents = common;
  st.plannerCurriculum = plannerNormalizeCurriculumFromBootstrap_(boot && boot.curriculum);
  if (st.modalBrushTodoId == null) st.modalBrushTodoId = '';
  plannerEnsureMonthTodos_(st);
  if (!st.plannerQuickPostBody || typeof st.plannerQuickPostBody !== 'object') {
    st.plannerQuickPostBody = { action: 'plannerPersonalTodosApply', todos: [] };
    plannerRebuildQuickPostPayload_(st);
  }
  if (!st.dayTimelineTodoByDate) st.dayTimelineTodoByDate = {};
  if (!st.dayFixedBlockSlotsByDate) st.dayFixedBlockSlotsByDate = {};
  if (!st.dayMemoByDate) st.dayMemoByDate = {};
  if (typeof st.quickRegCollapsed !== 'boolean') st.quickRegCollapsed = false;
  if (typeof st.planGuestUnlockMock !== 'boolean') st.planGuestUnlockMock = false;
  if (ban) {
    if (st.role === 'guest') {
      ban.textContent = '수강 확인이 되지 않아 학원 공통 일정만 표시됩니다. 문의가 필요하면 담당자에게 연락해 주세요.';
      ban.removeAttribute('hidden');
    } else {
      ban.setAttribute('hidden', 'hidden');
    }
  }
  if (!(st.viewMonth instanceof Date) || isNaN(Number(st.viewMonth))) {
    st.viewMonth = new Date();
  }

  plannerApplyBootstrapPersonal_(st, personal, st.role);

  function pad2(n) {
    return String(n < 10 ? '0' : '') + String(n);
  }

  /** @param {Date} d */
  function ymd(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** @param {Date} d */
  function ym(d) {
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월';
  }

  /** @param {Date} d */
  function mdShort(d) {
    return d.getMonth() + 1 + '/' + d.getDate();
  }

  /** @param {Date} d */
  function monthStartSunday(d) {
    const s = new Date(d.getFullYear(), d.getMonth(), 1);
    const wd = s.getDay(); // 0=Sun
    s.setDate(s.getDate() - wd);
    s.setHours(0, 0, 0, 0);
    return s;
  }

  function renderMonth_() {
    const view = st.viewMonth;
    const wrap = slot.querySelector('#sp-plan-month-wrap');
    if (!wrap) return;
    const title = wrap.querySelector('.sp-plan-month__title');
    if (title) title.textContent = ym(view);

    const grid = wrap.querySelector('.sp-plan-month__grid');
    if (!grid) return;
    const start = monthStartSunday(view);
    const viewY = view.getFullYear();
    const viewM = view.getMonth();

    /** @type {string[]} */
    const wkMetaKo = [];
    let weekOrd = 0;
    const ordWords = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'];
    for (let ww = 0; ww < 6; ww++) {
      const su = new Date(start.getFullYear(), start.getMonth(), start.getDate() + ww * 7);
      let touches = false;
      for (let di = 0; di < 7; di++) {
        const dd = new Date(su.getFullYear(), su.getMonth(), su.getDate() + di);
        if (dd.getFullYear() === viewY && dd.getMonth() === viewM) touches = true;
      }
      if (touches) {
        const word = ordWords[weekOrd] != null ? ordWords[weekOrd] : String(weekOrd + 1);
        wkMetaKo[ww] = String(viewM + 1) + '월 ' + word + '주';
        weekOrd++;
      } else {
        wkMetaKo[ww] = '';
      }
    }

    let html = '';
    for (let w = 0; w < 6; w++) {
      const sun = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7);
      const sat = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 6);
      html += '<div class="sp-plan-month__weekRow">';
      html +=
        '<div class="sp-plan-month__weekLead">' +
        '<div class="sp-plan-month__weekMeta" aria-label="주간 구간">' +
        '<div class="sp-plan-month__weekMeta-range">' +
        mdShort(sun) +
        ' – ' +
        mdShort(sat) +
        '</div>' +
        (wkMetaKo[w]
          ? '<div class="sp-plan-month__weekMeta-wk">' + esc(wkMetaKo[w]) + '</div>'
          : '') +
        '</div>' +
        plannerCurriculumWeekTableHtml_(
          plannerCurriculumWeekPayloadForRender_(
            w,
            [
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 0)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 1)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 2)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 3)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 4)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 5)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 6))
            ],
            st.plannerCurriculum,
            st
          )
        ) +
        '</div>';

      for (let di = 0; di < 7; di++) {
        const d = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + di);
        const inMonth = d.getFullYear() === viewY && d.getMonth() === viewM;
        const key = ymd(d);
        const wkCls = di === 0 ? ' is-sun' : di === 6 ? ' is-sat' : '';
        const apiN = st.byDate[key] || 0;
        const mn = plannerManualTodosCountForDay_(st, key);
        const qn = mn;
        const badge = plannerCalendarUserTodoCountForBadge_(st, key);
        const asg = plannerAssignedMinutesForDay_(st, key) > 0 ? 1 : 0;
        const memoIcon = plannerDayMemoIconHtml_(st, key);
        let dots = '';
        if (apiN) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--api" title="일정"></span>';
        if (qn) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--quick" title="빠른등록"></span>';
        if (mn) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--manual" title="개별 등록"></span>';
        if (asg) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--assign" title="시간표"></span>';
        html += `
        <button type="button" class="sp-plan-day${wkCls}${inMonth ? '' : ' is-out'}${memoIcon ? ' has-memo' : ''}" data-ymd="${key}" ${inMonth ? '' : 'disabled'}>
          <div class="sp-plan-day__top">
            <span class="sp-plan-day__dateHead">
              <span class="sp-plan-day__num">${d.getDate()}</span>${memoIcon}
            </span>
            ${badge ? `<span class="sp-plan-day__badge" aria-label="요약 ${badge}건">${badge}</span>` : ''}
          </div>
          <div class="sp-plan-day__dots" aria-hidden="true">${dots}</div>
          ${plannerQuickPlanCellSummaryHtml_(st, key)}
          ${plannerFixedScheduleFooterHtml_(st, key)}
        </button>`;
      }
      html += '</div>';
    }
    grid.innerHTML = html;
    plannerRefreshPostPreview_(root);
  }

  function plannerEnsureDayModalSaveActions_(modalEl) {
    if (!modalEl || modalEl.querySelector('#sp-plan-day-save')) return;
    const memoBlock = modalEl.querySelector('.sp-plan-day__memo');
    if (!memoBlock) return;
    memoBlock.insertAdjacentHTML(
      'afterend',
      '<div class="sp-plan-day__actions" aria-label="일일 저장">' +
        '<button type="button" class="btn btn--primary" id="sp-plan-day-save">저장하기</button>' +
        '<span class="sp-plan-day__applyMsg" id="sp-plan-day-apply-msg" hidden></span>' +
        '</div>'
    );
  }

  function ensureModal_() {
    const existingModal = root.querySelector('#sp-plan-day-modal');
    if (existingModal) {
      plannerEnsureDayModalSaveActions_(existingModal);
      return;
    }
    const el = document.createElement('div');
    el.id = 'sp-plan-day-modal';
    el.className = 'sp-plan-modal';
    el.setAttribute('hidden', 'hidden');
    el.innerHTML = `
      <div class="sp-plan-modal__backdrop" data-sp-plan-close="1"></div>
      <div class="sp-plan-modal__panel" role="dialog" aria-modal="true" aria-labelledby="sp-plan-day-modal-title">
        <div class="sp-plan-modal__head">
          <div class="sp-plan-modal__title" id="sp-plan-day-modal-title">오늘의 학습</div>
          <button type="button" class="btn btn--ghost sp-plan-modal__close" data-sp-plan-close="1">닫기</button>
        </div>
        <div class="sp-plan-modal__body">
          <div class="sp-plan-day sp-plan-day--daily">
            <section class="sp-plan-day__timeline" aria-label="할 일·시간표">
              <div class="sp-plan-day__secTitle">할 일과 학습 시간</div>
              <div class="sp-plan-day__split" role="presentation">
                <aside class="sp-plan-day__splitCol sp-plan-day__splitCol--todos" aria-label="할 일 요약">
                  <div class="sp-plan-day__splitColHead">할 일</div>
                  <div id="sp-plan-day-todo-side" class="sp-plan-day__todoSideSlot"></div>
                </aside>
                <div class="sp-plan-day__splitCol sp-plan-day__splitCol--time" aria-label="시간표 영역">
                  <div class="sp-plan-day__splitColHead">시간표</div>
                  <div class="sp-plan-day__timegrid sp-plan-day__timegrid--hourly" id="sp-plan-day-timegrid" role="group" aria-label="10분 단위 시간표"></div>
                </div>
              </div>
              <div id="sp-plan-day-study-footer" class="sp-plan-day__studyFooter" aria-live="polite"></div>
              <div class="sp-plan-day__memo" aria-label="일일 메모">
                <div class="sp-plan-day__memoHead">메모</div>
                <textarea id="sp-plan-day-memo" class="sp-plan-day__memoTa" rows="4" maxlength="3000" spellcheck="true" placeholder="오늘 기억할 내용을 적어 주세요."></textarea>
              </div>
            </section>
          </div>
          <div class="sp-plan-lock" id="sp-plan-day-lock" hidden>
            <div class="sp-plan-lock__card">
              <div class="sp-plan-lock__title">수강 확인 후 이용할 수 있습니다</div>
              <div class="sp-plan-lock__desc">날짜별 할 일과 시간표는 수강이 확인된 회원에게 제공됩니다.</div>
              <button type="button" id="sp-plan-lock-buy" class="btn btn--primary sp-plan-lock__cta">솔패스 안내</button>
            </div>
          </div>
        </div>
      </div>`;
    root.appendChild(el);
    plannerEnsureDayModalSaveActions_(el);
    function plannerGuestUnlockBuy_() {
      const st0 = root.__spPlanState;
      if (st0 && typeof st0 === 'object') {
        st0.planGuestUnlockMock = true;
      }
      const lockEl = el.querySelector('#sp-plan-day-lock');
      if (lockEl) {
        lockEl.setAttribute('hidden', 'hidden');
        lockEl.setAttribute('aria-hidden', 'true');
      }
    }
    const buyBtn = el.querySelector('#sp-plan-lock-buy');
    if (buyBtn) {
      buyBtn.addEventListener(
        'click',
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          plannerGuestUnlockBuy_();
        },
        true
      );
    }
    el.addEventListener('click', function (e) {
      let t = /** @type {Node|null} */ (e.target);
      if (!t) return;
      if (t.nodeType === 3 && t.parentNode) t = t.parentNode;
      const h = t instanceof HTMLElement ? t : null;
      if (!h) return;
      if (h.getAttribute && h.getAttribute('data-sp-plan-close') === '1') {
        closeDayModal_();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const m = root.querySelector('#sp-plan-day-modal');
        if (m && !m.hasAttribute('hidden')) {
          closeDayModal_();
        }
      }
    });
    wirePlannerDayModalUiOnce_(el, root);
  }

  function openDayModal_(dateYmd) {
    ensureModal_();
    const m = root.querySelector('#sp-plan-day-modal');
    if (!m) return;
    st.selectedDate = String(dateYmd || '');
    if (st.modalBrushTodoId) {
      const brushId = String(st.modalBrushTodoId);
      const brushRow = plannerMonthTodosForDay_(st, st.selectedDate).find(function (r) {
        return r && String(r.task_id || '') === brushId;
      });
      if (
        brushRow &&
        (String(brushRow.category || '').trim() === PLAN_CATEGORY_FIXED ||
          String(brushRow.category || '').trim() === 'memo')
      ) {
        st.modalBrushTodoId = '';
      }
    }
    plannerInvalidateDayTimelineCache_(st, st.selectedDate);
    const title = m.querySelector('#sp-plan-day-modal-title');
    if (title) title.textContent = st.selectedDate ? st.selectedDate + ' · 일일 플래너' : '일일 플래너';
    const todoSide = m.querySelector('#sp-plan-day-todo-side');
    if (todoSide) todoSide.innerHTML = plannerDayTodosFromPayloadHtml_(st.selectedDate, st);
    const timegrid = m.querySelector('#sp-plan-day-timegrid');
    if (timegrid) {
      timegrid.innerHTML = plannerDayTimelineHtml_(st, st.selectedDate);
      plannerRovingTabindexSlotcells_(timegrid);
    }
    plannerRefreshDayModalStudyFooter_(root);
    const memo = m.querySelector('#sp-plan-day-memo');
    if (memo instanceof HTMLTextAreaElement) {
      if (!st.dayMemoByDate) st.dayMemoByDate = {};
      let mv = '';
      plannerMonthTodosForDay_(st, st.selectedDate).forEach(function (r) {
        if (!r || String(r.category || '').trim() !== 'memo') return;
        const t = String(r.title != null ? r.title : '').trim();
        if (t) mv = t;
      });
      if (!mv && st.dayMemoByDate[st.selectedDate] != null) {
        mv = String(st.dayMemoByDate[st.selectedDate]);
      }
      st.dayMemoByDate[st.selectedDate] = mv;
      memo.value = mv;
    }
    m.removeAttribute('hidden');
    const lock = m.querySelector('#sp-plan-day-lock');
    if (lock) {
      if (st.planGuestUnlockMock) {
        lock.setAttribute('hidden', 'hidden');
        lock.setAttribute('aria-hidden', 'true');
      } else if (st.role === 'guest') {
        lock.removeAttribute('hidden');
        lock.removeAttribute('aria-hidden');
      } else {
        lock.setAttribute('hidden', 'hidden');
        lock.setAttribute('aria-hidden', 'true');
      }
    }
  }

  function closeDayModal_() {
    const m = root.querySelector('#sp-plan-day-modal');
    if (!m) return;
    m.setAttribute('hidden', 'hidden');
  }

  const vmMan = st.viewMonth;
  const defManDue =
    vmMan instanceof Date && !isNaN(Number(vmMan.getTime()))
      ? plannerYmdFromParts_(vmMan.getFullYear(), vmMan.getMonth(), 1)
      : plannerYmdFromParts_(new Date().getFullYear(), new Date().getMonth(), 1);

  const fixedTimeOptsStart = plannerFixedTimelineSelectOptionsHtml_(false);
  const fixedTimeOptsEnd = plannerFixedTimelineSelectOptionsHtml_(true);
  slot.innerHTML =
    '<div class="sp-plan-calstack">' +
    '<section class="sp-plan-todoReg sp-plan-quick' +
    (st.quickRegCollapsed ? ' is-collapsed' : '') +
    '" id="sp-plan-quick-reg" aria-label="할 일 등록">' +
    '<header class="sp-plan-todoReg__outerHead sp-plan-quick__head">' +
    '<div class="sp-plan-quick__headL">' +
    '<button type="button" class="sp-plan-quick__collapse" id="sp-quick-toggle" aria-expanded="' +
    (st.quickRegCollapsed ? 'false' : 'true') +
    '" aria-controls="sp-plan-todo-reg-body" title="할 일 등록 영역 접기·펼치기">' +
    '<span class="sp-plan-quick__chev" aria-hidden="true">▼</span>' +
    '</button>' +
    '<div class="sp-plan-todoReg__headMain">' +
    '<span class="sp-plan-todoReg__outerTitle">할 일 등록</span>' +
    '<span class="sp-plan-todoReg__outerSub">한 달 일정을 빠르게 채우거나 날짜별로 추가합니다.</span>' +
    '</div></div></header>' +
    '<div id="sp-plan-todo-reg-body" class="sp-plan-quick__body sp-plan-todoReg__scroll">' +
    '<div class="sp-plan-todoReg__panel sp-plan-todoReg__panel--quick">' +
    '<div class="sp-plan-todoReg__panelHead">' +
    '<span class="sp-plan-todoReg__panelBadge" aria-hidden="true">빠른</span>' +
    '<div class="sp-plan-todoReg__panelHeadText">' +
    '<h3 class="sp-plan-todoReg__panelTitle">빠른 등록</h3>' +
    '<p class="sp-plan-todoReg__panelSub">강좌와 회차 범위를 고른 뒤, 선택한 요일에 나눠 넣습니다. 요일별 강 수를 비우면 균등하게 배분합니다.</p>' +
    '</div></div>' +
    '<p class="sp-plan-quick__err" id="sp-plan-quick-err" hidden></p>' +
    '<p class="sp-plan-curr__hint" id="sp-quick-catalog-hint" hidden></p>' +
    '<div class="sp-plan-quick__row sp-plan-quick__row--stack">' +
    '<span class="sp-plan-quick__lbl">요일·강 수</span>' +
    '<div class="sp-plan-quick__dowGrid" role="group" aria-label="요일">' +
    '<div class="sp-plan-quick__dowItem"><label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="1"/>월</label><input type="text" class="sp-plan-quick__dowCnt" data-dow="1" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="강 수" hidden/></div>' +
    '<div class="sp-plan-quick__dowItem"><label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="2"/>화</label><input type="text" class="sp-plan-quick__dowCnt" data-dow="2" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="강 수" hidden/></div>' +
    '<div class="sp-plan-quick__dowItem"><label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="3"/>수</label><input type="text" class="sp-plan-quick__dowCnt" data-dow="3" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="강 수" hidden/></div>' +
    '<div class="sp-plan-quick__dowItem"><label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="4"/>목</label><input type="text" class="sp-plan-quick__dowCnt" data-dow="4" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="강 수" hidden/></div>' +
    '<div class="sp-plan-quick__dowItem"><label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="5"/>금</label><input type="text" class="sp-plan-quick__dowCnt" data-dow="5" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="강 수" hidden/></div>' +
    '<div class="sp-plan-quick__dowItem"><label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="6"/>토</label><input type="text" class="sp-plan-quick__dowCnt" data-dow="6" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="강 수" hidden/></div>' +
    '<div class="sp-plan-quick__dowItem"><label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="0"/>일</label><input type="text" class="sp-plan-quick__dowCnt" data-dow="0" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="강 수" hidden/></div>' +
    '</div></div>' +
    '<div class="sp-plan-manual__grid sp-plan-manual__grid--quick">' +
    '<label class="sp-plan-manual__lbl">과목<select id="sp-quick-subj" class="sp-plan-manual__select sp-plan-manual__control--fit" data-sp-fit-ph="과목 선택"></select></label>' +
    '<label class="sp-plan-manual__lbl">선생님<select id="sp-quick-instructor" class="sp-plan-manual__select sp-plan-manual__control--fit" data-sp-fit-ph="선생님 선택"></select></label>' +
    '<label class="sp-plan-manual__lbl">강좌명<select id="sp-quick-course" class="sp-plan-manual__select sp-plan-manual__control--fit" data-sp-fit-ph="강좌명 선택"></select></label>' +
    '<label class="sp-plan-manual__lbl">시작<select id="sp-quick-lec-from" class="sp-plan-manual__select sp-plan-manual__control--fit" data-sp-fit-ph="시작 회차"></select></label>' +
    '<label class="sp-plan-manual__lbl">끝<select id="sp-quick-lec-to" class="sp-plan-manual__select sp-plan-manual__control--fit" data-sp-fit-ph="끝 회차"></select></label>' +
    '</div>' +
    '<div class="sp-plan-quick__applyRow">' +
    '<button type="button" class="btn btn--primary sp-plan-quick__apply" id="sp-quick-apply">이 달에 반영</button>' +
    '<button type="button" class="btn btn--ghost sp-plan-quick__clear" id="sp-quick-clear">이 달 추가분 지우기</button>' +
    '</div></div>' +
    '<div class="sp-plan-todoReg__panel sp-plan-todoReg__panel--fixed" id="sp-plan-fixed-reg" aria-label="고정 일정">' +
    '<div class="sp-plan-todoReg__panelHead">' +
    '<span class="sp-plan-todoReg__panelBadge sp-plan-todoReg__panelBadge--fixed" aria-hidden="true">고정</span>' +
    '<div class="sp-plan-todoReg__panelHeadText">' +
    '<h3 class="sp-plan-todoReg__panelTitle">고정 일정</h3>' +
    '<p class="sp-plan-todoReg__panelSub">매주 같은 요일·시간에 반복되는 일정입니다. 해당 시간은 시간표에서 사용할 수 없습니다.</p>' +
    '</div></div>' +
    '<p class="sp-plan-quick__err" id="sp-plan-fixed-err" hidden></p>' +
    '<div class="sp-plan-quick__row sp-plan-quick__row--horiz">' +
    '<span class="sp-plan-quick__lbl">요일</span>' +
    '<div class="sp-plan-quick__chks" role="group" aria-label="고정 일정 요일">' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-fixed-dow" value="1"/>월</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-fixed-dow" value="2"/>화</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-fixed-dow" value="3"/>수</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-fixed-dow" value="4"/>목</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-fixed-dow" value="5"/>금</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-fixed-dow" value="6"/>토</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-fixed-dow" value="0"/>일</label>' +
    '</div></div>' +
    '<div class="sp-plan-fixed__nameRow">' +
    '<label class="sp-plan-fixed__nameLbl"><span class="sp-plan-quick__lbl">일정 이름</span>' +
    '<input type="text" id="sp-fixed-title" class="sp-plan-manual__input" maxlength="200" placeholder="예: 학원 수업" autocomplete="off"/></label>' +
    '</div>' +
    '<div class="sp-plan-quick__row sp-plan-quick__row--horiz">' +
    '<span class="sp-plan-quick__lbl">시간</span>' +
    '<div class="sp-plan-fixed__timeSelects">' +
    '<label class="sp-plan-fixed__timeLbl">시작<select id="sp-fixed-start" class="sp-plan-manual__select">' +
    fixedTimeOptsStart +
    '</select></label>' +
    '<label class="sp-plan-fixed__timeLbl">끝<select id="sp-fixed-end" class="sp-plan-manual__select">' +
    fixedTimeOptsEnd +
    '</select></label>' +
    '</div></div>' +
    '<div class="sp-plan-fixed__applyRow">' +
    '<button type="button" class="btn btn--primary" id="sp-fixed-apply">이 달에 반영</button>' +
    '</div></div>' +
    '<div class="sp-plan-todoReg__panel sp-plan-todoReg__panel--manual" id="sp-plan-manual-reg" aria-label="개별 등록">' +
    '<div class="sp-plan-todoReg__panelHead">' +
    '<span class="sp-plan-todoReg__panelBadge sp-plan-todoReg__panelBadge--manual" aria-hidden="true">개별</span>' +
    '<div class="sp-plan-todoReg__panelHeadText">' +
    '<h3 class="sp-plan-todoReg__panelTitle">개별 등록</h3>' +
    '<p class="sp-plan-todoReg__panelSub">제목을 직접 쓰거나, 등록된 강좌·회차를 골라 한 건씩 추가합니다.</p>' +
    '</div></div>' +
    '<p class="sp-plan-manual__err" id="sp-plan-manual-err" hidden></p>' +
    '<p class="sp-plan-manual__err sp-plan-manual__err--curr" id="sp-plan-curr-err" hidden></p>' +
    '<p class="sp-plan-curr__hint" id="sp-curr-catalog-hint" hidden></p>' +
    '<div class="sp-plan-manual__mode" role="group" aria-label="개별 등록 방식">' +
    '<button type="button" class="btn btn--ghost sp-plan-manual__modeBtn is-active" id="sp-manual-mode-direct" aria-pressed="true">직접 입력</button>' +
    '<button type="button" class="btn btn--ghost sp-plan-manual__modeBtn" id="sp-manual-mode-curriculum" aria-pressed="false">커리큘럼</button>' +
    '</div>' +
    '<div id="sp-plan-manual-direct" class="sp-plan-manual__block">' +
    '<div class="sp-plan-manual__grid">' +
    '<label class="sp-plan-manual__lbl">제목<input type="text" id="sp-manual-title" class="sp-plan-manual__input" maxlength="200" placeholder="예: 모의고사 오답" autocomplete="off"/></label>' +
    '<label class="sp-plan-manual__lbl">날짜<input type="date" id="sp-manual-due" class="sp-plan-manual__input" value="' +
    esc(defManDue) +
    '"/></label>' +
    '<label class="sp-plan-manual__lbl">과목<select id="sp-manual-cat" class="sp-plan-manual__select">' +
    '<option value="vocab">어휘</option><option value="grammar">문법</option><option value="logic">논리</option><option value="read">독해</option><option value="misc" selected>기타</option></select></label>' +
    '</div>' +
    '<button type="button" class="btn btn--primary sp-plan-manual__add" id="sp-manual-add">할 일 추가</button>' +
    '</div>' +
    '<div id="sp-plan-manual-curriculum" class="sp-plan-manual__block" hidden>' +
    '<div class="sp-plan-manual__grid sp-plan-manual__grid--curr">' +
    '<label class="sp-plan-manual__lbl">과목<select id="sp-curr-subj" class="sp-plan-manual__select sp-plan-manual__control--fit" data-sp-fit-ph="과목 선택"></select></label>' +
    '<label class="sp-plan-manual__lbl">선생님<select id="sp-curr-instructor" class="sp-plan-manual__select sp-plan-manual__control--fit" data-sp-fit-ph="선생님 선택"></select></label>' +
    '<label class="sp-plan-manual__lbl">강좌명<select id="sp-curr-course" class="sp-plan-manual__select sp-plan-manual__control--fit" data-sp-fit-ph="강좌명 선택"></select></label>' +
    '<label class="sp-plan-manual__lbl">회차<select id="sp-curr-lecture" class="sp-plan-manual__select sp-plan-manual__control--fit" data-sp-fit-ph="회차 선택"></select></label>' +
    '<label class="sp-plan-manual__lbl">날짜<input type="date" id="sp-curr-due" class="sp-plan-manual__input" value="' +
    esc(defManDue) +
    '"/></label>' +
    '<label class="sp-plan-manual__lbl sp-plan-manual__lbl--preview">제목<input type="text" id="sp-curr-title-preview" class="sp-plan-manual__input sp-plan-manual__control--fit" readonly tabindex="-1" aria-readonly="true" data-sp-fit-ph="회차를 선택하면 자동 입력" placeholder="회차를 선택하면 자동 입력"/></label>' +
    '</div>' +
    '<button type="button" class="btn btn--primary sp-plan-manual__add" id="sp-curr-add">할 일 추가</button>' +
    '</div></div>' +
    '<div class="sp-plan-quick__postPreview sp-plan-todoReg__postPreview">' +
    '<div class="sp-plan-quick__postActions">' +
    '<button type="button" class="btn btn--primary" id="sp-plan-todos-apply">일정 저장하기</button>' +
    '<span class="sp-plan-quick__applyMsg" id="sp-plan-todos-apply-msg" hidden></span>' +
    '</div>' +
    '<pre class="sp-plan-quick__postPre" id="sp-plan-post-preview" hidden aria-hidden="true"></pre>' +
    '</div></div></section>' +
    '<div class="sp-plan-month" id="sp-plan-month-wrap">' +
    '<div class="sp-plan-month__head">' +
    '<button type="button" class="btn btn--ghost sp-plan-month__nav" data-nav="-1" aria-label="이전 달">‹</button>' +
    '<div class="sp-plan-month__title">' +
    ym(st.viewMonth) +
    '</div>' +
    '<button type="button" class="btn btn--ghost sp-plan-month__nav" data-nav="1" aria-label="다음 달">›</button>' +
    '</div>' +
    '<div class="sp-plan-month__actions" role="group" aria-label="월간 일정 저장·삭제">' +
    '<button type="button" class="btn btn--primary" id="sp-plan-month-save">일정 저장하기</button>' +
    '<button type="button" class="btn btn--ghost" id="sp-plan-month-clear">일정 삭제하기</button>' +
    '<span class="sp-plan-month__applyMsg" id="sp-plan-month-apply-msg" hidden></span>' +
    '</div>' +
    '<div class="sp-plan-month__dow" role="row" aria-label="요일">' +
    '<div class="sp-plan-month__dowCorner" aria-hidden="true">주간 안내</div>' +
    '<div class="sp-plan-month__dowCell is-sun">SUN</div>' +
    '<div class="sp-plan-month__dowCell">MON</div>' +
    '<div class="sp-plan-month__dowCell">TUE</div>' +
    '<div class="sp-plan-month__dowCell">WED</div>' +
    '<div class="sp-plan-month__dowCell">THU</div>' +
    '<div class="sp-plan-month__dowCell">FRI</div>' +
    '<div class="sp-plan-month__dowCell is-sat">SAT</div>' +
    '</div>' +
    '<div class="sp-plan-month__grid" role="grid" aria-label="월간 달력"></div>' +
    '</div></div>';

  renderMonth_();

  const fss0 = slot.querySelector('#sp-fixed-start');
  const fse0 = slot.querySelector('#sp-fixed-end');
  if (fss0 instanceof HTMLSelectElement) fss0.selectedIndex = 0;
  if (fse0 instanceof HTMLSelectElement) {
    const o6 = fse0.querySelector('option[value="6"]');
    if (o6 instanceof HTMLOptionElement) fse0.value = '6';
    else if (fse0.options.length) fse0.selectedIndex = Math.min(2, fse0.options.length - 1);
  }

  plannerSetManualRegMode_(slot, st, st.manualRegMode === 'curriculum' ? 'curriculum' : 'direct');
  plannerQuickCurriculumRefreshCascade_(slot, st, 'all');
  plannerControlFitSyncWidthsIn_(slot);
  plannerQuickSyncDowCountInputs_(slot);

  if (!slot.__spPlanCalWired) {
    slot.__spPlanCalWired = true;
    slot.addEventListener('click', function (e) {
      const t = /** @type {HTMLElement|null} */ (e.target instanceof HTMLElement ? e.target : null);
      if (!t) return;
      const ctxDel = t.closest ? t.closest('[data-sp-ctx-action="delete"]') : null;
      if (ctxDel && slot.__spPlanCtxMenu) {
        e.preventDefault();
        e.stopPropagation();
        const pending = slot.__spPlanCtxMenu;
        void plannerDeleteTodosFromCalendar_(root, pending.ymd, pending.taskIds.slice());
        return;
      }
      const ctxMenuEl = slot.querySelector('#sp-plan-todo-ctx-menu');
      if (ctxMenuEl && !ctxMenuEl.hasAttribute('hidden') && !t.closest('#sp-plan-todo-ctx-menu')) {
        plannerHideTodoContextMenu_(slot);
      }
      const quickToggle = t.id === 'sp-quick-toggle' ? t : t.closest ? t.closest('#sp-quick-toggle') : null;
      if (quickToggle) {
        const sec = slot.querySelector('#sp-plan-quick-reg');
        const btn = slot.querySelector('#sp-quick-toggle');
        if (sec && btn) {
          const nowCollapsed = sec.classList.toggle('is-collapsed');
          st.quickRegCollapsed = nowCollapsed;
          btn.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
          if (!nowCollapsed) {
            const bodyEl = sec.querySelector('#sp-plan-todo-reg-body');
            if (bodyEl instanceof HTMLElement) {
              bodyEl.scrollTop = 0;
              requestAnimationFrame(function () {
                bodyEl.scrollTop = 0;
              });
            }
          }
        }
        return;
      }
      const quickApply = t.id === 'sp-quick-apply' ? t : t.closest ? t.closest('#sp-quick-apply') : null;
      const quickClear = t.id === 'sp-quick-clear' ? t : t.closest ? t.closest('#sp-quick-clear') : null;
      if (quickApply || quickClear) {
        const errEl = slot.querySelector('#sp-plan-quick-err');
        const qr = slot.querySelector('#sp-plan-quick-reg');
        if (quickApply && qr) {
          if (errEl) {
            errEl.textContent = '';
            errEl.setAttribute('hidden', 'hidden');
          }
          const weekdays = [];
          qr.querySelectorAll('input[name="sp-dow"]:checked').forEach(function (cb) {
            weekdays.push(Number(/** @type {HTMLInputElement} */ (cb).value));
          });
          const courseEl = slot.querySelector('#sp-quick-course');
          const fromEl = slot.querySelector('#sp-quick-lec-from');
          const toEl = slot.querySelector('#sp-quick-lec-to');
          const courseId =
            courseEl && 'value' in courseEl ? String(/** @type {HTMLSelectElement} */ (courseEl).value).trim() : '';
          const fromL = fromEl && 'value' in fromEl ? Number(/** @type {HTMLSelectElement} */ (fromEl).value) : 1;
          const toL = toEl && 'value' in toEl ? Number(/** @type {HTMLSelectElement} */ (toEl).value) : 1;
          const countByDow = plannerQuickReadCountByDow_(slot);
          const msg = plannerApplyQuickCurriculumToMonthTodos_(
            st,
            st.viewMonth,
            weekdays,
            courseId,
            fromL,
            toL,
            countByDow
          );
          if (msg) {
            if (errEl) {
              errEl.textContent = msg;
              errEl.removeAttribute('hidden');
            }
            return;
          }
          plannerRefreshPostPreview_(root);
          renderMonth_();
          const modal = root.querySelector('#sp-plan-day-modal');
          if (modal && st.selectedDate && !modal.hasAttribute('hidden')) {
            if (st.dayTimelineTodoByDate) {
              try {
                delete st.dayTimelineTodoByDate[st.selectedDate];
              } catch (_e) {
                st.dayTimelineTodoByDate[st.selectedDate] = {};
              }
            }
            openDayModal_(st.selectedDate);
          }
        }
        if (quickClear) {
          plannerClearQuickPlanForMonth_(st, st.viewMonth);
          plannerRefreshPostPreview_(root);
          renderMonth_();
          if (errEl) {
            errEl.textContent = '';
            errEl.setAttribute('hidden', 'hidden');
          }
          const modal = root.querySelector('#sp-plan-day-modal');
          if (modal && st.selectedDate && !modal.hasAttribute('hidden')) {
            if (st.dayTimelineTodoByDate) {
              try {
                delete st.dayTimelineTodoByDate[st.selectedDate];
              } catch (_e) {
                st.dayTimelineTodoByDate[st.selectedDate] = {};
              }
            }
            openDayModal_(st.selectedDate);
          }
        }
        return;
      }
      const fixedApply = t.id === 'sp-fixed-apply' ? t : t.closest ? t.closest('#sp-fixed-apply') : null;
      if (fixedApply) {
        const errF = slot.querySelector('#sp-plan-fixed-err');
        const box = slot.querySelector('#sp-plan-fixed-reg');
        if (errF) {
          errF.textContent = '';
          errF.setAttribute('hidden', 'hidden');
        }
        const titleEl = slot.querySelector('#sp-fixed-title');
        const startEl = slot.querySelector('#sp-fixed-start');
        const endEl = slot.querySelector('#sp-fixed-end');
        const title =
          titleEl && 'value' in titleEl ? String(/** @type {HTMLInputElement} */ (titleEl).value).trim() : '';
        const weekdays = [];
        if (box) {
          box.querySelectorAll('input[name="sp-fixed-dow"]:checked').forEach(function (cb) {
            weekdays.push(Number(/** @type {HTMLInputElement} */ (cb).value));
          });
        }
        const sIx = startEl && 'value' in startEl ? String(/** @type {HTMLSelectElement} */ (startEl).value) : '';
        const eIx = endEl && 'value' in endEl ? String(/** @type {HTMLSelectElement} */ (endEl).value) : '';
        const msg = plannerApplyFixedScheduleForMonth_(st, st.viewMonth, weekdays, title, Number(sIx), Number(eIx));
        if (errF) {
          if (msg) {
            errF.textContent = msg;
            errF.removeAttribute('hidden');
          } else {
            errF.textContent = '';
            errF.setAttribute('hidden', 'hidden');
          }
        }
        plannerRefreshPostPreview_(root);
        renderMonth_();
        const modalF = root.querySelector('#sp-plan-day-modal');
        if (modalF && st.selectedDate && !modalF.hasAttribute('hidden')) {
          if (st.dayTimelineTodoByDate) {
            try {
              delete st.dayTimelineTodoByDate[st.selectedDate];
            } catch (_e) {
              st.dayTimelineTodoByDate[st.selectedDate] = {};
            }
          }
          openDayModal_(st.selectedDate);
        }
        return;
      }
      const modeDirect =
        t.id === 'sp-manual-mode-direct' ? t : t.closest ? t.closest('#sp-manual-mode-direct') : null;
      const modeCurr =
        t.id === 'sp-manual-mode-curriculum' ? t : t.closest ? t.closest('#sp-manual-mode-curriculum') : null;
      if (modeDirect) {
        plannerSetManualRegMode_(slot, st, 'direct');
        return;
      }
      if (modeCurr) {
        plannerSetManualRegMode_(slot, st, 'curriculum');
        return;
      }
      const manualAdd = t.id === 'sp-manual-add' ? t : t.closest ? t.closest('#sp-manual-add') : null;
      if (manualAdd) {
        const errM = slot.querySelector('#sp-plan-manual-err');
        const msg = plannerAppendManualTodoFromForm_(slot, st);
        if (errM) {
          if (msg) {
            errM.textContent = msg;
            errM.removeAttribute('hidden');
          } else {
            errM.textContent = '';
            errM.setAttribute('hidden', 'hidden');
          }
        }
        plannerRefreshPostPreview_(root);
        renderMonth_();
        const modal2 = root.querySelector('#sp-plan-day-modal');
        if (modal2 && st.selectedDate && !modal2.hasAttribute('hidden')) {
          openDayModal_(st.selectedDate);
        }
        return;
      }
      const currAdd = t.id === 'sp-curr-add' ? t : t.closest ? t.closest('#sp-curr-add') : null;
      if (currAdd) {
        const errC = slot.querySelector('#sp-plan-curr-err');
        const msgC = plannerAppendCurriculumTodoFromForm_(slot, st);
        if (errC) {
          if (msgC) {
            errC.textContent = msgC;
            errC.removeAttribute('hidden');
          } else {
            errC.textContent = '';
            errC.setAttribute('hidden', 'hidden');
          }
        }
        plannerRefreshPostPreview_(root);
        renderMonth_();
        const modalC = root.querySelector('#sp-plan-day-modal');
        if (modalC && st.selectedDate && !modalC.hasAttribute('hidden')) {
          openDayModal_(st.selectedDate);
        }
        return;
      }
      const nav = t.closest ? t.closest('[data-nav]') : null;
      if (nav && nav.getAttribute) {
        const step = Number(nav.getAttribute('data-nav')) || 0;
        if (step) {
          st.viewMonth = new Date(st.viewMonth.getFullYear(), st.viewMonth.getMonth() + step, 1);
          renderMonth_();
          void plannerRefetchBootstrapForViewMonth_(root);
        }
        return;
      }
      const memoOpen = t.closest ? t.closest('[data-sp-open-memo]') : null;
      if (memoOpen) {
        e.preventDefault();
        e.stopPropagation();
        const dayBtn = t.closest('.sp-plan-day');
        const key = dayBtn && dayBtn.getAttribute ? dayBtn.getAttribute('data-ymd') || '' : '';
        if (key) {
          openDayModal_(key);
          requestAnimationFrame(function () {
            const ta = root.querySelector('#sp-plan-day-memo');
            if (ta instanceof HTMLTextAreaElement) ta.focus();
          });
        }
        return;
      }
      const btn = t.closest ? t.closest('.sp-plan-day') : null;
      if (btn && btn.getAttribute && !btn.hasAttribute('disabled')) {
        const key = btn.getAttribute('data-ymd') || '';
        if (key) {
          openDayModal_(key);
        }
      }
    });
    slot.addEventListener('change', function (e) {
      const t = e.target;
      if (t instanceof HTMLInputElement && t.name === 'sp-dow') {
        plannerQuickSyncDowCountInputs_(slot);
        return;
      }
      if (!(t instanceof HTMLSelectElement)) return;
      const id = t.id || '';
      if (id === 'sp-curr-subj') {
        plannerCurriculumRefreshCascade_(slot, st, 'subject');
      } else if (id === 'sp-curr-instructor') {
        plannerCurriculumRefreshCascade_(slot, st, 'instructor');
      } else if (id === 'sp-curr-course') {
        plannerCurriculumRefreshCascade_(slot, st, 'course');
      } else if (id === 'sp-curr-lecture') {
        plannerCurriculumRefreshCascade_(slot, st, 'preview');
      } else if (id === 'sp-quick-subj') {
        plannerQuickCurriculumRefreshCascade_(slot, st, 'subject');
      } else if (id === 'sp-quick-instructor') {
        plannerQuickCurriculumRefreshCascade_(slot, st, 'instructor');
      } else if (id === 'sp-quick-course') {
        plannerQuickCurriculumRefreshCascade_(slot, st, 'course');
      } else if (id === 'sp-quick-lec-from' || id === 'sp-quick-lec-to') {
        plannerControlFitSyncWidth_(t);
      }
    });
    slot.addEventListener('contextmenu', function (e) {
      if (!root.__spPlanAdminMode) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (!t) return;
      const hit = t.closest('[data-sp-task-id]') || t.closest('[data-sp-task-ids]');
      if (!hit || !(hit instanceof HTMLElement)) return;
      const dayBtn = t.closest('.sp-plan-day');
      if (!dayBtn || dayBtn.hasAttribute('disabled')) return;
      const ymdKey = dayBtn.getAttribute('data-ymd') || '';
      const ids = plannerResolveTodoIdsFromContextTarget_(hit);
      if (!ymdKey || !ids.length) return;
      e.preventDefault();
      slot.__spPlanCtxMenu = { ymd: ymdKey, taskIds: ids };
      const menu = slot.querySelector('#sp-plan-todo-ctx-menu');
      if (!(menu instanceof HTMLElement)) return;
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
      menu.removeAttribute('hidden');
    });
  }

  root.__spPlanRerenderMonth = renderMonth_;
  root.__spPlanRefreshOpenDayModal = function () {
    const m = root.querySelector('#sp-plan-day-modal');
    if (m && st.selectedDate && !m.hasAttribute('hidden')) {
      openDayModal_(st.selectedDate);
    }
  };

  plannerApplyAdminVisibility_(root);
}

/**
 * @param {HTMLElement} root
 */
function wireGate_(root) {
  const btn = root.querySelector('#sp-plan-gate-submit');
  const errEl = root.querySelector('#sp-plan-gate-err');
  const nameInput = root.querySelector('#sp-plan-name');
  const gate = root.querySelector('.sp-plan-gate');
  const appMain = root.querySelector('#sp-plan-app-main');
  if (!btn || !gate || !appMain) return;

  wirePlanPhoneDigitsOnly_(root);

  const statusEl = root.querySelector('#sp-plan-gate-status');
  const phoneInputs = [
    root.querySelector('#sp-plan-p0'),
    root.querySelector('#sp-plan-p1'),
    root.querySelector('#sp-plan-p2')
  ];

  function showErr(msg) {
    if (!errEl) return;
    if (msg) {
      errEl.textContent = msg;
      errEl.removeAttribute('hidden');
    } else {
      errEl.textContent = '';
      errEl.setAttribute('hidden', 'hidden');
    }
  }

  /**
   * @param {boolean} on
   * @param {string} [statusText]
   */
  function setGateLoading_(on, statusText) {
    const msg = String(statusText != null ? statusText : '').trim();
    if (on) {
      root.classList.add('is-plan-gate-loading');
      gate.setAttribute('aria-busy', 'true');
      btn.setAttribute('disabled', 'disabled');
      if (msg) {
        btn.textContent = msg;
      }
      if (nameInput instanceof HTMLInputElement) {
        nameInput.disabled = true;
      }
      phoneInputs.forEach(function (inp) {
        if (inp instanceof HTMLInputElement) {
          inp.disabled = true;
        }
      });
      if (statusEl) {
        statusEl.textContent = msg || '처리 중…';
        statusEl.removeAttribute('hidden');
        statusEl.setAttribute('aria-busy', 'true');
      }
    } else {
      root.classList.remove('is-plan-gate-loading');
      gate.setAttribute('aria-busy', 'false');
      btn.removeAttribute('disabled');
      btn.textContent = '확인';
      if (nameInput instanceof HTMLInputElement) {
        nameInput.disabled = false;
      }
      phoneInputs.forEach(function (inp) {
        if (inp instanceof HTMLInputElement) {
          inp.disabled = false;
        }
      });
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.setAttribute('hidden', 'hidden');
        statusEl.setAttribute('aria-busy', 'false');
      }
    }
  }

  async function runBootstrap(memberCode, segs, name) {
    root.__spPlannerBootstrapCtx = {
      memberCode: memberCode || '',
      phoneSegments: Array.isArray(segs)
        ? segs.map(function (s) {
            return String(s != null ? s : '');
          })
        : ['', '', ''],
      name: name || ''
    };
    const stPre = root.__spPlanState;
    const ymDate =
      stPre && stPre.viewMonth instanceof Date && !isNaN(stPre.viewMonth.getTime())
        ? stPre.viewMonth
        : new Date();
    const boot = await plannerGasCall_({
      action: 'plannerBootstrap',
      phoneSegments: segs,
      name: name || '',
      memberCode: memberCode || '',
      year_month: plannerYearMonthFromDate_(ymDate)
    });
    if (!boot || !boot.ok) {
      const m = boot && boot.error && boot.error.message != null ? String(boot.error.message) : '일정을 불러오지 못했습니다.';
      showErr(m);
      return;
    }
    const d = /** @type {{ role?: string, common?: object[], personal?: object[] | null, student_profile?: Record<string, unknown>, curriculum?: unknown }} */ (
      boot.data || {}
    );
    gate.setAttribute('hidden', 'hidden');
    gate.setAttribute('aria-hidden', 'true');
    plannerRevealPlanMain_(root);
    renderCalendar_(root, {
      role: d.role || 'guest',
      common: d.common || [],
      personal: d.personal != null ? d.personal : null,
      curriculum: d.curriculum
    });
    renderPlannerStudentProfile_(root, d.student_profile);
  }

  btn.addEventListener('click', async function () {
    showErr('');
    const p0 = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-p0'));
    const p1 = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-p1'));
    const p2 = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-p2'));
    const segs = readPhoneSegments_([p0 && p0.value, p1 && p1.value, p2 && p2.value]);
    if (segs[0].length !== 3 || segs[1].length !== 4 || segs[2].length !== 4) {
      showErr('휴대전화를 11자리(앞 3 · 가운데 4 · 끝 4) 숫자로만 입력해 주세요.');
      if (p0 && segs[0].length < 3) p0.focus();
      else if (p1 && segs[1].length < 4) p1.focus();
      else if (p2) p2.focus();
      return;
    }
    const name = nameInput ? String(nameInput.value || '').trim() : '';

    setGateLoading_(true, '등록 여부 확인 중…');
    try {
      const res = await plannerGasCall_({
        action: 'plannerMatch',
        phoneSegments: segs,
        name: name
      });
      if (!res || !res.ok) {
        const m = res && res.error && res.error.message != null ? String(res.error.message) : '확인에 실패했습니다.';
        showErr(m);
        return;
      }
      const data = /** @type {{ outcome?: string, needName?: boolean, link_key?: string | null, memberCode?: string | null }} */ (
        res.data || {}
      );
      const oc = String(data.outcome || '');
      if (oc === 'need_name') {
        if (nameInput) {
          nameInput.focus();
        }
        showErr('같은 번호로 등록된 분이 여러 명입니다. 이름을 입력한 뒤 다시 확인을 눌러 주세요.');
        return;
      }
      const linkKey =
        data.link_key != null && String(data.link_key).trim()
          ? String(data.link_key).trim()
          : data.memberCode != null && String(data.memberCode).trim()
            ? String(data.memberCode).trim()
            : '';
      setGateLoading_(true, '플래너 불러오는 중…');
      if (oc === 'matched' && linkKey) {
        await runBootstrap(linkKey, segs, name);
        return;
      }
      await runBootstrap('', segs, name);
    } finally {
      setGateLoading_(false);
    }
  });
}

/**
 * @param {HTMLElement} root
 */
function wirePlanDevBar_(root) {
  const msg = root.querySelector('#sp-plan-dev-msg');
  const skipBtn = root.querySelector('#sp-plan-dev-skip-gate');
  const initBtn = root.querySelector('#sp-plan-dev-init');
  const resetBtn = root.querySelector('#sp-plan-dev-reset');
  const syncBtn = root.querySelector('#sp-plan-dev-sync');
  if (!skipBtn || !initBtn || !resetBtn || !syncBtn) return;

  function showDevMsg(text) {
    if (msg) msg.textContent = text || '';
  }

  skipBtn.addEventListener('click', function () {
    showDevMsg('제작용: 게이트 생략 · GAS 없이 원페이지만 표시');
    const gate = root.querySelector('.sp-plan-gate');
    const appMain = root.querySelector('#sp-plan-app-main');
    if (gate) {
      gate.setAttribute('hidden', 'hidden');
      gate.setAttribute('aria-hidden', 'true');
    }
    plannerRevealPlanMain_(root);
    renderCalendar_(root, { role: 'guest', common: [], personal: null });
    renderPlannerStudentProfile_(root, null);
  });

  initBtn.addEventListener('click', async function () {
    showDevMsg('');
    const r = await plannerGasCall_({ action: 'initPlannerMasterSheets' });
    if (!r || !r.ok) {
      const m = r && r.error && r.error.message != null ? String(r.error.message) : '마스터 준비에 실패했습니다.';
      showDevMsg(m);
      return;
    }
    const d = /** @type {{ plannerSpreadsheetUrl?: string, createdNew?: boolean, alreadyConfigured?: boolean }} */ (r.data || {});
    const url = d.plannerSpreadsheetUrl != null ? String(d.plannerSpreadsheetUrl) : '';
    let line = '';
    if (d.createdNew) {
      line = '새 플래너 마스터 파일을 만들었습니다.';
    } else if (d.alreadyConfigured) {
      line = '연결된 마스터를 열어 필요한 탭·헤더를 확인했습니다.';
    } else {
      line = '마스터 준비가 완료되었습니다.';
    }
    showDevMsg(line + (url ? ' ' + url : ''));
  });

  resetBtn.addEventListener('click', async function () {
    showDevMsg('');
    if (
      !confirm(
        '플래너 마스터에서 레지스트리·방문 기록·학생 링크(2행~)을 비우고, 연결된 학생용 스프레드시트를 모두 휴지통으로 보냅니다. 계속할까요?'
      )
    ) {
      return;
    }
    const r = await plannerGasCall_({ action: 'plannerDevFullReset' });
    if (!r || !r.ok) {
      const m = r && r.error && r.error.message != null ? String(r.error.message) : '초기화에 실패했습니다.';
      showDevMsg(m);
      return;
    }
    const d = /** @type {{ trashedStudentFiles?: number }} */ (r.data || {});
    showDevMsg('완료: 학생 파일 휴지통 ' + (d.trashedStudentFiles != null ? d.trashedStudentFiles : 0) + '개.');
  });

  syncBtn.addEventListener('click', async function () {
    showDevMsg('');
    const r = await plannerGasCall_({ action: 'plannerRegistryRebuild' });
    if (!r || !r.ok) {
      const m = r && r.error && r.error.message != null ? String(r.error.message) : '동기화에 실패했습니다.';
      showDevMsg(m);
      return;
    }
    const d = /** @type {Record<string, number>} */ (r.data || {});
    showDevMsg(
      '레지스트리 ' +
        (d.written != null ? d.written : 0) +
        '행, 신규 학생파일 ' +
        (d.provisioned != null ? d.provisioned : 0) +
        ', 재사용 ' +
        (d.reusedStudentFiles != null ? d.reusedStudentFiles : 0) +
        (d.provisionErrors ? ', 생성 실패 ' + d.provisionErrors : '')
    );
  });
}

function main() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;
  injectPlanGateFallbackCss_();
  el.innerHTML = `<div class="sp-plan-rootinner">${PLAN_DEV_HTML}${PLAN_APP_SHELL_START}${GATE_HTML}${PLAN_ADMIN_MODAL_HTML}${PLAN_APP_MAIN_AND_CLOSE}</div>`;
  try {
    el.__spPlanAdminMode = sessionStorage.getItem(PLAN_SESSION_ADMIN_KEY) === '1';
  } catch (_e) {
    el.__spPlanAdminMode = false;
  }
  wirePlannerAdminUnlockOnce_(el);
  wirePlannerStudentProfileSaveOnce_(el);
  wirePlannerPdfExportOnce_(el);
  wirePlannerPersonalTodosApplyOnce_(el);
  plannerSetGatePending_(el);
  renderPlannerStudentProfile_(el, null);
  wirePlanDevBar_(el);
  plannerApplyAdminVisibility_(el);
  if (GAS_MODE.useMock) {
    const g = el.querySelector('.sp-plan-gate');
    if (g) {
      g.innerHTML =
        '<p class="sp-plan-gate__err">플래너를 불러올 수 없습니다. 잠시 후 다시 시도하거나 담당자에게 문의해 주세요.</p>';
    }
    return;
  }
  wireGate_(el);
}

main();
