// 일시정지: 화면 오른쪽 위 버튼 + 메뉴 (계속하기 · 처음부터 · 타이틀로). 담당: 최수정
// 키보드 Esc는 main이 받아서 open/close를 부른다. 여기서는 버튼 클릭만 처리한다.
import './ui.css';

/**
 * 오른쪽 위 일시정지 버튼.
 * @param {HTMLElement} container
 * @param {{ onClick: () => void }} opts
 * @returns {{ destroy(): void }}
 */
export function createPauseButton(container, { onClick }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ui-pause-btn';
  btn.title = '일시정지 (Esc)';
  btn.innerHTML = `<span class="ui-pause-icon" aria-hidden="true"></span><kbd>ESC</kbd>`;
  btn.onclick = () => {
    btn.blur();
    onClick();
  };
  container.appendChild(btn);
  return {
    destroy() {
      btn.remove();
    },
  };
}

/**
 * 일시정지 메뉴.
 * @param {HTMLElement} container
 * @param {{ onResume: () => void, onRestart: () => void, onTitle: () => void }} opts
 * @returns {{ destroy(): void }}
 */
export function showPauseMenu(container, { onResume, onRestart, onTitle }) {
  const el = document.createElement('div');
  el.className = 'ui-overlay ui-overlay-pause';
  el.innerHTML = `
    <div class="ui-modal-card ui-pause-card">
      <h2 class="ui-modal-title">일시정지</h2>
      <div class="ui-pause-actions">
        <button type="button" class="ui-btn ui-btn-primary" data-act="resume">
          <span>계속하기</span><kbd class="ui-btn-key">ESC</kbd>
        </button>
        <button type="button" class="ui-btn ui-btn-secondary" data-act="restart">
          <span>처음부터</span><kbd class="ui-btn-key">R</kbd>
        </button>
        <button type="button" class="ui-btn ui-btn-secondary" data-act="title">
          <span>타이틀로</span>
        </button>
      </div>
    </div>
  `;
  const acts = { resume: onResume, restart: onRestart, title: onTitle };
  el.querySelectorAll('button[data-act]').forEach((b) => {
    b.onclick = () => {
      b.blur();
      acts[b.dataset.act]();
    };
  });
  container.appendChild(el);
  return {
    destroy() {
      el.remove();
    },
  };
}
