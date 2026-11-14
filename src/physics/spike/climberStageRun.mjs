// climb1(클라이머 코스)에서 클라이머(다리 모양별)가 어디까지 가는지 본다. 담당: 원유승
// 실행: node src/physics/spike/climberStageRun.mjs
// W + 간단한 자동 조향 (앞쪽 중심선을 향해 A/D). heading은 게임처럼 cameraFollow가 준다.
// 결과: GOAL / FALL / timeout, 걸린 시간, 도달한 중심선 거리 / 전체 길이, 막힌 곳 근처 구간
import * as THREE from 'three';
import { createPhysicsWorld } from '../physicsWorld.js';
import { createClimber } from '../climber.js';
import { createTriggers } from '../triggers.js';
import { buildStage } from '../../stage/buildStage.js';
import { createCameraFollow } from '../../stage/cameraFollow.js';
import { nearestOnPath, pointAt } from '../../stage/track.js';
import { createEmitter } from '../../shared/events.js';
import { EVENTS } from '../../shared/contracts.js';
import { climb1 as level1 } from '../../stage/levels/climb1.js';

const DT = 1 / 60;
const arc = (n, f) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
const LEGS = {
  '큰 원': arc(48, (t) => ({
    x: 0.9 * Math.cos(t * 2 * Math.PI),
    y: 0.9 * Math.sin(t * 2 * Math.PI),
  })),
  '작은 원': arc(40, (t) => ({
    x: 0.5 * Math.cos(t * 2 * Math.PI),
    y: 0.5 * Math.sin(t * 2 * Math.PI),
  })),
  별: arc(80, (t) => {
    const a = t * 2 * Math.PI;
    const r = Math.round((a * 5) / Math.PI) % 2 ? 0.3 : 0.9;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  }),
  '갈고리 Z': [
    { x: -0.8, y: 0.6 },
    { x: -0.8, y: 0 },
    { x: 0.8, y: 0 },
    { x: 0.8, y: -0.6 },
  ],
  '긴 막대': [
    { x: -0.95, y: 0 },
    { x: 0.95, y: 0 },
  ],
};

// 구간 이름 (level1 sections + 조각 시작 거리)
const marks = [...level1.sections.map((s) => ({ at: s.at, name: s.type }))];
{
  // 바닥 없는 조각(틈)도 구간 이름으로
  let s0 = 0;
  for (const p of level1.track.pieces) {
    if (p.floor === false) marks.push({ at: s0, name: 'gap' });
    s0 += p.type === 'arc' ? (p.radius * Math.abs(p.angle) * Math.PI) / 180 : p.length;
  }
  marks.sort((a, b) => a.at - b.at);
}
const where = (s) => marks.filter((m) => m.at <= s + 1).pop()?.name ?? 'start';

function autoSteer(path, pos, vel, heading) {
  const target = pointAt(path, nearestOnPath(path, pos).s + 3).position;
  const rx = -heading.z;
  const rz = heading.x;
  const e = (target.x - pos.x) * rx + (target.z - pos.z) * rz - 0.4 * (vel.x * rx + vel.z * rz);
  return { right: e > 0.3, left: e < -0.3 };
}

function run(stroke, steer) {
  const ph = createPhysicsWorld();
  const events = createEmitter();
  const m = new THREE.MeshBasicMaterial();
  const stage = buildStage({
    scene: new THREE.Scene(),
    world: ph.world,
    events,
    materials: { track: m, goal: m, wall: m, player: m, obstacle: m },
    level: level1,
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
  const tr = createTriggers({ events, zones: stage.zones });
  let result = null;
  events.on(EVENTS.GOAL, () => (result = 'GOAL'));
  events.on(EVENTS.FALL, () => (result = 'FALL'));
  let t = 0;
  let sMax = nearestOnPath(stage.path, p.getPosition()).s;
  while (!result && t < 60) {
    const pos = p.getPosition();
    cam.update(DT, pos);
    const H = cam.getHeading();
    ph.step(DT);
    p.update(
      DT,
      { forward: true, ...(steer ? autoSteer(stage.path, pos, p.body.velocity, H) : {}) },
      H,
    );
    stage.update(DT, p);
    tr.update(p.getPosition());
    t += DT;
    const n = nearestOnPath(stage.path, p.getPosition());
    if (n.s < sMax + 2) sMax = Math.max(sMax, n.s);
  }
  return `${(result ?? 'timeout').padEnd(7)} ${t.toFixed(1).padStart(4)}s ${sMax.toFixed(0).padStart(3)}/${stage.path.length.toFixed(0)}m  (${where(sMax)})`;
}

console.log('다리       W만                                   자동 조향');
for (const [name, stroke] of Object.entries(LEGS)) {
  console.log(name.padEnd(8), run(stroke, false).padEnd(38), run(stroke, true));
}
