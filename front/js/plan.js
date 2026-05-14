/**
 * 플래너 임웹 전용 — 전화 확인 후 공통·개인 일정 표시 (드라이브 링크 없음).
 * GAS 호출은 관리자 `app.js` 와 동일하게 **JSONP(GET)**. `fetch` POST는 GAS `TextOutput` CORS 한계로 막힐 수 있음.
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

const PLANNER_JSONP_TIMEOUT_MS = 360000;

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
 * `HttpOpenSync.js` JSONP 분기 — 쿼리 `p0`·`p1`·`p2`·`n`·`m`(memberCode).
 * @param {Record<string, unknown>} payload
 * @return {Promise<Record<string, unknown>>}
 */
async function plannerGasCall_(payload) {
  const url = String(GAS_BASE_URL || '').trim();
  if (!url) {
    return { ok: false, error: { code: 'NO_GAS_URL', message: 'gasBaseUrl이 없습니다.' } };
  }
  const action = String(payload.action != null ? payload.action : '');
  try {
    if (action === 'plannerRegistryRebuild' || action === 'plannerDevFullReset' || action === 'initPlannerMasterSheets') {
      const raw = await plannerGasJsonpWithParams_(url, action, null, PLANNER_JSONP_TIMEOUT_MS);
      return plannerGasNormalizeResult_(raw);
    }
    if (action === 'plannerMatch' || action === 'plannerBootstrap') {
      const segs = /** @type {unknown[]} */ (Array.isArray(payload.phoneSegments) ? payload.phoneSegments : []);
      const extra = {
        p0: String(segs[0] != null ? segs[0] : '').replace(/\D/g, ''),
        p1: String(segs[1] != null ? segs[1] : '').replace(/\D/g, ''),
        p2: String(segs[2] != null ? segs[2] : '').replace(/\D/g, ''),
        n: String(payload.name != null ? payload.name : ''),
        m: String(payload.memberCode != null ? payload.memberCode : '')
      };
      const raw = await plannerGasJsonpWithParams_(url, action, extra, PLANNER_JSONP_TIMEOUT_MS);
      return plannerGasNormalizeResult_(raw);
    }
    return { ok: false, error: { code: 'BAD_ACTION', message: '지원하지 않는 action: ' + action } };
  } catch (e) {
    const m = e && typeof e === 'object' && 'message' in e ? String(/** @type {{ message?: string }} */ (e).message) : String(e);
    return {
      ok: false,
      error: {
        code: 'NETWORK',
        message:
          m +
          ' (GAS Web App: "Anyone(익명)" + Execute as Me + 새 버전 배포. 관리자와 동일 JSONP 경로입니다.)'
      }
    };
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
 * `plannerBootstrap.data.student_profile` 에 대응하는 **목업 객체** (필드명은 API 맞출 때 그대로 쓰면 됨).
 * @type {Record<string, string>}
 */
const MOCK_PLANNER_STUDENT_PROFILE = {
  display_name: '김솔패',
  phone_display: '010-2345-6789',
  track: '인문',
  admission_type: '일반',
  prev_university: '○○대학교',
  prev_major_gpa: '국어국문학과 · 평점 3.82 / 4.5',
  goal_university: '서울대학교',
  goal_department: '경영학부',
  study_status: '노배이스 처음시작'
};

/**
 * API가 일부 필드만 줄 때 목업과 병합.
 * @param {Record<string, unknown>|null|undefined} apiPartial
 * @returns {Record<string, string>}
 */
function plannerMergeStudentProfile_(apiPartial) {
  const o = apiPartial && typeof apiPartial === 'object' ? /** @type {Record<string, unknown>} */ (apiPartial) : {};
  const m = MOCK_PLANNER_STUDENT_PROFILE;
  /** @param {string} k */
  function pick(k) {
    const v = o[k];
    if (v != null && String(v).trim()) return String(v);
    return m[k] != null ? m[k] : '';
  }
  return {
    display_name: pick('display_name'),
    phone_display: pick('phone_display'),
    track: pick('track'),
    admission_type: pick('admission_type'),
    prev_university: pick('prev_university'),
    prev_major_gpa: pick('prev_major_gpa'),
    goal_university: pick('goal_university'),
    goal_department: pick('goal_department'),
    study_status: pick('study_status')
  };
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
 * 학생 정보 표 — **데이터 객체만** 받아 DOM 생성 (HTML에 문구 박지 않음).
 * @param {HTMLElement} root
 * @param {Record<string, unknown>|null|undefined} profile API `student_profile` 또는 null(목업만)
 */
function renderPlannerStudentProfile_(root, profile) {
  const tbody = root.querySelector('#sp-plan-student-tbody');
  if (!tbody) return;
  const p = plannerMergeStudentProfile_(profile);
  const pm = plannerPrevMajorGpaParts_(p.prev_major_gpa);
  tbody.innerHTML =
    '<tr>' +
    '<th scope="row">이름</th>' +
    '<td data-sp-plan-student="display_name">' +
    esc(p.display_name) +
    '</td>' +
    '<th scope="row">휴대전화</th>' +
    '<td data-sp-plan-student="phone_display">' +
    esc(p.phone_display) +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<th scope="row">계열</th>' +
    '<td data-sp-plan-student="track">' +
    esc(p.track) +
    '</td>' +
    '<th scope="row">편입 구분</th>' +
    '<td data-sp-plan-student="admission_type">' +
    esc(p.admission_type) +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<th scope="row">전적대</th>' +
    '<td data-sp-plan-student="prev_university">' +
    esc(p.prev_university) +
    '</td>' +
    '<th scope="row">학과</th>' +
    '<td data-sp-plan-student="prev_major">' +
    esc(pm.major) +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<th scope="row">평점</th>' +
    '<td colspan="3" data-sp-plan-student="prev_major_gpa">' +
    esc(pm.gpa) +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<th scope="row">목표대학</th>' +
    '<td data-sp-plan-student="goal_university">' +
    esc(p.goal_university) +
    '</td>' +
    '<th scope="row">목표 학과</th>' +
    '<td data-sp-plan-student="goal_department">' +
    esc(p.goal_department) +
    '</td>' +
    '</tr>' +
    '<tr class="sp-plan-student__tr--study">' +
    '<th scope="row">공부 현황</th>' +
    '<td colspan="3" class="sp-plan-student__td--text" data-sp-plan-student="study_status">' +
    esc(p.study_status) +
    '</td>' +
    '</tr>';
}

/**
 * 주간 커리큘럼 한 블록 — API에서 내려올 **JSON 형태** 목업 (`rows[]`).
 * @typedef {{ subject: string, subject_code?: string, textbook_goal: string, lesson_outline: string }} PlannerCurriculumRowPayload
 * @typedef {{ source: string, week_index: number, focus_phase: string, rows: PlannerCurriculumRowPayload[] }} PlannerCurriculumWeekPayload
 */

/**
 * 빠른 등록(quickPlanByDate)으로 해당 주의 과목별 강 범위를 만든다.
 * @param {object} st
 * @param {string[]} weekDateKeys YYYY-MM-DD 7일
 * @returns {Record<string, { min: number, max: number }>}
 */
function plannerCurriculumWeekLessonRangeFromQuickPlan_(st, weekDateKeys) {
  /** @type {Record<string, { min: number, max: number }>} */
  const out = {};
  if (!st || !st.quickPlanByDate) return out;
  (weekDateKeys || []).forEach(function (key) {
    const list = st.quickPlanByDate && st.quickPlanByDate[key] ? st.quickPlanByDate[key] : null;
    if (!Array.isArray(list)) return;
    list.forEach(function (t) {
      if (!t || typeof t !== 'object') return;
      const subj = String(t.subject != null ? t.subject : '').trim();
      const L = Number(t.lesson);
      if (!subj) return;
      if (!isFinite(L) || L <= 0) return;
      if (!out[subj]) out[subj] = { min: L, max: L };
      else {
        if (L < out[subj].min) out[subj].min = L;
        if (L > out[subj].max) out[subj].max = L;
      }
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
 * @param {number} weekIndex 0..5
 * @param {Record<string, { min: number, max: number }>} [weekLessonRanges] subjectCode → {min,max}
 * @returns {PlannerCurriculumWeekPayload}
 */
function plannerCurriculumMockWeekPayload_(weekIndex, weekLessonRanges) {
  const phases = ['기본 개념·예문', '오답·심화', '실전 모의', '누적 복습', '약점 보완', '월말 정리'];
  const phase = phases[weekIndex % phases.length];
  const ranges = weekLessonRanges && typeof weekLessonRanges === 'object' ? weekLessonRanges : {};
  return {
    source: 'mock',
    week_index: weekIndex,
    focus_phase: phase,
    rows: [
      {
        subject: '문법',
        subject_code: 'grammar',
        textbook_goal: '솔패스 문법 교재 · ' + phase,
        lesson_outline: plannerCurriculumLessonOutlineFromRange_(ranges.grammar) || '—'
      },
      {
        subject: '논리',
        subject_code: 'logic',
        textbook_goal: '논리 추론 기초 교재 · ' + phase,
        lesson_outline: plannerCurriculumLessonOutlineFromRange_(ranges.logic) || '—'
      },
      {
        subject: '독해',
        subject_code: 'read',
        textbook_goal: '실전 지문 독해 · ' + phase,
        lesson_outline: plannerCurriculumLessonOutlineFromRange_(ranges.read) || '—'
      },
      {
        subject: '어휘',
        subject_code: 'vocab',
        textbook_goal: '핵심 어휘 · ' + phase,
        lesson_outline: plannerCurriculumLessonOutlineFromRange_(ranges.vocab) || '—'
      }
    ]
  };
}

/**
 * `PlannerCurriculumWeekPayload` → 표 HTML (내용은 전부 `esc` 처리).
 * @param {PlannerCurriculumWeekPayload} payload
 * @returns {string}
 */
function plannerCurriculumWeekTableHtml_(payload) {
  let body = '';
  (payload.rows || []).forEach(function (r) {
    if (!r || typeof r !== 'object') return;
    const subj = String(r.subject != null ? r.subject : '').trim();
    const goal = String(r.textbook_goal != null ? r.textbook_goal : '').trim();
    const outl = String(r.lesson_outline != null ? r.lesson_outline : '').trim();
    body +=
      '<tr><th scope="row">' +
      esc(subj) +
      '</th><td class="sp-plan-cur__goal">' +
      esc(goal) +
      '</td><td class="sp-plan-cur__outline">' +
      esc(outl) +
      '</td><td class="sp-plan-cur__link"><a class="sp-plan-cur__a" href="" aria-disabled="true" tabindex="-1"></a></td></tr>';
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

const PLAN_DEV_HTML = `<div class="sp-plan-devbar" id="sp-plan-devbar" role="region" aria-label="제작용 도구">
  <span class="sp-plan-devbar__label">제작용</span>
  <button type="button" class="btn btn--ghost sp-plan-devbar__btn" id="sp-plan-dev-skip-gate" title="전화·이름 확인 없이 메인 화면만 표시합니다. (추적·GAS 호출 없음)">원페이지만(게이트 생략)</button>
  <button type="button" class="btn btn--ghost sp-plan-devbar__btn" id="sp-plan-dev-init" title="Drive에 플래너 마스터 스프레드시트가 없으면 새로 만들고, 필요한 시트·헤더를 맞춥니다.">마스터 준비(파일·탭)</button>
  <button type="button" class="btn btn--ghost sp-plan-devbar__btn" id="sp-plan-dev-sync">동기화(레지스트리+학생파일)</button>
  <button type="button" class="btn btn--ghost sp-plan-devbar__btn" id="sp-plan-dev-reset">DB 초기화(학생파일 포함)</button>
  <span class="sp-plan-devbar__msg" id="sp-plan-dev-msg" aria-live="polite"></span>
</div>`;

const PLAN_APP_HTML = `<div class="app-shell app-shell--plan">
  <header class="app-header">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true"></span>
      <div>
        <div class="brand__title" style="color:#4a148c">솔루션 학습 플래너</div>
        <p class="sp-plan-desc">공통 일정과 나만의 할 일을 달력에서 한눈에 볼 수 있게 연결할 예정입니다.</p>
      </div>
    </div>
  </header>
  <main class="app-main sp-plan-app-main">
    <p class="sp-plan-banner" id="sp-plan-banner" hidden></p>
    <div class="panel panel--hero sp-plan-body">
      <section class="sp-plan-student" id="sp-plan-student-info" aria-labelledby="sp-plan-student-info-title">
        <h2 class="sp-plan-student__title" id="sp-plan-student-info-title">학생 정보</h2>
        <p class="sp-plan-student__hint">추후 학생 DB와 연동 예정 · 현재 표시는 시연용 목업입니다.</p>
        <div class="sp-plan-student__wrap">
          <table class="sp-plan-student__tbl">
            <tbody id="sp-plan-student-tbody"></tbody>
          </table>
        </div>
      </section>
      <div class="sp-plan-monthly-title" id="sp-plan-monthly-label">월간 플랜</div>
      <div class="sp-plan-calendar-slot" id="sp-plan-calendar-slot" role="region" aria-labelledby="sp-plan-monthly-label"></div>
    </div>
  </main>
</div>`;

const GATE_HTML = `<div class="sp-plan-gate">
  <p class="sp-plan-gate__lead">솔패스 수강 이력이 있는 번호를 입력해 주세요. 입력 정보는 본인 확인·플래너 제공에만 사용됩니다.</p>
  <p class="sp-plan-gate__privacy">전화번호와 이름(필요 시)은 매칭·기록용으로만 처리되며, 구글 드라이브 연결 등은 요청하지 않습니다.</p>
  <div class="sp-plan-gate__pair" role="group" aria-label="이름 및 휴대전화">
    <div class="sp-plan-gate__stack">
      <label class="sp-plan-gate__lbl" for="sp-plan-name">이름</label>
      <input
        class="sp-plan-gate__input sp-plan-gate__input--name"
        id="sp-plan-name"
        type="text"
        maxlength="40"
        autocomplete="name"
        placeholder="선택 · 동일 번호 시"
      />
    </div>
    <div class="sp-plan-gate__stack sp-plan-gate__stack--tel">
      <span class="sp-plan-gate__lbl" id="sp-plan-phone-legend">휴대전화</span>
      <div class="sp-plan-gate__tel" role="group" aria-labelledby="sp-plan-phone-legend">
        <input
          class="sp-plan-gate__input sp-plan-gate__input--seg3"
          id="sp-plan-p0"
          type="text"
          maxlength="3"
          autocomplete="off"
          aria-label="휴대전화 앞자리 세 자리"
        />
        <span class="sp-plan-gate__dash" aria-hidden="true">-</span>
        <input
          class="sp-plan-gate__input sp-plan-gate__input--seg4"
          id="sp-plan-p1"
          type="text"
          maxlength="4"
          autocomplete="off"
          aria-label="휴대전화 중간 네 자리"
        />
        <span class="sp-plan-gate__dash" aria-hidden="true">-</span>
        <input
          class="sp-plan-gate__input sp-plan-gate__input--seg4"
          id="sp-plan-p2"
          type="text"
          maxlength="4"
          autocomplete="off"
          aria-label="휴대전화 끝 네 자리"
        />
      </div>
      <p class="sp-plan-gate__telhint">휴대전화 11자리(앞 3 · 가운데 4 · 끝 4). 숫자만 입력됩니다.</p>
    </div>
  </div>
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

/** 일일 타임라인: 매 정시 한 줄, 줄당 6칸(각 10분). 6시 행~22시 행 = 6:00~23:00 (저장 없음 · 프론트만) */
const PLAN_TIMELINE_FIRST_H = 6;
const PLAN_TIMELINE_LAST_H = 22;
const PLAN_TIMELINE_CELLS_PER_HOUR = 6;
const PLAN_TIMELINE_CELL_MIN = 10;
/** 예전 30분 슬롯 마이그레이션용 */
const PLAN_TIMELINE_LEGACY_START_H = 6;
const PLAN_TIMELINE_LEGACY_STEP_MIN = 30;

function plannerPad2_(n) {
  return String(n < 10 ? '0' : '') + String(n);
}

function plannerYmdFromParts_(y, m0, day) {
  return String(y) + '-' + plannerPad2_(m0 + 1) + '-' + plannerPad2_(day);
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
  if (!st.quickPlanByDate) return false;
  return Object.keys(st.quickPlanByDate).some(function (k) {
    return k.indexOf(pfx) === 0 && st.quickPlanByDate[k] && st.quickPlanByDate[k].length > 0;
  });
}

/**
 * @param {object} st
 * @param {Date} viewMonth
 */
function plannerClearQuickPlanForMonth_(st, viewMonth) {
  if (!st.quickPlanByDate) st.quickPlanByDate = {};
  const pfx = plannerMonthYmdPrefix_(viewMonth);
  Object.keys(st.quickPlanByDate).forEach(function (k) {
    if (k.indexOf(pfx) === 0) delete st.quickPlanByDate[k];
  });
  plannerClearQuickTodoOrderForMonth_(st, viewMonth);
  plannerRebuildQuickPostPayload_(st);
}

/**
 * 빠른 등록이 바뀐 달의 일자별 할 일 순서(드래그) 캐시 제거
 * @param {object} st
 * @param {Date} viewMonth
 */
function plannerClearQuickTodoOrderForMonth_(st, viewMonth) {
  if (!st.dayTodoOrderByDate) return;
  const pfx = plannerMonthYmdPrefix_(viewMonth);
  Object.keys(st.dayTodoOrderByDate).forEach(function (k) {
    if (k.indexOf(pfx) === 0) delete st.dayTodoOrderByDate[k];
  });
}

/**
 * `quickPlanByDate` + `plannerManualTodos` → 나중에 GAS POST에 넣을 **본문 형태**만 프론트에 유지 (`연동은 나중`).
 * 필드명은 `DB_PLANNER_PERSONAL_TODO_HEADERS` 와 맞춤 (`gas/DB/dbSchema.js`).
 * @param {object} st
 */
function plannerRebuildQuickPostPayload_(st) {
  if (!st.plannerQuickPostBody || typeof st.plannerQuickPostBody !== 'object') {
    st.plannerQuickPostBody = { action: 'plannerPersonalTodosApply', todos: [] };
  }
  st.plannerQuickPostBody.action = 'plannerPersonalTodosApply';
  const subjLabel = { grammar: '문법', logic: '논리', read: '독해', vocab: '어휘' };
  /** @type {{ task_id: string, title: string, description: string, status: string, priority: string, due_date: string, start_date: string, category: string, sort_key: number, completed_at: string, created_at: string, updated_at: string }[]} */
  const todos = [];
  const keys = Object.keys(st.quickPlanByDate || {}).sort();
  keys.forEach(function (ymd) {
    const arr = st.quickPlanByDate[ymd];
    if (!Array.isArray(arr)) return;
    let sk = 0;
    arr.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      const subject = String(item.subject != null ? item.subject : '').trim();
      const lesson = Number(item.lesson);
      if (!subject || !isFinite(lesson) || lesson <= 0) return;
      const label = subjLabel[subject] != null ? subjLabel[subject] : subject;
      const task_id = 'qk_' + ymd + '_' + subject + '_' + lesson;
      todos.push({
        task_id: task_id,
        title: label + ' · ' + lesson + '강',
        description: '',
        status: 'todo',
        priority: 'normal',
        due_date: ymd,
        start_date: ymd,
        category: subject,
        sort_key: sk++,
        completed_at: '',
        created_at: '',
        updated_at: ''
      });
    });
  });
  /** @type {Record<string, number>} */
  const maxSkByDue = {};
  todos.forEach(function (t) {
    const d = String((t && t.due_date) || '').trim();
    if (!d) return;
    const sk = Number(t.sort_key) || 0;
    if (maxSkByDue[d] == null || sk > maxSkByDue[d]) maxSkByDue[d] = sk;
  });
  const manual = Array.isArray(st.plannerManualTodos) ? st.plannerManualTodos : [];
  manual.forEach(function (m) {
    if (!m || typeof m !== 'object') return;
    const d = String(m.due_date != null ? m.due_date : '').trim();
    if (!d) return;
    const next = (maxSkByDue[d] != null ? maxSkByDue[d] : -1) + 1;
    maxSkByDue[d] = next;
    m.sort_key = next;
    todos.push(m);
  });
  st.plannerQuickPostBody.todos = todos;
  plannerSyncPayloadSortKeysFromDayOrder_(st);
}

/**
 * 일반 등록 폼 → `plannerManualTodos` 에 append 후 페이로드 재생성.
 * @param {HTMLElement} slot `#sp-plan-calendar-slot`
 * @param {object} st
 * @returns {string} 빈 문자열 = 성공, 아니면 에러 메시지
 */
function plannerAppendManualTodoFromForm_(slot, st) {
  if (!st.plannerManualTodos) st.plannerManualTodos = [];
  const titleEl = slot.querySelector('#sp-manual-title');
  const dueEl = slot.querySelector('#sp-manual-due');
  const catEl = slot.querySelector('#sp-manual-cat');
  const prioEl = slot.querySelector('#sp-manual-prio');
  const descEl = slot.querySelector('#sp-manual-desc');
  const title = titleEl && 'value' in titleEl ? String(/** @type {HTMLInputElement} */ (titleEl).value).trim() : '';
  const due = dueEl && 'value' in dueEl ? String(/** @type {HTMLInputElement} */ (dueEl).value).trim() : '';
  const category = catEl && 'value' in catEl ? String(/** @type {HTMLSelectElement} */ (catEl).value).trim() : 'misc';
  const priority = prioEl && 'value' in prioEl ? String(/** @type {HTMLSelectElement} */ (prioEl).value).trim() : 'normal';
  const description = descEl && 'value' in descEl ? String(/** @type {HTMLTextAreaElement} */ (descEl).value).trim() : '';
  if (!title.length) return '할 일 제목을 입력해 주세요.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return '등록·예정일을 선택해 주세요.';
  const allowedP = { low: true, normal: true, high: true };
  const p = allowedP[priority] ? priority : 'normal';
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
  st.plannerManualTodos.push({
    task_id: task_id,
    title: title,
    description: description,
    status: 'todo',
    priority: p,
    due_date: due,
    start_date: due,
    category: c,
    sort_key: 0,
    completed_at: '',
    created_at: '',
    updated_at: ''
  });
  plannerRebuildQuickPostPayload_(st);
  if (titleEl) /** @type {HTMLInputElement} */ (titleEl).value = '';
  if (descEl) /** @type {HTMLTextAreaElement} */ (descEl).value = '';
  return '';
}

/**
 * 드래그로 쌓인 `dayTodoOrderByDate` 가 있으면 페이로드 `sort_key` 에 반영
 * @param {object} st
 */
function plannerSyncPayloadSortKeysFromDayOrder_(st) {
  if (!st.dayTodoOrderByDate) return;
  Object.keys(st.dayTodoOrderByDate).forEach(function (ymd) {
    const ord = st.dayTodoOrderByDate[ymd];
    if (ord && ord.length) plannerApplyTodoOrderToPayloadSortKeys_(st, ymd, ord.slice());
  });
}

/**
 * @param {object} st
 * @param {string} dateYmd
 * @returns {{ task_id: string, title: string, description: string, status: string, priority: string, due_date: string, start_date: string, category: string, sort_key: number, completed_at: string, created_at: string, updated_at: string }[]}
 */
function plannerOrderedDayTodos_(st, dateYmd) {
  const body = st.plannerQuickPostBody;
  const all = body && Array.isArray(body.todos) ? body.todos : [];
  /** @type {{ task_id: string, title: string, description: string, status: string, priority: string, due_date: string, start_date: string, category: string, sort_key: number, completed_at: string, created_at: string, updated_at: string }[]} */
  const rows = [];
  for (let i = 0; i < all.length; i++) {
    const t = all[i];
    if (t && String(t.due_date || '') === dateYmd) rows.push(t);
  }
  rows.sort(function (a, b) {
    return (Number(a.sort_key) || 0) - (Number(b.sort_key) || 0);
  });
  const custom = st.dayTodoOrderByDate && st.dayTodoOrderByDate[dateYmd];
  if (custom && custom.length) {
    const byId = {};
    rows.forEach(function (r) {
      byId[r.task_id] = r;
    });
    /** @type {typeof rows} */
    const out = [];
    custom.forEach(function (id) {
      const r = byId[String(id)];
      if (r) out.push(r);
    });
    rows.forEach(function (r) {
      if (out.indexOf(r) < 0) out.push(r);
    });
    return out;
  }
  return rows;
}

/**
 * @param {object} st
 * @param {string} dateYmd
 * @param {string[]} taskIdsInOrder
 */
function plannerApplyTodoOrderToPayloadSortKeys_(st, dateYmd, taskIdsInOrder) {
  const todos = st.plannerQuickPostBody && Array.isArray(st.plannerQuickPostBody.todos) ? st.plannerQuickPostBody.todos : [];
  const idToIndex = {};
  let i;
  for (i = 0; i < taskIdsInOrder.length; i++) {
    idToIndex[String(taskIdsInOrder[i])] = i;
  }
  for (i = 0; i < todos.length; i++) {
    const row = todos[i];
    if (!row || String(row.due_date || '') !== dateYmd) continue;
    const ix = idToIndex[row.task_id];
    if (ix != null) row.sort_key = ix;
  }
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
  let n = 0;
  Object.keys(slots).forEach(function (k) {
    if (!plannerTimelineSlotKeyParse_(k)) return;
    if (String(slots[k] != null ? slots[k] : '').trim() === tid) n++;
  });
  return n * PLAN_TIMELINE_CELL_MIN;
}

/**
 * 일일 모달 왼쪽 열: 할 일 요약(과목 칩·제목·완료 표시·오늘 칠한 분).
 * @param {string} dateYmd
 * @param {object} st
 * @returns {string}
 */
function plannerDayTodosFromPayloadHtml_(dateYmd, st) {
  const rows = plannerOrderedDayTodos_(st, dateYmd);
  if (!rows.length) {
    return '<p class="sp-plan-day__todoEmpty">이 날짜에 할 일이 없습니다. 위 <strong>할 일 등록</strong>에서 빠른 등록 또는 개별 등록으로 추가한 뒤, POST 미리보기에서 확인할 수 있습니다.</p>';
  }
  const chip = {
    grammar: { cat: '문법', cls: 'sp-plan-chip--grammar' },
    logic: { cat: '논리', cls: 'sp-plan-chip--logic' },
    read: { cat: '독해', cls: 'sp-plan-chip--read' },
    vocab: { cat: '어휘', cls: 'sp-plan-chip--vocab' },
    misc: { cat: '기타', cls: 'sp-plan-chip--misc' }
  };
  const brush = st.modalBrushTodoId ? String(st.modalBrushTodoId) : '';
  let h = '';
  rows.forEach(function (r) {
    const id = String(r.task_id || '');
    const cat = String(r.category || '');
    const meta = chip[cat] || { cat: cat || '기타', cls: 'sp-plan-chip--read' };
    const isB = Boolean(brush && id === brush);
    const comp = plannerTodoCompletionGet_(st, dateYmd, id);
    const sym = comp === 'circle' ? '○' : comp === 'triangle' ? '△' : comp === 'x' ? '×' : '·';
    const mins = plannerTaskTimelineMinutesForDay_(st, dateYmd, id);
    const dur = mins > 0 ? plannerFormatStudyDurationKo_(mins) : '—';
    h +=
      '<div class="sp-plan-day__todoRow' +
      (isB ? ' is-brush' : '') +
      '" draggable="true" data-todo-id="' +
      esc(id) +
      '">' +
      '<span class="sp-plan-chip ' +
      esc(meta.cls) +
      '">' +
      esc(meta.cat) +
      '</span>' +
      '<span class="sp-plan-day__todoTxt">' +
      esc(String(r.title || '')) +
      '</span>' +
      '<span class="sp-plan-day__todoCm" title="위 표에서 ○△×">' +
      esc(sym) +
      '</span>' +
      '<span class="sp-plan-day__todoTime" title="오늘 시간표에 칠한 합">' +
      esc(dur) +
      '</span></div>';
  });
  return '<div class="sp-plan-dayTodoSideList">' + h + '</div>';
}

/**
 * @param {object} st
 * @param {string} ymd
 */
function plannerAssignedMinutesForDay_(st, ymd) {
  const slots = st.dayTimelineTodoByDate && st.dayTimelineTodoByDate[ymd];
  if (!slots) return 0;
  let n = 0;
  Object.keys(slots).forEach(function (k) {
    if (slots[k]) n++;
  });
  return n * PLAN_TIMELINE_CELL_MIN;
}

/**
 * 선택 요일만 달에서 **1일→말일 순**으로 `dates`에 모은 뒤, 과목마다 강 `fromL`~`toL` 총 N건을
 * **날짜마다 가능한 한 균등**하게 나눈다: 각 날에는 `⌊N/M⌋` 또는 `⌊N/M⌋+1`강(앞쪽 날부터 +1 분배).
 * 과목끼리는 섞지 않는다(저장 없음).
 * @param {object} st
 * @param {Date} viewMonth
 * @param {number[]} weekdays 0=일 … 6=토
 * @param {string[]} subjects grammar|logic|read|vocab
 * @param {number} fromL
 * @param {number} toL
 */
function plannerApplyQuickPlanToState_(st, viewMonth, weekdays, subjects, fromL, toL) {
  plannerClearQuickPlanForMonth_(st, viewMonth);
  const y = viewMonth.getFullYear();
  const m0 = viewMonth.getMonth();
  const last = new Date(y, m0 + 1, 0).getDate();
  const dates = [];
  for (let day = 1; day <= last; day++) {
    const dd = new Date(y, m0, day);
    if (weekdays.indexOf(dd.getDay()) >= 0) {
      dates.push(plannerYmdFromParts_(y, m0, day));
    }
  }
  if (!dates.length || !subjects.length) return;
  const lo = Math.min(Number(fromL) || 1, Number(toL) || 1);
  const hi = Math.max(Number(fromL) || 1, Number(toL) || 1);
  if (lo > hi) return;
  if (!st.quickPlanByDate) st.quickPlanByDate = {};
  const M = dates.length;
  const N = hi - lo + 1;
  const base = Math.floor(N / M);
  const rem = N % M;
  subjects.forEach(function (subj) {
    let Lrun = lo;
    for (let di = 0; di < M && Lrun <= hi; di++) {
      const cnt = base + (di < rem ? 1 : 0);
      const key = dates[di];
      if (!st.quickPlanByDate[key]) st.quickPlanByDate[key] = [];
      for (let k = 0; k < cnt && Lrun <= hi; k++) {
        st.quickPlanByDate[key].push({ subject: subj, lesson: Lrun });
        Lrun++;
      }
    }
  });
  plannerRebuildQuickPostPayload_(st);
}

/**
 * 달력 칸에 빠른등록 요약(짧은 문자열) — 점/배지 외에 일자 안에 보이게.
 * @param {object} st
 * @param {string} key ymd
 * @returns {string}
 */
function plannerQuickPlanCellSummaryHtml_(st, key) {
  const arr = st.quickPlanByDate && st.quickPlanByDate[key];
  if (!Array.isArray(arr) || !arr.length) return '';
  const subjName = { grammar: '문법', logic: '논리', read: '독해', vocab: '어휘' };
  const order = ['grammar', 'logic', 'read', 'vocab'];
  /** @type {Record<string, number[]>} */
  const bySub = {};
  arr.forEach(function (t) {
    if (!t || typeof t !== 'object') return;
    const s = String(t.subject != null ? t.subject : '').trim();
    const L = Number(t.lesson);
    if (!s || !isFinite(L) || L <= 0) return;
    if (!bySub[s]) bySub[s] = [];
    bySub[s].push(L);
  });
  function lessonsToOutline_(nums) {
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
  const lines = [];
  order.forEach(function (code) {
    const nums = bySub[code];
    if (!nums || !nums.length) return;
    const outline = lessonsToOutline_(nums);
    const name = subjName[code] || code;
    const mod = /^(grammar|logic|read|vocab)$/.test(code) ? code : 'misc';
    const tip = name + ' ' + outline + '강';
    const body = name + ' ' + outline + '강';
    lines.push(
      '<span class="sp-plan-curBadge sp-plan-curBadge--' +
      esc(mod) +
      '" title="' +
      esc(tip) +
      '">' +
      esc(body) +
      '</span>'
    );
  });
  Object.keys(bySub).forEach(function (code) {
    if (order.indexOf(code) >= 0) return;
    const nums = bySub[code];
    if (!nums || !nums.length) return;
    const outline = lessonsToOutline_(nums);
    const mod = 'misc';
    const tip = code + ' ' + outline + '강';
    const body = code + ' ' + outline + '강';
    lines.push(
      '<span class="sp-plan-curBadge sp-plan-curBadge--' +
      mod +
      '" title="' +
      esc(tip) +
      '">' +
      esc(body) +
      '</span>'
    );
  });
  if (!lines.length) return '';
  return (
    '<div class="sp-plan-day__quick sp-plan-day__quick--badges" aria-hidden="true">' + lines.join('') + '</div>'
  );
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

/** @param {string} id task_id 또는 legacy 짧은 id */
function plannerTodoSlotClassSuffix_(id) {
  const s = String(id != null ? id : '');
  if (/^(grammar|logic|read|vocab)$/.test(s)) return s;
  const m = s.match(/(grammar|logic|read|vocab)/);
  return m ? m[1] : 'misc';
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
      if (h < PLAN_TIMELINE_FIRST_H || h > PLAN_TIMELINE_LAST_H) continue;
      if (sub < 0 || sub >= PLAN_TIMELINE_CELLS_PER_HOUR) continue;
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
    if (!r || !r.task_id) return;
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
    const txt = row && row.title ? String(row.title).trim() : tid.length > 10 ? tid.slice(0, 10) + '…' : tid;
    const suf = plannerTodoSlotClassSuffix_(tid);
    const short = txt.length > 10 ? txt.slice(0, 10) + '…' : txt;
    h +=
      '<span class="sp-plan-hourTodoPill sp-plan-hourTodoPill--' +
      esc(suf) +
      '" title="' +
      esc(tid) +
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
  if (!st.dayTodoCompletionByDate || !st.dayTodoCompletionByDate[ymd]) return 'none';
  const v = st.dayTodoCompletionByDate[ymd][String(taskId)];
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
  if (!st.dayTodoCompletionByDate) st.dayTodoCompletionByDate = {};
  if (!st.dayTodoCompletionByDate[ymd]) st.dayTodoCompletionByDate[ymd] = {};
  const id = String(taskId);
  if (mark === 'none') {
    try {
      delete st.dayTodoCompletionByDate[ymd][id];
    } catch (_e) {
      st.dayTodoCompletionByDate[ymd][id] = 'none';
    }
  } else {
    st.dayTodoCompletionByDate[ymd][id] = mark;
  }
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
    const tid = String(slots[k] != null ? slots[k] : '').trim();
    if (!tid) return;
    const row = map[tid];
    const cat = row && row.category ? String(row.category).trim() : '';
    const suf = cat && acc[cat] != null ? cat : plannerTodoSlotClassSuffix_(tid);
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
  const labels = { grammar: '문법', logic: '논리', read: '독해', vocab: '어휘', misc: '기타' };
  const order = ['grammar', 'logic', 'read', 'vocab', 'misc'];
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
      '<p class="sp-plan-studyFooter__empty">아직 칠한 10분 칸이 없습니다. 할 일을 선택한 뒤 시간표에 칠하면 여기에 합계가 나타납니다.</p>' +
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

/**
 * @param {string} dateYmd
 * @param {object} st
 * @returns {string}
 */
function plannerDayTodoTableHtml_(dateYmd, st) {
  const rows = plannerOrderedDayTodos_(st, dateYmd);
  if (!rows.length) {
    return '<p class="sp-plan-day__todoTableEmpty">이 날짜에 할 일이 없습니다. <strong>할 일 등록</strong>에서 빠른 등록 또는 개별 등록으로 추가하면 아래 표에서 선택·완료 표시를 할 수 있습니다.</p>';
  }
  const brush = st.modalBrushTodoId ? String(st.modalBrushTodoId) : '';
  let body = '';
  rows.forEach(function (r) {
    const id = String(r.task_id || '');
    const title = esc(String(r.title || '').trim() || id);
    const isB = Boolean(brush && brush === id);
    const comp = plannerTodoCompletionGet_(st, dateYmd, id);
    function markCell(kind, sym, aria) {
      const active = comp === kind ? ' is-active' : '';
      return (
        '<td class="sp-plan-todoTable__tdMark">' +
        '<button type="button" class="sp-plan-todoMark sp-plan-todoMark--' +
        kind +
        active +
        '" data-completion="' +
        kind +
        '" aria-label="' +
        esc(aria) +
        (active ? ' (선택됨)' : '') +
        '">' +
        sym +
        '</button></td>'
      );
    }
    body +=
      '<tr class="sp-plan-todoTable__row' +
      (isB ? ' is-brushRow' : '') +
      '" data-todo-id="' +
      esc(id) +
      '">' +
      '<th scope="row" class="sp-plan-todoTable__thTitleCell">' +
      title +
      '</th>' +
      '<td class="sp-plan-todoTable__tdBrush">' +
      '<button type="button" class="sp-plan-todoTable__brushBtn' +
      (isB ? ' is-brush' : '') +
      '" data-action="todo-brush" aria-pressed="' +
      (isB ? 'true' : 'false') +
      '" aria-label="이 할 일로 시간 칠하기">' +
      (isB ? '칠하기 ✓' : '칠하기') +
      '</button></td>' +
      markCell('circle', '○', '동그라미·진행 약함') +
      markCell('triangle', '△', '세모·진행 중') +
      markCell('x', '×', '엑스·완료 또는 보류') +
      '</tr>';
  });
  return (
    '<div class="sp-plan-todoTableWrap">' +
    '<table class="sp-plan-todoTable">' +
    '<thead><tr>' +
    '<th scope="col" class="sp-plan-todoTable__colTitle">할 일</th>' +
    '<th scope="col" class="sp-plan-todoTable__colBrush">시간 칠하기</th>' +
    '<th scope="col" class="sp-plan-todoTable__colMark"><span aria-hidden="true">○</span><span class="sp-plan-vh">동그라미</span></th>' +
    '<th scope="col" class="sp-plan-todoTable__colMark"><span aria-hidden="true">△</span><span class="sp-plan-vh">세모</span></th>' +
    '<th scope="col" class="sp-plan-todoTable__colMark"><span aria-hidden="true">×</span><span class="sp-plan-vh">엑스</span></th>' +
    '</tr></thead><tbody>' +
    body +
    '</tbody></table></div>'
  );
}

/** @param {HTMLElement} timegrid */
function plannerRovingTabindexSlotcells_(timegrid) {
  if (!timegrid) return;
  timegrid.querySelectorAll('.sp-plan-slotcell').forEach(function (el, idx) {
    if (el instanceof HTMLElement) {
      el.setAttribute('tabindex', idx === 0 ? '0' : '-1');
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
    st.dayTimelineTodoByDate[d] = leg ? plannerMigrateLegacySlotsToTodo_(leg) : {};
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
  let html = '';
  let h;
  for (h = PLAN_TIMELINE_FIRST_H; h <= PLAN_TIMELINE_LAST_H; h++) {
    let cells = '';
    for (let sub = 0; sub < PLAN_TIMELINE_CELLS_PER_HOUR; sub++) {
      const k = plannerTimelineSlotKey_(h, sub);
      const tid = slots[k] ? String(slots[k]) : '';
      const suf = tid ? plannerTodoSlotClassSuffix_(tid) : '';
      const m0 = sub * PLAN_TIMELINE_CELL_MIN;
      const m1 = m0 + PLAN_TIMELINE_CELL_MIN;
      const lab = plannerPad2_(h) + ':' + plannerPad2_(m0) + '–' + plannerPad2_(h) + ':' + plannerPad2_(m1);
      cells +=
        '<button type="button" tabindex="-1" class="sp-plan-slotcell' +
        (tid ? ' is-on sp-plan-slotcell--todo sp-plan-slotcell--todo--' + suf : '') +
        '" data-slot="' +
        esc(k) +
        '" aria-pressed="' +
        (tid ? 'true' : 'false') +
        '" aria-label="' +
        esc(lab + (tid ? ' · ' + tid : '') + ' 칸') +
        '"></button>';
    }
    const hourLbl = String(h) + '시';
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
      '</div></div>';
  }
  return html;
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
  const slots = plannerEnsureTimelineTodoSlots_(st, st.selectedDate);
  const brush = st.modalBrushTodoId ? String(st.modalBrushTodoId) : '';
  if (!brush) {
    slots[slot] = '';
  } else {
    slots[slot] = brush;
  }
  const tid = slots[slot] ? String(slots[slot]) : '';
  const suf = tid ? plannerTodoSlotClassSuffix_(tid) : '';
  btn.className =
    'sp-plan-slotcell' + (tid ? ' is-on sp-plan-slotcell--todo sp-plan-slotcell--todo--' + suf : '');
  btn.setAttribute('aria-pressed', tid ? 'true' : 'false');
  const p = plannerTimelineSlotKeyParse_(slot);
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
    btn.setAttribute('aria-label', esc(lab + (tid ? ' · ' + tid : '') + ' 칸'));
  }
}

/**
 * 일일 모달: 할 일 표(브러시·○△×) · 10분 칸 드래그 칠하기(POST 없음)
 * @param {HTMLElement} modalEl
 * @param {HTMLElement} root
 */
function wirePlannerDayModalUiOnce_(modalEl, root) {
  if (modalEl.__spPlanDayUiWired) return;
  modalEl.__spPlanDayUiWired = true;
  const todoTable = modalEl.querySelector('#sp-plan-day-todo-table');
  const timegrid = modalEl.querySelector('#sp-plan-day-timegrid');
  if (!todoTable || !timegrid) return;

  let painting = false;
  let lastPaintSlot = '';

  function syncBrushTable_(st) {
    const brush = st.modalBrushTodoId ? String(st.modalBrushTodoId) : '';
    todoTable.querySelectorAll('.sp-plan-todoTable__row').forEach(function (tr) {
      if (!(tr instanceof HTMLElement)) return;
      const id = tr.getAttribute('data-todo-id') || '';
      const on = Boolean(brush && id === brush);
      tr.classList.toggle('is-brushRow', on);
      const b = tr.querySelector('[data-action="todo-brush"]');
      if (b instanceof HTMLElement) {
        b.classList.toggle('is-brush', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.textContent = on ? '칠하기 ✓' : '칠하기';
      }
    });
    const modal = todoTable.closest ? todoTable.closest('#sp-plan-day-modal') : null;
    const side = modal && modal.querySelector('#sp-plan-day-todo-side');
    if (side) {
      side.querySelectorAll('.sp-plan-day__todoRow').forEach(function (row) {
        if (!(row instanceof HTMLElement)) return;
        const id = row.getAttribute('data-todo-id') || '';
        const on = Boolean(brush && id === brush);
        row.classList.toggle('is-brush', on);
      });
    }
  }

  function syncCompletionMarksInRow_(tr, st, ymd, taskId) {
    const comp = plannerTodoCompletionGet_(st, ymd, taskId);
    tr.querySelectorAll('[data-completion]').forEach(function (btn) {
      if (!(btn instanceof HTMLElement)) return;
      const kind = btn.getAttribute('data-completion') || '';
      btn.classList.toggle('is-active', kind === comp);
    });
  }

  todoTable.addEventListener('click', function (e) {
    const st = root.__spPlanState;
    if (!st || !st.selectedDate) return;
    const ymd = st.selectedDate;
    const markBtn = e.target && e.target.closest ? e.target.closest('[data-completion]') : null;
    if (markBtn && todoTable.contains(markBtn)) {
      const tr = markBtn.closest ? markBtn.closest('.sp-plan-todoTable__row') : null;
      if (!(tr instanceof HTMLElement)) return;
      const taskId = tr.getAttribute('data-todo-id') || '';
      const kind = /** @type {'circle'|'triangle'|'x'} */ (markBtn.getAttribute('data-completion') || '');
      if (kind !== 'circle' && kind !== 'triangle' && kind !== 'x') return;
      const cur = plannerTodoCompletionGet_(st, ymd, taskId);
      plannerTodoCompletionSet_(st, ymd, taskId, cur === kind ? 'none' : kind);
      syncCompletionMarksInRow_(tr, st, ymd, taskId);
      plannerRefreshDayModalTodoSide_(root);
      return;
    }
    const brushBtn = e.target && e.target.closest ? e.target.closest('[data-action="todo-brush"]') : null;
    if (brushBtn && todoTable.contains(brushBtn)) {
      const tr = brushBtn.closest ? brushBtn.closest('.sp-plan-todoTable__row') : null;
      if (!(tr instanceof HTMLElement)) return;
      const id = tr.getAttribute('data-todo-id') || '';
      st.modalBrushTodoId = st.modalBrushTodoId === id ? '' : id;
      syncBrushTable_(st);
    }
  });

  function endPaintGlobal() {
    painting = false;
    lastPaintSlot = '';
    plannerRefreshDayModalStudyFooter_(root);
    plannerRefreshDayModalTodoSide_(root);
    window.removeEventListener('pointerup', endPaintGlobal);
    window.removeEventListener('pointercancel', endPaintGlobal);
  }

  timegrid.addEventListener('pointerdown', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('.sp-plan-slotcell') : null;
    if (!btn || !timegrid.contains(btn) || !(btn instanceof HTMLButtonElement)) return;
    painting = true;
    lastPaintSlot = '';
    plannerPaintSlotcellFromState_(root, btn, timegrid);
    plannerFocusSlotcell_(timegrid, btn);
    lastPaintSlot = btn.getAttribute('data-slot') || '';
    window.addEventListener('pointerup', endPaintGlobal);
    window.addEventListener('pointercancel', endPaintGlobal);
  });

  timegrid.addEventListener('pointermove', function (e) {
    if (!painting) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el && el.closest ? el.closest('.sp-plan-slotcell') : null;
    if (!btn || !timegrid.contains(btn) || !(btn instanceof HTMLButtonElement)) return;
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
      const slot = btn.getAttribute('data-slot');
      if (slot == null) return;
      const slots = plannerEnsureTimelineTodoSlots_(st, st.selectedDate);
      const cur = slots[slot] ? String(slots[slot]) : '';
      if (cur) {
        slots[slot] = '';
      } else if (st.modalBrushTodoId) {
        slots[slot] = String(st.modalBrushTodoId);
      } else {
        return;
      }
      plannerPaintSlotcellFromState_(root, btn, timegrid);
      plannerRefreshDayModalStudyFooter_(root);
      plannerRefreshDayModalTodoSide_(root);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (i < 0 || i >= cells.length - 1) return;
      const next = cells[i + 1];
      if (next instanceof HTMLButtonElement) plannerFocusSlotcell_(timegrid, next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (i <= 0) return;
      const next = cells[i - 1];
      if (next instanceof HTMLButtonElement) plannerFocusSlotcell_(timegrid, next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = cells[i + PLAN_TIMELINE_CELLS_PER_HOUR];
      if (next instanceof HTMLButtonElement) plannerFocusSlotcell_(timegrid, next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = cells[i - PLAN_TIMELINE_CELLS_PER_HOUR];
      if (next instanceof HTMLButtonElement) plannerFocusSlotcell_(timegrid, next);
    }
  });
}

/**
 * 일반 등록(`plannerManualTodos`) 중 해당 날짜 건수.
 * @param {object} st
 * @param {string} ymd
 * @returns {number}
 */
function plannerManualTodosCountForDay_(st, ymd) {
  const m = st.plannerManualTodos;
  if (!Array.isArray(m)) return 0;
  let n = 0;
  for (let i = 0; i < m.length; i++) {
    const row = m[i];
    if (row && String(row.due_date || '').trim() === ymd) n++;
  }
  return n;
}

/**
 * 해당 월에 빠른 등록 또는 일반 등록 할 일이 하나라도 있으면 true (시연 점 숨김용).
 * @param {object} st
 * @param {Date} viewMonth
 */
function plannerMonthHasAnyLocalPlan_(st, viewMonth) {
  if (plannerMonthHasQuickPlan_(st, viewMonth)) return true;
  const pfx = plannerMonthYmdPrefix_(viewMonth);
  const m = st.plannerManualTodos;
  if (!Array.isArray(m)) return false;
  for (let i = 0; i < m.length; i++) {
    const row = m[i];
    const d = row && String(row.due_date || '').trim();
    if (d && d.indexOf(pfx) === 0) return true;
  }
  return false;
}

/**
 * @param {HTMLElement} root
 * @param {{ role: string, common: object[], personal: object[] | null }} boot
 */
function renderCalendar_(root, boot) {
  const slot = root.querySelector('#sp-plan-calendar-slot');
  const ban = root.querySelector('#sp-plan-banner');
  if (!slot) return;

  const role = boot && boot.role === 'member' ? 'member' : 'guest';

  const common = boot && Array.isArray(boot.common) ? boot.common : [];
  const personal = boot && boot.personal != null && Array.isArray(boot.personal) ? boot.personal : [];

  /** @type {Record<string, number>} */
  const byDate = {};
  common.forEach(function (ev) {
    const d0 = String((ev && ev.start_date) || '').trim();
    if (!d0) return;
    byDate[d0] = (byDate[d0] || 0) + 1;
  });
  personal.forEach(function (ev) {
    const d0 = String((ev && ev.start_date) || '').trim();
    if (!d0) return;
    byDate[d0] = (byDate[d0] || 0) + 1;
  });

  const apiHadCalendarRows = common.length > 0 || personal.length > 0;

  /** @type {{ role: 'member'|'guest', viewMonth: Date, byDate: Record<string, number>, selectedDate: string|null, apiHadCalendarRows: boolean, dayTodoOrderByDate?: Record<string, string[]>, dayTodoCompletionByDate?: Record<string, Record<string, string>>, dayTimelineSlotsByDate?: Record<string, Record<string, boolean>>, dayTimelineTodoByDate?: Record<string, Record<string, string>>, quickPlanByDate?: Record<string, { subject: string, lesson: number }[]>, plannerManualTodos?: object[], plannerQuickPostBody?: { action: string, todos: object[] }, modalBrushTodoId?: string, quickRegCollapsed?: boolean, planGuestUnlockMock?: boolean }} */
  const st = (root.__spPlanState =
    root.__spPlanState && typeof root.__spPlanState === 'object'
      ? root.__spPlanState
      : {
          role: role,
          viewMonth: new Date(),
          byDate: {},
          selectedDate: null,
          apiHadCalendarRows: false,
          dayTodoOrderByDate: {},
          dayTodoCompletionByDate: {},
          dayTimelineSlotsByDate: {},
          dayTimelineTodoByDate: {},
          quickPlanByDate: {},
          plannerManualTodos: [],
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
  if (st.modalBrushTodoId == null) st.modalBrushTodoId = '';
  if (!st.quickPlanByDate) st.quickPlanByDate = {};
  if (!st.plannerManualTodos) st.plannerManualTodos = [];
  if (!st.plannerQuickPostBody || typeof st.plannerQuickPostBody !== 'object') {
    st.plannerQuickPostBody = { action: 'plannerPersonalTodosApply', todos: [] };
    plannerRebuildQuickPostPayload_(st);
  }
  if (!st.dayTimelineTodoByDate) st.dayTimelineTodoByDate = {};
  if (!st.dayTodoCompletionByDate) st.dayTodoCompletionByDate = {};
  if (typeof st.quickRegCollapsed !== 'boolean') st.quickRegCollapsed = false;
  if (typeof st.planGuestUnlockMock !== 'boolean') st.planGuestUnlockMock = false;
  if (ban) {
    if (st.role === 'guest') {
      ban.textContent = '등록된 번호로 확인되지 않아 공통 일정만 표시합니다.';
      ban.removeAttribute('hidden');
    } else {
      ban.setAttribute('hidden', 'hidden');
    }
  }
  if (!(st.viewMonth instanceof Date) || isNaN(Number(st.viewMonth))) {
    st.viewMonth = new Date();
  }

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

  /**
   * 시트에 `start_date` 일정이 없을 때만: 월간 점·배지 시연 (실제 todo 모달 HTML 목업과 별개 파이프)
   * @param {number} viewY
   * @param {number} viewM 0–11
   * @returns {Record<string, number>}
   */
  function plannerDemoDotsForViewMonth_(viewY, viewM) {
    const out = {};
    const pairs = [
      [2, 1],
      [5, 2],
      [12, 1],
      [18, 2],
      [26, 3]
    ];
    pairs.forEach(function (pair) {
      const key = viewY + '-' + pad2(viewM + 1) + '-' + pad2(pair[0]);
      out[key] = pair[1];
    });
    return out;
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

    const hasLocal = plannerMonthHasAnyLocalPlan_(st, view);
    const demoByDate = st.apiHadCalendarRows || hasLocal ? {} : plannerDemoDotsForViewMonth_(viewY, viewM);

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
          plannerCurriculumMockWeekPayload_(
            w,
            plannerCurriculumWeekLessonRangeFromQuickPlan_(st, [
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 0)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 1)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 2)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 3)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 4)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 5)),
              ymd(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 6))
            ])
          )
        ) +
        '</div>';

      for (let di = 0; di < 7; di++) {
        const d = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + di);
        const inMonth = d.getFullYear() === viewY && d.getMonth() === viewM;
        const key = ymd(d);
        const wkCls = di === 0 ? ' is-sun' : di === 6 ? ' is-sat' : '';
        const apiN = st.byDate[key] || 0;
        const qn = st.quickPlanByDate && st.quickPlanByDate[key] ? st.quickPlanByDate[key].length : 0;
        const mn = plannerManualTodosCountForDay_(st, key);
        const demN = demoByDate[key] || 0;
        const asg = plannerAssignedMinutesForDay_(st, key) > 0 ? 1 : 0;
        const badge = apiN + qn + mn + demN + asg;
        let dots = '';
        if (apiN) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--api" title="일정"></span>';
        if (qn) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--quick" title="빠른등록"></span>';
        if (mn) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--manual" title="개별 등록"></span>';
        if (asg) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--assign" title="시간표"></span>';
        if (demN) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--demo" title="시연"></span>';
        html += `
        <button type="button" class="sp-plan-day${wkCls}${inMonth ? '' : ' is-out'}" data-ymd="${key}" ${inMonth ? '' : 'disabled'}>
          <div class="sp-plan-day__top">
            <span class="sp-plan-day__num">${d.getDate()}</span>
            ${badge ? `<span class="sp-plan-day__badge" aria-label="요약 ${badge}건">${badge}</span>` : ''}
          </div>
          <div class="sp-plan-day__dots" aria-hidden="true">${dots}</div>
          ${plannerQuickPlanCellSummaryHtml_(st, key)}
        </button>`;
      }
      html += '</div>';
    }
    grid.innerHTML = html;
    plannerRefreshPostPreview_(root);
  }

  function ensureModal_() {
    if (root.querySelector('#sp-plan-day-modal')) return;
    const el = document.createElement('div');
    el.id = 'sp-plan-day-modal';
    el.className = 'sp-plan-modal';
    el.setAttribute('hidden', 'hidden');
    el.innerHTML = `
      <div class="sp-plan-modal__backdrop" data-sp-plan-close="1"></div>
      <div class="sp-plan-modal__panel" role="dialog" aria-modal="true" aria-labelledby="sp-plan-day-modal-title">
        <div class="sp-plan-modal__head">
          <div class="sp-plan-modal__title" id="sp-plan-day-modal-title">일일 플래너</div>
          <button type="button" class="btn btn--ghost sp-plan-modal__close" data-sp-plan-close="1">닫기</button>
        </div>
        <div class="sp-plan-modal__body">
          <div class="sp-plan-day sp-plan-day--daily">
            <section class="sp-plan-day__timeline" aria-label="할 일·시간표">
              <div class="sp-plan-day__secTitle">할 일 · 시간 (6시~23시, 10분 단위)</div>
              <p class="sp-plan-day__timelineHint">표의 「칠하기」로 할 일을 고른 뒤 10분 칸을 누르거나 드래그해 칠합니다. ○ △ ×는 완료·진행 정도(같은 기호를 다시 누르면 해제). 브러시 없이 칸만 누르면 지웁니다. Space=칸 토글 · 화살표=이동. 저장·API 없음.</p>
              <div id="sp-plan-day-todo-table" class="sp-plan-day__todoTableSlot" aria-label="할 일 표"></div>
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
            </section>
          </div>
          <div class="sp-plan-lock" id="sp-plan-day-lock" hidden>
            <div class="sp-plan-lock__card">
              <div class="sp-plan-lock__title">회원 전용 기능입니다</div>
              <div class="sp-plan-lock__desc">일일 플래너(시간 배치·개인 할 일)는 회원에게만 제공됩니다.</div>
              <button type="button" id="sp-plan-lock-buy" class="btn btn--primary sp-plan-lock__cta">구매하기</button>
            </div>
          </div>
        </div>
      </div>`;
    root.appendChild(el);
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
    const title = m.querySelector('#sp-plan-day-modal-title');
    if (title) title.textContent = st.selectedDate ? st.selectedDate + ' · 일일 플래너' : '일일 플래너';
    const todoTable = m.querySelector('#sp-plan-day-todo-table');
    const todoSide = m.querySelector('#sp-plan-day-todo-side');
    if (todoTable) todoTable.innerHTML = plannerDayTodoTableHtml_(st.selectedDate, st);
    if (todoSide) todoSide.innerHTML = plannerDayTodosFromPayloadHtml_(st.selectedDate, st);
    const timegrid = m.querySelector('#sp-plan-day-timegrid');
    if (timegrid) {
      timegrid.innerHTML = plannerDayTimelineHtml_(st, st.selectedDate);
      plannerRovingTabindexSlotcells_(timegrid);
    }
    plannerRefreshDayModalStudyFooter_(root);
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
    '<span class="sp-plan-todoReg__outerSub">빠른 배치와 개별 입력 · 시트 저장 전 미리보기</span>' +
    '</div></div>' +
    '<span class="sp-plan-todoReg__pill">로컬만</span></header>' +
    '<div id="sp-plan-todo-reg-body" class="sp-plan-quick__body sp-plan-todoReg__scroll">' +
    '<div class="sp-plan-todoReg__panel sp-plan-todoReg__panel--quick">' +
    '<div class="sp-plan-todoReg__panelHead">' +
    '<span class="sp-plan-todoReg__panelBadge" aria-hidden="true">빠른</span>' +
    '<div class="sp-plan-todoReg__panelHeadText">' +
    '<h3 class="sp-plan-todoReg__panelTitle">빠른 등록</h3>' +
    '<p class="sp-plan-todoReg__panelSub">선택한 요일에 강 번호를 나눠 한 달 치 할 일을 만듭니다.</p>' +
    '</div></div>' +
    '<p class="sp-plan-quick__err" id="sp-plan-quick-err" hidden></p>' +
    '<div class="sp-plan-quick__row sp-plan-quick__row--horiz">' +
    '<span class="sp-plan-quick__lbl">요일</span>' +
    '<div class="sp-plan-quick__chks" role="group" aria-label="요일">' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="1"/>월</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="2"/>화</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="3"/>수</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="4"/>목</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="5"/>금</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="6"/>토</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-dow" value="0"/>일</label>' +
    '</div></div>' +
    '<div class="sp-plan-quick__row sp-plan-quick__row--horiz">' +
    '<span class="sp-plan-quick__lbl">과목</span>' +
    '<div class="sp-plan-quick__chks" role="group" aria-label="과목">' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-subj" value="grammar" checked/>문법</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-subj" value="logic" checked/>논리</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-subj" value="read" checked/>독해</label>' +
    '<label class="sp-plan-quick__chk"><input type="checkbox" name="sp-subj" value="vocab"/>어휘</label>' +
    '</div></div>' +
    '<div class="sp-plan-quick__row sp-plan-quick__row--horiz sp-plan-quick__row--nums">' +
    '<span class="sp-plan-quick__lbl">강</span>' +
    '<div class="sp-plan-quick__chks sp-plan-quick__chks--nums">' +
    '<input type="number" id="sp-lesson-from" class="sp-plan-quick__num" min="1" max="99" value="1" />' +
    '<span class="sp-plan-quick__til">~</span>' +
    '<input type="number" id="sp-lesson-to" class="sp-plan-quick__num" min="1" max="99" value="20" />' +
    '<button type="button" class="btn btn--primary sp-plan-quick__apply" id="sp-quick-apply">이 달에 반영</button>' +
    '<button type="button" class="btn btn--ghost sp-plan-quick__clear" id="sp-quick-clear">이 달 지우기</button>' +
    '</div></div></div>' +
    '<div class="sp-plan-todoReg__panel sp-plan-todoReg__panel--manual" id="sp-plan-manual-reg" aria-label="개별 등록">' +
    '<div class="sp-plan-todoReg__panelHead">' +
    '<span class="sp-plan-todoReg__panelBadge sp-plan-todoReg__panelBadge--manual" aria-hidden="true">개별</span>' +
    '<div class="sp-plan-todoReg__panelHeadText">' +
    '<h3 class="sp-plan-todoReg__panelTitle">개별 등록</h3>' +
    '<p class="sp-plan-todoReg__panelSub">제목·등록 날짜·과목을 넣고 한 건씩 추가합니다. 그날짜가 이 할 일의 기준일입니다.</p>' +
    '</div></div>' +
    '<p class="sp-plan-manual__err" id="sp-plan-manual-err" hidden></p>' +
    '<div class="sp-plan-manual__grid">' +
    '<label class="sp-plan-manual__lbl">제목<input type="text" id="sp-manual-title" class="sp-plan-manual__input" maxlength="200" placeholder="예: 모의고사 오답" autocomplete="off"/></label>' +
    '<label class="sp-plan-manual__lbl">등록·예정일<input type="date" id="sp-manual-due" class="sp-plan-manual__input" value="' +
    esc(defManDue) +
    '"/></label>' +
    '<label class="sp-plan-manual__lbl">과목<select id="sp-manual-cat" class="sp-plan-manual__select">' +
    '<option value="grammar">문법</option><option value="logic">논리</option><option value="read">독해</option><option value="vocab">어휘</option><option value="misc" selected>기타</option></select></label>' +
    '<label class="sp-plan-manual__lbl">우선순위<select id="sp-manual-prio" class="sp-plan-manual__select">' +
    '<option value="low">낮음</option><option value="normal" selected>보통</option><option value="high">높음</option></select></label>' +
    '</div>' +
    '<label class="sp-plan-manual__lbl sp-plan-manual__lbl--block">메모(선택)<textarea id="sp-manual-desc" class="sp-plan-manual__textarea" rows="2" maxlength="2000"></textarea></label>' +
    '<button type="button" class="btn btn--primary sp-plan-manual__add" id="sp-manual-add">할 일 추가</button></div>' +
    '<div class="sp-plan-quick__postPreview sp-plan-todoReg__postPreview">' +
    '<div class="sp-plan-quick__postPreviewLbl">POST 미리보기 · <code>plannerPersonalTodosApply</code> (빠른+개별 합본)</div>' +
    '<pre class="sp-plan-quick__postPre" id="sp-plan-post-preview"></pre>' +
    '</div></div></section>' +
    '<div class="sp-plan-month" id="sp-plan-month-wrap">' +
    '<div class="sp-plan-month__head">' +
    '<button type="button" class="btn btn--ghost sp-plan-month__nav" data-nav="-1" aria-label="이전 달">‹</button>' +
    '<div class="sp-plan-month__title">' +
    ym(st.viewMonth) +
    '</div>' +
    '<button type="button" class="btn btn--ghost sp-plan-month__nav" data-nav="1" aria-label="다음 달">›</button>' +
    '</div>' +
    '<div class="sp-plan-month__dow" role="row" aria-label="요일">' +
    '<div class="sp-plan-month__dowCorner" aria-hidden="true">주차 · 커리큘럼</div>' +
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

  if (!slot.__spPlanCalWired) {
    slot.__spPlanCalWired = true;
    slot.addEventListener('click', function (e) {
      const t = /** @type {HTMLElement|null} */ (e.target instanceof HTMLElement ? e.target : null);
      if (!t) return;
      const quickToggle = t.id === 'sp-quick-toggle' ? t : t.closest ? t.closest('#sp-quick-toggle') : null;
      if (quickToggle) {
        const sec = slot.querySelector('#sp-plan-quick-reg');
        const btn = slot.querySelector('#sp-quick-toggle');
        if (sec && btn) {
          const nowCollapsed = sec.classList.toggle('is-collapsed');
          st.quickRegCollapsed = nowCollapsed;
          btn.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
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
          const subjects = [];
          qr.querySelectorAll('input[name="sp-subj"]:checked').forEach(function (cb) {
            subjects.push(String(/** @type {HTMLInputElement} */ (cb).value));
          });
          const fromEl = slot.querySelector('#sp-lesson-from');
          const toEl = slot.querySelector('#sp-lesson-to');
          const fromL = fromEl && 'value' in fromEl ? Number(/** @type {HTMLInputElement} */ (fromEl).value) : 1;
          const toL = toEl && 'value' in toEl ? Number(/** @type {HTMLInputElement} */ (toEl).value) : 20;
          if (!weekdays.length) {
            if (errEl) {
              errEl.textContent = '요일을 한 개 이상 선택해 주세요.';
              errEl.removeAttribute('hidden');
            }
            return;
          }
          if (!subjects.length) {
            if (errEl) {
              errEl.textContent = '과목을 한 개 이상 선택해 주세요.';
              errEl.removeAttribute('hidden');
            }
            return;
          }
          plannerApplyQuickPlanToState_(st, st.viewMonth, weekdays, subjects, fromL, toL);
          renderMonth_();
          const modal = root.querySelector('#sp-plan-day-modal');
          if (modal && st.selectedDate && !modal.hasAttribute('hidden')) {
            openDayModal_(st.selectedDate);
          }
        }
        if (quickClear) {
          plannerClearQuickPlanForMonth_(st, st.viewMonth);
          renderMonth_();
          if (errEl) {
            errEl.textContent = '';
            errEl.setAttribute('hidden', 'hidden');
          }
          const modal = root.querySelector('#sp-plan-day-modal');
          if (modal && st.selectedDate && !modal.hasAttribute('hidden')) {
            openDayModal_(st.selectedDate);
          }
        }
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
      const nav = t.closest ? t.closest('[data-nav]') : null;
      if (nav && nav.getAttribute) {
        const step = Number(nav.getAttribute('data-nav')) || 0;
        if (step) {
          st.viewMonth = new Date(st.viewMonth.getFullYear(), st.viewMonth.getMonth() + step, 1);
          renderMonth_();
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
  }
}

/**
 * @param {HTMLElement} root
 */
function wireGate_(root) {
  const btn = root.querySelector('#sp-plan-gate-submit');
  const errEl = root.querySelector('#sp-plan-gate-err');
  const nameInput = root.querySelector('#sp-plan-name');
  const gate = root.querySelector('.sp-plan-gate');
  const app = root.querySelector('.app-shell--plan');
  if (!btn || !gate || !app) return;

  wirePlanPhoneDigitsOnly_(root);

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

  async function runBootstrap(memberCode, segs, name) {
    const boot = await plannerGasCall_({
      action: 'plannerBootstrap',
      phoneSegments: segs,
      name: name || '',
      memberCode: memberCode || ''
    });
    if (!boot || !boot.ok) {
      const m = boot && boot.error && boot.error.message != null ? String(boot.error.message) : '일정을 불러오지 못했습니다.';
      showErr(m);
      return;
    }
    const d = /** @type {{ role?: string, common?: object[], personal?: object[] | null, student_profile?: Record<string, unknown> }} */ (
      boot.data || {}
    );
    gate.setAttribute('hidden', 'hidden');
    app.removeAttribute('hidden');
    renderPlannerStudentProfile_(root, d.student_profile);
    renderCalendar_(root, { role: d.role || 'guest', common: d.common || [], personal: d.personal != null ? d.personal : null });
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
    const data = /** @type {{ outcome?: string, needName?: boolean, memberCode?: string | null }} */ (res.data || {});
    const oc = String(data.outcome || '');
    if (oc === 'need_name') {
      if (nameInput) {
        nameInput.focus();
      }
      showErr('같은 번호로 등록된 분이 여러 명입니다. 이름을 입력한 뒤 다시 확인을 눌러 주세요.');
      return;
    }
    if (oc === 'matched' && data.memberCode) {
      await runBootstrap(String(data.memberCode), segs, name);
      return;
    }
    await runBootstrap('', segs, name);
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
    const app = root.querySelector('.app-shell--plan');
    if (gate) gate.setAttribute('hidden', 'hidden');
    if (app) app.removeAttribute('hidden');
    renderCalendar_(root, { role: 'guest', common: [], personal: null });
    renderPlannerStudentProfile_(root, MOCK_PLANNER_STUDENT_PROFILE);
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
  el.innerHTML = `<div class="sp-plan-rootinner">${PLAN_DEV_HTML}${GATE_HTML}${PLAN_APP_HTML}</div>`;
  renderPlannerStudentProfile_(el, MOCK_PLANNER_STUDENT_PROFILE);
  const app = el.querySelector('.app-shell--plan');
  if (app) app.setAttribute('hidden', 'hidden');
  wirePlanDevBar_(el);
  if (GAS_MODE.useMock) {
    const g = el.querySelector('.sp-plan-gate');
    if (g) {
      g.innerHTML =
        '<p class="sp-plan-gate__err">스니펫에 Web App 주소(<code>gasBaseUrl</code>)가 없어 플래너를 불러올 수 없습니다.</p>';
    }
    return;
  }
  wireGate_(el);
}

main();
