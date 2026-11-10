// 클리어 화면. 담당: 최수정
// 완주 축하 및 클리어 타임 / 최고 기록 표시
import { showOverlay } from './overlay.js';

const BEST_RECORD_KEY = 'rollcraft_best_time';

/**
 * @param {HTMLElement} container
 * @param {import('../shared/events.js').Emitter} events
 * @param {{ time: number }} opts
 * @returns {{ destroy(): void }}
 */
export function showClear(container, events, { time }) {
  const formattedTime = time.toFixed(2);
  let isNewRecord = false;

  try {
    const prevBest = localStorage.getItem(BEST_RECORD_KEY);
    if (!prevBest || time < parseFloat(prevBest)) {
      localStorage.setItem(BEST_RECORD_KEY, time.toString());
      if (prevBest) isNewRecord = true;
    }
  } catch (_) {
    // localStorage 접근 제한 환경 fallback
  }

  const detailHtml = `
    <div class="ui-record-box">
      <span class="ui-record-label">CLEAR TIME</span>
      <span class="ui-record-value">${formattedTime}s</span>
      ${isNewRecord ? '<span class="ui-record-new">★ NEW RECORD!</span>' : ''}
    </div>
  `;

  return showOverlay(container, events, {
    type: 'clear',
    badge: '🏆 STAGE CLEAR',
    title: '코스 완주 성공!',
    subTitle: '장애물 코스를 무사히 통과했습니다.',
    detailHtml,
  });
}
