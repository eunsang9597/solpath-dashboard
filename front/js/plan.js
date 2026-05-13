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
 * `prev_major_gpa` 한 필드 문자열(예: `국어국문학과 · 평점 3.82 / 4.5`)을 같은 칸 안 탭(칩)으로 나눈다.
 * @param {string} raw
 * @returns {string}
 */
function plannerPrevMajorGpaPillsHtml_(raw) {
  const s = String(raw != null ? raw : '').trim();
  if (!s) return '';
  const chunks = s
    .split(/\s*·\s*/)
    .map(function (x) {
      return String(x || '').trim();
    })
    .filter(Boolean);
  if (!chunks.length) return '';
  /** @type {{ lbl: string, val: string }[]} */
  const items = [];
  chunks.forEach(function (chunk) {
    const m = chunk.match(/^평점\s*(.*)$/i);
    if (m) {
      const rest = String(m[1] != null ? m[1] : '').trim();
      items.push({ lbl: '평점', val: rest || '—' });
    } else {
      items.push({ lbl: '학과', val: chunk });
    }
  });
  return (
    '<div class="sp-plan-student__pills" role="list">' +
    items
      .map(function (t) {
        const aria = (t.lbl ? t.lbl + ' ' : '') + t.val;
        return (
          '<span class="sp-plan-student__pill" role="listitem" tabindex="0" aria-label="' +
          esc(aria) +
          '">' +
          (t.lbl ? '<span class="sp-plan-student__pill-lbl">' + esc(t.lbl) + '</span>' : '') +
          '<span class="sp-plan-student__pill-val">' +
          esc(t.val) +
          '</span></span>'
        );
      })
      .join('') +
    '</div>'
  );
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
    '<td colspan="3" data-sp-plan-student="prev_university">' +
    esc(p.prev_university) +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<th scope="row">전적대 학과 · 학점</th>' +
    '<td colspan="3" data-sp-plan-student="prev_major_gpa">' +
    plannerPrevMajorGpaPillsHtml_(p.prev_major_gpa) +
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
 * @typedef {{ subject: string, textbook_goal: string, lesson_outline: string }} PlannerCurriculumRowPayload
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
        textbook_goal: '솔패스 문법 교재 · ' + phase,
        lesson_outline: plannerCurriculumLessonOutlineFromRange_(ranges.grammar) || '—'
      },
      {
        subject: '논리',
        textbook_goal: '논리 추론 기초 교재 · ' + phase,
        lesson_outline: plannerCurriculumLessonOutlineFromRange_(ranges.logic) || '—'
      },
      {
        subject: '독해',
        textbook_goal: '실전 지문 독해 · ' + phase,
        lesson_outline: plannerCurriculumLessonOutlineFromRange_(ranges.read) || '—'
      },
      {
        subject: '어휘',
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
    body +=
      '<tr><th scope="row">' +
      esc(r.subject) +
      '</th><td class="sp-plan-cur__goal">' +
      esc(r.textbook_goal) +
      '</td><td class="sp-plan-cur__outline">' +
      esc(r.lesson_outline) +
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

/** 일일 타임라인: 06:00~22:00, 30분 칸 (저장 없음 · 프론트만) */
const PLAN_TIMELINE_START_H = 6;
const PLAN_TIMELINE_END_H = 22;
const PLAN_TIMELINE_STEP_MIN = 30;

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
  return n * PLAN_TIMELINE_STEP_MIN;
}

/**
 * 선택 요일에 해당하는 날짜를 달 안에서 **시간순**으로 두고,
 * 과목×강 N건을 `floor(N/M)`건씩 앞쪽 M-1일에 두고, 나머지는 **마지막 날**에 몰아 넣는다(저장 없음).
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
  const tasks = [];
  subjects.forEach(function (subj) {
    for (let L = lo; L <= hi; L++) {
      tasks.push({ subject: subj, lesson: L });
    }
  });
  if (!tasks.length) return;
  if (!st.quickPlanByDate) st.quickPlanByDate = {};
  const M = dates.length;
  const N = tasks.length;
  const q = Math.floor(N / M);
  const r = N % M;
  let ti = 0;
  for (let j = 0; j < M; j++) {
    const key = dates[j];
    const cnt = q + (j === M - 1 ? r : 0);
    if (!st.quickPlanByDate[key]) st.quickPlanByDate[key] = [];
    for (let k = 0; k < cnt; k++) {
      const t = tasks[ti++];
      if (t) st.quickPlanByDate[key].push({ subject: t.subject, lesson: t.lesson });
    }
  }
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

/** @param {string} id */
function plannerTodoSlotClassSuffix_(id) {
  return /^(grammar|logic|read|vocab)$/.test(id) ? id : 'misc';
}

