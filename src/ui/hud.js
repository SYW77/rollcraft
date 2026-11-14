// HUD. 담당: 최수정
import './ui.css';

/**
 * @param {HTMLElement} container
 * @param {import('../shared/events.js').Emitter} [events]
 * @returns {{ setTime(t: number): void, setStatus(s: string): void,
 *             setLap(lap: number, total: number): void, destroy(): void }}
 *   setLap: 서킷 바퀴 표시 (total 0이면 숨김)
 */
export function createHud(container, events) {
  const el = document.createElement('div');
  el.className = 'ui-hud';
  el.innerHTML = `
    <div class="ui-hud-lap" hidden>
      <span class="ui-hud-lap-label">LAP</span>
      <span class="ui-hud-lap-num">1</span><span class="ui-hud-lap-total">/3</span>
    </div>
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
  const lapEl = el.querySelector('.ui-hud-lap');

  return {
    setTime(t) {
      timeEl.textContent = `${t.toFixed(1)}s`;
    },
    setStatus(s) {
      statusEl.textContent = s;
    },
    setLap(lap, total) {
      lapEl.hidden = !total;
      lapEl.querySelector('.ui-hud-lap-num').textContent = String(lap);
      lapEl.querySelector('.ui-hud-lap-total').textContent = `/${total}`;
    },
    destroy() {
      el.remove();
    },
  };
}
