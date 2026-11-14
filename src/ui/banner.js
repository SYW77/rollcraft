// 화면 가운데 잠깐 뜨는 큰 글씨 (바퀴 알림 등). 담당: 최수정
import './ui.css';

/**
 * @param {HTMLElement} container
 * @param {string} text
 * @param {{ tone?: 'blue' | 'yellow', duration?: number }} [opts] duration = 초
 */
export function showBanner(container, text, { tone = 'blue', duration = 1.4 } = {}) {
  const el = document.createElement('div');
  el.className = 'ui-banner';
  el.innerHTML = `<span class="ui-banner-text ui-banner-${tone}"></span>`;
  el.querySelector('span').textContent = text;
  el.style.setProperty('--ui-banner-time', `${duration}s`);
  container.appendChild(el);
  const t = setTimeout(() => el.remove(), duration * 1000);
  return {
    destroy() {
      clearTimeout(t);
      el.remove();
    },
  };
}
