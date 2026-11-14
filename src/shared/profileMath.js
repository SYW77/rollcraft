// 프로파일 기하 계산 (부피, 무게중심, 투영면적, 관성). 담당: 원유승
//
// 좌표계: 회전체의 로컬 좌표. Y축 = 회전축, 원점 = 프로파일 바닥(y = 0).
// 단위: 월드 단위. latheGeometry와 같은 규칙으로 정규화 프로파일을 변환한다.
//   반지름 = r × PLAYER_SIZE / 2  (r 최대 1.0 → 지름 PLAYER_SIZE)
//   높이   = y × PLAYER_SIZE
// 프로파일의 이웃한 두 점 사이 = 원뿔대(frustum) 한 구간. PROFILE_POINTS = 12 → 구간 11개.
import { PLAYER_SIZE } from './contracts.js';

const SLICES_PER_SEGMENT = 16; // 관성 적분용 원판 개수 (구간당)

/**
 * 정규화 프로파일 → 월드 단위 원뿔대 구간 목록.
 * @param {import('./contracts.js').Profile} profile
 * @returns {{ r1: number, r2: number, y1: number, y2: number, h: number,
 *             volume: number, centerY: number, comY: number }[]}
 *   r1/y1 = 아래, r2/y2 = 위. centerY = 구간 높이 중앙(콜라이더 위치), comY = 구간 무게중심.
 */
export function frustumSegments(profile) {
  const rs = PLAYER_SIZE / 2;
  const segs = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const r1 = profile[i].r * rs;
    const r2 = profile[i + 1].r * rs;
    const y1 = profile[i].y * PLAYER_SIZE;
    const y2 = profile[i + 1].y * PLAYER_SIZE;
    const h = y2 - y1;
    if (h <= 1e-9) continue; // 높이 0 구간은 부피가 없음
    const k = r1 * r1 + r1 * r2 + r2 * r2;
    segs.push({
      r1,
      r2,
      y1,
      y2,
      h,
      volume: (Math.PI * h * k) / 3,
      centerY: (y1 + y2) / 2,
      // 원뿔대 무게중심 (아래 면 기준): h (r1² + 2 r1 r2 + 3 r2²) / (4 (r1² + r1 r2 + r2²))
      comY: y1 + (h * (r1 * r1 + 2 * r1 * r2 + 3 * r2 * r2)) / (4 * k),
    });
  }
  return segs;
}

/**
 * @param {import('./contracts.js').Profile} profile
 * @returns {{ volume: number, comY: number, maxRadius: number, height: number,
 *             projectedArea: (dir: {x:number,y:number,z:number}) => number }}
 *   모두 월드 단위. comY는 로컬 원점(프로파일 바닥) 기준.
 *   projectedArea(dir): dir 방향(로컬 좌표, 길이 무관)에서 본 실루엣 면적.
 */
export function profileStats(profile) {
  const segs = frustumSegments(profile);
  const volume = segs.reduce((s, g) => s + g.volume, 0);
  const comY = segs.reduce((s, g) => s + g.volume * g.comY, 0) / volume;
  const maxRadius = Math.max(...segs.flatMap((g) => [g.r1, g.r2]));
  const height = segs.length ? segs[segs.length - 1].y2 - segs[0].y1 : 0;

  // 축 방향에서 본 면적 = 가장 큰 원, 옆에서 본 면적 = 사다리꼴 합
  const axialArea = Math.PI * maxRadius * maxRadius;
  const sideArea = segs.reduce((s, g) => s + (g.r1 + g.r2) * g.h, 0);

  return {
    volume,
    comY,
    maxRadius,
    height,
    // 근사: 축과 dir 사이 각 θ에 대해 |cos θ| × 축 방향 면적 + |sin θ| × 옆면 면적.
    // θ = 0, 90°에서는 정확하고 그 사이는 실제보다 약간 크게 나온다.
    projectedArea(dir) {
      const len = Math.hypot(dir.x, dir.y, dir.z);
      if (len === 0) return 0;
      const c = Math.abs(dir.y) / len;
      const s = Math.sqrt(Math.max(0, 1 - c * c));
      return c * axialArea + s * sideArea;
    },
  };
}

/**
 * 균일 밀도 회전체의 무게중심 기준 주관성모멘트.
 * 각 구간을 얇은 원판으로 잘라 합산한다: 원판(반지름 r, 질량 dm)의
 *   축 방향 ½ dm r², 가로 방향 dm (r²/4 + d²)  (d = 무게중심까지 높이 차, 평행축 정리)
 * @param {import('./contracts.js').Profile} profile
 * @param {number} mass
 * @returns {{ axial: number, transverse: number }}  axial = 회전축(Y), transverse = X·Z
 */
