/**
 * 플래너 임웹 전용 엔트리. 현재는 빈 페이지(마운트 비움)만 — UI·달력은 추후.
 */
const MOUNT_ID = 'solpath-plan-root';

function main() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;
  el.innerHTML = '';
}

main();
