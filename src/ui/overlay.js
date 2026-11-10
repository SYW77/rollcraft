// gameOver / clear 공용 오버레이 헬퍼. 담당: 최수정
// 세련된 글래스모피즘 모달 카드 UI 및 인터랙션 구현
import './ui.css';
import { EVENTS } from '../shared/contracts.js';

/**
 * @param {HTMLElement} container
 * @param {import('../shared/events.js').Emitter} events
 * @param {{
 *   type: 'clear' | 'over',
 *   badge?: string,
 *   title: string,
 *   subTitle?: string,
 *   detailHtml?: string
 * }} opts
 * @returns {{ destroy(): void }}
 */
export function showOverlay(
  container,
  events,
  { type, badge = '', title, subTitle = '', detailHtml = '' },
) {
  const el = document.createElement('div');
  el.className = `ui-overlay ui-overlay-${type}`;

  el.innerHTML = `
    <div class="ui-modal-card">
      ${badge ? `<div class="ui-modal-badge">${badge}</div>` : ''}
      <h2 class="ui-modal-title">${title}</h2>
      ${subTitle ? `<p class="ui-modal-sub">${subTitle}</p>` : ''}
      ${detailHtml ? `<div class="ui-modal-detail">${detailHtml}</div>` : ''}
      <div class="ui-modal-actions">
        <button type="button" class="ui-btn ui-btn-primary" data-ev="${EVENTS.RETRY}">
          다시 도전 (R)
        </button>
        <button type="button" class="ui-btn ui-btn-secondary" data-ev="${EVENTS.EDIT}">
          모양 바꾸기 (E)
        </button>
      </div>
    </div>
  `;

  el.querySelectorAll('button[data-ev]').forEach((btn) => {
    btn.onclick = () => {
      btn.blur();
      events.emit(btn.dataset.ev);
    };
  });

  container.appendChild(el);

  return {
    destroy() {
      el.remove();
    },
  };
}