export function profileInertia(profile, mass) {
  const segs = frustumSegments(profile);
  const { volume, comY } = profileStats(profile);
  const density = mass / volume;
  let axial = 0;
  let transverse = 0;
  for (const g of segs) {
    const dy = g.h / SLICES_PER_SEGMENT;
    for (let j = 0; j < SLICES_PER_SEGMENT; j++) {
      const t = (j + 0.5) / SLICES_PER_SEGMENT;
      const r = g.r1 + (g.r2 - g.r1) * t;
      const y = g.y1 + g.h * t;
      const dm = density * Math.PI * r * r * dy;
      const d = y - comY;
      axial += 0.5 * dm * r * r;
      transverse += dm * (r * r * 0.25 + d * d);
    }
  }
  return { axial, transverse };
}

/**
 * 옆으로 누웠을 때 바닥에 닿는 "옆면": 프로파일 바깥쪽 볼록 껍질에서 가장 긴 변.
 * 원통·원뿔·아령은 높이만큼 긴 옆면이 있어 그 면으로 눕고(원뿔은 기울어져서),
 * 구·달걀처럼 둥근 모양은 긴 옆면이 없어 아무 방향으로나 구른다.
 * 위·아래 캡(r = 0인 점으로 가는 변)은 세워진 자세라 제외한다.
 * @param {import('./contracts.js').Profile} profile
 * @returns {{ length: number, tilt: number }}  length = 월드 단위, tilt = 회전축과 옆면 사이 각 (rad)
 */
export function restingSide(profile) {
  const { length, tilt } = restingEdge(profile);
  return { length, tilt };
}

/**
 * 옆으로 누웠을 때 옆면 중 실제로 바닥에 닿는 비율 (0~1). 조향 세기에 쓴다.
 * 원통처럼 옆면 전체가 닿으면 1, 아령처럼 양 끝 테두리만 닿으면 0에 가깝다.
 * 프로파일 점은 y로 균등하므로, 옆면 선에서 CONTACT_TOL 안에 있는 점의 비율로 근사한다.
 * @param {import('./contracts.js').Profile} profile
 * @returns {number}
 */
export function contactFraction(profile) {
  const { a, b, length } = restingEdge(profile);
  if (!a || length === 0) return 0;
  const rs = PLAYER_SIZE / 2;
  const tol = CONTACT_TOL * PLAYER_SIZE;
  let n = 0;
  for (const p of profile) {
    const r = p.r * rs;
    const y = p.y * PLAYER_SIZE;
    if (y < Math.min(a.y, b.y) - 1e-9 || y > Math.max(a.y, b.y) + 1e-9) continue;
    // 옆면 선분까지의 거리 (바깥쪽 껍질이라 점은 항상 선 안쪽에 있다)
    const d = ((b.y - a.y) * (r - a.r) - (b.r - a.r) * (y - a.y)) / length;
    if (Math.abs(d) <= tol) n++;
  }
  return n / profile.length;
}

const CONTACT_TOL = 0.02; // 옆면에서 이만큼(크기 대비) 안쪽까지는 닿는 것으로 본다

/** 바깥쪽 볼록 껍질에서 가장 긴 변 (월드 단위 끝점 a, b 포함) */
function restingEdge(profile) {
  const rs = PLAYER_SIZE / 2;
  const pts = profile.map((p) => ({ r: p.r * rs, y: p.y * PLAYER_SIZE }));
  // y 순서로 훑으며 바깥쪽(r이 큰 쪽) 볼록 껍질을 만든다 (monotone chain)
  const hull = [];
  for (const p of pts) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2];
      const b = hull[hull.length - 1];
      // a→b→p 가 안쪽으로 꺾이면 b 제거 (외적 부호로 판정)
      const cross = (b.y - a.y) * (p.r - a.r) - (b.r - a.r) * (p.y - a.y);
      if (cross >= 0) hull.pop();
      else break;
    }
    hull.push(p);
  }
  let best = { length: 0, tilt: 0, a: null, b: null };
  for (let i = 0; i < hull.length - 1; i++) {
    const dr = hull[i + 1].r - hull[i].r;
    const dy = hull[i + 1].y - hull[i].y;
    const length = Math.hypot(dr, dy);
    if (length > best.length)
      best = { length, tilt: Math.atan2(Math.abs(dr), dy), a: hull[i], b: hull[i + 1] };
  }
  return best;
}
