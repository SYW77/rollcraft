// 장애물: 불규칙 계단. 담당: 손연우
//
// 트랙 위에 높이가 제각각인 단(턱)을 진행 방향으로 놓는다. 트랙 폭 전체를 막아서 돌아갈 수 없다.
// - 통과: 반지름이 큰 모양 (구 · 아령, 반지름 0.5) → 턱을 타고 넘음
// - 실패: 반지름이 작은 모양 (막대 0.1은 첫 턱, 원통 0.3은 둘째 턱에서 걸림)
//
// 설계 메모 (헤드리스 측정, 2026-11-09 조작 값 기준)
// - 구르기 토크(질량 × 1.6)로는 정지 상태에서 0.1m 넘는 턱을 못 오른다 → 턱은 달려온 운동량으로 넘는다.
//   그래서 턱 사이에 평지(높이 0)를 4m 이상 두어 다시 속도를 붙이게 한다.
// - 6m 달려와서 한 번에 넘는 높이 (턱 하나): 막대 0.1 · 원통 0.2 · 아령 0.25 · 구 0.35 (반지름의 약 0.7배)
// - 결과가 진입 속도에 민감하다. 핸들링 튜닝 후 tops/depth를 다시 맞춰야 한다.
import { createBoxSet } from '../staticBox.js';

const DEFAULTS = {
  tops: [0.15, 0, 0.2, 0, 0.26], // 각 단의 윗면 높이 (트랙 윗면 기준, m). 0 = 평지(달리기 구간).
  depth: [1.5, 4.5, 1.5, 4.5, 1.5], // 각 단의 진행 방향 길이 (m). 숫자 하나면 전부 같은 길이.
  width: 6, // 트랙 폭과 맞춘다
};

/**
 * @param {{ scene, world, events, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 *   origin = 트랙 중심선 위 지점 (y = 트랙 윗면), heading = 그 지점의 진행 방향
 * @returns {{ update?(dt: number, player: any): void, dispose(): void }}
 */
export function create({ scene, world, materials, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const boxes = createBoxSet({ scene, world });

  let s0 = 0; // 단 시작 거리
  p.tops.forEach((top, i) => {
    const depth = Array.isArray(p.depth) ? p.depth[i] : p.depth;
    const s = s0 + depth / 2; // 단 중앙의 거리
    s0 += depth;
    if (top <= 0) return; // 평지는 트랙 바닥 그대로
    boxes.add({
      x: origin.x + heading.x * s,
      z: origin.z + heading.z * s,
      top: origin.y + top,
      dir: heading,
      length: depth,
      width: p.width,
      height: top + 1, // 아래로 트랙 속까지 채움 (두께 1 이상)
      material: materials.obstacle,
      castShadow: true,
    });
  });

  return {
    dispose() {
      boxes.dispose();
    },
  };
}
