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
      <div class="ui-tip-header">
        <span>💡</span>
        <span>코스 공략 전술 팁</span>
      </div>
      <ul class="ui-tip-list">
        <li><strong class="ui-tip-highlight">분할 레일</strong>: 레일 틈(0.6m)보다 접촉 구간이 넓은 모양 선택</li>
        <li><strong class="ui-tip-highlight">불규칙 계단</strong>: 단차를 타고 넘을 수 있는 반지름이 큰 모양 선택</li>
      </ul>
    </div>
  `;

  return showOverlay(container, events, {
    type: 'over',
    icon: '💥',
    title: 'RUN FAILED',
    subTitle: '코스 밖으로 추락했거나 장애물에 걸렸습니다.',
    detailHtml,
  });
}
