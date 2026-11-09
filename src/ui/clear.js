// 클리어 화면. 담당: 최수정
import { showOverlay } from './overlay.js';

/** @returns {{ destroy(): void }} */
export function showClear(container, events, { time }) {
  return showOverlay(container, events, 'CLEAR!', `기록 ${time.toFixed(2)}s`);
}
