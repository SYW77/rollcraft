// 멀티 플레이 메뉴: 이름 입력 + 방 만들기 / 방 코드로 참가. 담당: 최수정
import './ui.css';

const NAME_KEY = 'rollcraft_name';

/**
 * @param {HTMLElement} container
 * @param {{ onCreate: (name: string) => void, onJoin: (name: string, code: string) => void, onBack: () => void }} opts
 * @returns {{ setBusy(text: string | null): void, setError(text: string): void, destroy(): void }}
 */
export function showMultiMenu(container, { onCreate, onJoin, onBack }) {
  let saved = '';
  try {
    saved = localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    // 저장소를 못 쓰는 환경
  }
  const el = document.createElement('div');
  el.className = 'ui-overlay ui-overlay-multi';
  el.innerHTML = `
    <div class="ui-modal-card ui-multi-card">
      <h2 class="ui-modal-title">멀티 플레이</h2>
      <label class="ui-multi-field">
        <span>내 이름</span>
        <input class="ui-multi-input" data-f="name" maxlength="12" placeholder="이름" />
      </label>
      <button type="button" class="ui-btn ui-btn-primary" data-act="create">방 만들기</button>
      <div class="ui-multi-or">또는 방 코드로 참가</div>
      <div class="ui-multi-join">
        <input class="ui-multi-input ui-multi-code" data-f="code" maxlength="4" placeholder="ABCD" />
        <button type="button" class="ui-btn ui-btn-secondary" data-act="join">참가</button>
      </div>
      <p class="ui-multi-msg"></p>
      <button type="button" class="ui-btn ui-btn-secondary ui-multi-back" data-act="back">
        <span>뒤로</span><kbd class="ui-btn-key">ESC</kbd>
      </button>
    </div>
  `;
  container.appendChild(el);
  const nameIn = el.querySelector('[data-f=name]');
  const codeIn = el.querySelector('[data-f=code]');
  const msg = el.querySelector('.ui-multi-msg');
  nameIn.value = saved;
  codeIn.addEventListener('input', () => {
    codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z]/g, '');
  });
  const name = () => {
    const n = nameIn.value.trim() || '플레이어';
    try {
      localStorage.setItem(NAME_KEY, n);
    } catch {
      // 저장 못 해도 진행
    }
    return n;
  };
  let busy = false;
  el.querySelector('[data-act=create]').onclick = () => !busy && onCreate(name());
  const join = () => {
    if (busy) return;
    if (codeIn.value.length !== 4) {
      msg.textContent = '방 코드 4글자를 넣어 주세요';
      return;
    }
    onJoin(name(), codeIn.value);
  };
  el.querySelector('[data-act=join]').onclick = join;
  codeIn.addEventListener('keydown', (e) => e.key === 'Enter' && join());
  el.querySelector('[data-act=back]').onclick = () => onBack();
  const onKey = (e) => e.code === 'Escape' && onBack();
  addEventListener('keydown', onKey);
  setTimeout(() => (saved ? codeIn : nameIn).focus(), 0);

  return {
    setBusy(text) {
      busy = !!text;
      el.classList.toggle('ui-multi-busy', busy);
      msg.textContent = text ?? '';
    },
    setError(text) {
      busy = false;
      el.classList.remove('ui-multi-busy');
      msg.textContent = text;
    },
    destroy() {
      removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}
