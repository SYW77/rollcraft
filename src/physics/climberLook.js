// 클라이머 생김새 (동물 몸통 · 그린 선 다리) + 다리 선 계산. 담당: 원유승
// climber.js(게임 속 물리 플레이어)와 ui/lobby.js(대기 화면 미리보기)가 같이 쓴다.
//
// 동물은 생김새만 다르다. 충돌 모양 · 무게는 모두 같다 (BODY · HEAD 상자) → 멀티에서 동물로 유불리가 생기지 않는다.
// 좌표 (몸통 로컬): X = 좌우(경첩 축), Y = 위, Z = 뒤 (앞 = −Z). 다리 평면 = 로컬 YZ.
import * as THREE from 'three';

// ── 치수 (물리와 같이 쓴다) ──
export const BODY = { w: 0.5, h: 0.42, d: 0.55 }; // 몸통 상자 (폭 = 축 방향)
export const HEAD = { s: 0.36, y: 0.33, z: -0.14 }; // 머리 상자 (몸통 중심 기준 위치)
export const LEG_DEPTH = 0.1; // 다리 충돌 상자 폭 (축 방향)
export const LEG_SIDE_X = BODY.w / 2 + 0.06 + LEG_DEPTH / 2; // 다리가 붙는 위치 (몸통 옆면 바깥)
const LEG_SCALE = 0.7; // 그리기 칸 반 폭(정규화 1) = 이만큼 (m). 칸 끝에서 끝까지 그으면 1.4m 다리
const MAX_REACH = 1.3; // 다리 끝이 경첩에서 이보다 멀면 선 전체를 줄인다 (m)
const LEG_RADIUS = 0.05; // 화면용 관 반지름
const SEG_LEN = 0.12;
const MAX_SEGS = 24;

const INK = 0x2a241f;
const HUB = 0xd9892a;
const MARK = 0xfbe3b8;

// ── 다리 선 ──

/** 선 길이를 따라 고르게 다시 고른다 */
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const L = Math.hypot(bx - ax, by - ay);
    let s = step - carry;
    while (s <= L) {
      out.push([ax + ((bx - ax) * s) / L, ay + ((by - ay) * s) / L]);
      s += step;
    }
    carry = L - (s - step);
  }
  const last = pts[pts.length - 1];
  const prev = out[out.length - 1];
  if (Math.hypot(last[0] - prev[0], last[1] - prev[1]) > step * 0.3) out.push(last);
  return out;
}

/**
 * 그리기 칸 좌표(Legs) → 다리 평면 점 [z, y] (m). 시작점 = 경첩 (0, 0), 오른쪽 = 앞(−Z).
 * @param {import('../shared/contracts.js').Legs} stroke
 */
export function legLine(stroke) {
  if (!stroke || stroke.length < 2) return [];
  const [x0, y0] = [stroke[0].x, stroke[0].y];
  let pts = stroke.map((p) => [-(p.x - x0) * LEG_SCALE, (p.y - y0) * LEG_SCALE]);
  const far = Math.max(...pts.map(([z, y]) => Math.hypot(z, y)));
  if (far > MAX_REACH) pts = pts.map(([z, y]) => [(z * MAX_REACH) / far, (y * MAX_REACH) / far]);
  let line = resample(pts, SEG_LEN);
  if (line.length > MAX_SEGS + 1) line = resample(pts, (SEG_LEN * (line.length - 1)) / MAX_SEGS);
  return line;
}

/** 한쪽 다리 선: 오른쪽(+1)은 그대로, 왼쪽(−1)은 축 둘레로 180° 돌린다 (페달처럼) */
export const sideLine = (line, sx) => (sx > 0 ? line : line.map(([z, y]) => [-z, -y]));

// ── 동물 ──

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function pyramid(r, h, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(r, h, 4),
    new THREE.MeshStandardMaterial({ color }),
  );
  m.rotation.y = Math.PI / 4;
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

const hy = HEAD.y;
const hz = HEAD.z;
const s = HEAD.s;
const face = hz - s / 2; // 얼굴 앞면 z

