// 레벨 1 구간 배치. 담당: 손연우
// 트랙은 조각(직선 · 곡선)을 순서대로 이어 붙인다 (stage/track.js).
// 장애물은 { type, at, params }: at = 트랙 중심선을 따라 시작점부터의 거리(m).
// 스폰은 트랙 시작, 골은 트랙 끝에 자동으로 놓인다.

export const level1 = {
  track: {
    width: 6,
    start: { x: 0, z: 0 },
    heading: { x: 0, z: -1 }, // -Z 방향으로 출발
    pieces: [
      { type: 'straight', length: 18 },
      { type: 'arc', radius: 9, angle: 90, walls: true }, // 오른쪽으로 꺾음
      { type: 'straight', length: 14 },
      { type: 'arc', radius: 9, angle: -90, walls: true }, // 왼쪽으로 꺾음
      { type: 'straight', length: 18 },
    ],
  },
  spawnOffset: 2, // 트랙 시작점에서 이만큼 앞에 스폰
  spawnHeight: 1,
  goalDepth: 2, // 골 상자 깊이 (진행 방향)
  killY: -10,
  sections: [
    // { type: 'splitRail', at: 10, params: { gap: 0.6 } },
    // { type: 'curve',     at: 30, params: {} },
    // { type: 'steps',     at: 55, params: { height: 0.3 } },
  ],
};
