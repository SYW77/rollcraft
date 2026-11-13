// HUD. 담당: 최수정
import './ui.css';

/**
 * @param {HTMLElement} container
 * @param {import('../shared/events.js').Emitter} [events]
 * @returns {{ setTime(t: number): void, setStatus(s: string): void, destroy(): void }}
 */
export function createHud(container, events) {
  const el = document.createElement('div');
  el.className = 'ui-hud';
  el.innerHTML = `
    <div class="ui-hud-info">
      <div class="ui-hud-time-wrap">
        <span class="ui-hud-time-label">TIME</span>
        <span class="ui-hud-time">0.0s</span>
      </div>
      <div class="ui-hud-divider"></div>
      <span class="ui-hud-status"></span>
    </div>
  `;
  container.appendChild(el);

  const timeEl = el.querySelector('.ui-hud-time');
  const statusEl = el.querySelector('.ui-hud-status');

  return {
    setTime(t) {
      timeEl.textContent = `${t.toFixed(1)}s`;
    },
    setStatus(s) {
      statusEl.textContent = s;
    },
    destroy() {
      el.remove();
    },
  };
}