/** 몸 + 머리 + 가슴 · 주둥이 + 눈 (모든 동물 공통 뼈대) */
function base(g, { fur, light, eye = INK, muzzle = true }) {
  g.add(box(BODY.w, BODY.h, BODY.d, fur, 0, 0, 0));
  g.add(box(BODY.w * 0.7, BODY.h * 0.5, 0.02, light, 0, -0.04, -BODY.d / 2 - 0.005)); // 가슴
  g.add(box(s, s, s, fur, 0, hy, hz));
  if (muzzle) g.add(box(s * 0.6, s * 0.35, 0.02, light, 0, hy - 0.07, face - 0.005)); // 주둥이
  for (const sx of [-1, 1]) g.add(box(0.05, 0.07, 0.02, eye, sx * 0.09, hy + 0.04, face - 0.01));
}

/** 동물마다 생김새. 모두 BODY · HEAD 크기 안팎에서 덧붙이기만 한다. */
const BUILDERS = {
  cat(g) {
    base(g, { fur: 0xf2a33a, light: 0xfbe3b8 });
    for (const sx of [-1, 1])
      g.add(pyramid(0.08, 0.13, 0xf2a33a, sx * 0.11, hy + s / 2 + 0.06, hz));
    g.add(box(0.05, 0.035, 0.02, 0xe8798a, 0, hy - 0.04, face - 0.02)); // 코
    const tail = box(0.07, 0.3, 0.07, 0xf2a33a, 0, 0.2, BODY.d / 2 + 0.03);
    tail.rotation.x = -0.5;
    g.add(tail);
  },
  dog(g) {
    base(g, { fur: 0xb5793f, light: 0xf1dcc0 });
    for (const sx of [-1, 1]) {
      const ear = box(0.07, 0.2, 0.14, 0x6b4426, sx * (s / 2 + 0.03), hy - 0.02, hz); // 늘어진 귀
      ear.rotation.z = sx * 0.15;
      g.add(ear);
    }
    g.add(box(0.16, 0.1, 0.1, 0xf1dcc0, 0, hy - 0.08, face - 0.05)); // 튀어나온 주둥이
    g.add(box(0.07, 0.05, 0.03, INK, 0, hy - 0.04, face - 0.1)); // 코
    const tail = box(0.06, 0.24, 0.06, 0xb5793f, 0, 0.18, BODY.d / 2 + 0.02);
    tail.rotation.x = -0.9;
    g.add(tail);
  },
  rabbit(g) {
    base(g, { fur: 0xf4f1ec, light: 0xffffff });
    for (const sx of [-1, 1]) {
      g.add(box(0.08, 0.32, 0.06, 0xf4f1ec, sx * 0.09, hy + s / 2 + 0.16, hz + 0.04)); // 긴 귀
      g.add(box(0.04, 0.24, 0.01, 0xf3a6b5, sx * 0.09, hy + s / 2 + 0.16, hz + 0.005)); // 귀 안쪽
    }
    g.add(box(0.05, 0.035, 0.02, 0xe8798a, 0, hy - 0.04, face - 0.02)); // 코
    g.add(box(0.12, 0.12, 0.12, 0xffffff, 0, -0.02, BODY.d / 2 + 0.05)); // 동그란 꼬리
  },
  bear(g) {
    base(g, { fur: 0x6e4a30, light: 0xd8b48a });
    for (const sx of [-1, 1]) {
      g.add(box(0.11, 0.11, 0.06, 0x6e4a30, sx * 0.13, hy + s / 2 + 0.03, hz)); // 둥근 귀
      g.add(box(0.05, 0.05, 0.01, 0xd8b48a, sx * 0.13, hy + s / 2 + 0.03, hz - 0.035));
    }
    g.add(box(0.08, 0.05, 0.03, INK, 0, hy - 0.04, face - 0.02)); // 코
  },
  pig(g) {
    base(g, { fur: 0xf2a0b0, light: 0xf8c3cd, muzzle: false });
    g.add(box(0.16, 0.11, 0.06, 0xe8798a, 0, hy - 0.06, face - 0.03)); // 납작 코
    for (const sx of [-1, 1]) {
      g.add(box(0.03, 0.04, 0.01, 0x9c3f55, sx * 0.035, hy - 0.06, face - 0.065)); // 콧구멍
      const ear = pyramid(0.07, 0.1, 0xf2a0b0, sx * 0.12, hy + s / 2 + 0.03, hz);
      ear.rotation.x = 0.4;
      g.add(ear);
    }
    const tail = box(0.05, 0.05, 0.12, 0xe8798a, 0, 0.1, BODY.d / 2 + 0.05);
    tail.rotation.z = 0.8;
    g.add(tail);
  },
  frog(g) {
    base(g, { fur: 0x5fb85a, light: 0xd8f0b8, muzzle: false, eye: 0x5fb85a });
    for (const sx of [-1, 1]) {
      g.add(box(0.14, 0.14, 0.14, 0x5fb85a, sx * 0.11, hy + s / 2 + 0.03, hz - 0.04)); // 툭 튀어나온 눈
      g.add(box(0.07, 0.08, 0.02, INK, sx * 0.11, hy + s / 2 + 0.03, hz - 0.12));
    }
    g.add(box(s * 0.8, 0.03, 0.02, 0x2f6b2c, 0, hy - 0.08, face - 0.01)); // 넓은 입
  },
  penguin(g) {
    base(g, { fur: 0x1f2a44, light: 0xffffff, muzzle: false, eye: INK });
    g.add(box(s * 0.75, s * 0.7, 0.02, 0xffffff, 0, hy - 0.02, face - 0.005)); // 흰 얼굴
    for (const sx of [-1, 1]) g.add(box(0.05, 0.07, 0.02, INK, sx * 0.08, hy + 0.04, face - 0.02)); // 눈
    g.add(box(0.1, 0.06, 0.1, 0xf2a33a, 0, hy - 0.05, face - 0.05)); // 부리
    g.add(box(BODY.w * 0.75, BODY.h * 0.8, 0.02, 0xffffff, 0, -0.02, -BODY.d / 2 - 0.006)); // 흰 배
  },
};

