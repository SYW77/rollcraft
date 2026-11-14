// 대기 화면 (레이스 준비): 동물 고르기 · 다리 그리기 · 3D 미리보기. 담당: 최수정
// 타이틀 → 여기 → 출발! → 카운트다운. 미리보기는 따로 작은 WebGLRenderer로 그린다 (게임 장면과 별개).
// 다리 좌표 규칙은 계약 Legs와 같다 (그리기 칸 [-1, 1], 위 +y, 시작점이 몸통에 붙음).
import * as THREE from 'three';
import './ui.css';
import { ANIMALS, makeAnimal, makeLegs, legLine, disposeLook } from '../physics/climberLook.js';

const PAD = 300; // 그리기 칸 (CSS px)
const VIEW = { w: 340, h: 260 }; // 미리보기 (CSS px)
const MIN_STROKE = 12; // px. 이보다 짧으면 실수로 보고 무시
const LEG_SPIN = 3; // rad/s. 미리보기에서 다리가 도는 빠르기

/**
 * @param {HTMLElement} container
 * @param {{ legs?: import('../shared/contracts.js').Legs, animal?: string,
 *           onReady: (r: { legs: import('../shared/contracts.js').Legs, animal: string }) => void,
 *           onBack: () => void }} opts
 * @returns {{ destroy(): void }}
 */
