// 트랙 주변 배경: 땅 + 테마별 소품 (나무 · 선인장 · 눈사람 · 산 ...). 담당: 손연우
//
// 소품은 보이기만 하고 충돌이 없다. 종류마다 InstancedMesh 하나라 수백 개여도 가볍다.
// 위치는 시드 고정 난수 → 매번 같은 배경 (멀티에서도 모두 같은 화면).
// 트랙 중심선에서 일정 거리 안에는 놓지 않는다 (길을 가리지 않게).
// 땅은 충돌 있는 평면: 트랙 밖으로 떨어지면 땅에 닿고, laps.fallen()이 다시 출발시킨다.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/** 시드 고정 난수 (mulberry32) */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });

/** 부품(geometry + 재질 + 로컬 변환) 목록으로 소품 한 종류를 정의 */
const part = (
  geometry,
  material,
  { x = 0, y = 0, z = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {},
) => {
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)),
      new THREE.Vector3(sx, sy, sz),
    ),
  );
  return { geometry, material };
};

// ── 소품 종류 (크기 1 기준, 놓을 때 scale) ──
const KINDS = {
  tree: () => [
    part(new THREE.CylinderGeometry(0.18, 0.25, 1.4, 6), mat(0x7a5232), { y: 0.7 }),
    part(new THREE.IcosahedronGeometry(1.1, 0), mat(0x3f9a45), { y: 2.1 }),
    part(new THREE.IcosahedronGeometry(0.75, 0), mat(0x58b450), { y: 2.9, x: 0.2 }),
  ],
  bush: () => [part(new THREE.IcosahedronGeometry(0.6, 0), mat(0x4caa48), { y: 0.35, sy: 0.7 })],
  flower: () => [
    part(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4), mat(0x3d8a3a), { y: 0.2 }),
    part(new THREE.IcosahedronGeometry(0.13, 0), mat(0xffffff), { y: 0.45 }),
  ],
  rock: () => [part(new THREE.DodecahedronGeometry(0.6, 0), mat(0x9a9a9a), { y: 0.25, sy: 0.6 })],
  cloud: () => [
    part(new THREE.IcosahedronGeometry(2, 1), mat(0xffffff, { roughness: 1 }), { sy: 0.6 }),
    part(new THREE.IcosahedronGeometry(1.5, 1), mat(0xffffff, { roughness: 1 }), {
      x: 2,
      y: 0.3,
      sy: 0.6,
    }),
    part(new THREE.IcosahedronGeometry(1.3, 1), mat(0xffffff, { roughness: 1 }), {
      x: -1.9,
      y: 0.1,
      sy: 0.6,
    }),
  ],
  hill: () => [
    part(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x67b04f)),
  ],
  cactus: () => [
    part(new THREE.CylinderGeometry(0.28, 0.32, 2.4, 7), mat(0x4f9a4a), { y: 1.2 }),
    part(new THREE.CylinderGeometry(0.18, 0.2, 0.9, 6), mat(0x4f9a4a), { x: 0.45, y: 1.5 }),
    part(new THREE.CylinderGeometry(0.16, 0.18, 0.6, 6), mat(0x4f9a4a), { x: -0.42, y: 1.1 }),
    part(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 5), mat(0x4f9a4a), {
      x: 0.3,
      y: 1.05,
      rz: Math.PI / 2,
    }),
    part(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 5), mat(0x4f9a4a), {
      x: -0.28,
      y: 0.85,
      rz: Math.PI / 2,
    }),
  ],
  sandRock: () => [
    part(new THREE.DodecahedronGeometry(0.7, 0), mat(0xc98b52), { y: 0.3, sy: 0.65 }),
  ],
  mesa: () => [
    part(new THREE.CylinderGeometry(0.8, 1, 1, 7), mat(0xc47a45), { y: 0.5 }),
    part(new THREE.CylinderGeometry(0.82, 0.82, 0.12, 7), mat(0xe0a06a), { y: 1.0 }),
  ],
  deadBush: () => [part(new THREE.IcosahedronGeometry(0.35, 0), mat(0x9b7a4a), { y: 0.25 })],
  pine: () => [
    part(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 6), mat(0x6b4a30), { y: 0.4 }),
    part(new THREE.ConeGeometry(1.1, 1.6, 7), mat(0x2f6d4a), { y: 1.4 }),
    part(new THREE.ConeGeometry(0.85, 1.4, 7), mat(0x377a52), { y: 2.2 }),
    part(new THREE.ConeGeometry(0.55, 1.1, 7), mat(0xf4f8fb), { y: 2.95 }),
  ],
  snowman: () => [
    part(new THREE.IcosahedronGeometry(0.5, 1), mat(0xffffff), { y: 0.45 }),
    part(new THREE.IcosahedronGeometry(0.35, 1), mat(0xffffff), { y: 1.1 }),
    part(new THREE.ConeGeometry(0.06, 0.3, 5), mat(0xff7a1a), {
      y: 1.12,
      z: 0.45,
      rx: Math.PI / 2,
    }),
    part(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 8), mat(0x222831), { y: 1.5 }),
  ],
  iceRock: () => [
    part(new THREE.DodecahedronGeometry(0.6, 0), mat(0xb9d4e8), { y: 0.25, sy: 0.7 }),
  ],
  mountain: () => [
    part(new THREE.ConeGeometry(1, 1, 6), mat(0x8fa6bb), { y: 0.5 }),
    part(new THREE.ConeGeometry(0.42, 0.42, 6), mat(0xffffff), { y: 0.79 }),
  ],
};

