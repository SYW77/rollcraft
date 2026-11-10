// 게임 오버 화면. 담당: 최수정
// 낙하/실패 알림 및 장애물 공략 팁 제공
import { showOverlay } from './overlay.js';

/**
 * @param {HTMLElement} container
 * @param {import('../shared/events.js').Emitter} events
 * @returns {{ destroy(): void }}
 */
export function showGameOver(container, events) {
  const detailHtml = `
    <div class="ui-tip-box">
      <div class="ui-tip-title">💡 장애물 공략 팁</div>
      <p class="ui-tip-desc">
        • <strong>분할 레일</strong>: 가운데 틈보다 허리가 넓은 원통/막대 모양<br>
        • <strong>불규칙 계단</strong>: 단차를 딛고 넘어갈 수 있는 반지름이 큰 모양
      </p>
    </div>
  `;

  return showOverlay(container, events, {
    type: 'over',
    badge: '💥 GAME OVER',
    title: '코스 밖으로 추락!',
    subTitle: '트랙에서 벗어나거나 장애물을 넘지 못했습니다.',
    detailHtml,
  });
}
