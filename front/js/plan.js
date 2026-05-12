/**
 * 플래너 임웹 전용 엔트리. 달력·연동 전까지 기본 쉘(헤더·안내·자리 표시)만 표시.
 */
const MOUNT_ID = 'solpath-plan-root';

const PLAN_SHELL_HTML = `<div class="app-shell app-shell--plan solpath-plan-shell">
  <header class="app-header">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true"></span>
      <div>
        <div class="brand-kicker">솔루션 편입</div>
        <div class="brand__title">학습 플래너</div>
        <p
          class="sp-cdn-build"
          id="sp-planCdnBuild"
          title=""
          hidden
          aria-label="화면 버전 표시. 임웹 스니펫과 같은 배포인지 확인할 때 참고"
        ></p>
      </div>
    </div>
  </header>
  <main class="solpath-plan-main">
    <section class="sp-intro-card" aria-labelledby="solpath-plan-panel-label">
      <p class="sp-intro-title" id="solpath-plan-panel-label">플래너 화면</p>
      <div class="header-desc solpath-plan-panel__desc">
        <p>
          달력·일정·할 일은 단계적으로 연결할 예정입니다. 아래는 이후 UI가 붙을 자리입니다.
        </p>
      </div>
      <div class="solpath-plan-placeholder" role="status" aria-live="polite">
        <div class="solpath-plan-placeholder__grid" aria-hidden="true"></div>
        <p class="solpath-plan-placeholder__hint">콘텐츠 영역 (준비 중)</p>
      </div>
    </section>
  </main>
</div>`;

/**
 * @returns {{ full: string, fromModule: string, fromSnippet: string, mismatch: boolean }}
 */
function resolveCdnBuildMeta_() {
  let fromModule = '';
  try {
    const u = import.meta.url;
    let m = u.match(/solpath-dashboard-front@([0-9a-fA-F]{7,40})\//i);
    if (!m) {
      m = u.match(/solpath-dashboard@([0-9a-fA-F]{7,40})\/front\//i);
    }
    if (m) {
      fromModule = m[1].toLowerCase();
    }
  } catch (e) {
    void e;
  }
  let fromSnippet = '';
  if (typeof window !== 'undefined' && window.__SOLPATH__ && window.__SOLPATH__.cdnCommit) {
    fromSnippet = String(window.__SOLPATH__.cdnCommit).toLowerCase();
  }
  const full = fromModule || fromSnippet;
  const mismatch = Boolean(fromModule && fromSnippet && fromModule !== fromSnippet);
  return { full, fromModule, fromSnippet, mismatch };
}

function stampPlanCdnBuild_() {
  const { full, fromModule, fromSnippet, mismatch } = resolveCdnBuildMeta_();
  const el = document.getElementById('sp-planCdnBuild');
  if (!full) {
    if (el) {
      el.textContent = '버전 —';
      el.setAttribute('title', '로컬에서 열었거나 표시 정보를 읽지 못한 경우 비어 있을 수 있습니다.');
      el.removeAttribute('hidden');
    }
    return;
  }
  const short = full.length >= 7 ? full.slice(0, 7) : full;
  if (el) {
    el.textContent = '버전 ' + short;
    let tip = '이 화면이 어느 배포본인지 확인할 때 쓰는 짧은 표시입니다.';
    if (fromModule) {
      tip = '지금 브라우저가 불러온 파일 기준 표시입니다.';
    } else if (fromSnippet) {
      tip = '임웹 스니펫에 적어 둔 cdnCommit 기준입니다.';
    }
    if (mismatch) {
      tip += ' (스니펫 cdnCommit와 불러온 plan.js의 SHA가 다릅니다. 스니펫·핀을 맞춰 주세요.)';
    }
    el.setAttribute('title', tip);
    el.removeAttribute('hidden');
  }
}

function main() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;
  el.innerHTML = PLAN_SHELL_HTML;
  stampPlanCdnBuild_();
}

main();
