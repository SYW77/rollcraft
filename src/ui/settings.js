// 설정: 그림자 켬/끔, 화질(높음 · 보통 · 낮음), 배경음 · 효과음 크기. 브라우저에 기억해 둔다 (localStorage). 담당: 최수정
// 실제로 적용하는 건 main (renderer 그림자 · 픽셀 배율, audio 음량).
import './ui.css';

const KEY = 'rollcraft_settings';
export const DEFAULT_SETTINGS = Object.freeze({
  shadows: true,
  quality: 'high',
  music: 0.7,
  sfx: 1,
});
const QUALITIES = [
  { id: 'high', name: '높음' },
  { id: 'medium', name: '보통' },
  { id: 'low', name: '낮음' },
];
const VOLUMES = [
  { id: 0, name: '끔' },
  { id: 0.35, name: '작게' },
  { id: 0.7, name: '보통' },
  { id: 1, name: '크게' },
];

/** @returns {{ shadows: boolean, quality: 'high' | 'medium' | 'low', music: number, sfx: number }} */
export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 저장 못 하는 환경 (사생활 보호 모드 등): 이번 실행에만 적용
  }
}

/**
 * @param {HTMLElement} container
 * @param {{ settings: ReturnType<typeof loadSettings>, onChange: (s: ReturnType<typeof loadSettings>) => void,
 *           onClose: () => void }} opts  onChange는 바꿀 때마다 바로 부른다 (미리 적용해 보기)
 * @returns {{ destroy(): void }}
 */
export function showSettings(container, { settings, onChange, onClose }) {
  let s = { ...settings };
  const el = document.createElement('div');
  el.className = 'ui-overlay ui-overlay-settings';
  el.innerHTML = `
    <div class="ui-modal-card ui-settings-card">
      <h2 class="ui-modal-title">설정</h2>
      <div class="ui-settings-row">
        <span class="ui-settings-label">그림자</span>
        <div class="ui-settings-seg" data-key="shadows">
          <button type="button" data-val="true">켬</button>
          <button type="button" data-val="false">끔</button>
        </div>
      </div>
      <div class="ui-settings-row">
        <span class="ui-settings-label">화질</span>
        <div class="ui-settings-seg" data-key="quality">
          ${QUALITIES.map((q) => `<button type="button" data-val="${q.id}">${q.name}</button>`).join('')}
        </div>
      </div>
      <div class="ui-settings-row">
        <span class="ui-settings-label">배경음</span>
        <div class="ui-settings-seg" data-key="music">
          ${VOLUMES.map((v) => `<button type="button" data-val="${v.id}">${v.name}</button>`).join('')}
        </div>
      </div>
      <div class="ui-settings-row">
        <span class="ui-settings-label">효과음</span>
        <div class="ui-settings-seg" data-key="sfx">
          ${VOLUMES.map((v) => `<button type="button" data-val="${v.id}">${v.name}</button>`).join('')}
        </div>
      </div>
      <div class="ui-modal-actions">
        <button type="button" class="ui-btn ui-btn-secondary" data-act="reset">기본값</button>
        <button type="button" class="ui-btn ui-btn-primary" data-act="close">
          <span>닫기</span><kbd class="ui-btn-key">ESC</kbd>
        </button>
      </div>
    </div>
  `;
  container.appendChild(el);

  function render() {
    el.querySelectorAll('.ui-settings-seg').forEach((seg) => {
      const cur = String(s[seg.dataset.key]);
      seg
        .querySelectorAll('button')
        .forEach((b) => b.classList.toggle('ui-on', b.dataset.val === cur));
    });
  }
  function set(key, raw) {
    const num = Number(raw);
    s = {
      ...s,
      [key]: raw === 'true' ? true : raw === 'false' ? false : Number.isNaN(num) ? raw : num,
    };
    saveSettings(s);
    render();
    onChange(s);
  }
  el.querySelectorAll('.ui-settings-seg').forEach((seg) => {
    seg.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        b.blur();
        set(seg.dataset.key, b.dataset.val);
      };
    });
  });
  el.querySelector('[data-act=reset]').onclick = () => {
    s = { ...DEFAULT_SETTINGS };
    saveSettings(s);
    render();
    onChange(s);
  };
  el.querySelector('[data-act=close]').onclick = () => onClose();
  const onKey = (e) => {
    if (e.code === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };
  addEventListener('keydown', onKey);
  render();

  return {
    destroy() {
      removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}
