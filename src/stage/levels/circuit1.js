// 서킷 1 (3바퀴 레이스). 담당: 손연우
// 폭 7m, 오른쪽으로 네 번 꺾는 고리 (한 바퀴 ≈ 190m). level1의 장애물(불규칙 계단 · 분할 레일 · 급커브 표지판 · 강풍)을
// 다리 그리기 레이스에 맞게 다시 배치했다. 구간마다 유리한 다리가 달라서 달리면서 다시 그리게 된다.
//   출발 직선   결승선 · 불규칙 계단(턱 0.15 · 0.2 · 0.26)          → 크고 둥근 다리
//   바람 직선   강풍(옆바람), 양옆 벽 없음 → 밀리면 떨어짐          → 작고 낮은 다리 (바람 받는 면이 작게)
//   레일 직선   분할 레일(바닥 없음, 레일 두 줄) → 높은 벽 1.0m      → 양옆 다리가 레일에 걸치게 → 긴 다리
//   급커브      벽 없는 코너 + 셰브론 표지판                         → 천천히, A / D
//   계단 직선   계단 오르막 · 내리막 → 허들                          → 크고 긴 다리
// 떨어지면 게임오버 대신 조금 뒤 바닥에서 다시 출발 (main + stage/laps.js).
// 고리가 닫히려면 마주 보는 직선 길이가 같아야 한다 (출발 = 레일 직선, 바람 = 계단 직선).

const pieces = [];
let length = 0;
/** 트랙 조각을 추가하고, 그 조각이 시작하는 중심선 거리를 돌려준다. 기본은 양옆 벽 있음. */
function piece(p) {
  const start = length;
  pieces.push({ walls: true, ...p });
  length += p.type === 'arc' ? (p.radius * Math.abs(p.angle) * Math.PI) / 180 : p.length;
  return start;
}

const W = 7; // 트랙 폭
const R = 13; // 코너 반지름
const corner = (extra = {}) =>
  piece({ type: 'arc', radius: R, angle: 90, label: '코너', ...extra });

// 출발 직선 (30)
const startStraight = piece({ type: 'straight', length: 30, label: '출발' });
corner();
// 바람 직선 (36): 앞뒤는 벽, 바람 부는 가운데 14m는 벽 없음
piece({ type: 'straight', length: 11, label: '바람' });
const wind = piece({ type: 'straight', length: 14, walls: false, label: '바람' });
piece({ type: 'straight', length: 11, label: '바람' });
corner();
// 레일 직선 (30 = 7 + 레일 6 + 17)
piece({ type: 'straight', length: 7, label: '레일' });
const rail = piece({ type: 'straight', length: 6, floor: false, label: '레일' });
const afterRail = piece({ type: 'straight', length: 17, label: '레일' });
// 급커브: 벽 없음 (level1의 급커브처럼)
const sharp = corner({ walls: false, label: '급커브' });
// 계단 직선 (36)
const stairs = piece({ type: 'straight', length: 36, label: '계단' });
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
    // level1 불규칙 계단 그대로 (턱 0.15 · 0.2 · 0.26, 사이에 다시 속도 붙일 평지)
    { type: 'steps', at: startStraight + 8, params: { width: W } },
    // level1 강풍: 오른쪽 옆바람. 벽 없는 14m 가운데 10m
    { type: 'windGap', at: wind + 2, params: { length: 10, width: W, speed: 6 } },
    // level1 분할 레일: 가운데 틈 0.6m, 레일 폭 0.5m (양옆 다리가 레일 두 줄에 걸친다)
    { type: 'splitRail', at: rail, params: { length: 6, gap: 0.6, railWidth: 0.5 } },
    { type: 'steps', at: afterRail + 6, params: { tops: [1.0], depth: [0.6], width: W } },
    // level1 급커브 표지판 (바깥 가장자리 셰브론)
    { type: 'curve', at: sharp, params: { radius: R, angle: 90, width: W } },
    {
      type: 'steps',
      at: stairs + 4,
      params: {
        tops: [0.3, 0.6, 0.9, 0.9, 0.6, 0.3],
        depth: [1.2, 1.2, 1.2, 3, 1.2, 1.2],
        width: W,
      },
    },
    {
      type: 'steps',
      at: stairs + 22,
      params: { tops: [0.45, 0, 0.45, 0, 0.45], depth: [0.4, 2.2, 0.4, 2.2, 0.4], width: W },
    },
  ],
};
