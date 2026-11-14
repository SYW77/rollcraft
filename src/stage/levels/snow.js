// 설산 고개 (2바퀴). 담당: 손연우
// 한 바퀴에 장애물마다 한 번씩. 통나무가 굴러오는 긴 오르막을 올라 산마루 벽 계단 · 얼음 동굴을 지나 내려온다.
//   출발 → 회전 막대 → 코너 → 통나무 굴러오는 오르막 5m → 벽 계단 1.0 · 1.4 · 1.8 → 코너
//   → 얼음 동굴(천장 1.3) → 얼음덩이 길 → 코너 → 내리막 → 옆바람 → 코너
import { createCourse } from './course.js';

const W = 7;
const c = createCourse(W);
const { run, turn } = c;

run(4);
const mill = run(10, { label: '회전 막대' });
run(11);
turn(12, 90);
run(6);
const climb = run(22, { rise: 5, label: '오르막' });
run(4, { label: '산마루' });
c.big({ tops: [1.0, 1.4, 1.8], label: '벽 계단' });
run(4, { label: '산마루' });
turn(12, 90);
run(4, { label: '산마루' });
const cave = run(8, { label: '얼음 동굴' });
run(6, { label: '산마루' });
const ice = run(14, { label: '얼음덩이' });
run(4, { label: '산마루' });
turn(12, 90);
run(22, { rise: -5, label: '내리막' });
c.wind({ len: 12, speed: 6, lead: 10 });
run(12);
turn(12, 90);
run(11);

export const snow = {
  theme: 'snow',
  seed: 5,
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
    { type: 'sweeper', at: mill + 5, params: { width: W, speed: 1.0 } },
    {
      type: 'rollingLogs',
      at: climb,
      params: { length: 22, rise: 5, width: W, interval: 3.2, mass: 3, despawn: 3 },
    },
    { type: 'ceiling', at: cave, params: { length: 8, height: 1.3, width: W, style: 'ice' } },
    { type: 'blocks', at: ice + 1, params: { length: 12, width: W, seed: 4, style: 'ice' } },
    ...c.sections,
  ],
};
