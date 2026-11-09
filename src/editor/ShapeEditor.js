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
      <h2 class="ed-title">RollCraft — Shape Editor</h2>
      <div class="ed-presets"></div>
    </header>

    <main class="ed-main">
      <!-- 2D 캔버스 드로잉 영역 -->
      <section class="ed-canvas-panel">
        <div class="ed-panel-header">
          <span class="ed-panel-title">2D 단면 드로잉 (회전축 대칭)</span>
          <div class="ed-canvas-actions">
            <button type="button" class="ed-btn-sm ed-btn-undo" title="실행 취소">실행 취소</button>
            <button type="button" class="ed-btn-sm ed-btn-clear" title="초기화">초기화</button>
          </div>
        </div>
        <div class="ed-canvas-wrapper">
          <canvas class="ed-canvas" width="340" height="340"></canvas>
          <div class="ed-canvas-tip">캔버스 위를 드래그하여 회전체 단면을 그리거나 제어점을 드래그하세요</div>
        </div>
      </section>

      <!-- 3D 미리보기 및 제어 영역 -->
      <section class="ed-control-panel">
        <div class="ed-panel-header">
          <span class="ed-panel-title">3D 회전체 실시간 미리보기</span>
        </div>
        <div class="ed-preview-slot"></div>
        <div class="ed-controls">
          <label class="ed-row">
            <span>원주 분할 수</span>
            <input type="range" class="ed-seg" min="${SEGMENTS_MIN}" max="${SEGMENTS_MAX}" value="${segments}">
            <span class="ed-seg-val">${segments}</span>
          </label>
          <button type="button" class="ed-confirm">형상 확정 및 굴리기 ▶</button>
        </div>
      </section>
    </main>
  `;
  container.appendChild(root);

  // 3D 미리보기 인스턴스
  const previewSlot = root.querySelector('.ed-preview-slot');
  const preview = createEditorPreview(previewSlot);
  preview.setShape(profile, segments);

  // 프리셋 버튼 목록 바인딩
  const presetBox = root.querySelector('.ed-presets');
  for (const name of PRESET_NAMES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = name;
    btn.onclick = () => {
      profile = getPreset(name);
      pushHistory();
      renderAll();
      presetBox.querySelectorAll('button').forEach((b) => b.classList.toggle('ed-on', b === btn));
    };
    presetBox.appendChild(btn);
  }
  presetBox.firstChild?.classList.add('ed-on');

  // 분할 수 슬라이더
  const segInput = root.querySelector('.ed-seg');
  const segVal = root.querySelector('.ed-seg-val');
  segInput.oninput = () => {
    segments = Number(segInput.value);
    segVal.textContent = segments;
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

  // 확정 버튼
  root.querySelector('.ed-confirm').onclick = () => {
    onConfirm({ profile: profile.map((p) => ({ ...p })), segments });
  };

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

  // 좌표계 변환:
  // 월드: r in [0, 1], y in [0, 1] (바닥 y=0, 위 y=1)
  // 캔버스: axisX에서 오른쪽으로 r * (drawW * 0.5)
  //         바닥 y=0 -> 캔버스 padY + drawH, 위 y=1 -> 캔버스 padY
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

    // 1. 배경 및 그리드
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    // 수평 안내선
    for (let i = 0; i < PROFILE_POINTS; i++) {
      const y = padY + (i / (PROFILE_POINTS - 1)) * drawH;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(W - padX, y);
      ctx.stroke();
    }

    // 2. 중심 회전축 (Axis of Revolution)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(axisX, padY - 8);
    ctx.lineTo(axisX, padY + drawH + 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. 회전 대칭 실루엣 채우기 (반투명 영역)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.beginPath();
    // 오른쪽 윤곽
    for (let i = 0; i < profile.length; i++) {
      const { x, y } = profileToCanvas(profile[i].r, profile[i].y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    // 왼쪽 대칭 윤곽 (거꾸로)
    for (let i = profile.length - 1; i >= 0; i--) {
      const { x, y } = profileToCanvas(profile[i].r, profile[i].y);
      const mirrorX = axisX - (x - axisX);
      ctx.lineTo(mirrorX, y);
    }
    ctx.closePath();
    ctx.fill();

    // 4. 왼쪽 대칭 윤곽선 (희미한 점선)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    for (let i = 0; i < profile.length; i++) {
      const { x, y } = profileToCanvas(profile[i].r, profile[i].y);
      const mirrorX = axisX - (x - axisX);
      if (i === 0) ctx.moveTo(mirrorX, y);
      else ctx.lineTo(mirrorX, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. 오른쪽 활성 단면 곡선
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < profile.length; i++) {
      const { x, y } = profileToCanvas(profile[i].r, profile[i].y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 6. 12개 제어점(Control Points)
    for (let i = 0; i < profile.length; i++) {
      const { x, y } = profileToCanvas(profile[i].r, profile[i].y);
      ctx.fillStyle = i === activeDragPointIdx ? '#f59e0b' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, y, i === activeDragPointIdx ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
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
      // 마우스 오버 시 커서 변경
      const pos = getCanvasPos(e);
      canvas.style.cursor = findControlPoint(pos) !== -1 ? 'pointer' : 'crosshair';
      return;
    }

    const pos = getCanvasPos(e);

    if (activeDragPointIdx !== -1) {
      // 개별 제어점의 반경(r) 조절 (y는 균등 분할 유지)
      const profPt = canvasToProfile(pos.x, pos.y);
      profile[activeDragPointIdx].r = profPt.r;
      drawCanvas();
      preview.setShape(profile, segments);
    } else if (isFreehandDrawing) {
      // 자유 드로잉 궤적 수집 및 실시간 리샘플링 피드백
      const profPt = canvasToProfile(pos.x, pos.y);
      drawnStrokePoints.push(profPt);

      if (drawnStrokePoints.length >= 3) {
        try {
          profile = resampleProfile(drawnStrokePoints);
          drawCanvas();
          preview.setShape(profile, segments);
        } catch (_) {
          // 리샘플 도중 점 부족 시 무시
        }
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

  // 초기 렌더링
  renderAll();

  return {
    destroy() {
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