export function showLobby(container, { legs = [], animal = 'cat', onReady, onBack }) {
  const el = document.createElement('div');
  el.className = 'ui-lobby';
  el.innerHTML = `
    <div class="ui-lobby-title">레이스 준비</div>
    <div class="ui-lobby-main">
      <section class="ui-lobby-panel">
        <div class="ui-lobby-band">다리 그리기</div>
        <canvas class="ui-lobby-canvas"></canvas>
        <div class="ui-lobby-row">
          <span class="ui-lobby-tip">펜을 댄 곳이 몸통에 붙어요</span>
          <button type="button" class="ui-btn ui-btn-secondary ui-lobby-small" data-act="clear">지우기</button>
        </div>
      </section>
      <section class="ui-lobby-panel">
        <div class="ui-lobby-band">미리보기</div>
        <div class="ui-lobby-view"></div>
        <div class="ui-lobby-animals"></div>
      </section>
    </div>
    <div class="ui-lobby-actions">
      <button type="button" class="ui-btn ui-btn-secondary" data-act="back">
        <span>타이틀로</span><kbd class="ui-btn-key">ESC</kbd>
      </button>
      <button type="button" class="ui-btn ui-btn-primary ui-lobby-go" data-act="go">
        <span>출발!</span><kbd class="ui-btn-key">ENTER</kbd>
      </button>
    </div>
  `;
  container.appendChild(el);

  // ── 그리기 칸 ──
  const canvas = el.querySelector('.ui-lobby-canvas');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = canvas.height = PAD * dpr;
  canvas.style.width = canvas.style.height = `${PAD}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const h = PAD / 2;
  let stroke = legs.map((p) => ({ x: h + p.x * h, y: h - p.y * h })); // CSS px
  let drawing = false;

  function drawPad() {
    ctx.clearRect(0, 0, PAD, PAD);
    if (!stroke.length) {
      ctx.fillStyle = 'rgba(19, 33, 63, 0.35)';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('여기에 선 하나를 그려요', h, h);
      return;
    }
    ctx.fillStyle = '#f2a33a';
    ctx.beginPath();
    ctx.arc(stroke[0].x, stroke[0].y, 9, 0, Math.PI * 2);
    ctx.fill();
    if (stroke.length < 2) return;
    ctx.strokeStyle = '#13213f';
    ctx.lineWidth = 7;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    stroke.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(PAD, ((e.clientX - r.left) / r.width) * PAD)),
      y: Math.max(0, Math.min(PAD, ((e.clientY - r.top) / r.height) * PAD)),
    };
  };
  const strokeLength = () =>
    stroke.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - stroke[i].x, p.y - stroke[i].y), 0);
  const currentLegs = () =>
    strokeLength() >= MIN_STROKE ? stroke.map((p) => ({ x: (p.x - h) / h, y: (h - p.y) / h })) : [];

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // 캡처할 수 없는 포인터 (합성 이벤트 등)
    }
    drawing = true;
    stroke = [pos(e)];
    drawPad();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    const q = stroke[stroke.length - 1];
    if (Math.hypot(p.x - q.x, p.y - q.y) > 2) stroke.push(p);
    drawPad();
  });
  const finish = () => {
    if (!drawing) return;
    drawing = false;
    if (strokeLength() < MIN_STROKE) stroke = [];
    drawPad();
    refresh();
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);

  // ── 미리보기 (동물 + 다리, 다리는 돌고 전체는 천천히 회전) ──
  const view = el.querySelector('.ui-lobby-view');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(VIEW.w, VIEW.h);
  view.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 5, -2);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(35, VIEW.w / VIEW.h, 0.1, 50);
  const root = new THREE.Group(); // 천천히 도는 받침
  scene.add(root);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.8, 40),
    new THREE.MeshStandardMaterial({ color: 0xd6e4ff }),
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  let animalMesh = null;
  let legsMesh = null;
  let reach = 0.5;

  function rebuild() {
    if (animalMesh) {
      root.remove(animalMesh);
      disposeLook(animalMesh);
    }
    if (legsMesh) {
      root.remove(legsMesh);
      disposeLook(legsMesh);
    }
    const line = legLine(currentLegs());
    reach = Math.max(0.45, ...line.map(([z, y]) => Math.hypot(z, y)));
    animalMesh = makeAnimal(animal);
    legsMesh = makeLegs(line);
    // 다리 끝이 바닥에 닿을 높이로 띄운다
    animalMesh.position.y = legsMesh.position.y = reach;
    root.add(animalMesh, legsMesh);
    const d = 2.2 + reach * 1.5; // 다리가 길면 그만큼 물러난다
    camera.position.set(d * 0.8, reach + d * 0.3, -d * 0.6);
    camera.lookAt(0, reach * 0.75, 0);
  }

  let last = performance.now();
  let raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    root.rotation.y += dt * 0.5;
    if (legsMesh) legsMesh.rotation.x -= dt * LEG_SPIN;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  // ── 동물 고르기 ──
  const animalsBox = el.querySelector('.ui-lobby-animals');
  for (const a of ANIMALS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ui-lobby-animal';
    b.dataset.id = a.id;
    b.innerHTML = `<i style="background:${a.color}"></i><span>${a.name}</span>`;
    b.onclick = () => {
      b.blur();
      animal = a.id;
      refresh();
    };
    animalsBox.appendChild(b);
  }

  // ── 버튼 · 키 ──
  const goBtn = el.querySelector('[data-act=go]');
  function refresh() {
    animalsBox
      .querySelectorAll('.ui-lobby-animal')
      .forEach((b) => b.classList.toggle('ui-on', b.dataset.id === animal));
    const ready = currentLegs().length > 0;
    goBtn.disabled = !ready;
    goBtn.querySelector('span').textContent = ready ? '출발!' : '다리를 먼저 그려요';
    rebuild();
  }
  function go() {
    const l = currentLegs();
    if (!l.length) return;
    onReady({ legs: l, animal });
  }
  el.querySelector('[data-act=clear]').onclick = (e) => {
    e.currentTarget.blur();
    stroke = [];
    drawPad();
    refresh();
  };
  el.querySelector('[data-act=back]').onclick = () => onBack();
  goBtn.onclick = () => go();
  const onKey = (e) => {
    if (e.repeat) return;
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      go();
    } else if (e.code === 'Escape') onBack();
  };
  addEventListener('keydown', onKey);

  drawPad();
  refresh();

  return {
    destroy() {
      removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      if (animalMesh) disposeLook(animalMesh);
      if (legsMesh) disposeLook(legsMesh);
      floor.geometry.dispose();
      floor.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      el.remove();
    },
  };
}
