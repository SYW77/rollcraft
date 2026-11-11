// 변신 작업대 오버레이 (P1). 담당: 최수정
// 주행 중 작업대(Workbench) 구역 진입 시 인게임 위에 에디터를 띄우고 제자리 변신을 지원합니다.
import './ui.css';
import { createShapeEditor } from '../editor/ShapeEditor.js';
import { EVENTS } from '../shared/contracts.js';

/**
 * @param {HTMLElement} container
 * @param {import('../shared/events.js').Emitter} events
 * @param {{ profile?: import('../shared/contracts.js').Profile, segments?: number }} [opts]
 * @returns {{ destroy(): void }}
 */
export function showWorkbench(container, events, { profile, segments } = {}) {
  const el = document.createElement('div');
  el.className = 'ui-overlay ui-workbench-overlay';

  // 상단 바 (작업대 태그 + 취소 버튼)
  const topBar = document.createElement('div');
  topBar.className = 'ui-workbench-top-bar';
  topBar.innerHTML = `
    <div class="ui-workbench-tag">🔧 WORKBENCH ZONE</div>
    <button type="button" class="ui-workbench-cancel-btn" title="변신 취소 및 주행 재개 (Esc)">✕ 취소 (Esc)</button>
  `;
  el.appendChild(topBar);

  const cancelBtn = topBar.querySelector('.ui-workbench-cancel-btn');
  cancelBtn.onclick = () => {
    // main.js의 Escape 키 리스너를 호출하여 안전하게 닫고 게임 재개
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true })
    );
  };

  // 상단 작업대 안내 헤더
  const header = document.createElement('div');
  header.className = 'ui-workbench-header';
  header.innerHTML = `
    <h2 class="ui-workbench-title">변신 작업대: 형상 재구성</h2>
    <p class="ui-workbench-desc">현재 위치에 멈춰 섰습니다. 다음 코스를 통과할 수 있도록 최적의 형상으로 변신하세요!</p>
  `;
  el.appendChild(header);

  // 에디터 마운트 슬롯
  const editorSlot = document.createElement('div');
  editorSlot.className = 'ui-workbench-slot';
  el.appendChild(editorSlot);

  container.appendChild(el);

  // 에디터 생성 (기존 프로파일 이어받기)
  const editor = createShapeEditor(editorSlot, {
    initialProfile: profile,
    onConfirm: (shape) => {
      // main에 새로운 형상 확정 전달 (제자리 재생성 인자 포함)
      events.emit(EVENTS.CONFIRM, {
        profile: shape.profile,
        segments: shape.segments ?? segments,
        inPlace: true,
      });
    },
  });

  return {
    destroy() {
      editor.destroy();
      el.remove();
    },
  };
}
