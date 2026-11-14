// 출발 카운트다운 (3 · 2 · 1 · GO!). 담당: 최수정
// 카운트다운 동안에도 아래 그리기 칸으로 다리를 미리 그릴 수 있다 (main이 물리를 멈춰 둔다).
import './ui.css';

/**
 * @param {HTMLElement} container
 * @param {{ from?: number, step?: number, onDone: () => void }} opts  step = 숫자 하나 시간 (초)
 * @returns {{ destroy(): void }}
 */
export function showCountdown(container, { from = 3, step = 0.7, onDone }) {
  const el = document.createElement('div');
  el.className = 'ui-countdown';
  container.appendChild(el);

  const timers = [];
  function show(text, go = false) {
    el.innerHTML = `<span class="ui-countdown-num${go ? ' ui-countdown-go' : ''}">${text}</span>`;
  }
  for (let i = 0; i < from; i++)
    timers.push(setTimeout(() => show(String(from - i)), i * step * 1000));
  timers.push(
    setTimeout(
      () => {
        show('GO!', true);
        onDone();
      },
      from * step * 1000,
    ),
  );
  timers.push(setTimeout(() => el.remove(), (from * step + 0.6) * 1000));

  return {
    destroy() {
      timers.forEach(clearTimeout);
      el.remove();
    },
  };
}
