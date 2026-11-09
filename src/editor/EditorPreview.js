// 에디터 3D 미리보기 (별도 WebGLRenderer). 담당: 최수정
// STUB: 아무것도 그리지 않음. destroy에서 dispose + forceContextLoss 필수 (컨텍스트 누수 방지).

/**
 * @param {HTMLElement} container
 * @returns {{ setShape(profile: any, segments: number): void, destroy(): void }}
 */
export function createEditorPreview(container) {
  const el = document.createElement('div');
  el.className = 'ed-preview';
  el.textContent = '3D 미리보기 (TODO)';
  container.appendChild(el);

  return {
    setShape() {},
    destroy() {
      el.remove();
    },
  };
}
