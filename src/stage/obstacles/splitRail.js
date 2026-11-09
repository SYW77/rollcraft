// 장애물: 분할 레일. 담당: 손연우
//
// 바닥이 없는 구간(트랙 조각 floor: false)에 진행 방향으로 레일 두 줄을 깐다. 가운데는 틈.
// 플레이어는 회전축을 진행 방향에 수직으로 눕혀 구르므로, 축 방향으로 틈을 걸쳐야 레일에 올라탄다.
// - 통과: 원통 · 막대(축 길이 1이 틈보다 김), 아령(넓은 양 끝이 레일 위), 구(틈 가장자리에 살짝 끼어 굴러감)
// - 실패: 짧고 넓은 원반 · 바퀴 (축 방향 폭이 틈보다 좁음) → 틈으로 낙하. 옆으로 흘러도 레일 밖으로 낙하.
// 레일 윗면은 트랙과 같은 높이. 두께 1 (터널링 방지).
import { createBoxSet } from '../staticBox.js';

const DEFAULTS = {
  length: 6, // 진행 방향 길이 (m). 레벨의 floor: false 조각 길이와 맞춘다.
  gap: 0.6, // 가운데 틈 폭 (m). 플레이어 축 길이는 최대 1.0. 0.8이면 원반도 통과해서 변별력이 없음.
  railWidth: 0.5, // 레일 한 줄의 폭 (m)
  overlap: 0.3, // 앞뒤 트랙과 겹치는 길이 (이음매에서 걸리지 않게)
};

/**
 * @param {{ scene, world, events, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 *   origin = 트랙 중심선 위 지점 (y = 트랙 윗면), heading = 그 지점의 진행 방향
 * @returns {{ update?(dt: number, player: any): void, dispose(): void }}
 */
export function create({ scene, world, materials, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const boxes = createBoxSet({ scene, world });
  const right = { x: -heading.z, z: heading.x };
  // 레일 중심: origin에서 진행 방향으로 length/2, 옆으로 ±(gap/2 + railWidth/2)
  const cx = origin.x + heading.x * (p.length / 2);
  const cz = origin.z + heading.z * (p.length / 2);
  const off = p.gap / 2 + p.railWidth / 2;

  for (const side of [-1, 1]) {
    boxes.add({
      x: cx + right.x * off * side,
      z: cz + right.z * off * side,
      top: origin.y,
      dir: heading,
      length: p.length + p.overlap * 2,
      width: p.railWidth,
      height: 1,
      material: materials.obstacle,
      castShadow: true,
    });
  }

  return {
    dispose() {
      boxes.dispose();
    },
  };
}
