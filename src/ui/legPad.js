// 인게임 다리 그리기 칸 (Draw Climber 방식). 담당: 최수정
// 화면 아래 가운데에 항상 떠 있는 빈 캔버스. 아무 데나 선 하나를 그리면, 펜을 댄 시작점이 몸통 회전축에 붙고
// 그 선이 양옆 다리가 된다 (반대쪽은 180° 엇갈려 붙음). 달리는 중 아무 때나 다시 그릴 수 있다.
//   그리기 시작 → EVENTS.DRAWING true (main이 시간을 느리게)
//   손을 뗌     → EVENTS.DRAWING false, 선이 충분히 길면 EVENTS.LEGS (Legs: [-1, 1] 정규화, 위 +y)
import './ui.css';
import { EVENTS } from '../shared/contracts.js';

const SIZE = 180; // CSS px
const MIN_STROKE = 12; // px. 이보다 짧게 그리면 실수로 보고 무시한다

/**
 * @param {HTMLElement} container
 * @param {import('../shared/events.js').Emitter} events
 * @returns {{ clear(): void, show(legs: import('../shared/contracts.js').Legs): void, destroy(): void }}
 *   show: 대기 화면에서 그린 다리를 칸에 그대로 보여 준다 (이벤트는 내지 않음)
 */
export function createLegPad(container, events) {
  const el = document.createElement('div');
  el.className = 'ui-legpad';
  el.innerHTML = `
    <div class="ui-legpad-head">다리 그리기</div>
    <canvas class="ui-legpad-canvas"></canvas>
  `;
  container.appendChild(el);

  const canvas = el.querySelector('canvas');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = canvas.height = SIZE * dpr;
  canvas.style.width = canvas.style.height = `${SIZE}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  let stroke = []; // CSS px
  let drawing = false;

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (!stroke.length) return;
    // 시작점 = 몸통에 붙는 곳
    ctx.fillStyle = '#f2a33a';
    ctx.beginPath();
    ctx.arc(stroke[0].x, stroke[0].y, 7, 0, Math.PI * 2);
    ctx.fill();
    if (stroke.length < 2) return;
    ctx.strokeStyle = '#13213f';
    ctx.lineWidth = 5;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    stroke.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(SIZE, ((e.clientX - r.left) / r.width) * SIZE)),
      y: Math.max(0, Math.min(SIZE, ((e.clientY - r.top) / r.height) * SIZE)),
    };
  };

  function finish() {
    if (!drawing) return;
    drawing = false;
    el.classList.remove('ui-legpad-active');
    events.emit(EVENTS.DRAWING, false);
    let len = 0;
    for (let i = 1; i < stroke.length; i++) {
      len += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
    }
    if (len < MIN_STROKE) return;
    el.classList.add('ui-legpad-has');
    const h = SIZE / 2;
    events.emit(
      EVENTS.LEGS,
      stroke.map((p) => ({ x: (p.x - h) / h, y: (h - p.y) / h })),
    );
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // 캡처할 수 없는 포인터 (합성 이벤트 등)
    }
    drawing = true;
    el.classList.add('ui-legpad-active');
    stroke = [pos(e)];
    events.emit(EVENTS.DRAWING, true);
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    const q = stroke[stroke.length - 1];
    if (Math.hypot(p.x - q.x, p.y - q.y) > 2) stroke.push(p);
    draw();
  });
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
  canvas.addEventListener('lostpointercapture', finish);
  draw();

  return {
    /** 그린 선을 지운다 (다리 없이 다시 시작할 때) */
    clear() {
      stroke = [];
      el.classList.remove('ui-legpad-has');
      draw();
    },
    show(legs) {
      const h = SIZE / 2;
      stroke = (legs ?? []).map((p) => ({ x: h + p.x * h, y: h - p.y * h }));
      el.classList.toggle('ui-legpad-has', stroke.length > 1);
      draw();
    },
    destroy() {
      finish();
      el.remove();
    },
  };
}
