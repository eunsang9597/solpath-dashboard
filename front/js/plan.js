/**
 * 플래너 임웹 전용 — PC 베이스: 상단 프로필 행 + 제목 + 달력 영역만.
 */
const MOUNT_ID = 'solpath-plan-root';

const PLAN_SHELL_HTML = `<div class="sp-plan sp-plan--pc">
  <header class="sp-plan-head">
    <div class="sp-plan-head__profile">
      <div class="sp-plan-head__avatar" role="presentation" aria-hidden="true"></div>
      <div class="sp-plan-head__profile-meta"></div>
    </div>
    <h1 class="sp-plan-head__title">학습 플래너</h1>
  </header>
  <section class="sp-plan-calendar" aria-label="달력"></section>
</div>`;

function main() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;
  el.innerHTML = PLAN_SHELL_HTML;
}

main();
