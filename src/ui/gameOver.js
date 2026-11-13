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
        <li><strong class="ui-tip-highlight">분할 레일</strong>: 레일 틈(0.6m)보다 접촉 구간이 넓은 모양(원통·구·아령) 선택</li>
        <li><strong class="ui-tip-highlight">불규칙 계단</strong>: 단차를 타고 넘을 수 있는 반지름이 큰 모양(구) 선택</li>
        <li><strong class="ui-tip-highlight">급커브</strong>: 바깥 벽이 없으므로 아령을 쓰거나 커브 진입 전 감속(S) 필요</li>
        <li><strong class="ui-tip-highlight">강풍 구간</strong>: 옆바람(7m/s) 투영 면적이 작아 잘 밀리지 않는 원통 선택</li>
        <li><strong class="ui-tip-highlight">변신 작업대</strong>: 패드 위에 올라 [F] 키를 눌러 다음 코스용 모양으로 변신</li>
      </ul>
    </div>
  `;

  return showOverlay(container, events, {
    type: 'over',
    icon: '💥',
    title: 'GAME OVER',
    subTitle: '코스 밖으로 추락했거나 장애물에 걸렸습니다.',
    detailHtml,
  });
}
