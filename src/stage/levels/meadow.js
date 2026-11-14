// 초원 언덕길 (3바퀴, 입문 맵). 담당: 손연우
// 한 바퀴에 장애물마다 한 번씩. 구간마다 빠른 다리가 달라서 상황에 맞게 바꿔 그린다.
// (괄호 = 가장 빠른 다리, node src/physics/spike/sectionLab.mjs)
//   출발 → 풍차 막대(갈고리 · 별) → 코너 → 컨베이어 바둑판(앞 · 뒤로 흐르는 칸이 섞임) → 통나무 굴러오는 언덕(갈고리 · 긴 막대)
//   → 코너(언덕 위) → 옆바람 → 내리막 → 코너 → 피스톤 → 블록 길 → 급커브 → 블록 길
import { createCourse } from './course.js';

const W = 7;
const c = createCourse(W);
const { run, turn, piece } = c;

run(4);
const mill = run(12, { label: '풍차' });
run(4);
turn(12, 90);
const belt = run(12, { label: '컨베이어' });
run(10); // 컨베이어와 통나무 언덕 사이: 굴러 내려온 통나무가 이 중간에서 사라진다
const logs = run(14, { rise: 2, label: '통나무' });
turn(12, 90);
c.wind({ len: 12, speed: 4.5, lead: 4 });
run(14, { rise: -2, label: '내리막' });
turn(12, 90);
run(8);
const pistons = run(15, { label: '피스톤' });
const crates1 = run(15, { label: '블록' });
const sharp = piece({ type: 'arc', radius: 10, angle: 90, walls: false, label: '급커브' });
const crates2 = run(12, { label: '블록' });

export const meadow = {
  theme: 'meadow',
  seed: 11,
  track: {
    width: W,
    start: { x: 0, z: 0 },
    heading: { x: 0, z: -1 },
    pieces: c.pieces,
    wallHeight: 2,
    wallCap: 5, // 보이지 않는 벽: 큰 다리가 벽 위로 올라가 장애물을 우회하지 못하게
  },
  length: c.length,
  laps: 3,
  spawnOffset: 2,
  spawnHeight: 1.5,
  goalDepth: 2,
  killY: -6,
  zones: c.zones,
  sections: [
    { type: 'finishLine', at: 0, params: { width: W } },
    { type: 'sweeper', at: mill + 6, params: { width: W, speed: 0.9 } },
    { type: 'conveyor', at: belt, params: { length: 12, width: W } },
    {
      type: 'rollingLogs',
      at: logs,
      params: { length: 14, rise: 2, width: W, interval: 3, mass: 3 },
    },
    { type: 'pusher', at: pistons + 1, params: { width: W, count: 3, spacing: 4.5, period: 3.2 } },
    { type: 'curve', at: sharp, params: { radius: 10, angle: 90, width: W } },
    { type: 'blocks', at: crates1 + 1, params: { length: 13, width: W, seed: 3 } },
    { type: 'blocks', at: crates2 + 1, params: { length: 8, width: W, seed: 8 } },
    ...c.sections,
  ],
};
