// 게임 오버 화면. 담당: 최수정
// 아케이드 스타일 낙하/실패 연출 및 전략 팁 제공
import { showOverlay } from './overlay.js';

/**
 * @param {HTMLElement} container
 * @param {import('../shared/events.js').Emitter} events
 * @returns {{ destroy(): void }}
 */
export function showGameOver(container, events) {
  const detailHtml = `
    <div class="ui-tip-card">
      <div class="ui-tip-header">다리 고르는 팁</div>
      <ul class="ui-tip-list">
        <li><strong class="ui-tip-highlight">턱 · 계단</strong>: 큰 원이나 별처럼 크고 둥근 다리</li>
        <li><strong class="ui-tip-highlight">높은 벽</strong>: 길게 뻗은 다리로 넘어가요</li>
        <li><strong class="ui-tip-highlight">낮은 천장</strong>: 납작한 막대 · 갈고리 다리</li>
        <li><strong class="ui-tip-highlight">좁은 길 · 레일</strong>: 작은 다리로 천천히, A / D로 방향</li>
        <li><strong class="ui-tip-highlight">다시 그리기</strong>: 달리는 중에도 돼요 (그동안 느려져요)</li>
      </ul>
    </div>
  `;

  return showOverlay(container, events, {
    type: 'over',
    title: '떨어졌어요!',
    subTitle: '다리를 바꿔서 다시 도전해 봐요',
    detailHtml,
  });
}
