// 클리어 화면. 담당: 최수정
// 아케이드 스타일 클리어 연출 및 신기록 표시
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
    // localStorage 제한 환경 fallback
  }

  const detailHtml = `
    <div class="ui-record-card">
      <span class="ui-record-label">FINAL RECORD</span>
      <div class="ui-record-value-wrap">
        <span class="ui-record-num">${formattedTime}</span>
        <span class="ui-record-unit">SEC</span>
      </div>
      ${isNewRecord ? '<div class="ui-record-badge-new">★ NEW BEST RECORD</div>' : ''}
    </div>
  `;

  return showOverlay(container, events, {
    type: 'clear',
    icon: '🏆',
    title: 'STAGE CLEARED',
    subTitle: '장애물 코스를 완벽하게 돌파했습니다!',
    detailHtml,
  });
}
