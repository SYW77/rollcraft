// 설산 고개 (2바퀴). 담당: 손연우
// 높은 벽(큰 다리만 오름)과 센 옆바람(작은 다리만 버팀)이 쉬지 않고 번갈아 나온다.
//   출발(회전 막대) → 센 바람 → 코너 → 오르막 5m → 벽 1.0 · 1.4 · 1.8 → 산마루 → 코너
//   → 센 바람 → 구덩이 2.2 + 벽 → 코너 → 내리막 → 센 바람 → 코너(회전 막대)
import { createCourse } from './course.js';

const W = 7;
const c = createCourse(W);

const start = c.run(12);
c.wind({ len: 12, speed: 10 });
c.turn(12, 90);
c.run(22, { rise: 5, label: '오르막' });
c.big({ tops: [1.0, 1.4, 1.8] });
c.run(20, { label: '산마루' });
c.turn(12, 90);
c.wind({ len: 12, speed: 10 });
c.big({ pit: 2.2 });
c.run(4);
c.turn(12, 90);
c.run(22, { rise: -5, label: '내리막' });
c.wind({ len: 12, speed: 10 });
c.run(20);
c.turn(12, 90);
const last = c.run(9.2);

export const snow = {
  theme: 'snow',
  seed: 5,
  track: {
    width: W,
    start: { x: 0, z: 0 },
    heading: { x: 0, z: -1 },
    pieces: c.pieces,
    wallHeight: 2,
    wallCap: 5, // 보이지 않는 벽: 큰 다리가 벽 위로 올라가 전기줄 · 높은 벽을 우회하지 못하게
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
    { type: 'sweeper', at: start + 5, params: { width: W, speed: 1.0 } },
    { type: 'sweeper', at: last + 6, params: { width: W, speed: -1.1 } },
    ...c.sections,
  ],
};
