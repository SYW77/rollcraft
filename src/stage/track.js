// 트랙 조각(직선 · 곡선)을 이어 붙여 바닥/벽과 중심선(path)을 만든다. 담당: 손연우
//
// 좌표 규칙
// - 트랙 윗면은 출발점에서 y = 0, 조각의 rise만큼 오르내린다. 바닥/벽 두께는 1 이상 (터널링 방지).
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
const ROAD_TILE = 4; // 길 텍스처 한 장의 진행 방향 길이 (m)

/**
 * @typedef {{ type: 'straight', length: number, walls?: boolean | 'left' | 'right', floor?: boolean, rise?: number, width?: number }
 *         | { type: 'arc', radius: number, angle: number, walls?: boolean | 'left' | 'right', floor?: boolean, rise?: number, width?: number }} TrackPiece
 *   arc.angle: 도(deg). 양수 = 오른쪽으로 꺾임, 음수 = 왼쪽.
 *   walls: 양옆에 벽을 세운다 (기본 false, 떨어질 수 있음). 'left' · 'right'면 그쪽에만.
 *   floor: false면 바닥을 비운다 (splitRail처럼 장애물이 바닥을 대신하는 구간).
 *   rise: 조각 끝까지 올라가는 높이 (m, 음수 = 내리막). 양 끝 기울기가 0이 되게 부드럽게 오르내린다.
 *   width: 이 조각만 트랙 폭을 바꾼다 (좁은 다리 등).
 *   skirt: false면 바닥 밑 둑을 안 채운다 (공중 다리. 테마 레벨에서 기둥만 세운다).
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

/** 조각 안 높이: 양 끝 기울기가 0인 smoothstep (이음매에서 꺾이지 않게) */
const ease = (t) => t * t * (3 - 2 * t);

/** 조각 길이 (m) */
export function pieceLength(p) {
  return p.type === 'arc' ? (p.radius * Math.abs(p.angle) * Math.PI) / 180 : p.length;
}

/**
 * 트랙을 만든다. 메쉬와 강체는 scene/world에 바로 추가하고, dispose()로 지운다.
 * @param {{ scene: THREE.Scene, world: CANNON.World, materials: { track: THREE.Material, wall: THREE.Material, skirt?: THREE.Material },
 *           width: number, start: {x:number,z:number}, heading: Heading, pieces: TrackPiece[],
 *           wallHeight?: number, wallCap?: number, groundY?: number }} opts
 *   wallHeight = 벽 높이 (기본 WALL_H). wallCap > wallHeight면 벽 위에 그 높이까지 보이지 않는 벽을 더 세운다
 *   (큰 다리가 벽을 타고 올라 벽 위로 장애물을 우회하지 못하게). groundY가 있으면 바닥 아래를 그 높이까지 둑(장식, 충돌 없음)으로 채운다.
 * @returns {{ path: TrackPath, end: { position: {x:number,z:number}, heading: Heading, y: number }, dispose(): void }}
 */
