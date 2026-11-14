// 장애물 하나씩 따로 깔고 다리 모양별 통과 시간을 잰다. 담당: 원유승
// 실행: node src/physics/spike/sectionLab.mjs [시험 이름 일부 ...]
// 각 시험: 폭 7m 직선 트랙(벽 있음), 출발 2m → 장애물(8m부터) → 장애물 끝 + 4m에 도착하면 통과.
// W만 + 트랙 중심 자동 조향. 결과: 통과 시간(초), 막힘(시간 초과) ✗, 떨어짐 ↓
import * as THREE from 'three';
import { createPhysicsWorld } from '../physicsWorld.js';
import { createClimber } from '../climber.js';
import { buildStage } from '../../stage/buildStage.js';
import { createCameraFollow } from '../../stage/cameraFollow.js';
import { createEmitter } from '../../shared/events.js';
import { nearestOnPath, pointAt } from '../../stage/track.js';
import { LEGS } from './legShapes.mjs';

const DT = 1 / 60;
const TIMEOUT = 25;
const W = 7;

/** 시험 코스: pre(8m) + 본 구간 pieces + post(12m). sections의 at은 본 구간 시작 기준 */
const TESTS = {
  '평지 20m': { pieces: [{ type: 'straight', length: 20 }], len: 20 },
  '천장 1.3': {
    pieces: [{ type: 'straight', length: 8 }],
    len: 8,
    sections: [{ type: 'ceiling', at: 0, params: { length: 8, height: 1.3, width: W } }],
  },
  '천장 0.9': {
    pieces: [{ type: 'straight', length: 8 }],
    len: 8,
    sections: [{ type: 'ceiling', at: 0, params: { length: 8, height: 0.9, width: W } }],
  },
  '벽 0.6': {
    pieces: [{ type: 'straight', length: 6 }],
    len: 6,
    sections: [{ type: 'steps', at: 1, params: { tops: [0.6], depth: [1], width: W } }],
  },
  '벽 1.0': {
    pieces: [{ type: 'straight', length: 6 }],
    len: 6,
    sections: [{ type: 'steps', at: 1, params: { tops: [1.0], depth: [1], width: W } }],
  },
  '벽 1.4': {
    pieces: [{ type: 'straight', length: 6 }],
    len: 6,
    sections: [{ type: 'steps', at: 1, params: { tops: [1.4], depth: [1], width: W } }],
  },
  '구덩이 1.2': {
    pieces: [{ type: 'straight', length: 1.2, floor: false }],
    len: 1.2,
  },
  '구덩이 2.0': {
    pieces: [{ type: 'straight', length: 2, floor: false }],
    len: 2,
  },
  '계단 오르막': {
    pieces: [{ type: 'straight', length: 10 }],
    len: 10,
    sections: [
      {
        type: 'steps',
        at: 0,
        params: { tops: [0.3, 0.6, 0.9, 1.2, 1.5], depth: [1.2, 1.2, 1.2, 1.2, 3], width: W },
      },
    ],
  },
  '급경사 30%': { pieces: [{ type: 'straight', length: 14, rise: 3 }], len: 14 },
  '급경사 45%': { pieces: [{ type: 'straight', length: 10, rise: 3 }], len: 10 },
  '허들 0.45x3': {
    pieces: [{ type: 'straight', length: 10 }],
    len: 10,
    sections: [
      {
        type: 'steps',
        at: 0,
        params: { tops: [0.45, 0, 0.45, 0, 0.45], depth: [0.4, 3, 0.4, 3, 0.4], width: W },
      },
    ],
  },
  '분할 레일': {
    pieces: [{ type: 'straight', length: 6, floor: false }],
    len: 6,
    sections: [{ type: 'splitRail', at: 0, params: { length: 6, gap: 0.6, railWidth: 0.5 } }],
  },
  '좁은 다리 1.2': {
    pieces: [{ type: 'straight', length: 12, width: 1.2, walls: false }],
    len: 12,
  },
  '강풍 6': {
    pieces: [{ type: 'straight', length: 12, walls: false }],
    len: 12,
    sections: [{ type: 'windGap', at: 1, params: { length: 10, width: W, speed: 6 } }],
  },
  '천장 1.1 길이12': {
    pieces: [{ type: 'straight', length: 12 }],
    len: 12,
    sections: [{ type: 'ceiling', at: 0, params: { length: 12, height: 1.1, width: W } }],
  },
  '천장 0.7': {
    pieces: [{ type: 'straight', length: 8 }],
    len: 8,
    sections: [{ type: 'ceiling', at: 0, params: { length: 8, height: 0.7, width: W } }],
  },
  '구덩이 2.6': { pieces: [{ type: 'straight', length: 2.6, floor: false }], len: 2.6 },
  '구덩이 3.2': { pieces: [{ type: 'straight', length: 3.2, floor: false }], len: 3.2 },
  '벽 1.8': {
    pieces: [{ type: 'straight', length: 6 }],
    len: 6,
    sections: [{ type: 'steps', at: 1, params: { tops: [1.8], depth: [1], width: W } }],
  },
  '사다리(0.3/0.8)': {
    pieces: [{ type: 'straight', length: 8.8, floor: false }],
    len: 8.8,
    sections: [
      {
        type: 'steps',
        at: 0,
        params: {
          tops: [
            0.01, 0, 0.01, 0, 0.01, 0, 0.01, 0, 0.01, 0, 0.01, 0, 0.01, 0, 0.01, 0, 0.01, 0, 0.01,
            0, 0.01, 0, 0.01,
          ],
          depth: 0.4,
          width: W,
        },
      },
    ],
  },
  '터널 1.15 10m': {
    pieces: [{ type: 'straight', length: 10 }],
    len: 10,
    sections: [{ type: 'ceiling', at: 0, params: { length: 10, height: 1.15, width: W } }],
  },
  '터널 1.2 10m': {
    pieces: [{ type: 'straight', length: 10 }],
    len: 10,
    sections: [{ type: 'ceiling', at: 0, params: { length: 10, height: 1.2, width: W } }],
  },
  '터널 1.25 10m': {
    pieces: [{ type: 'straight', length: 10 }],
    len: 10,
    sections: [{ type: 'ceiling', at: 0, params: { length: 10, height: 1.25, width: W } }],
  },
  '터널 1.35 10m': {
    pieces: [{ type: 'straight', length: 10 }],
    len: 10,
    sections: [{ type: 'ceiling', at: 0, params: { length: 10, height: 1.35, width: W } }],
  },
  '터널 1.45 10m': {
    pieces: [{ type: 'straight', length: 10 }],
    len: 10,
    sections: [{ type: 'ceiling', at: 0, params: { length: 10, height: 1.45, width: W } }],
  },
  '문 1.0': {
    pieces: [{ type: 'straight', length: 1 }],
    len: 1,
    sections: [{ type: 'ceiling', at: 0.2, params: { length: 0.6, height: 1.0, width: W } }],
  },
  '문 1.2': {
    pieces: [{ type: 'straight', length: 1 }],
    len: 1,
    sections: [{ type: 'ceiling', at: 0.2, params: { length: 0.6, height: 1.2, width: W } }],
  },
  '문 1.3': {
    pieces: [{ type: 'straight', length: 1 }],
    len: 1,
    sections: [{ type: 'ceiling', at: 0.2, params: { length: 0.6, height: 1.3, width: W } }],
  },
  '벽 1.1': {
    pieces: [{ type: 'straight', length: 6 }],
    len: 6,
    sections: [{ type: 'steps', at: 1, params: { tops: [1.1], depth: [1], width: W } }],
  },
  '벽 1.2': {
    pieces: [{ type: 'straight', length: 6 }],
    len: 6,
    sections: [{ type: 'steps', at: 1, params: { tops: [1.2], depth: [1], width: W } }],
  },
  '구덩이 2.8': { pieces: [{ type: 'straight', length: 2.8, floor: false }], len: 2.8 },
  '구덩이 3.0': { pieces: [{ type: 'straight', length: 3.0, floor: false }], len: 3.0 },
  '구덩이 3.4': {
    pieces: [{ type: 'straight', length: 3.4, floor: false, walls: false }],
    len: 3.4,
  },
  '구덩이 3.6': {
    pieces: [{ type: 'straight', length: 3.6, floor: false, walls: false }],
    len: 3.6,
  },
  '강풍 8': {
    pieces: [{ type: 'straight', length: 12, walls: false }],
    len: 12,
    sections: [{ type: 'windGap', at: 1, params: { length: 10, width: W, speed: 8 } }],
  },
  '강풍 10': {
    pieces: [{ type: 'straight', length: 12, walls: false }],
    len: 12,
    sections: [{ type: 'windGap', at: 1, params: { length: 10, width: W, speed: 10 } }],
  },
  '강풍 12': {
    pieces: [{ type: 'straight', length: 12, walls: false }],
    len: 12,
    sections: [{ type: 'windGap', at: 1, params: { length: 10, width: W, speed: 12 } }],
  },
  '컨베이어 띠': {
    pieces: [{ type: 'straight', length: 12, walls: 'right' }],
    len: 12,
    sections: [{ type: 'conveyor', at: 0, params: { length: 12 } }],
  },
  '통나무 언덕': {
    pieces: [
      { type: 'straight', length: 14, rise: 2 },
      { type: 'straight', length: 4 },
    ],
    len: 18,
    sections: [{ type: 'rollingLogs', at: 0, params: { length: 14, rise: 2, width: W } }],
  },
  피스톤: {
    pieces: [{ type: 'straight', length: 14 }],
    len: 14,
    sections: [
      { type: 'pusher', at: 1, params: { width: W, count: 3, spacing: 4.5, period: 3.2 } },
    ],
  },
  '회전 막대': {
    pieces: [{ type: 'straight', length: 8 }],
    len: 8,
    sections: [{ type: 'sweeper', at: 4, params: { width: W, speed: 1.1 } }],
  },
};