function plannerTimelineSlotCount_() {
  return ((PLAN_TIMELINE_END_H - PLAN_TIMELINE_START_H) * 60) / PLAN_TIMELINE_STEP_MIN;
}

/** @param {number} i */
function plannerTimelineSlotLabel_(i) {
  const t0 = PLAN_TIMELINE_START_H * 60 + i * PLAN_TIMELINE_STEP_MIN;
  const t1 = t0 + PLAN_TIMELINE_STEP_MIN;
  const h0 = Math.floor(t0 / 60);
  const m0 = t0 % 60;
  const h1 = Math.floor(t1 / 60);
  const m1 = t1 % 60;
  return plannerPad2_(h0) + ':' + plannerPad2_(m0) + '–' + plannerPad2_(h1) + ':' + plannerPad2_(m1);
}

/**
 * @param {object} st
 * @param {string} d
 * @returns {Record<string, string>} 슬롯 인덱스 → todoId(또는 빈 문자열)
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
  return st.dayTimelineTodoByDate[d];
}

/**
 * @param {object} st
 * @param {string} d
 * @returns {string[]}
 */
function plannerEnsureTodoOrder_(st, d) {
  if (!st.dayTodoOrderByDate) st.dayTodoOrderByDate = {};
  if (!st.dayTodoOrderByDate[d]) {
    st.dayTodoOrderByDate[d] = ['grammar', 'logic', 'read', 'vocab'];
  }
  return st.dayTodoOrderByDate[d];
}

/** 일일 todo 카탈로그 — API `personal[]` 등으로 치환 시 `task_id` 키만 맞추면 됨. @type {Record<string, { cat: string, cls: string, txt: string, time: string }>} */
const MOCK_PLANNER_TODO_CATALOG = {
  grammar: { cat: '문법', cls: 'sp-plan-chip--grammar', txt: '핵심 문법 단원 복습 · 예문 정리', time: '45M' },
  logic: { cat: '논리', cls: 'sp-plan-chip--logic', txt: '논리 추론 유형별 풀이', time: '50M' },
  read: { cat: '독해', cls: 'sp-plan-chip--read', txt: '실전 지문 2편 · 시간 재기', time: '1H' },
  vocab: { cat: '어휘', cls: 'sp-plan-chip--vocab', txt: 'day1 ~ day30', time: '30M' }
};

/**
 * @param {string[]} orderIds
 * @param {string} [brushTodoId]
 * @returns {string}
 */
function plannerDayTodosHtmlFromOrder_(orderIds, brushTodoId) {
  const brush = brushTodoId != null ? String(brushTodoId) : '';
  let h = '';
  orderIds.forEach(function (id) {
    const r = MOCK_PLANNER_TODO_CATALOG[id];
    if (!r) return;
    const isB = Boolean(brush && id === brush);
    h +=
      '<div class="sp-plan-day__todoRow' +
      (isB ? ' is-brush' : '') +
      '" draggable="true" data-todo-id="' +
      esc(id) +
      '">' +
      '<span class="sp-plan-chip ' +
      esc(r.cls) +
      '">' +
      esc(r.cat) +
      '</span>' +
      '<span class="sp-plan-day__todoTxt">' +
      esc(r.txt) +
      '</span>' +
      '<span class="sp-plan-day__todoTime">' +
      esc(r.time) +
      '</span></div>';
  });
  return h;
}

/**
 * @param {object} st
 * @param {string} dateYmd
 * @returns {string}
 */
function plannerDayTimelineHtml_(st, dateYmd) {
  const slots = plannerEnsureTimelineTodoSlots_(st, dateYmd);
  const n = plannerTimelineSlotCount_();
  let h = '';
  for (let i = 0; i < n; i++) {
    const k = String(i);
    const tid = slots[k] ? String(slots[k]) : '';
    const lab = plannerTimelineSlotLabel_(i);
    const suf = tid ? plannerTodoSlotClassSuffix_(tid) : '';
    h +=
      '<div class="sp-plan-timegrid__row">' +
      '<span class="sp-plan-timegrid__lbl">' +
      esc(lab) +
      '</span>' +
      '<button type="button" tabindex="0" class="sp-plan-timecell' +
      (tid ? ' is-on sp-plan-timecell--todo sp-plan-timecell--todo--' + suf : '') +
      '" data-slot="' +
      esc(k) +
      '" aria-pressed="' +
      (tid ? 'true' : 'false') +
      '" aria-label="' +
      esc(lab + (tid ? ' · ' + tid : '') + ' 구간') +
      '"></button></div>';
  }
  return h;
}

