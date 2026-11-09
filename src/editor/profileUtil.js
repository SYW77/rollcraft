// 자유 드로잉 점 → 계약 Profile 변환. 담당: 최수정
// STUB: 단순 선형 리샘플 + y 단조 보정. 정밀한 규칙은 실제 구현에서.
import { PROFILE_POINTS, R_MIN, R_MAX } from '../shared/contracts.js';

/**
 * @param {{ r: number, y: number }[]} rawPoints 캔버스에서 얻은 점 (정규화 전)
 * @returns {import('../shared/contracts.js').Profile}
 */
export function resampleProfile(rawPoints) {
  if (rawPoints.length < 2) throw new Error('need at least 2 points');

  // y 단조 증가로 정렬 (오버행 제거)
  const pts = [...rawPoints].sort((a, b) => a.y - b.y);
  const y0 = pts[0].y;
  const y1 = pts[pts.length - 1].y;
  const h = y1 - y0 || 1;
  const rMax = Math.max(...pts.map((p) => p.r)) || 1;

  const out = [];
  for (let i = 0; i < PROFILE_POINTS; i++) {
    const t = i / (PROFILE_POINTS - 1);
    const y = y0 + t * h;
    // y를 감싸는 두 점 사이 선형 보간
    let j = 0;
    while (j < pts.length - 2 && pts[j + 1].y < y) j++;
    const a = pts[j];
    const b = pts[j + 1];
    const s = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
    const r = (a.r + s * (b.r - a.r)) / rMax;
    out.push({ r: Math.min(R_MAX, Math.max(R_MIN, r)), y: t });
  }
  return out;
}
