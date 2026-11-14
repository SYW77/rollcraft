// 클라이머 레벨 1 (Draw Climber 방식). 담당: 손연우
// 구간마다 유리한 다리가 다르다 → 달리면서 다시 그려 가며 푸는 코스.
//   낮은 턱 (아무 다리)  →  높은 벽 (긴 다리)  →  낮은 천장 (작은 다리)  →  틈 (긴 다리)  →  계단  →  골
// 트랙 조각 · 장애물 형식은 level1.js와 같다 ({ type, at, params }, at = 중심선 거리).
// 양옆 벽을 높게 둔다: 다리가 크게 튀어서 낮은 벽(0.8)은 넘어간다.

const pieces = [];
let length = 0;
/** 트랙 조각을 추가하고, 그 조각이 시작하는 중심선 거리를 돌려준다 */
function piece(p) {
  const start = length;
  pieces.push({ walls: true, ...p });
  length += p.type === 'arc' ? (p.radius * Math.abs(p.angle) * Math.PI) / 180 : p.length;
  return start;
}

piece({ type: 'straight', length: 8 }); // 출발 · 다리 그리기
const bumps = piece({ type: 'straight', length: 12 }); // 낮은 턱
const wall = piece({ type: 'straight', length: 10 }); // 높은 벽
piece({ type: 'arc', radius: 12, angle: 45 }); // 완만한 곡선
const roof = piece({ type: 'straight', length: 12 }); // 낮은 천장
piece({ type: 'straight', length: 4 });
const gap = piece({ type: 'straight', length: 1.2, floor: false }); // 틈 (바닥 없음)
piece({ type: 'straight', length: 6 });
piece({ type: 'arc', radius: 12, angle: -45 });
const stairs = piece({ type: 'straight', length: 16 }); // 계단
piece({ type: 'straight', length: 10 }); // 골까지

export const climb1 = {
  track: {
    width: 4,
    start: { x: 0, z: 0 },
    heading: { x: 0, z: -1 },
    pieces,
    wallHeight: 2.2,
  },
  length,
  spawnOffset: 3,
  spawnHeight: 1.5, // 클라이머는 다리 길이에 맞춰 스스로 띄운다
  goalDepth: 2,
  goalHeight: 6, // 다리가 큰 클라이머는 높이 튀어서 골 위로 지나칠 수 있다
  killY: -6,
  sections: [
    {
      type: 'steps',
      at: bumps + 2,
      params: { tops: [0.25, 0, 0.3, 0, 0.3], depth: [1, 2, 1, 2, 1], width: 4 },
    },
    { type: 'steps', at: wall + 4, params: { tops: [1.0], depth: [0.6], width: 4 } },
    { type: 'ceiling', at: roof + 3, params: { length: 6, height: 1.3, width: 4 } },
    {
      type: 'steps',
      at: stairs + 3,
      params: { tops: [0.35, 0.7, 1.05, 1.05], depth: [1.2, 1.2, 1.2, 3], width: 4 },
    },
  ],
};
