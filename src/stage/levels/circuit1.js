// 서킷 1 (3바퀴 레이스). 담당: 손연우
// 한 바퀴 ≈ 150m, 오른쪽으로 네 번 꺾는 고리. 구간마다 유리한 다리가 달라서 달리면서 다시 그리게 된다.
//   출발 직선   결승선 · 낮은 턱                         → 아무 다리나 (크고 둥근 다리가 빠름)
//   오르막 직선 계단 오르막 · 내리막 → 높은 벽 1.0m        → 크고 긴 다리
//   터널 직선   낮은 천장 터널 → 바닥 없는 틈              → 납작한 다리 → 긴 다리
//   다리 직선   좁은 외나무다리 (아래는 낭떠러지) → 허들   → 작고 안정적인 다리 → 긴 다리
// 떨어지면 게임오버 대신 조금 뒤 바닥에서 다시 출발 (main + stage/laps.js).
// 고리가 닫히려면 마주 보는 직선 길이가 같아야 한다 (출발 = 터널, 오르막 = 다리 직선).

const pieces = [];
let length = 0;
/** 트랙 조각을 추가하고, 그 조각이 시작하는 중심선 거리를 돌려준다 */
function piece(p) {
  const start = length;
  pieces.push({ walls: true, ...p });
  length += p.type === 'arc' ? (p.radius * Math.abs(p.angle) * Math.PI) / 180 : p.length;
  return start;
}
const corner = () => piece({ type: 'arc', radius: 10, angle: 90 });

const W = 5; // 트랙 폭

// 출발 직선 (24)
const startStraight = piece({ type: 'straight', length: 24 });
corner();
// 오르막 직선 (30)
const climb = piece({ type: 'straight', length: 30 });
corner();
// 터널 직선 (24 = 14 + 틈 1.4 + 8.6)
const tunnel = piece({ type: 'straight', length: 14 });
piece({ type: 'straight', length: 1.4, floor: false }); // 틈
piece({ type: 'straight', length: 8.6 });
corner();
// 다리 직선 (30 = 6 + 외나무다리 8 + 16)
piece({ type: 'straight', length: 6 }); // 다리 앞
const bridge = piece({ type: 'straight', length: 8, floor: false }); // 낭떠러지 위 외나무다리
const hurdles = piece({ type: 'straight', length: 16 });
corner();

export const circuit1 = {
  track: {
    width: W,
    start: { x: 0, z: 0 },
    heading: { x: 0, z: -1 },
    pieces,
    wallHeight: 2.2,
  },
  length,
  laps: 3,
  spawnOffset: 2, // 결승선 바로 앞에서 출발
  spawnHeight: 1.5, // 클라이머는 다리 길이에 맞춰 스스로 띄운다
  goalDepth: 2,
  killY: -6,
  sections: [
    { type: 'finishLine', at: 0, params: { width: W } },
    {
      type: 'steps',
      at: startStraight + 9,
      params: { tops: [0.25, 0, 0.25, 0, 0.25], depth: [0.8, 1.6, 0.8, 1.6, 0.8], width: W },
    },
    {
      type: 'steps',
      at: climb + 3,
      params: {
        tops: [0.3, 0.6, 0.9, 0.9, 0.6, 0.3],
        depth: [1.2, 1.2, 1.2, 3, 1.2, 1.2],
        width: W,
      },
    },
    { type: 'steps', at: climb + 20, params: { tops: [1.0], depth: [0.6], width: W } },
    { type: 'ceiling', at: tunnel + 3, params: { length: 7, height: 1.3, width: W } },
    // 외나무다리: 레일 두 줄을 붙여 폭 1.2m 판 하나로
    { type: 'splitRail', at: bridge, params: { length: 8, gap: 0, railWidth: 0.6 } },
    {
      type: 'steps',
      at: hurdles + 4,
      params: { tops: [0.45, 0, 0.45, 0, 0.45], depth: [0.4, 2.2, 0.4, 2.2, 0.4], width: W },
    },
  ],
};
