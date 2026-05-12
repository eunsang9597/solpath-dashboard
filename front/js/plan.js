/**
 * 플래너 임웹 전용 — PC 베이스: 상단 프로필 행 + 제목 + 달력 영역만.
 * styles.css가 늦게 오거나 실패해도 레이아웃·제목색이 유지되도록 핵심만 인라인으로 둠.
 */
const MOUNT_ID = 'solpath-plan-root';

const PLAN_SHELL_HTML = `<div class="sp-plan sp-plan--pc" style="max-width:min(100%,72rem);margin:0 auto;padding:1rem clamp(1rem,2.5vw,2rem) 2rem;box-sizing:border-box;font-family:Pretendard,system-ui,'Apple SD Gothic Neo',sans-serif">
  <header class="sp-plan-head" style="background:#fff;border:1px solid #e8e0f0;border-radius:12px;padding:1rem 1.35rem 1.15rem;margin-bottom:1.25rem;box-shadow:0 1px 4px rgba(74,20,140,0.06)">
    <div class="sp-plan-head__profile" style="display:flex;align-items:center;gap:0.85rem;min-height:52px">
      <div class="sp-plan-head__avatar" role="presentation" aria-hidden="true" style="width:48px;height:48px;border-radius:50%;flex-shrink:0;background:linear-gradient(160deg,#ede7f6,#d1c4e9);border:1px solid #e1bee7;box-sizing:border-box"></div>
      <div class="sp-plan-head__profile-meta" style="flex:1;min-height:48px;min-width:8rem"></div>
    </div>
    <h1 class="sp-plan-head__title" style="margin:0.9rem 0 0;padding:0;font-size:clamp(1.35rem,2.1vw,1.85rem);font-weight:750;letter-spacing:-0.03em;color:#4a148c;line-height:1.2">학습 플래너</h1>
  </header>
  <section class="sp-plan-calendar" aria-label="달력" style="min-height:24rem;border-radius:12px;border:2px dashed #d1c4e9;background:#faf8ff;box-sizing:border-box"></section>
</div>`;

function main() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;
  el.innerHTML = PLAN_SHELL_HTML;
}

main();
