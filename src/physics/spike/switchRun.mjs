// 서킷을 "표지판 보고 다리 바꾸기" 봇과 "한 다리로만" 봇으로 돌려 비교한다. 담당: 원유승
// 실행: node src/physics/spike/switchRun.mjs [맵 id] [바퀴 수]
// 바꾸기 봇: 구간(level.zones) 앞 달리는 길에 들어설 때 그 구간에 맞는 다리로 바꾼다 (게임처럼 그 자리에서 snapshot → restore).
// 바라는 결과: 바꾸기 봇은 완주, 한 다리 봇은 어딘가에서 막힘.
import * as THREE from 'three';
import { createPhysicsWorld } from '../physicsWorld.js';
import { createClimber } from '../climber.js';
import { buildStage } from '../../stage/buildStage.js';
import { createCameraFollow } from '../../stage/cameraFollow.js';
import { createLapCounter } from '../../stage/laps.js';
import { nearestOnPath, pointAt, pieceLength } from '../../stage/track.js';
import { createEmitter } from '../../shared/events.js';
import { levelById } from '../../stage/levels/index.js';
import { LEGS } from './legShapes.mjs';

const LEVEL = { ...levelById(process.argv[2]).level };
if (process.argv[3]) LEVEL.laps = Number(process.argv[3]);
const DT = 1 / 60;
const TIMEOUT = 150 * LEVEL.laps;
/** 구간 → 바꿀 다리 */
const PICK = { big: '큰 원', wind: '작은 원' };

const signs = LEVEL.zones ?? [];
const labels = (() => {
  const out = [];
  let s = 0;
  for (const p of LEVEL.track.pieces) {
    out.push({ at: s, name: p.label ?? '' });
    s += pieceLength(p);
  }
  return out;
})();
const labelAt = (s) => {
  let n = '';
  for (const l of labels) if (l.at <= s) n = l.name || n;
  return n || '출발';
};

function race(first, switching) {
  const ph = createPhysicsWorld();
  const m = new THREE.MeshBasicMaterial();
  const stage = buildStage({
    scene: new THREE.Scene(),
    world: ph.world,
    events: createEmitter(),
    materials: { track: m, goal: m, wall: m, player: m, obstacle: m },
    level: LEVEL,
  });
  const scene = new THREE.Scene();
  let legName = first;
  let p = createClimber({ stroke: LEGS[first], world: ph.world, scene, spawn: stage.spawn });
  const swap = (name) => {
    if (name === legName) return;
    const snap = p.snapshot();
    p.dispose();
    p = createClimber({ stroke: LEGS[name], world: ph.world, scene, spawn: stage.spawn });
    p.restore(snap);
    legName = name;
    swaps++;
  };
  const cam = createCameraFollow(new THREE.PerspectiveCamera(), {
    path: stage.path,
    heading: stage.spawn.heading,
  });
  cam.snap(p.getPosition());
  const laps = createLapCounter({
    path: stage.path,
    pieces: stage.pieces,
    laps: stage.laps,
    startS: stage.startS,
  });
  let t = 0;
  let falls = 0;
  let swaps = 0;
  let lastS = stage.startS;
  let stuckT = 0;
  let bestProg = 0;
  let done = false;
  while (!done && t < TIMEOUT) {
    const pos = p.getPosition();
    const near = nearestOnPath(stage.path, pos);
    if (switching) {
      for (const sg of signs) {
        const crossed =
          (lastS < sg.at && near.s >= sg.at) || (lastS > near.s + 50 && near.s >= sg.at);
        if (crossed) swap(PICK[sg.kind]);
      }
    }
    lastS = near.s;
    cam.update(DT, pos);
    const H = cam.getHeading();
    const target = pointAt(stage.path, (near.s + 3) % stage.path.length).position;
    const e =
      (target.x - pos.x) * -H.z +
      (target.z - pos.z) * H.x -
      0.4 * (p.body.velocity.x * -H.z + p.body.velocity.z * H.x);
    ph.step(DT);
    p.update(DT, { forward: true, right: e > 0.3, left: e < -0.3 }, H);
    stage.update(DT, p);
    const r = laps.update(p.getPosition());
    if (laps.fallen(p.getPosition())) {
      falls++;
      const pose = laps.respawnPose();
      p.reset({ position: pose.position, heading: pose.heading, groundY: pose.position.y });
    }
    done = r.finished;
    // 15초 동안 앞으로 못 가면 막힘
    if (laps.progress > bestProg + 1) {
      bestProg = laps.progress;
      stuckT = 0;
    } else stuckT += DT;
    if (stuckT > 15) break;
    t += DT;
  }
  const where = labelAt(nearestOnPath(stage.path, p.getPosition()).s);
  return { t, done, falls, swaps, where, prog: laps.progress };
}

console.log(`${LEVEL.theme} · 한 바퀴 ${LEVEL.length.toFixed(0)}m × ${LEVEL.laps}바퀴`);
const show = (name, r) =>
  console.log(
    `${name.padEnd(12)} ${(r.done ? `완주 ${r.t.toFixed(0)}s` : `막힘: ${r.where} (${r.prog.toFixed(0)}m)`).padEnd(22)} 낙하 ${r.falls}${r.swaps ? ` · 바꿈 ${r.swaps}` : ''}`,
  );
show('바꿔 그리기', race('큰 원', true));
for (const name of Object.keys(LEGS)) show(name, race(name, false));
