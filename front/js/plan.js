/**
 * 플래너 임웹 전용 — 대시보드 상단 뼈대와 동일, 탭 없이 월간 플랜·달력 영역만.
 */
const MOUNT_ID = 'solpath-plan-root';

const PLAN_SHELL_HTML = `<div class="app-shell app-shell--plan">
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
    <div class="panel panel--hero sp-plan-body">
      <div class="sp-plan-monthly-title" id="sp-plan-monthly-label">월간 플랜</div>
      <div class="sp-plan-calendar-slot" role="region" aria-labelledby="sp-plan-monthly-label"></div>
    </div>
  </main>
</div>`;

function main() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;
  el.innerHTML = PLAN_SHELL_HTML;
}

main();