/**
 * @param {HTMLElement} root
 * @param {HTMLButtonElement} btn
 */
function plannerPaintTimecellFromState_(root, btn) {
  const st = root.__spPlanState;
  if (!st || !st.selectedDate) return;
  const slot = btn.getAttribute('data-slot');
  if (slot == null) return;
  const slots = plannerEnsureTimelineTodoSlots_(st, st.selectedDate);
  const brush = st.modalBrushTodoId ? String(st.modalBrushTodoId) : '';
  if (!brush) {
    slots[slot] = '';
  } else {
    slots[slot] = brush;
  }
  const tid = slots[slot] ? String(slots[slot]) : '';
  const i = Number(slot);
  const lab = plannerTimelineSlotLabel_(isNaN(i) ? 0 : i);
  const suf = tid ? plannerTodoSlotClassSuffix_(tid) : '';
  btn.className =
    'sp-plan-timecell' + (tid ? ' is-on sp-plan-timecell--todo sp-plan-timecell--todo--' + suf : '');
  btn.setAttribute('aria-pressed', tid ? 'true' : 'false');
  btn.setAttribute('aria-label', esc(lab + (tid ? ' · ' + tid : '') + ' 구간'));
}

/**
 * 일일 모달: 할 일 순서 드래그 · 행 클릭=브러시 · 타임라인 칠하기(POST 없음)
 * @param {HTMLElement} modalEl
 * @param {HTMLElement} root
 */
function wirePlannerDayModalUiOnce_(modalEl, root) {
  if (modalEl.__spPlanDayUiWired) return;
  modalEl.__spPlanDayUiWired = true;
  const todoList = modalEl.querySelector('#sp-plan-day-todo-list');
  const timegrid = modalEl.querySelector('#sp-plan-day-timegrid');
  if (!todoList || !timegrid) return;

  let painting = false;
  let lastPaintSlot = '';

  todoList.addEventListener('click', function (e) {
    const row = e.target && e.target.closest ? e.target.closest('.sp-plan-day__todoRow') : null;
    if (!row || !todoList.contains(row)) return;
    const id = row.getAttribute('data-todo-id') || '';
    const st = root.__spPlanState;
    if (!st) return;
    st.modalBrushTodoId = st.modalBrushTodoId === id ? '' : id;
    todoList.querySelectorAll('.sp-plan-day__todoRow').forEach(function (r) {
      const rid = r.getAttribute('data-todo-id') || '';
      r.classList.toggle('is-brush', Boolean(st.modalBrushTodoId) && rid === st.modalBrushTodoId);
    });
  });

  todoList.addEventListener('dragstart', function (e) {
    const row = e.target && e.target.closest ? e.target.closest('.sp-plan-day__todoRow') : null;
    if (!row || !todoList.contains(row)) return;
    const id = row.getAttribute('data-todo-id') || '';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    row.classList.add('is-dragging');
    modalEl.__spDragTodoId = id;
  });

  todoList.addEventListener('dragend', function (e) {
    const row = e.target && e.target.closest ? e.target.closest('.sp-plan-day__todoRow') : null;
    if (row) row.classList.remove('is-dragging');
    modalEl.__spDragTodoId = '';
  });

  todoList.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  todoList.addEventListener('drop', function (e) {
    e.preventDefault();
    const st = root.__spPlanState;
    if (!st || !st.selectedDate) return;
    const draggedId =
      (modalEl.__spDragTodoId && String(modalEl.__spDragTodoId)) ||
      (e.dataTransfer ? String(e.dataTransfer.getData('text/plain') || '') : '');
    if (!draggedId) return;
    const targetRow = /** @type {HTMLElement|null} */ (e.target && e.target.closest ? e.target.closest('.sp-plan-day__todoRow') : null);
    if (!targetRow || !todoList.contains(targetRow)) return;
    const targetId = targetRow.getAttribute('data-todo-id') || '';
    if (!targetId || draggedId === targetId) return;
    const order = plannerEnsureTodoOrder_(st, st.selectedDate).slice();
    const from = order.indexOf(draggedId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, draggedId);
    st.dayTodoOrderByDate[st.selectedDate] = order;
    todoList.innerHTML = plannerDayTodosHtmlFromOrder_(order, st.modalBrushTodoId || '');
    todoList.querySelectorAll('.sp-plan-day__todoRow').forEach(function (r) {
      const rid = r.getAttribute('data-todo-id') || '';
      r.classList.toggle('is-brush', Boolean(st.modalBrushTodoId) && rid === st.modalBrushTodoId);
    });
  });

  function endPaintGlobal() {
    painting = false;
    lastPaintSlot = '';
    window.removeEventListener('pointerup', endPaintGlobal);
    window.removeEventListener('pointercancel', endPaintGlobal);
  }

  timegrid.addEventListener('pointerdown', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('.sp-plan-timecell') : null;
    if (!btn || !timegrid.contains(btn) || !(btn instanceof HTMLButtonElement)) return;
    painting = true;
    lastPaintSlot = '';
    plannerPaintTimecellFromState_(root, btn);
    lastPaintSlot = btn.getAttribute('data-slot') || '';
    window.addEventListener('pointerup', endPaintGlobal);
    window.addEventListener('pointercancel', endPaintGlobal);
  });

  timegrid.addEventListener('pointermove', function (e) {
    if (!painting) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el && el.closest ? el.closest('.sp-plan-timecell') : null;
    if (!btn || !timegrid.contains(btn) || !(btn instanceof HTMLButtonElement)) return;
    const sk = btn.getAttribute('data-slot') || '';
    if (sk === lastPaintSlot) return;
    lastPaintSlot = sk;
    plannerPaintTimecellFromState_(root, btn);
  });

  timegrid.addEventListener('keydown', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('.sp-plan-timecell') : null;
    if (!btn || !timegrid.contains(btn) || !(btn instanceof HTMLButtonElement)) return;
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
      plannerPaintTimecellFromState_(root, btn);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const cells = Array.prototype.slice.call(timegrid.querySelectorAll('.sp-plan-timecell'));
      const i = cells.indexOf(btn);
      if (i < 0) return;
      const next = e.key === 'ArrowDown' ? cells[i + 1] : cells[i - 1];
      if (next instanceof HTMLButtonElement) {
        next.focus();
      }
    }
  });
}