/**
 * 테마별 배치 규칙: kind, count, scale [min, max], dist [트랙 가장자리에서 최소, 최대] (m), y = 높이 (구름)
 * 꽃 색은 인스턴스 색으로 바꾼다.
 */
const LAYOUT = {
  meadow: [
    { kind: 'tree', count: 90, scale: [0.8, 1.5], dist: [4, 45] },
    { kind: 'bush', count: 110, scale: [0.6, 1.4], dist: [2.5, 40] },
    {
      kind: 'flower',
      count: 260,
      scale: [0.8, 1.3],
      dist: [1.5, 20],
      colors: [0xff6b8b, 0xffd23f, 0xffffff, 0xb77cff],
    },
    { kind: 'rock', count: 40, scale: [0.5, 1.4], dist: [3, 40] },
    { kind: 'hill', count: 14, scale: [12, 26], dist: [45, 90], squash: 0.35 },
    { kind: 'cloud', count: 22, scale: [1.2, 2.4], dist: [0, 90], y: [22, 34] },
  ],
  desert: [
    { kind: 'cactus', count: 70, scale: [0.7, 1.4], dist: [3, 45] },
    { kind: 'sandRock', count: 80, scale: [0.5, 2], dist: [2.5, 45] },
    { kind: 'deadBush', count: 90, scale: [0.6, 1.3], dist: [1.5, 35] },
    { kind: 'mesa', count: 16, scale: [9, 18], dist: [60, 120], tall: [0.6, 1.4] },
  ],
  snow: [
    { kind: 'pine', count: 130, scale: [0.8, 1.7], dist: [3.5, 45] },
    { kind: 'snowman', count: 14, scale: [0.9, 1.3], dist: [2.5, 14], face: true },
    { kind: 'iceRock', count: 50, scale: [0.5, 1.5], dist: [2.5, 40] },
    { kind: 'mountain', count: 18, scale: [20, 36], dist: [70, 120], tall: [0.7, 1.2] },
  ],
};

/**
 * @param {{ scene: THREE.Scene, world: CANNON.World, path: import('./track.js').TrackPath,
 *           theme: import('./themes.js').Theme, materials: { ground: THREE.Material },
 *           width: number, groundY: number, seed?: number }} opts
 * @returns {{ dispose(): void }}
 */
export function buildScenery({ scene, world, path, theme, materials, width, groundY, seed = 7 }) {
  const rand = rng(seed);
  const group = new THREE.Group();
  const disposables = [];

  // 트랙 범위
  const pts = path.points;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  // ── 땅 (보이는 평면 + 충돌 평면) ──
  const groundGeo = new THREE.CircleGeometry(260, 48);
  const ground = new THREE.Mesh(groundGeo, materials.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(cx, groundY, cz);
  ground.receiveShadow = true;
  group.add(ground);
  disposables.push(groundGeo);
  const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  groundBody.position.set(0, groundY, 0);
  world.addBody(groundBody);

  // 중심선에서 가장 가까운 거리 (XZ). 샘플을 4개마다 하나씩 써도 충분하다.
  const coarse = pts.filter((_, i) => i % 4 === 0);
  const distToTrack = (x, z) => {
    let d2 = Infinity;
    for (const p of coarse) d2 = Math.min(d2, (p.x - x) ** 2 + (p.z - z) ** 2);
    return Math.sqrt(d2);
  };

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (const rule of LAYOUT[theme.id] ?? []) {
    const parts = KINDS[rule.kind]();
    const meshes = parts.map(({ geometry, material }) => {
      const m = new THREE.InstancedMesh(geometry, material, rule.count);
      m.castShadow = rule.kind !== 'cloud' && rule.dist[1] < 50;
      m.receiveShadow = true;
      disposables.push(geometry, material);
      group.add(m);
      return m;
    });
    const half = width / 2;
    const span = Math.max(maxX - minX, maxZ - minZ) / 2 + rule.dist[1];
    let placed = 0;
    for (let tries = 0; placed < rule.count && tries < rule.count * 40; tries++) {
      const x = cx + (rand() * 2 - 1) * span;
      const z = cz + (rand() * 2 - 1) * span;
      const d = distToTrack(x, z) - half;
      if (d < rule.dist[0] || d > rule.dist[1]) continue;
      const s = rule.scale[0] + rand() * (rule.scale[1] - rule.scale[0]);
      const tall = rule.tall ? rule.tall[0] + rand() * (rule.tall[1] - rule.tall[0]) : 1;
      const y = rule.y ? rule.y[0] + rand() * (rule.y[1] - rule.y[0]) : groundY;
      dummy.position.set(x, y, z);
      // 눈사람은 트랙 쪽을 본다
      dummy.rotation.set(0, rule.face ? Math.atan2(cx - x, cz - z) : rand() * Math.PI * 2, 0);
      dummy.scale.set(s, s * tall * (rule.squash ?? 1), s);
      dummy.updateMatrix();
      meshes.forEach((m) => m.setMatrixAt(placed, dummy.matrix));
      if (rule.colors) {
        // 꽃: 꽃잎(마지막 부품)만 색을 바꾼다
        color.setHex(rule.colors[Math.floor(rand() * rule.colors.length)]);
        meshes[meshes.length - 1].setColorAt(placed, color);
      }
      placed++;
    }
    meshes.forEach((m) => {
      m.count = placed;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }

  scene.add(group);
  return {
    dispose() {
      scene.remove(group);
      world.removeBody(groundBody);
      new Set(disposables).forEach((d) => d.dispose());
    },
  };
}
