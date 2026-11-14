// 타이틀 화면. 담당: 최수정
// 게임 이름 · 한 줄 소개 · 시작 버튼 · 3단계 조작 안내. 뒤로 게임 장면이 비쳐 보인다 (카메라는 main이 돌린다).
// 시작: 버튼 클릭 또는 Enter / Space → onStart()
import './ui.css';

/**
 * @param {HTMLElement} container
 * @param {{ onStart: () => void }} opts
 * @returns {{ destroy(): void }}
 */
export function showTitle(container, { onStart }) {
  const el = document.createElement('div');
  el.className = 'ui-title';
  el.innerHTML = `
    <div class="ui-title-inner">
      <!-- 우리 블록 고양이 (옆모습) + 주황 시작점에서 뻗은 다리. 뒤 다리는 180° 엇갈려 연하게 -->
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
      <p class="ui-title-tagline">다리를 그려서 장애물을 넘어라</p>
      <button type="button" class="ui-btn ui-btn-primary ui-title-start">
        <span>시작하기</span>
        <kbd class="ui-btn-key">ENTER</kbd>
      </button>
      <ol class="ui-title-steps">
        <li><b>1</b><span>아래 칸에 선을 그려요<br /><small>펜을 댄 곳이 몸통에 붙어요</small></span></li>
        <li><b>2</b><span>W로 달려요<br /><small>A / D로 방향</small></span></li>
        <li><b>3</b><span>막히면 다시 그려요<br /><small>달리는 중에도 돼요</small></span></li>
      </ol>
      <p class="ui-title-credit">Team J · CG Term Project</p>
    </div>
  `;
  container.appendChild(el);

  let done = false;
  function start() {
    if (done) return;
    done = true;
    onStart();
  }
  const btn = el.querySelector('.ui-title-start');
  btn.onclick = () => {
    btn.blur();
    start();
  };
  const onKey = (e) => {
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
      e.preventDefault();
      start();
    }
  };
  addEventListener('keydown', onKey);

  return {
    destroy() {
      removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}
