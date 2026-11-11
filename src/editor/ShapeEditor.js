// 2D 단면 에디터. 담당: 최수정
// 2D 캔버스 자유 드로잉 + 12점 제어점 편집 + 실시간 3D 미리보기 + 프리셋 + Undo/Clear
import './editor.css';
import {
  PROFILE_POINTS,
  SEGMENTS_MIN,
  SEGMENTS_MAX,
  SEGMENTS_DEFAULT,
  R_MIN,
  R_MAX,
} from '../shared/contracts.js';
import { PRESET_NAMES, getPreset } from '../shared/presets.js';
import { resampleProfile } from './profileUtil.js';
import { createEditorPreview } from './EditorPreview.js';

const PRESET_ICONS = {
  sphere: '●',
  cylinder: '▮',
  cone: '▲',
  dumbbell: '⧓',
};

const PRESET_KO = {
  sphere: '구',
  cylinder: '원통',
  cone: '원뿔',
  dumbbell: '아령',
};

/**
 * @param {HTMLElement} container
 * @param {{ initialProfile?: import('../shared/contracts.js').Profile, onConfirm: (r: { profile: any, segments: number }) => void }} opts
 * @returns {{ destroy(): void }}
 */
export function createShapeEditor(container, { initialProfile, onConfirm }) {
  let profile = initialProfile ? [...initialProfile.map((p) => ({ ...p }))] : getPreset('sphere');
  let segments = SEGMENTS_DEFAULT;
  const history = [profile.map((p) => ({ ...p }))];

  const root = document.createElement('div');
  root.className = 'ed-root';
  root.innerHTML = `
    <header class="ed-header">
      <div class="ed-header-badge">ROLLCRAFT STUDIO</div>
      <h1 class="ed-title">단면 형상 제작소</h1>
      <p class="ed-subtitle">2D 단면을 회전시켜 물리 퍼즐 코스를 돌파할 나만의 3D 회전체를 만드세요</p>
      <div class="ed-presets-wrap">
        <span class="ed-presets-label">기본 프리셋:</span>
        <div class="ed-presets"></div>
      </div>
    </header>

    <main class="ed-main">
      <!-- 2D 캔버스 드로잉 패널 -->
      <section class="ed-panel ed-canvas-panel">
        <div class="ed-panel-header">
          <div class="ed-panel-title-wrap">
            <span class="ed-panel-dot"></span>
            <span class="ed-panel-title">2D 단면 블루프린트</span>
          </div>
          <div class="ed-canvas-actions">
            <button type="button" class="ed-btn-sm ed-btn-undo" title="실행 취소 (Ctrl+Z)">
              <span>↶</span> 실행 취소
            </button>
            <button type="button" class="ed-btn-sm ed-btn-clear" title="초기화">
              <span>✕</span> 초기화
            </button>
          </div>
        </div>
        <div class="ed-canvas-wrapper">
          <canvas class="ed-canvas" width="340" height="340"></canvas>
          <div class="ed-canvas-tip">
            <span>🖱️ 마우스 드래그로 선을 그리거나, <strong>12개 제어점</strong>을 직접 움직여 미세 조정하세요</span>
          </div>
        </div>
      </section>

      <!-- 3D 미리보기 및 조작 패널 -->
      <section class="ed-panel ed-control-panel">
        <div class="ed-panel-header">
          <div class="ed-panel-title-wrap">
            <span class="ed-panel-dot ed-dot-cyan"></span>
            <span class="ed-panel-title">실시간 3D 렌더 뷰</span>
          </div>
        </div>
        <div class="ed-preview-slot"></div>
        <div class="ed-controls">
          <div class="ed-slider-card">
            <div class="ed-row-header">
              <span class="ed-row-label">원주 분할 해상도</span>
              <span class="ed-seg-val">${segments} SEGS</span>
            </div>
            <input type="range" class="ed-seg" min="${SEGMENTS_MIN}" max="${SEGMENTS_MAX}" value="${segments}">
            <div class="ed-slider-ticks">
              <span>빠른 성능 (8)</span>
              <span>표준 (24)</span>
              <span>정밀 곡면 (64)</span>
            </div>
          </div>
          <button type="button" class="ed-confirm">
            <span>형상 확정하고 코스 달리기</span>
            <kbd class="ed-kbd">ENTER</kbd>
          </button>
        </div>
      </section>
    </main>
  `;
  container.appendChild(root);

  // 3D 미리보기 인스턴스
  const previewSlot = root.querySelector('.ed-preview-slot');
  const preview = createEditorPreview(previewSlot);
  preview.setShape(profile, segments);

  // 프리셋 버튼 목록 바인딩 (아이콘 + 한글/영문 라벨)
  const presetBox = root.querySelector('.ed-presets');
  for (const name of PRESET_NAMES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ed-preset-btn';
    btn.innerHTML = `<span class="ed-preset-icon">${PRESET_ICONS[name] || '●'}</span> <span>${PRESET_KO[name] || name}</span>`;
    btn.onclick = () => {
      profile = getPreset(name);
      pushHistory();
      renderAll();
      presetBox
        .querySelectorAll('.ed-preset-btn')
        .forEach((b) => b.classList.toggle('ed-on', b === btn));
    };
    presetBox.appendChild(btn);
  }
  presetBox.firstChild?.classList.add('ed-on');

  // 분할 수 슬라이더
  const segInput = root.querySelector('.ed-seg');
  const segVal = root.querySelector('.ed-seg-val');
  segInput.oninput = () => {
    segments = Number(segInput.value);
    segVal.textContent = `${segments} SEGS`;
    preview.setShape(profile, segments);
  };

  // 실행 취소 & 초기화
  function pushHistory() {
    history.push(profile.map((p) => ({ ...p })));
    if (history.length > 20) history.shift();
  }

  const undoBtn = root.querySelector('.ed-btn-undo');
  undoBtn.onclick = () => {
    if (history.length > 1) {
      history.pop();
      profile = history[history.length - 1].map((p) => ({ ...p }));
      renderAll();
    }
  };

  const clearBtn = root.querySelector('.ed-btn-clear');
  clearBtn.onclick = () => {
    profile = getPreset('cylinder');
    pushHistory();
    renderAll();
  };

  // 확정 버튼 및 단축키 (Enter)
  function handleConfirm() {
    onConfirm({ profile: profile.map((p) => ({ ...p })), segments });
  }

  root.querySelector('.ed-confirm').onclick = handleConfirm;

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      undoBtn.click();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  // -------------------------------------------------------------
  // 2D 캔버스 드로잉 및 제어점 상호작용
  // -------------------------------------------------------------
  const canvas = root.querySelector('.ed-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const padX = 24;
  const padY = 24;
  const drawW = W - padX * 2;
  const drawH = H - padY * 2;
  const axisX = padX + drawW * 0.5; // 화면 중앙이 회전축 (r = 0)

  function profileToCanvas(r, y) {
    const px = axisX + r * (drawW * 0.48);
    const py = padY + (1 - y) * drawH;
    return { x: px, y: py };
  }

  function canvasToProfile(cx, cy) {
    const rawR = (cx - axisX) / (drawW * 0.48);
    const rawY = 1 - (cy - padY) / drawH;
    return {
      r: Math.max(R_MIN, Math.min(R_MAX, Math.abs(rawR))),
      y: Math.max(0, Math.min(1, rawY)),
    };
  }

  function drawCanvas() {
    ctx.clearRect(0, 0, W, H);

    // 1. 하이테크 그리드 배경
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, W, H);

    // 은은한 방안 그리드
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = padX; x <= W - padX; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, padY);
      ctx.lineTo(x, H - padY);
      ctx.stroke();
    }
    for (let i = 0; i < PROFILE_POINTS; i++) {
      const y = padY + (i / (PROFILE_POINTS - 1)) * drawH;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(W - padX, y);
      ctx.stroke();
    }

    // 2. 중심 회전축 (Y-Axis)
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(axisX, padY - 8);
    ctx.lineTo(axisX, padY + drawH + 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. 회전 대칭 실루엣 (은은한 청록빛 채우기)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.beginPath();
    for (let i = 0; i < profile.length; i++) {
      const { x, y } = profileToCanvas(profile[i].r, profile[i].y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = profile.length - 1; i >= 0; i--) {
      const { x, y } = profileToCanvas(profile[i].r, profile[i].y);
      const mirrorX = axisX - (x - axisX);
      ctx.lineTo(mirrorX, y);
    }
    ctx.closePath();
    ctx.fill();

    // 4. 왼쪽 대칭 윤곽선
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    for (let i = 0; i < profile.length; i++) {
      const { x, y } = profileToCanvas(profile[i].r, profile[i].y);
      const mirrorX = axisX - (x - axisX);
      if (i === 0) ctx.moveTo(mirrorX, y);
      else ctx.lineTo(mirrorX, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. 활성 오른쪽 단면 곡선 (네온 시안)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < profile.length; i++) {
      const { x, y } = profileToCanvas(profile[i].r, profile[i].y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 6. 12개 제어점(Control Points)
    for (let i = 0; i < profile.length; i++) {
      const { x, y } = profileToCanvas(profile[i].r, profile[i].y);
      const isDrag = i === activeDragPointIdx;

      // 점 외곽 링
      ctx.fillStyle = isDrag ? '#f59e0b' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, y, isDrag ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();

      // 내부 핀포인트
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y, isDrag ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function renderAll() {
    drawCanvas();
    preview.setShape(profile, segments);
  }

  // 상호작용 상태
  let isPointerDown = false;
  let isFreehandDrawing = false;
  let activeDragPointIdx = -1;
  let drawnStrokePoints = [];

  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top) * (H / rect.height),
    };
  }

  function findControlPoint(pos) {
    for (let i = 0; i < profile.length; i++) {
      const cp = profileToCanvas(profile[i].r, profile[i].y);
      const d = Math.hypot(pos.x - cp.x, pos.y - cp.y);
      if (d <= 14) return i;
    }
    return -1;
  }

  const onDown = (e) => {
    isPointerDown = true;
    const pos = getCanvasPos(e);
    const hit = findControlPoint(pos);

    if (hit !== -1) {
      activeDragPointIdx = hit;
      isFreehandDrawing = false;
    } else {
      activeDragPointIdx = -1;
      isFreehandDrawing = true;
      const profPt = canvasToProfile(pos.x, pos.y);
      drawnStrokePoints = [profPt];
    }
    drawCanvas();
  };

  const onMove = (e) => {
    if (!isPointerDown) {
      const pos = getCanvasPos(e);
      canvas.style.cursor = findControlPoint(pos) !== -1 ? 'pointer' : 'crosshair';
      return;
    }

    const pos = getCanvasPos(e);

    if (activeDragPointIdx !== -1) {
      const profPt = canvasToProfile(pos.x, pos.y);
      profile[activeDragPointIdx].r = profPt.r;
      drawCanvas();
      preview.setShape(profile, segments);
    } else if (isFreehandDrawing) {
      const profPt = canvasToProfile(pos.x, pos.y);
      drawnStrokePoints.push(profPt);

      if (drawnStrokePoints.length >= 3) {
        try {
          profile = resampleProfile(drawnStrokePoints);
          drawCanvas();
          preview.setShape(profile, segments);
        } catch (_) {}
      }
    }
  };

  const onUp = () => {
    if (isPointerDown) {
      if (isFreehandDrawing && drawnStrokePoints.length >= 2) {
        try {
          profile = resampleProfile(drawnStrokePoints);
        } catch (_) {}
      }
      pushHistory();
      renderAll();
    }
    isPointerDown = false;
    isFreehandDrawing = false;
    activeDragPointIdx = -1;
    drawnStrokePoints = [];
  };

  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  canvas.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onUp);

  renderAll();

  return {
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);

      preview.destroy();
      root.remove();
    },
  };
}
