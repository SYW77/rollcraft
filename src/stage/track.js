// 트랙 조각(직선 · 곡선)을 이어 붙여 바닥/벽과 중심선(path)을 만든다. 담당: 손연우
//
// 좌표 규칙
// - 트랙 윗면은 y = 0. 바닥/벽 두께는 1 이상 (터널링 방지).
// - heading = XZ 단위벡터 (진행 방향). 오른쪽 = (-h.z, h.x) — physics/PlayerController와 같은 규칙.
// - 곡선은 짧은 직선 상자(chord) 여러 개로 근사한다. 상자 윗면이 전부 y = 0이라 이음매가 평평하다.
//   cannon-es의 Trimesh는 원뿔대(ConvexPolyhedron)와 충돌이 불안정해서 Box만 쓴다.
import { createBoxSet } from './staticBox.js';

const THICK = 1; // 바닥 두께
const WALL_T = 1; // 벽 두께
const WALL_H = 0.8; // 벽 높이 (트랙 윗면 기준)
const ARC_STEP_DEG = 7.5; // 곡선을 이 각도마다 상자 하나로 나눈다
const PATH_STEP = 0.5; // 중심선 샘플 간격 (m)
const OVERLAP = 0.05; // 이웃 상자끼리 살짝 겹쳐 틈을 막는다

/**
 * @typedef {{ type: 'straight', length: number, walls?: boolean, floor?: boolean }
 *         | { type: 'arc', radius: number, angle: number, walls?: boolean, floor?: boolean }} TrackPiece
 *   arc.angle: 도(deg). 양수 = 오른쪽으로 꺾임, 음수 = 왼쪽.
 *   walls: 양옆에 낮은 벽을 세운다 (기본 false, 떨어질 수 있음).
 *   floor: false면 바닥을 비운다 (splitRail처럼 장애물이 바닥을 대신하는 구간).
 *
 * @typedef {{ x: number, z: number }} Heading
 * @typedef {{ points: {x:number,y:number,z:number,s:number,hx:number,hz:number}[], length: number }} TrackPath
 *   s = 시작점부터의 중심선 거리, (hx, hz) = 그 지점의 진행 방향
 */

const rightOf = (h) => ({ x: -h.z, z: h.x });

/** heading을 오른쪽으로 rad만큼 돌린다 */
function turn(h, rad) {
  const r = rightOf(h);
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: h.x * c + r.x * s, z: h.z * c + r.z * s };
}

/**
 * 조각 하나를 따라가는 함수 at(u) → { x, z, h } (u = 조각 안에서의 거리, 0..length)
 * @param {TrackPiece} piece
 */
function pieceCurve(piece, start, h0) {
  if (piece.type === 'straight') {
    return {
      length: piece.length,
      at: (u) => ({ x: start.x + h0.x * u, z: start.z + h0.z * u, h: h0 }),
    };
  }
  if (piece.type === 'arc') {
    const R = piece.radius;
    const theta = (piece.angle * Math.PI) / 180;
    const sign = Math.sign(theta) || 1;
    const r0 = rightOf(h0);
    // p(φ) = p0 + R (h0 sin φ + sign · r0 (1 - cos φ)),  p'(φ) = R · h(φ)
    return {
      length: R * Math.abs(theta),
      at: (u) => {
        const phi = u / R;
        const sp = Math.sin(phi);
        const cp = 1 - Math.cos(phi);
        return {
          x: start.x + R * (h0.x * sp + sign * r0.x * cp),
          z: start.z + R * (h0.z * sp + sign * r0.z * cp),
          h: turn(h0, sign * phi),
        };
      },
    };
  }
  throw new Error(`Unknown track piece: ${piece.type}`);
}

/**
 * 트랙을 만든다. 메쉬와 강체는 scene/world에 바로 추가하고, dispose()로 지운다.
 * @param {{ scene: THREE.Scene, world: CANNON.World, materials: { track: THREE.Material, wall: THREE.Material },
 *           width: number, start: {x:number,z:number}, heading: Heading, pieces: TrackPiece[] }} opts
 * @returns {{ path: TrackPath, end: { position: {x:number,z:number}, heading: Heading }, dispose(): void }}
 */
