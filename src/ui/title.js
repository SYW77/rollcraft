// 타이틀 화면: 로고 + 메뉴 (싱글 플레이 · 멀티 플레이 · 설정 · 게임 종료). 담당: 최수정
// 뒤로 게임 장면이 비쳐 보인다 (카메라는 main이 돌린다).
// 키보드: ↑ / ↓ 로 고르고 Enter / Space로 실행. 마우스로 누르면 바로 실행.
import './ui.css';

/**
 * @param {HTMLElement} container
 * @param {{ onSingle: () => void, onMulti: () => void, onSettings: () => void, onQuit: () => void }} opts
 * @returns {{ destroy(): void, setEnabled(on: boolean): void }}
 *   setEnabled(false): 설정 창처럼 다른 창이 위에 떠 있는 동안 키 입력을 받지 않는다
 */
export function showTitle(container, { onSingle, onMulti, onSettings, onQuit }) {
  const el = document.createElement('div');
  el.className = 'ui-title';
  el.innerHTML = `
    <div class="ui-title-inner">
      <!-- 우리 블록 고양이 (옆모습) + 허브에서 뻗은 다리. 뒤 다리는 180° 엇갈려 연하게 -->
      <svg class="ui-title-mark" viewBox="0 0 160 120" aria-hidden="true">
        <path class="leg leg-back" d="M74 70 C 62 58, 66 40, 50 34 S 30 40, 26 28" />
        <path class="blk tail" d="M44 58 L 30 36 L 38 32 L 52 54 Z" />
        <rect class="blk" x="46" y="50" width="56" height="40" />
        <rect class="blk" x="78" y="22" width="40" height="38" />
        <path class="blk" d="M82 24 L 88 8 L 96 24 Z" />
        <path class="blk" d="M100 24 L 108 8 L 116 24 Z" />
        <rect class="cream" x="104" y="40" width="16" height="14" />
        <rect class="ink" x="104" y="32" width="5" height="8" />
        <rect class="pink" x="116" y="42" width="5" height="4" />
        <path class="leg" d="M74 70 C 86 82, 82 100, 98 106 S 118 100, 122 112" />
        <circle class="hub" cx="74" cy="70" r="7" />
      </svg>
      <h1 class="ui-title-logo">ROLL<span>CRAFT</span></h1>
      <p class="ui-title-tagline">직접 그리는 나만의 레이싱</p>
      <nav class="ui-title-menu">
        <button type="button" class="ui-btn ui-btn-primary" data-act="single">싱글 플레이</button>
        <button type="button" class="ui-btn ui-btn-secondary" data-act="multi">
          멀티 플레이 <small class="ui-title-soon">준비 중</small>
        </button>
        <button type="button" class="ui-btn ui-btn-secondary" data-act="settings">설정</button>
        <button type="button" class="ui-btn ui-btn-secondary" data-act="quit">게임 종료</button>
      </nav>
      <p class="ui-title-credit">Team J · CG Term Project</p>
    </div>
  `;
  container.appendChild(el);

  const acts = { single: onSingle, multi: onMulti, settings: onSettings, quit: onQuit };
  const buttons = [...el.querySelectorAll('.ui-title-menu button')];
  let index = 0;
  let enabled = true;
  function select(i) {
    index = (i + buttons.length) % buttons.length;
    buttons.forEach((b, k) => b.classList.toggle('ui-focus', k === index));
  }
  buttons.forEach((b, k) => {
    b.onclick = () => {
      b.blur();
      select(k);
      acts[b.dataset.act]();
    };
    b.onmouseenter = () => select(k);
  });
  select(0);

  const onKey = (e) => {
    if (!enabled || e.repeat) return;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') select(index + 1);
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') select(index - 1);
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
      e.preventDefault();
      acts[buttons[index].dataset.act]();
    } else return;
    e.preventDefault();
  };
  addEventListener('keydown', onKey);

  return {
    setEnabled(on) {
      enabled = on;
    },
    destroy() {
      removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}

/**
 * 게임 종료 화면 (브라우저가 창 닫기를 막았을 때).
 * @param {HTMLElement} container
 * @param {{ onBack: () => void }} opts
 * @returns {{ destroy(): void }}
 */
export function showQuitScreen(container, { onBack }) {
  const el = document.createElement('div');
  el.className = 'ui-overlay ui-quit';
  el.innerHTML = `
    <div class="ui-modal-card">
      <h2 class="ui-modal-title">게임을 종료했어요</h2>
      <p class="ui-modal-sub">플레이해 줘서 고마워요! 이제 창을 닫아도 돼요.</p>
      <div class="ui-modal-actions">
        <button type="button" class="ui-btn ui-btn-primary">타이틀로</button>
      </div>
    </div>
  `;
  el.querySelector('button').onclick = () => onBack();
  container.appendChild(el);
  return {
    destroy() {
      el.remove();
    },
  };
}