export function buildTrack({
  scene,
  world,
  materials,
  width,
  start,
  heading,
  pieces,
  wallHeight = WALL_H,
  wallCap = 0,
  groundY,
}) {
  const boxes = createBoxSet({ scene, world });

  /**
   * a → b 구간 하나에 바닥(과 벽)을 깐다. a, b = { x, y, z } (y = 트랙 윗면 높이)
   * scaleFor(off) = 중심선에서 off만큼 떨어진 줄의 길이 비율 (곡선 바깥쪽 틈 막기)
   */
  function addSpan(
    a,
    b,
    { floor = true, walls = false, skirt = true, width: w = width },
    scaleFor,
  ) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const dir = { x: dx / len, z: dz / len };
    const r = rightOf(dir);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const mz = (a.z + b.z) / 2;
    const pitch = Math.atan2(b.y - a.y, len);
    const slope = 1 / Math.cos(pitch); // 기운 상자는 수평 거리보다 길어야 한다
    if (floor) {
      const mesh = boxes.add({
        x: mx,
        z: mz,
        top: my,
        dir,
        length: len * slope * scaleFor(w / 2) + OVERLAP,
        width: w,
        height: THICK,
        pitch,
        material: materials.track,
      });
      // 길 무늬가 상자 길이에 따라 늘어나지 않게 v를 길이에 맞춘다 (텍스처 한 장 = ROAD_TILE m)
      const uv = mesh.geometry.attributes.uv;
      const k = (len * slope) / ROAD_TILE;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * k);
      // 공중 다리: 양쪽 가장자리에 기둥 (보이기만)
      if (!skirt && groundY !== undefined && materials.skirt) {
        for (const side of [-1, 1]) {
          boxes.add({
            x: mx + r.x * (w / 2 - 0.2) * side,
            z: mz + r.z * (w / 2 - 0.2) * side,
            top: my - THICK + 0.02,
            dir,
            length: 0.4,
            width: 0.4,
            height: my - THICK - groundY + 0.5,
            material: materials.skirt,
            castShadow: true,
            solid: false,
          });
        }
      }
      // 둑: 바닥 밑을 땅까지 채운다 (보이기만)
      if (skirt && groundY !== undefined && materials.skirt) {
        const bottom = Math.min(a.y, b.y) - THICK;
        if (bottom > groundY + 0.05) {
          boxes.add({
            x: mx,
            z: mz,
            top: bottom + 0.02,
            dir,
            length: len * scaleFor(w / 2) + OVERLAP,
            width: w - 0.3,
            height: bottom - groundY + 0.5,
            material: materials.skirt,
            solid: false,
          });
        }
      }
    }
    if (!walls) return;
    const off = w / 2 + WALL_T / 2;
    // walls: true = 양쪽, 'left' · 'right' = 그쪽만
    const sides = walls === 'left' ? [-1] : walls === 'right' ? [1] : [-1, 1];
    for (const side of sides) {
      boxes.add({
        x: mx + r.x * off * side,
        z: mz + r.z * off * side,
        top: my + wallHeight,
        dir,
        length: len * slope * scaleFor(off + WALL_T / 2) + OVERLAP,
        width: WALL_T,
        height: wallHeight + THICK,
        pitch,
        material: materials.wall,
        castShadow: true,
      });
      if (wallCap > wallHeight) {
        boxes.add({
          x: mx + r.x * off * side,
          z: mz + r.z * off * side,
          top: my + wallCap,
          dir,
          length: len * slope * scaleFor(off + WALL_T / 2) + OVERLAP,
          width: WALL_T,
          height: wallCap - wallHeight + 0.05,
          pitch,
          hidden: true,
        });
      }
    }
  }

  const points = [];
  let pos = { x: start.x, z: start.z };
  let y = 0;
  let h = { x: heading.x, z: heading.z };
  let s0 = 0;

  for (const piece of pieces) {
    const curve = pieceCurve(piece, pos, h);
    const rise = piece.rise ?? 0;
    const y0 = y;
    const yAt = (u) => y0 + rise * ease(u / curve.length);
    const at = (u) => ({ ...curve.at(u), y: yAt(u) });

    if (piece.type === 'straight') {
      // 높낮이가 있으면 1.5m마다 나눠 곡면을 따라간다
      const n = rise ? Math.max(2, Math.ceil(curve.length / 1.5)) : 1;
      const du = curve.length / n;
      for (let i = 0; i < n; i++) addSpan(at(i * du), at((i + 1) * du), piece, () => 1);
    } else {
      // 곡선: chord 상자. 상자 길이를 가장 바깥 반지름 기준으로 늘려야 바깥쪽에 틈이 안 생긴다.
      const R = piece.radius;
      const n = Math.max(1, Math.ceil(Math.abs(piece.angle) / ARC_STEP_DEG));
      const du = curve.length / n;
      for (let i = 0; i < n; i++) {
        addSpan(at(i * du), at((i + 1) * du), piece, (off) => (R + off) / R);
      }
    }

    // 중심선 샘플 (조각의 시작점 포함, 끝점은 다음 조각이 넣는다)
    const n = Math.max(1, Math.ceil(curve.length / PATH_STEP));
    for (let i = 0; i < n; i++) {
      const u = (i / n) * curve.length;
      const p = at(u);
      points.push({ x: p.x, y: p.y, z: p.z, s: s0 + u, hx: p.h.x, hz: p.h.z });
    }

    const e = curve.at(curve.length);
    pos = { x: e.x, z: e.z };
    y = y0 + rise;
    h = normalize(e.h);
    s0 += curve.length;
  }
  points.push({ x: pos.x, y, z: pos.z, s: s0, hx: h.x, hz: h.z });

  return {
    path: { points, length: s0 },
    end: { position: pos, heading: h, y },
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
    position: {
      x: a.x + (b.x - a.x) * t,
      y: (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * t,
      z: a.z + (b.z - a.z) * t,
    },
    heading: normalize({ x: a.hx + (b.hx - a.hx) * t, z: a.hz + (b.hz - a.hz) * t }),
  };
}

/**
 * 점 p에서 가장 가까운 중심선 위치의 진행 방향. 카메라 heading용.
 * @param {TrackPath} path
 * @param {{x:number,z:number}} p
 * @returns {{ heading: Heading, s: number, dist: number, y: number }}  y = 그 지점의 트랙 윗면 높이
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
    // 높이 차이는 2m 넘는 부분만 센다 (위아래로 겹치는 길에서 엉뚱한 층을 고르지 않게)
    const dy =
      p.y === undefined
        ? 0
        : Math.max(0, Math.abs((a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * t - p.y) - 2);
    const d2 = qx * qx + qz * qz + dy * dy;
    if (d2 < best.d2) best = { d2, i, t };
  }
  const a = pts[best.i - 1] ?? pts[0];
  const b = pts[best.i] ?? pts[0];
  const pose = toPose(a, b, best.t);
  return {
    heading: pose.heading,
    s: a.s + (b.s - a.s) * best.t,
    dist: Math.sqrt(best.d2),
    y: pose.position.y,
  };
}
