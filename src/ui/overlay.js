// gameOver / clear 공용 오버레이 헬퍼. 담당: 최수정
// 아케이드 스타일 글래스모피즘 모달 카드 및 키 가이드 버튼
import './ui.css';
import { EVENTS } from '../shared/contracts.js';

/**
 * @param {HTMLElement} container
 * @param {import('../shared/events.js').Emitter} events
 * @param {{
 *   type: 'clear' | 'over',
 *   icon?: string, (쓰지 않음)
 *   title: string,
 *   subTitle?: string,
 *   detailHtml?: string
 * }} opts
 * @returns {{ destroy(): void }}
 */
export function showOverlay(container, events, { type, title, subTitle = '', detailHtml = '' }) {
  const el = document.createElement('div');
  el.className = `ui-overlay ui-overlay-${type}`;

  el.innerHTML = `
    <div class="ui-modal-card">
      <h2 class="ui-modal-title">${title}</h2>
      ${subTitle ? `<p class="ui-modal-sub">${subTitle}</p>` : ''}
      ${detailHtml ? `<div class="ui-modal-detail">${detailHtml}</div>` : ''}
      <div class="ui-modal-actions">
        <button type="button" class="ui-btn ui-btn-primary" data-ev="${EVENTS.RETRY}">
          <span>다시 도전</span>
          <kbd class="ui-btn-key">R</kbd>
        </button>
        <button type="button" class="ui-btn ui-btn-secondary" data-ev="${EVENTS.EDIT}">
          <span>다리 지우기</span>
          <kbd class="ui-btn-key">E</kbd>
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
