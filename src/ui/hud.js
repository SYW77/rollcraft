// HUD. 담당: 최수정
import './ui.css';

/** @param {HTMLElement} container */
export function createHud(container) {
  const el = document.createElement('div');
  el.className = 'ui-hud';
  container.appendChild(el);
  let time = 0;
  let status = '';
  const draw = () => (el.textContent = `${time.toFixed(1)}s  ${status}`);
  draw();

  return {
    setTime(t) {
      time = t;
      draw();
    },
    setStatus(s) {
      status = s;
      draw();
    },
    destroy() {
      el.remove();
    },
  };
}
