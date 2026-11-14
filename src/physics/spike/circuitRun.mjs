// 서킷(circuit1)에서 다리 모양별로 3바퀴 레이스를 돌려 본다. 담당: 원유승
// 실행: node src/physics/spike/circuitRun.mjs
// 게임과 같이: W + 간단한 자동 조향, 떨어지면 조금 뒤에서 다시 출발 (stage/laps.js).
// 결과: 완주 시간(또는 시간 초과), 떨어진 횟수, 구간별 평균 통과 시간 (한 바퀴 기준, 초)
import * as THREE from 'three';
import { createPhysicsWorld } from '../physicsWorld.js';
import { createClimber } from '../climber.js';
import { createTriggers } from '../triggers.js';
import { buildStage } from '../../stage/buildStage.js';
import { createCameraFollow } from '../../stage/cameraFollow.js';
import { createLapCounter } from '../../stage/laps.js';
import { nearestOnPath, pointAt } from '../../stage/track.js';
import { createEmitter } from '../../shared/events.js';
import { EVENTS } from '../../shared/contracts.js';
import { circuit1 } from '../../stage/levels/circuit1.js';

const DT = 1 / 60;
const TIMEOUT = 240;
const arc = (n, f) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
const LEGS = {
  '큰 원': arc(48, (t) => ({
    x: 0.9 * Math.cos(t * 2 * Math.PI),
    y: 0.9 * Math.sin(t * 2 * Math.PI),
  })),
  '작은 원': arc(40, (t) => ({
    x: 0.45 * Math.cos(t * 2 * Math.PI),
    y: 0.45 * Math.sin(t * 2 * Math.PI),
  })),
  별: arc(80, (t) => {
    const a = t * 2 * Math.PI;
    const r = Math.round((a * 5) / Math.PI) % 2 ? 0.3 : 0.9;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  }),
  '긴 막대': [
    { x: -0.95, y: 0 },
    { x: 0.95, y: 0 },
  ],
  '갈고리 Z': [
    { x: -0.8, y: 0.6 },
    { x: -0.8, y: 0 },
    { x: 0.8, y: 0 },
    { x: 0.8, y: -0.6 },
  ],
  S자: arc(40, (t) => ({ x: -0.9 + 1.8 * t, y: 0.5 * Math.sin(t * 2 * Math.PI) })),
};

// 구간 이름: 레벨 조각의 label
const SECTIONS = (() => {
  const out = [];
  let s = 0;
  for (const p of circuit1.track.pieces) {
    out.push({ name: p.label ?? '', at: s });
    s += p.type === 'arc' ? (p.radius * Math.abs(p.angle) * Math.PI) / 180 : p.length;
  }
  return out;
})();
function groupOf(s) {
  let name = '';
  for (const sec of SECTIONS) if (sec.at <= s) name = sec.name || name;
  return name || '출발';
}

function autoSteer(path, pos, vel, heading) {
  const target = pointAt(path, (nearestOnPath(path, pos).s + 3) % path.length).position;
  const rx = -heading.z;
  const rz = heading.x;
  const e = (target.x - pos.x) * rx + (target.z - pos.z) * rz - 0.4 * (vel.x * rx + vel.z * rz);
  return { right: e > 0.3, left: e < -0.3 };
}

function race(stroke) {
  const ph = createPhysicsWorld();
  const events = createEmitter();
  const m = new THREE.MeshBasicMaterial();
  const stage = buildStage({
    scene: new THREE.Scene(),
    world: ph.world,
    events,
    materials: { track: m, goal: m, wall: m, player: m, obstacle: m },
    level: circuit1,
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
  const laps = createLapCounter({
    path: stage.path,
    pieces: stage.pieces,
    laps: stage.laps,
    startS: stage.startS,
  });
  let falls = 0;
  const fallAt = {};
  events.on(EVENTS.FALL, () => {
    falls++;
    const g = groupOf(nearestOnPath(stage.path, p.getPosition()).s);
    fallAt[g] = (fallAt[g] ?? 0) + 1;
    const pose = laps.respawnPose();
    p.reset({ position: pose.position, heading: pose.heading });
    tr.reset();
  });
  const timeIn = {};
  let t = 0;
  let done = false;
  let lap = 1;
  while (!done && t < TIMEOUT) {
    const pos = p.getPosition();
    cam.update(DT, pos);
    const H = cam.getHeading();
    ph.step(DT);
    p.update(DT, { forward: true, ...autoSteer(stage.path, pos, p.body.velocity, H) }, H);
    stage.update(DT, p);
    tr.update(p.getPosition());
    const r = laps.update(p.getPosition());
    lap = r.lap;
    done = r.finished;
    const g = groupOf(nearestOnPath(stage.path, p.getPosition()).s);
    timeIn[g] = (timeIn[g] ?? 0) + DT;
    t += DT;
  }
  const lapsDone = done ? 3 : lap - 1;
  return { t, done, lap, falls, fallAt, timeIn, lapsDone };
}

const COLS = [...new Set(SECTIONS.map((x) => x.name).filter(Boolean))];
console.log(
  '다리       결과                 낙하  ' +
    COLS.map((c) => c.padEnd(6)).join('') +
    ' (구간 시간: 바퀴당 평균 초)',
);
for (const [name, stroke] of Object.entries(LEGS)) {
  const r = race(stroke);
  const per = Math.max(1, r.lapsDone + (r.done ? 0 : 0.5));
  const res = r.done ? `완주 ${r.t.toFixed(0)}s` : `시간초과 (${r.lap}바퀴째)`;
  const falls = Object.entries(r.fallAt)
    .map(([k, v]) => `${k}${v}`)
    .join(' ');
  console.log(
    `${name.padEnd(8)} ${res.padEnd(18)} ${String(r.falls).padStart(3)}  ` +
      COLS.map((c) => ((r.timeIn[c] ?? 0) / per).toFixed(1).padEnd(6)).join('') +
      (falls ? `  낙하: ${falls}` : ''),
  );
}
