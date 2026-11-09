// 2D 단면 에디터. 담당: 최수정
// STUB: 드로잉 캔버스 대신 프리셋 버튼 + 분할 수 슬라이더 + 확정 버튼.
import './editor.css';
import { SEGMENTS_MIN, SEGMENTS_MAX, SEGMENTS_DEFAULT } from '../shared/contracts.js';
import { PRESET_NAMES, getPreset } from '../shared/presets.js';
import { createEditorPreview } from './EditorPreview.js';

/**
 * @param {HTMLElement} container
 * @param {{ initialProfile?: any, onConfirm: (r: { profile: any, segments: number }) => void }} opts
 * @returns {{ destroy(): void }}
 */
export function createShapeEditor(container, { initialProfile, onConfirm }) {
  let profile = initialProfile ?? getPreset('sphere');
  let segments = SEGMENTS_DEFAULT;

  const root = document.createElement('div');
  root.className = 'ed-root';
  root.innerHTML = `
    <h2 class="ed-title">RollCraft — Shape Editor (stub)</h2>
    <div class="ed-presets"></div>
    <label class="ed-row">분할 수 <input type="range" class="ed-seg"
      min="${SEGMENTS_MIN}" max="${SEGMENTS_MAX}" value="${segments}"> <span class="ed-seg-val">${segments}</span></label>
    <button class="ed-confirm">확정하고 굴리기</button>
  `;
  container.appendChild(root);

  const preview = createEditorPreview(root);
  preview.setShape(profile, segments);

  const presetBox = root.querySelector('.ed-presets');
  for (const name of PRESET_NAMES) {
    const b = document.createElement('button');
    b.textContent = name;
    b.onclick = () => {
      profile = getPreset(name);
      preview.setShape(profile, segments);
      presetBox.querySelectorAll('button').forEach((x) => x.classList.toggle('ed-on', x === b));
    };
    presetBox.appendChild(b);
  }
  presetBox.firstChild?.classList.add('ed-on');

  const seg = root.querySelector('.ed-seg');
  seg.oninput = () => {
    segments = Number(seg.value);
    root.querySelector('.ed-seg-val').textContent = segments;
    preview.setShape(profile, segments);
  };

  root.querySelector('.ed-confirm').onclick = () => onConfirm({ profile, segments });

  return {
    destroy() {
      preview.destroy();
      root.remove();
    },
  };
}
