/**
 * 플래너 임웹 전용 엔트리. 달력·연동 전까지 기본 쉘만 표시 (학생·비회원 가독성 우선).
 */
const MOUNT_ID = 'solpath-plan-root';

const PLAN_SHELL_HTML = `<div class="app-shell app-shell--plan solpath-plan-shell">
  <div class="panel panel--hero solpath-plan-hero">
    <div class="panel__head solpath-plan-hero__head">
      <div class="solpath-plan-head-left">
        <span class="brand-mark solpath-plan-head__mark" aria-hidden="true"></span>
        <div class="solpath-plan-head-titles">
          <p class="solpath-plan-kicker">솔루션 편입</p>
          <h1 class="solpath-plan-head-title">학습 플래너</h1>
        </div>
      </div>
      <div class="solpath-plan-profile" aria-label="프로필">
        <span class="solpath-plan-profile__avatar" aria-hidden="true">학</span>
        <div class="solpath-plan-profile__text">
          <span class="solpath-plan-profile__name">학습자</span>
          <span class="solpath-plan-profile__sub">이름·사진은 연동 후 표시</span>
        </div>
      </div>
    </div>
    <div class="sp-confirm-block solpath-plan-block">
      <p class="sp-intro-title" id="solpath-plan-panel-label">플래너 화면</p>
      <div class="header-desc solpath-plan-panel__desc">
        <p>
          달력·일정·할 일은 단계적으로 연결할 예정입니다. 아래는 이후 화면이 붙을 자리입니다.
        </p>
      </div>
      <div class="solpath-plan-placeholder" role="status" aria-live="polite">
        <div class="solpath-plan-placeholder__grid" aria-hidden="true"></div>
        <p class="solpath-plan-placeholder__hint">콘텐츠 영역 (준비 중)</p>
      </div>
    </div>
  </div>
</div>`;

function main() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;
  el.innerHTML = PLAN_SHELL_HTML;
}

main();