const PRE = Number(process.env.PRE ?? 8); // 장애물 앞 달리는 거리 (진입 속도가 달라진다)
const LAT = Number(process.env.LAT ?? 0); // 조향 목표의 옆 위치 (오른쪽 +, 차선 시험용)
function level(test) {
  const pieces = [{ type: 'straight', length: PRE, walls: true }];
  for (const p of test.pieces) pieces.push({ walls: true, ...p });
  pieces.push({ type: 'straight', length: 12, walls: true });
  return {
    track: { width: W, start: { x: 0, z: 0 }, heading: { x: 0, z: -1 }, pieces, wallHeight: 2 },
    spawnOffset: 2,
    spawnHeight: 1.5,
    goalDepth: 2,
    killY: -6,
    sections: (test.sections ?? []).map((s) => ({ ...s, at: s.at + PRE })),
  };
}

function run(test, stroke) {
  const ph = createPhysicsWorld();
  const m = new THREE.MeshBasicMaterial();
  const lv = level(test);
  const stage = buildStage({
    scene: new THREE.Scene(),
    world: ph.world,
    events: createEmitter(),
    materials: { track: m, goal: m, wall: m, player: m, obstacle: m },
    level: lv,
  });
  const p = createClimber({
    stroke,
    world: ph.world,
    scene: new THREE.Scene(),
    spawn: stage.spawn,
  });
  const cam = createCameraFollow(new THREE.PerspectiveCamera(), {
    path: stage.path,
    heading: stage.spawn.heading,
  });
  cam.snap(p.getPosition());
  const startS = PRE;
  const endS = PRE + test.len + 4;
  let t = 0;
  let tStart = null;
  while (t < TIMEOUT) {
    const pos = p.getPosition();
    if (pos.y < -1.5) return '↓';
    const near = nearestOnPath(stage.path, pos);
    if (tStart === null && near.s >= startS - 4) tStart = t; // 장애물 4m 앞부터 잰다
    if (near.s >= endS) return (t - tStart).toFixed(1);
    cam.update(DT, pos);
    const H = cam.getHeading();
    const tp = pointAt(stage.path, near.s + 3);
    const target = {
      x: tp.position.x - tp.heading.z * LAT,
      z: tp.position.z + tp.heading.x * LAT,
    };
    const e =
      (target.x - pos.x) * -H.z +
      (target.z - pos.z) * H.x -
      0.4 * (p.body.velocity.x * -H.z + p.body.velocity.z * H.x);
    ph.step(DT);
    p.update(DT, { forward: true, right: e > 0.3, left: e < -0.3 }, H);
    stage.update(DT, p);
    t += DT;
  }
  return '✗';
}

const filters = process.argv.slice(2);
const names = Object.keys(LEGS);
console.log('시험'.padEnd(12) + names.map((n) => n.padStart(7)).join(''));
for (const [tn, test] of Object.entries(TESTS)) {
  if (filters.length && !filters.some((f) => tn.includes(f))) continue;
  const row = names.map((n) => run(test, LEGS[n]).padStart(8));
  console.log(tn.padEnd(12) + row.join(''));
}
