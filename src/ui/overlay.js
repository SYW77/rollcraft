// gameOver / clear 공용 오버레이 헬퍼. 담당: 최수정
import './ui.css';
import { EVENTS } from '../shared/contracts.js';

export function showOverlay(container, events, title, detail = '') {
  const el = document.createElement('div');
  el.className = 'ui-overlay';
  el.innerHTML = `<h2>${title}</h2><div>${detail}</div>
    <div class="ui-buttons"><button data-ev="${EVENTS.RETRY}">다시 하기 (R)</button>
    <button data-ev="${EVENTS.EDIT}">모양 바꾸기</button></div>`;
  el.querySelectorAll('button').forEach((b) => (b.onclick = () => events.emit(b.dataset.ev)));
  container.appendChild(el);
  return {
    destroy() {
      el.remove();
    },
  };
}
