// 사막 협곡 (2바퀴). 담당: 손연우
// 한 바퀴에 장애물마다 한 번씩. 고원으로 올라가 바람 · 좁은 다리를 건너고 내려와 레일 · 구덩이를 지난다.
//   출발 → 바위 길 → 높은 벽 1.4 → 코너 → 오르막 4m → 고원 옆바람 → 코너 → 좁은 협곡 다리(폭 2.4, 벽 없음)
//   → 피스톤 → 코너 → 내리막 → 분할 레일 → 구덩이 → 급커브(바깥 벽 없음)
import { createCourse } from './course.js';

const W = 7;
const c = createCourse(W);
const { run, turn, piece } = c;

run(4);
const rocks = run(14, { label: '바위 길' });
c.big();
run(4);
turn(12, 90);
run(20, { rise: 4, label: '오르막' });
c.wind({ len: 12, speed: 6, lead: 4 });
run(8.4, { label: '고원' });
turn(12, 90);
run(4, { label: '고원' });
piece({ type: 'straight', length: 14, width: 2.4, walls: false, skirt: false, label: '좁은 다리' });
run(6, { label: '고원' });
const pistons = run(15, { label: '피스톤' });
run(4);
turn(12, 90);
run(20, { rise: -4, label: '내리막' });
run(6);
const rail = piece({ type: 'straight', length: 6, floor: false, label: '레일' });
run(8);
piece({ type: 'straight', length: 2.4, floor: false, walls: false, label: '구덩이' });
run(4);
const sharp = piece({ type: 'arc', radius: 10, angle: 90, walls: false, label: '급커브' });
run(11);

export const desert = {
  theme: 'desert',
  seed: 23,
  track: {
    width: W,
    start: { x: 0, z: 0 },
    heading: { x: 0, z: -1 },
    pieces: c.pieces,
    wallHeight: 2,
    wallCap: 5, // 보이지 않는 벽: 큰 다리가 벽 위로 올라가 장애물을 우회하지 못하게
  },
  length: c.length,
  laps: 2,
  spawnOffset: 2,
  spawnHeight: 1.5,
  goalDepth: 2,
  killY: -8,
  zones: c.zones,
  sections: [
    { type: 'finishLine', at: 0, params: { width: W } },
    { type: 'blocks', at: rocks + 1, params: { length: 12, width: W, seed: 5, style: 'rock' } },
    {
      type: 'pusher',
      at: pistons + 1,
      params: { width: W, count: 3, spacing: 4.5, period: 3.2 },
    },
    { type: 'splitRail', at: rail, params: { length: 6, gap: 0.6, railWidth: 0.5 } },
    { type: 'curve', at: sharp, params: { radius: 10, angle: 90, width: W } },
    ...c.sections,
  ],
};
