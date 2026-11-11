// HUD. 담당: 최수정
import './ui.css';
import { EVENTS } from '../shared/contracts.js';

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
    <button type="button" class="ui-hud-btn" title="모양 설정 화면으로 이동 (E)">
      <span>모양 바꾸기</span>
      <kbd class="ui-btn-key">E</kbd>
    </button>
  `;
  container.appendChild(el);

  const timeEl = el.querySelector('.ui-hud-time');
  const statusEl = el.querySelector('.ui-hud-status');
  const editBtn = el.querySelector('.ui-hud-btn');

  editBtn.onclick = () => {
    editBtn.blur();
    if (events) {
      events.emit(EVENTS.EDIT);
    } else {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    }
  };

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
