/**
 * 플래너 임웹 전용 — 전화 확인 후 공통·개인 일정 표시 (드라이브 링크 없음).
 * `config.js`를 import하지 않음: CDN·임웹에서 `plan.js`만 로드되어도 동작하고, 2차 모듈 요청 404를 피함.
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

/** @param {string} s */
function esc(s) {
  return String(s != null ? s : '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {Record<string, unknown>} payload
 * @return {Promise<Record<string, unknown>>}
 */
async function plannerPost_(payload) {
  const url = String(GAS_BASE_URL || '').trim();
  if (!url) {
    return { ok: false, error: { code: 'NO_GAS_URL', message: 'gasBaseUrl이 없습니다.' } };
  }
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    const m = e && typeof e === 'object' && 'message' in e ? String(/** @type {{ message?: string }} */ (e).message) : String(e);
    return { ok: false, error: { code: 'NETWORK', message: m } };
  }
  if (!res.ok) {
    const t = await res.text().catch(function () {
      return '';
    });
    return { ok: false, error: { code: 'HTTP_' + res.status, message: t.slice(0, 400) || res.statusText } };
  }
  const txt = await res.text();
  let j;
  try {
    j = JSON.parse(txt);
  } catch (_e) {
    return { ok: false, error: { code: 'BAD_JSON', message: txt.slice(0, 400) } };
  }
  return j;
}

const PLAN_DEV_HTML = `<div class="sp-plan-devbar" id="sp-plan-devbar" role="region" aria-label="제작용 도구">
  <span class="sp-plan-devbar__label">제작용</span>
  <button type="button" class="btn btn--ghost sp-plan-devbar__btn" id="sp-plan-dev-reset">DB 초기화(학생파일 포함)</button>
  <button type="button" class="btn btn--ghost sp-plan-devbar__btn" id="sp-plan-dev-sync">동기화(레지스트리+학생파일)</button>
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
          inputmode="numeric"
          maxlength="3"
          pattern="[0-9]*"
          autocomplete="off"
          aria-label="휴대전화 앞자리 세 자리"
        />
        <span class="sp-plan-gate__dash" aria-hidden="true">-</span>
        <input
          class="sp-plan-gate__input sp-plan-gate__input--seg4"
          id="sp-plan-p1"
          type="text"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]*"
          autocomplete="off"
          aria-label="휴대전화 중간 네 자리"
        />
        <span class="sp-plan-gate__dash" aria-hidden="true">-</span>
        <input
          class="sp-plan-gate__input sp-plan-gate__input--seg4"
          id="sp-plan-p2"
          type="text"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]*"
          autocomplete="off"
          aria-label="휴대전화 끝 네 자리"
        />
      </div>
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
 * @param {HTMLElement} root
 * @param {{ role: string, common: object[], personal: object[] | null }} boot
 */
function renderCalendar_(root, boot) {
  const slot = root.querySelector('#sp-plan-calendar-slot');
  const ban = root.querySelector('#sp-plan-banner');
  if (!slot) return;
  const role = boot && boot.role === 'member' ? 'member' : 'guest';
  if (ban) {
    if (role === 'guest') {
      ban.textContent = '등록된 번호로 확인되지 않아 공통 일정만 표시합니다.';
      ban.removeAttribute('hidden');
    } else {
      ban.setAttribute('hidden', 'hidden');
    }
  }
  const common = boot && Array.isArray(boot.common) ? boot.common : [];
  const personal = boot && boot.personal != null && Array.isArray(boot.personal) ? boot.personal : [];
  const lines = common
    .slice()
    .sort(function (a, b) {
      const da = String(a.start_date || '');
      const db = String(b.start_date || '');
      if (da !== db) return da < db ? -1 : da > db ? 1 : 0;
      return (Number(a.sort_key) || 0) - (Number(b.sort_key) || 0);
    })
    .map(function (ev) {
      const t = esc(ev.title || '(제목 없음)');
      const r0 = esc(String(ev.start_date || ''));
      const r1 = esc(String(ev.end_date || ''));
      return `<li><span class="sp-plan-ev__date">${r0}${r1 && r1 !== r0 ? ' ~ ' + r1 : ''}</span> <span class="sp-plan-ev__title">${t}</span></li>`;
    });
  const pLines =
    role === 'member' && personal.length
      ? personal
          .map(function (ev) {
            const t = esc(ev && ev.title != null ? ev.title : '일정');
            const d0 = esc(String((ev && ev.start_date) || ''));
            const datePart = d0 ? `<span class="sp-plan-ev__date">${d0}</span> ` : '';
            return `<li>${datePart}<span class="sp-plan-ev__title">${t}</span></li>`;
          })
          .join('')
      : '';
  slot.innerHTML = `
    <div class="sp-plan-calwrap">
      <section class="sp-plan-calsec" aria-label="공통 일정">
        <div class="sp-plan-calsec__h" role="heading" aria-level="3">공통 일정</div>
        ${lines.length ? `<ul class="sp-plan-evlist">${lines.join('')}</ul>` : '<p class="sp-plan-empty">등록된 공통 일정이 없습니다.</p>'}
      </section>
      ${
        role === 'member'
          ? `<section class="sp-plan-calsec" aria-label="나의 할 일"><div class="sp-plan-calsec__h" role="heading" aria-level="3">나의 할 일</div>${
              pLines.length ? `<ul class="sp-plan-evlist">${pLines}</ul>` : '<p class="sp-plan-empty">등록된 할 일이 없습니다.</p>'
            }</section>`
          : ''
      }
    </div>`;
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
    const boot = await plannerPost_({
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
    const d = /** @type {{ role?: string, common?: object[], personal?: object[] | null }} */ (boot.data || {});
    gate.setAttribute('hidden', 'hidden');
    app.removeAttribute('hidden');
    renderCalendar_(root, { role: d.role || 'guest', common: d.common || [], personal: d.personal != null ? d.personal : null });
  }

  btn.addEventListener('click', async function () {
    showErr('');
    const p0 = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-p0'));
    const p1 = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-p1'));
    const p2 = /** @type {HTMLInputElement | null} */ (root.querySelector('#sp-plan-p2'));
    const segs = readPhoneSegments_([p0 && p0.value, p1 && p1.value, p2 && p2.value]);
    const name = nameInput ? String(nameInput.value || '').trim() : '';

    const res = await plannerPost_({
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
  const resetBtn = root.querySelector('#sp-plan-dev-reset');
  const syncBtn = root.querySelector('#sp-plan-dev-sync');
  if (!resetBtn || !syncBtn) return;

  function showDevMsg(text) {
    if (msg) msg.textContent = text || '';
  }

  resetBtn.addEventListener('click', async function () {
    showDevMsg('');
    if (
      !confirm(
        '플래너 마스터에서 레지스트리·방문 기록·학생 링크(2행~)을 비우고, 연결된 학생용 스프레드시트를 모두 휴지통으로 보냅니다. 계속할까요?'
      )
    ) {
      return;
    }
    const r = await plannerPost_({ action: 'plannerDevFullReset' });
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
    const r = await plannerPost_({ action: 'plannerRegistryRebuild' });
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
  el.innerHTML = `<div class="sp-plan-rootinner">${PLAN_DEV_HTML}${GATE_HTML}${PLAN_APP_HTML}</div>`;
  const app = el.querySelector('.app-shell--plan');
  if (app) app.setAttribute('hidden', 'hidden');
  if (GAS_MODE.useMock) {
    const g = el.querySelector('.sp-plan-gate');
    if (g) {
      g.innerHTML =
        '<p class="sp-plan-gate__err">스니펫에 Web App 주소(<code>gasBaseUrl</code>)가 없어 플래너를 불러올 수 없습니다.</p>';
    }
    return;
  }
  wireGate_(el);
  wirePlanDevBar_(el);
}

main();