export function buildTrack({ scene, world, materials, width, start, heading, pieces }) {
  const boxes = createBoxSet({ scene, world });

  /**
   * a → b 직선 구간 하나에 바닥(과 벽)을 깐다.
   * scaleFor(off) = 중심선에서 off만큼 떨어진 줄의 길이 비율 (곡선 바깥쪽 틈 막기)
   */
  function addSpan(a, b, { floor = true, walls = false }, scaleFor) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const dir = { x: dx / len, z: dz / len };
    const r = rightOf(dir);
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    if (floor) {
      boxes.add({
        x: mx,
        z: mz,
        top: 0,
        dir,
        length: len * scaleFor(width / 2) + OVERLAP,
        width,
        height: THICK,
        material: materials.track,
      });
    }
    if (!walls) return;
    const off = width / 2 + WALL_T / 2;
    for (const side of [-1, 1]) {
      boxes.add({
        x: mx + r.x * off * side,
        z: mz + r.z * off * side,
        top: WALL_H,
        dir,
        length: len * scaleFor(off + WALL_T / 2) + OVERLAP,
        width: WALL_T,
        height: WALL_H + THICK,
        material: materials.wall,
        castShadow: true,
      });
    }
  }

  const points = [];
  let pos = { x: start.x, z: start.z };
  let h = { x: heading.x, z: heading.z };
  let s0 = 0;

  for (const piece of pieces) {
    const curve = pieceCurve(piece, pos, h);

    if (piece.type === 'straight') {
      const end = curve.at(curve.length);
      addSpan(pos, end, piece, () => 1);
    } else {
      // 곡선: chord 상자. 상자 길이를 가장 바깥 반지름 기준으로 늘려야 바깥쪽에 틈이 안 생긴다.
      const R = piece.radius;
      const n = Math.max(1, Math.ceil(Math.abs(piece.angle) / ARC_STEP_DEG));
      const du = curve.length / n;
      for (let i = 0; i < n; i++) {
        addSpan(curve.at(i * du), curve.at((i + 1) * du), piece, (off) => (R + off) / R);
      }
    }

    // 중심선 샘플 (조각의 시작점 포함, 끝점은 다음 조각이 넣는다)
    const n = Math.max(1, Math.ceil(curve.length / PATH_STEP));
    for (let i = 0; i < n; i++) {
      const u = (i / n) * curve.length;
      const p = curve.at(u);
      points.push({ x: p.x, y: 0, z: p.z, s: s0 + u, hx: p.h.x, hz: p.h.z });
    }

    const e = curve.at(curve.length);
    pos = { x: e.x, z: e.z };
    h = normalize(e.h);
    s0 += curve.length;
  }
  points.push({ x: pos.x, y: 0, z: pos.z, s: s0, hx: h.x, hz: h.z });

  return {
    path: { points, length: s0 },
    end: { position: pos, heading: h },
    dispose() {
      boxes.dispose();
    },
  };
}

function normalize(h) {
  const l = Math.hypot(h.x, h.z) || 1;
  return { x: h.x / l, z: h.z / l };
}

/**
 * 중심선에서 거리 s 지점의 위치와 진행 방향 (장애물 배치용).
 * @param {TrackPath} path
 * @param {number} s
 */
export function pointAt(path, s) {
  const pts = path.points;
  if (s <= 0) return toPose(pts[0], pts[0], 0);
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].s >= s) {
      const a = pts[i - 1];
      const b = pts[i];
      return toPose(a, b, (s - a.s) / (b.s - a.s || 1));
    }
  }
  const last = pts[pts.length - 1];
  return toPose(last, last, 0);
}

function toPose(a, b, t) {
  return {
    position: { x: a.x + (b.x - a.x) * t, y: 0, z: a.z + (b.z - a.z) * t },
    heading: normalize({ x: a.hx + (b.hx - a.hx) * t, z: a.hz + (b.hz - a.hz) * t }),
  };
}

/**
 * 점 p에서 가장 가까운 중심선 위치의 진행 방향. 카메라 heading용.
 * @param {TrackPath} path
 * @param {{x:number,z:number}} p
 * @returns {{ heading: Heading, s: number, dist: number }}
 */
export function nearestOnPath(path, p) {
  const pts = path.points;
  let best = { d2: Infinity, i: 0, t: 0 };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const l2 = ex * ex + ez * ez || 1;
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * ex + (p.z - a.z) * ez) / l2));
    const qx = a.x + ex * t - p.x;
    const qz = a.z + ez * t - p.z;
    const d2 = qx * qx + qz * qz;
    if (d2 < best.d2) best = { d2, i, t };
  }
  const a = pts[best.i - 1] ?? pts[0];
  const b = pts[best.i] ?? pts[0];
  const pose = toPose(a, b, best.t);
  return { heading: pose.heading, s: a.s + (b.s - a.s) * best.t, dist: Math.sqrt(best.d2) };
}
