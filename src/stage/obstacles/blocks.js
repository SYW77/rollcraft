// 장애물: 길 위 블록 (건초 더미 · 나무 상자). 담당: 손연우
//
// 평범한 직선에 크기 · 높이가 다른 상자를 흩어 놓는다. 낮은 건 큰 다리로 타고 넘고, 높은 건 A / D로 돌아간다.
// 줄마다 상자 1~2개, 어느 줄이든 지나갈 틈(gapMin 이상)을 남긴다. 위치는 seed로 고정 (멀티에서도 같다).
// 충돌은 보이지 않는 상자 그대로, 보이는 건 높이에 따라 소품으로 꾸민다:
//   낮음(< 0.5) = 건초 더미, 중간 = 나무 상자, 높음(≥ 1) = 나무 상자 두 개 쌓음
import * as THREE from 'three';
import { createBoxSet } from '../staticBox.js';

const DEFAULTS = {
  length: 16, // 진행 방향 길이 (m)
  width: 7, // 트랙 폭
  spacing: 3.2, // 줄 간격 (m)
  heights: [0.35, 0.6, 1.2], // 상자 높이 후보 (낮음 = 타고 넘기, 높음 = 돌아가기)
  sizes: [1.0, 1.4, 1.8], // 상자 옆 폭 후보 (m)
  depth: 0.9, // 상자 앞뒤 길이
  gapMin: 2.2, // 줄마다 남기는 가장 넓은 틈
  seed: 1,
};

const canDraw = typeof document !== 'undefined';

/** 캔버스 텍스처 (헤드리스에서는 null) */
function canvasTex(w, h, draw) {
  if (!canDraw) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 나무 상자 면: 판자 줄 + 테두리 + 대각선 버팀목 */
const crateTex = () =>
  canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#b5773f';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,45,20,0.45)';
    g.lineWidth = 2;
    for (let y = 21; y < h; y += 21) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.strokeStyle = '#7a4a24';
    g.lineWidth = 14;
    g.strokeRect(7, 7, w - 14, h - 14);
    g.beginPath();
    g.moveTo(12, h - 12);
    g.lineTo(w - 12, 12);
    g.stroke();
    g.fillStyle = '#3b2a1c';
    for (const [x, y] of [
      [14, 14],
      [w - 14, 14],
      [14, h - 14],
      [w - 14, h - 14],
    ]) {
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
    }
  });

/** 건초: 노란 바탕에 짧은 지푸라기 결 */
const hayTex = () =>
  canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#e8c35a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      g.strokeStyle = Math.random() < 0.5 ? 'rgba(160,110,30,0.5)' : 'rgba(255,240,170,0.6)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 6, y + 8 + Math.random() * 8);
      g.stroke();
    }
  });

function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {{ scene, world, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 *   origin = 구간 시작점 (트랙 중심선 위), heading = 진행 방향 (직선 구간에 놓는다)
 * @returns {{ dispose(): void }}
 */
export function create({ scene, world, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const rand = rng(p.seed);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const right = { x: -heading.z, z: heading.x };
  const boxes = createBoxSet({ scene, world });
  const yaw = Math.atan2(-heading.x, -heading.z);
  const group = new THREE.Group();
  const geos = [];
  const crateMap = crateTex();
  const hayMap = hayTex();
  const crateMat = new THREE.MeshStandardMaterial(
    crateMap ? { map: crateMap, roughness: 0.85 } : { color: 0xb5773f },
  );
  const hayMat = new THREE.MeshStandardMaterial(
    hayMap ? { map: hayMap, roughness: 1 } : { color: 0xe8c35a },
  );
  const twineMat = new THREE.MeshStandardMaterial({ color: 0x8a3b1e, roughness: 0.8 });
  const mesh = (geo, mat, x, y, z, ry = 0) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  /** 소품 하나 (블록 중심 로컬: x = 옆, z = 앞뒤, 바닥 y = 0) */
  function prop(w, h, d) {
    const g = new THREE.Group();
    const add = (m) => (g.add(m), m);
    if (h < 0.5) {
      // 건초 더미: 모서리를 깎은 상자 + 끈 두 줄
      add(mesh(new THREE.BoxGeometry(w, h * 0.92, d * 0.96), hayMat, 0, h * 0.46, 0));
      add(mesh(new THREE.BoxGeometry(w * 0.96, h, d * 0.88), hayMat, 0, h / 2, 0));
      for (const s of [-1, 1])
        add(mesh(new THREE.BoxGeometry(0.05, h + 0.01, d + 0.01), twineMat, (s * w) / 4, h / 2, 0));
    } else if (h < 1) {
      add(mesh(new THREE.BoxGeometry(w, h, d), crateMat, 0, h / 2, 0));
    } else {
      // 상자 두 개: 아래는 넓게, 위는 조금 작고 살짝 돌려서
      const h1 = h * 0.5;
      add(mesh(new THREE.BoxGeometry(w, h1, d), crateMat, 0, h1 / 2, 0));
      add(
        mesh(
          new THREE.BoxGeometry(w * 0.82, h - h1, d * 0.9),
          crateMat,
          0.04,
          h1 + (h - h1) / 2,
          0,
          0.12,
        ),
      );
    }
    return g;
  }

  const half = p.width / 2;
  for (let along = p.depth / 2; along < p.length; along += p.spacing) {
    // 이 줄에 놓을 상자 1~2개: 겹치지 않고, 가장 넓은 틈이 gapMin 이상이 되게
    for (let tries = 0; tries < 20; tries++) {
      const n = rand() < 0.45 ? 2 : 1;
      const row = [];
      for (let i = 0; i < n; i++) {
        const w = pick(p.sizes);
        row.push({ w, lat: -half + w / 2 + rand() * (p.width - w), h: pick(p.heights) });
      }
      row.sort((a, b) => a.lat - b.lat);
      const edges = [-half, ...row.flatMap((b) => [b.lat - b.w / 2, b.lat + b.w / 2]), half];
      let ok = true;
      let widest = 0;
      for (let i = 0; i < edges.length; i += 2) {
        const gap = edges[i + 1] - edges[i];
        if (gap < -0.01) ok = false;
        widest = Math.max(widest, gap);
      }
      if (!ok || widest < p.gapMin) continue;
      for (const b of row) {
        const x = origin.x + heading.x * along + right.x * b.lat;
        const z = origin.z + heading.z * along + right.z * b.lat;
        boxes.add({
          x,
          z,
          top: origin.y + b.h,
          dir: heading,
          length: p.depth,
          width: b.w,
          height: b.h + 0.5, // 트랙 속까지
          hidden: true, // 충돌만. 보이는 건 아래 소품
        });
        const g = prop(b.w, b.h, p.depth);
        g.position.set(x, origin.y, z);
        g.rotation.y = yaw;
        group.add(g);
      }
      break;
    }
  }

  scene.add(group);

  return {
    dispose() {
      boxes.dispose();
      scene.remove(group);
      geos.forEach((g) => g.dispose());
      [crateMat, hayMat, twineMat].forEach((m) => m.dispose());
      crateMap?.dispose();
      hayMap?.dispose();
    },
  };
}