/** 고를 수 있는 동물 (id, 이름, 대표 색) */
export const ANIMALS = Object.freeze([
  { id: 'cat', name: '고양이', color: '#f2a33a' },
  { id: 'dog', name: '강아지', color: '#b5793f' },
  { id: 'rabbit', name: '토끼', color: '#f4f1ec' },
  { id: 'bear', name: '곰', color: '#6e4a30' },
  { id: 'pig', name: '돼지', color: '#f2a0b0' },
  { id: 'frog', name: '개구리', color: '#5fb85a' },
  { id: 'penguin', name: '펭귄', color: '#1f2a44' },
]);

/**
 * 동물 몸통 (몸통 로컬 좌표). 모르는 id면 고양이.
 * @param {string} [id]
 */
export function makeAnimal(id = 'cat') {
  const g = new THREE.Group();
  (BUILDERS[id] ?? BUILDERS.cat)(g);
  return g;
}

/**
 * 다리 (다리 로컬 좌표): 양옆에 굵은 관 + 둥근 끝 + 허브. 왼쪽은 180° 돌린 선.
 * @param {[number, number][]} baseLine legLine() 결과
 */
export function makeLegs(baseLine) {
  const g = new THREE.Group();
  const ink = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.6 });
  const hubMat = new THREE.MeshStandardMaterial({ color: HUB });
  const markMat = new THREE.MeshStandardMaterial({ color: MARK });
  for (const sx of [-1, 1]) {
    const x = sx * LEG_SIDE_X;
    const line = sideLine(baseLine, sx);
    if (line.length >= 2) {
      const path = new THREE.CurvePath();
      for (let i = 1; i < line.length; i++) {
        path.add(
          new THREE.LineCurve3(
            new THREE.Vector3(x, line[i - 1][1], line[i - 1][0]),
            new THREE.Vector3(x, line[i][1], line[i][0]),
          ),
        );
      }
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(path, Math.max(8, (line.length - 1) * 4), LEG_RADIUS, 8, false),
        ink,
      );
      tube.castShadow = true;
      g.add(tube);
      for (const p of [line[0], line[line.length - 1]]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(LEG_RADIUS, 12, 8), ink);
        cap.position.set(x, p[1], p[0]);
        g.add(cap);
      }
    }
    // 허브: 축에 꽂힌 원판 + 회전이 보이는 표시
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 20), hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = sx * (BODY.w / 2 + 0.03);
    g.add(hub);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.14, 0.03), markMat);
    mark.position.x = sx * (BODY.w / 2 + 0.06);
    g.add(mark);
  }
  return g;
}

/** makeAnimal · makeLegs로 만든 그룹의 지오메트리 · 재질을 정리한다 */
export function disposeLook(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
}
