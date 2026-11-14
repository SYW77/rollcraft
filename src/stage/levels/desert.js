// 사막 협곡 (2바퀴). 담당: 손연우
// 높은 벽(큰 다리만 오름)과 센 옆바람(작은 다리만 버팀)이 번갈아 나온다.
//   출발 → 높은 벽 1.4 → 코너 → 오르막 4m → 센 바람 → 고원 → 코너 → 약한 바람 → 벽 1.0 · 1.8
//   → 코너 → 내리막 → 센 바람 → 구덩이 2.2 + 벽 1.4 → 코너
import { createCourse } from './course.js';

const W = 7;
const c = createCourse(W);

c.run(8);
c.big();
c.run(2);
c.turn(12, 90);
c.run(20, { rise: 4, label: '오르막' });
c.wind({ len: 12, speed: 10 });
c.run(23.2, { label: '고원' });
c.turn(12, 90);
c.wind({ len: 12, speed: 6, label: '약한 바람' });
c.big({ tops: [1.0, 1.8] });
c.run(4);
c.turn(12, 90);
c.run(20, { rise: -4, label: '내리막' });
c.wind({ len: 12, speed: 10 });
c.run(2);
c.big({ pit: 2.2 });
c.run(4);
c.turn(12, 90);
c.run(18);

export const desert = {
  theme: 'desert',
  seed: 23,
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
  sections: [{ type: 'finishLine', at: 0, params: { width: W } }, ...c.sections],
};
