// 레벨 1 구간 배치. 담당: 손연우
// STUB: 장애물 없이 직선 트랙만. 구간은 { type, origin, params } 목록으로 추가.

export const level1 = {
  track: { width: 6, length: 60 }, // -Z 방향으로 뻗음
  spawn: { position: { x: 0, y: 1, z: -2 }, heading: { x: 0, z: -1 } },
  goal: { center: { x: 0, y: 1, z: -55 }, size: { x: 6, y: 3, z: 2 } },
  killY: -10,
  sections: [
    // { type: 'splitRail', origin: { x: 0, y: 0, z: -15 }, params: { gap: 0.6 } },
    // { type: 'curve',     origin: { x: 0, y: 0, z: -30 }, params: {} },
    // { type: 'steps',     origin: { x: 0, y: 0, z: -45 }, params: { height: 0.3 } },
  ],
};
