// 게임 오버 화면. 담당: 최수정
import { showOverlay } from './overlay.js';

/** @returns {{ destroy(): void }} */
export function showGameOver(container, events) {
  return showOverlay(container, events, 'GAME OVER');
}
