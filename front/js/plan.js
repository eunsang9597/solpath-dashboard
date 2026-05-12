/**
 * 플래너 임웹 전용 — 학생용 주·할 일 화면 골격(달력·DB 연동 전).
 */
const MOUNT_ID = 'solpath-plan-root';

const PLAN_SHELL_HTML = `<div class="sp-plan">
  <header class="sp-plan-top">
    <div class="sp-plan-top__left">
      <div class="sp-plan-logo" aria-hidden="true"></div>
      <div class="sp-plan-top__titles">
        <p class="sp-plan-eyebrow">솔루션 편입</p>
        <h1 class="sp-plan-title">학습 플래너</h1>
        <p class="sp-plan-tagline">날짜별 할 일과 공통 안내를 한곳에서 볼 수 있게 준비 중이에요.</p>
      </div>
    </div>
    <div class="sp-plan-user" role="group" aria-label="내 정보">
      <div class="sp-plan-user__avatar" role="presentation"></div>
      <div class="sp-plan-user__text">
        <span class="sp-plan-user__name">로그인 후 이름 표시</span>
        <span class="sp-plan-user__note">사진·닉네임 연동 예정</span>
      </div>
    </div>
  </header>

  <section class="sp-plan-card" aria-labelledby="sp-plan-week-h">
    <h2 id="sp-plan-week-h" class="sp-plan-card__h">이번 주</h2>
    <p class="sp-plan-card__p">날짜를 골라 하루씩 할 일만 모아 보는 달력은 다음 단계에서 붙일 예정이에요.</p>
    <div class="sp-plan-week" aria-hidden="true">
      <span class="sp-plan-day sp-plan-day--on">월</span>
      <span class="sp-plan-day">화</span>
      <span class="sp-plan-day">수</span>
      <span class="sp-plan-day">목</span>
      <span class="sp-plan-day">금</span>
      <span class="sp-plan-day">토</span>
      <span class="sp-plan-day">일</span>
    </div>
  </section>

  <section class="sp-plan-card" aria-labelledby="sp-plan-todo-h">
    <div class="sp-plan-card__row">
      <h2 id="sp-plan-todo-h" class="sp-plan-card__h">할 일</h2>
      <span class="sp-plan-badge">준비 중</span>
    </div>
    <ul class="sp-plan-todos">
      <li class="sp-plan-todos__item sp-plan-todos__item--demo">
        <span class="sp-plan-cb" aria-hidden="true"></span>
        <span class="sp-plan-todos__txt">예시) 오늘 강의 복습하기</span>
      </li>
      <li class="sp-plan-todos__item sp-plan-todos__item--demo">
        <span class="sp-plan-cb" aria-hidden="true"></span>
        <span class="sp-plan-todos__txt">예시) 과제 제출 전 확인</span>
      </li>
      <li class="sp-plan-todos__item sp-plan-todos__item--empty">
        <span class="sp-plan-todos__empty">연동 후에는 여기에 실제 할 일이 쌓여요.</span>
      </li>
    </ul>
  </section>

  <p class="sp-plan-foot">
    팀에서 정한 공통 일정과, 학생 파일에 쌓이는 나만의 할 일을 합쳐 보여 줄 계획이에요.
  </p>
</div>`;

function main() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;
  el.innerHTML = PLAN_SHELL_HTML;
}

main();