/**
 * 일일 모달 «오늘 할 일» — **프론트 목업만**. 추후 `plannerBootstrap.personal` 등으로 치환.
 * @param {string} dateYmd
 * @param {object} st
 * @returns {string}
 */
function plannerDayTodosMockHtml_(dateYmd, st) {
  const order = plannerEnsureTodoOrder_(st, dateYmd);
  return plannerDayTodosHtmlFromOrder_(order, st.modalBrushTodoId || '');
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

  /** @type {{ role: 'member'|'guest', viewMonth: Date, byDate: Record<string, number>, selectedDate: string|null, apiHadCalendarRows: boolean, dayTodoOrderByDate?: Record<string, string[]>, dayTimelineSlotsByDate?: Record<string, Record<string, boolean>>, dayTimelineTodoByDate?: Record<string, Record<string, string>>, quickPlanByDate?: Record<string, { subject: string, lesson: number }[]>, modalBrushTodoId?: string, quickRegCollapsed?: boolean, planGuestUnlockMock?: boolean }} */
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
          dayTimelineSlotsByDate: {},
          dayTimelineTodoByDate: {},
          quickPlanByDate: {},
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
  if (!st.dayTimelineTodoByDate) st.dayTimelineTodoByDate = {};
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

  /** 해당 주(일요일 기준) ISO 주차 — 시연용 메타 표시 */
  function isoWeekNumber_(d) {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = x.getUTCDay() || 7;
    x.setUTCDate(x.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
    return Math.ceil(((x.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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

    const hasQuick = plannerMonthHasQuickPlan_(st, view);
    const demoByDate = st.apiHadCalendarRows || hasQuick ? {} : plannerDemoDotsForViewMonth_(viewY, viewM);

    let html = '';
    for (let w = 0; w < 6; w++) {
      const sun = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7);
      const sat = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 6);
      const wk = isoWeekNumber_(sun);
      html += '<div class="sp-plan-month__weekRow">';
      html +=
        '<div class="sp-plan-month__weekLead">' +
        '<div class="sp-plan-month__weekMeta" aria-label="주간 구간">' +
        '<div class="sp-plan-month__weekMeta-range">' +
        mdShort(sun) +
        ' – ' +
        mdShort(sat) +
        '</div>' +
        '<div class="sp-plan-month__weekMeta-wk">ISO ' +
        wk +
        '주</div>' +
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
        const demN = demoByDate[key] || 0;
        const asg = plannerAssignedMinutesForDay_(st, key) > 0 ? 1 : 0;
        const badge = apiN + qn + demN + asg;
        let dots = '';
        if (apiN) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--api" title="일정"></span>';
        if (qn) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--quick" title="빠른등록"></span>';
        if (asg) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--assign" title="시간표"></span>';
        if (demN) dots += '<span class="sp-plan-day__dot sp-plan-day__dot--demo" title="시연"></span>';
        html += `
        <button type="button" class="sp-plan-day${wkCls}${inMonth ? '' : ' is-out'}" data-ymd="${key}" ${inMonth ? '' : 'disabled'}>
          <div class="sp-plan-day__top">
            <span class="sp-plan-day__num">${d.getDate()}</span>
            ${badge ? `<span class="sp-plan-day__badge" aria-label="요약 ${badge}건">${badge}</span>` : ''}
          </div>
          <div class="sp-plan-day__dots" aria-hidden="true">${dots}</div>
        </button>`;
      }
      html += '</div>';
    }
    grid.innerHTML = html;
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
          <div class="sp-plan-day">
            <section class="sp-plan-day__left" aria-label="할 일">
              <div class="sp-plan-day__secTitle">오늘 할 일</div>
              <div class="sp-plan-day__todo" id="sp-plan-day-todo-list"></div>
            </section>
            <section class="sp-plan-day__right" aria-label="타임라인">
              <div class="sp-plan-day__secTitle">TIME TABLE</div>
              <div class="sp-plan-day__timeline">
                <p class="sp-plan-day__timelineHint">할 일 행을 클릭하면 브러시 · 시간 칸을 드래그해 칠함(브러시 없이 칸만 누르면 지움). Space=포커스 칸 토글 · ↑↓ 이동. 저장·API 없음.</p>
                <div class="sp-plan-day__timegrid" id="sp-plan-day-timegrid" role="group" aria-label="시간표"></div>
              </div>
            </section>
          </div>
          <div class="sp-plan-lock" id="sp-plan-day-lock" hidden>
            <div class="sp-plan-lock__card">
              <div class="sp-plan-lock__title">회원 전용 기능입니다</div>
              <div class="sp-plan-lock__desc">일일 플래너(시간 배치·개인 할 일)는 회원에게만 제공됩니다.</div>
              <button type="button" class="btn btn--primary sp-plan-lock__cta">구매하기</button>
            </div>
          </div>
        </div>
      </div>`;
    root.appendChild(el);
    const cta = el.querySelector('.sp-plan-lock__cta');
    if (cta) {
      cta.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        /* 시연: 결제 플로우 없이 세션 내 회원 UI(잠금 해제) — renderCalendar_ 재호출 시에도 유지 */
        st.planGuestUnlockMock = true;
        st.role = 'member';
        if (ban) ban.setAttribute('hidden', 'hidden');
        const lockEl = el.querySelector('#sp-plan-day-lock');
        if (lockEl) lockEl.setAttribute('hidden', 'hidden');
      });
    }
    el.addEventListener('click', function (e) {
      const t = /** @type {HTMLElement|null} */ (e.target);
      if (!t) return;
      if (t && t.getAttribute && t.getAttribute('data-sp-plan-close') === '1') {
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
    const todoSlot = m.querySelector('#sp-plan-day-todo-list');
    if (todoSlot) todoSlot.innerHTML = plannerDayTodosMockHtml_(st.selectedDate, st);
    const timegrid = m.querySelector('#sp-plan-day-timegrid');
    if (timegrid) timegrid.innerHTML = plannerDayTimelineHtml_(st, st.selectedDate);
    m.removeAttribute('hidden');
    const lock = m.querySelector('#sp-plan-day-lock');
    if (lock) {
      if (st.role === 'guest') lock.removeAttribute('hidden');
      else lock.setAttribute('hidden', 'hidden');
    }
  }

  function closeDayModal_() {
    const m = root.querySelector('#sp-plan-day-modal');
    if (!m) return;
    m.setAttribute('hidden', 'hidden');
  }

  slot.innerHTML =
    '<div class="sp-plan-calstack">' +
    '<section class="sp-plan-quick' +
    (st.quickRegCollapsed ? ' is-collapsed' : '') +
    '" id="sp-plan-quick-reg" aria-label="빠른 등록">' +
    '<div class="sp-plan-quick__head">' +
    '<div class="sp-plan-quick__headL">' +
    '<button type="button" class="sp-plan-quick__collapse" id="sp-quick-toggle" aria-expanded="' +
    (st.quickRegCollapsed ? 'false' : 'true') +
    '" aria-controls="sp-plan-quick-body" title="빠른 등록 접기·펼치기">' +
    '<span class="sp-plan-quick__chev" aria-hidden="true">▼</span>' +
    '</button>' +
    '<span class="sp-plan-quick__title">빠른 등록</span></div>' +
    '<span class="sp-plan-quick__note">보는 달만 · 저장 없음</span></div>' +
    '<div id="sp-plan-quick-body" class="sp-plan-quick__body">' +
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
    '</div></div></div></section>' +
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
