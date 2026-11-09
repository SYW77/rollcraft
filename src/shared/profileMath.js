// 프로파일 기하 계산 (부피, 무게중심, 투영면적). 담당: 원유승
// STUB: 계약 시그니처만 맞춘 근사값. 실제 구현은 frustum 구간 합산으로 교체.

/**
 * @param {import('./contracts.js').Profile} profile
 * @returns {{ volume: number, comY: number, maxRadius: number,
 *             projectedArea: (dir: {x:number,y:number,z:number}) => number }}
 */
export function profileStats(profile) {
  const maxRadius = Math.max(...profile.map((p) => p.r));
  const height = profile[profile.length - 1].y - profile[0].y;

  return {
    volume: Math.PI * maxRadius * maxRadius * height, // TODO: 구간별 frustum 부피 합
    comY: profile[0].y + height / 2, // TODO: 부피 가중 평균
    maxRadius,
    projectedArea: () => 2 * maxRadius * height, // TODO: 방향별 투영면적
  };
}
