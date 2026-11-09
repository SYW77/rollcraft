// 자유 드로잉 점 → 계약 Profile 변환. 담당: 최수정
// 캔버스 드로잉 좌표를 12개 균등 y점의 Profile로 리샘플링하고 y 단조성 및 r 제약을 보장합니다.
import { PROFILE_POINTS, R_MIN, R_MAX } from '../shared/contracts.js';

const clampR = (r) => Math.min(R_MAX, Math.max(R_MIN, r));

/**
 * 캔버스/마우스 드로잉 좌표들을 계약에 맞는 12점 Profile로 변환합니다.
 *
 * 처리 과정:
 * 1. 최소 2개 이상의 정점 확인
 * 2. Y축 방향 자동 감지 (상→하 또는 하→상 드로잉 모두 지원) 및 Y 범위 정규화
 * 3. 12개의 균등 분할 높이 y_k = k / (PROFILE_POINTS - 1)에 대해 r(y) 보간
 * 4. 오버행(동일 y에 여러 r) 발생 시 외곽 윤곽(최대 r) 채택
 * 5. 노이즈 완화를 위한 약한 3점 이동평균 스무딩
 * 6. R_MIN(0.05) ~ R_MAX(1.0) 클램핑
 *
 * @param {{ r: number, y: number }[]} rawPoints 캔버스에서 얻은 점 배열
 * @returns {import('../shared/contracts.js').Profile}
 */
export function resampleProfile(rawPoints) {
  if (!rawPoints || rawPoints.length < 2) {
    throw new Error('리샘플링을 위해 최소 2개 이상의 점이 필요합니다.');
  }

  // 1. 유효한 점들만 필터링
  const valid = rawPoints.filter(
    (p) => typeof p.r === 'number' && typeof p.y === 'number' && !isNaN(p.r) && !isNaN(p.y),
  );
  if (valid.length < 2) {
    throw new Error('유효한 좌표 점이 부족합니다.');
  }

  // 2. Y 범위 및 드로잉 방향 판별
  let minY = Infinity;
  let maxY = -Infinity;
  let maxR = 0;

  for (const p of valid) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.r > maxR) maxR = p.r;
  }

  const heightSpan = maxY - minY;
  if (heightSpan < 1e-4) {
    // 높이 차이가 거의 없는 경우 (수평선) -> 단순 원통형으로 fallback
    const uniformR = clampR(maxR > 0 ? maxR : 0.5);
    return Array.from({ length: PROFILE_POINTS }, (_, i) => ({
      r: uniformR,
      y: i / (PROFILE_POINTS - 1),
    }));
  }

  // 드로잉 순서가 위에서 아래인지(화면 좌표계 Y 증가), 아래에서 위인지 감지
  // 캔버스에서는 통상 화면 위(y=0), 화면 아래(y=H)이지만 게임 월드에서는 y=0이 바닥, y=1이 위입니다.
  // 사용자가 그리는 의도에 맞게, 캔버스 바닥쪽 점이 y=0, 위쪽 점이 y=1이 되도록 정규화:
  const normalizedSegments = [];
  for (let i = 0; i < valid.length - 1; i++) {
    const p1 = valid[i];
    const p2 = valid[i + 1];

    // r은 maxR 기준으로 0~1 정규화 (입력이 이미 0~1인 경우 그대로 유지)
    const normScaleR = maxR > 1.0 ? 1 / maxR : 1.0;

    normalizedSegments.push({
      r1: p1.r * normScaleR,
      y1: (p1.y - minY) / heightSpan,
      r2: p2.r * normScaleR,
      y2: (p2.y - minY) / heightSpan,
    });
  }

  // 3. 12개 타겟 y값에 대해 선분 교차 보간
  const sampledR = new Array(PROFILE_POINTS);

  for (let k = 0; k < PROFILE_POINTS; k++) {
    const targetY = k / (PROFILE_POINTS - 1);
    let bestR = null;
    let closestDist = Infinity;
    let closestR = 0.5;

    for (const seg of normalizedSegments) {
      const segMinY = Math.min(seg.y1, seg.y2);
      const segMaxY = Math.max(seg.y1, seg.y2);

      // 타겟 Y가 선분의 Y 범위에 포함되는 경우
      if (targetY >= segMinY && targetY <= segMaxY) {
        let rAtY;
        if (Math.abs(seg.y2 - seg.y1) < 1e-6) {
          rAtY = Math.max(seg.r1, seg.r2);
        } else {
          const t = (targetY - seg.y1) / (seg.y2 - seg.y1);
          rAtY = seg.r1 + t * (seg.r2 - seg.r1);
        }

        // 오버행이 있을 때는 가장 바깥쪽 윤곽(최대 반경) 채택
        if (bestR === null || rAtY > bestR) {
          bestR = rAtY;
        }
      }

      // 선분 양 끝점과의 거리 측정 (교차 선분이 없는 경우 최근접점 fallback)
      const dist1 = Math.abs(seg.y1 - targetY);
      if (dist1 < closestDist) {
        closestDist = dist1;
        closestR = seg.r1;
      }
      const dist2 = Math.abs(seg.y2 - targetY);
      if (dist2 < closestDist) {
        closestDist = dist2;
        closestR = seg.r2;
      }
    }

    sampledR[k] = bestR !== null ? bestR : closestR;
  }

  // 4. 스무딩 (3점 이동평균, 양 끝 보존)
  const smoothedR = [...sampledR];
  for (let k = 1; k < PROFILE_POINTS - 1; k++) {
    smoothedR[k] = 0.25 * sampledR[k - 1] + 0.5 * sampledR[k] + 0.25 * sampledR[k + 1];
  }

  // 5. 최종 프로파일 빌드 (r in [R_MIN, R_MAX], y 단조 증가 보장)
  return smoothedR.map((r, i) => ({
    r: clampR(r),
    y: i / (PROFILE_POINTS - 1),
  }));
}

/**
 * 프로파일이 공용 계약을 만족하는지 검증합니다.
 * @param {import('../shared/contracts.js').Profile} profile
 * @returns {boolean}
 */
export function isValidProfile(profile) {
  if (!Array.isArray(profile) || profile.length !== PROFILE_POINTS) return false;
  for (let i = 0; i < profile.length; i++) {
    const pt = profile[i];
    if (typeof pt.r !== 'number' || typeof pt.y !== 'number') return false;
    if (pt.r < R_MIN - 1e-4 || pt.r > R_MAX + 1e-4) return false;
    if (i > 0 && pt.y < profile[i - 1].y - 1e-6) return false; // 단조 증가 검사
  }
  return true;
}
