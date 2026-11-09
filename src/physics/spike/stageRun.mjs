// 실제 스테이지(level1)에서 프리셋별로 골까지 가는지 본다. 담당: 원유승
// 실행: node src/physics/spike/stageRun.mjs
// heading은 실제 게임처럼 cameraFollow가 트랙 중심선을 따라 준다.
// 모드 두 가지:
//   W     W만 누름 (조향 없음). 직진 안정성과 곡선에서 어떻게 되는지
//   steer W + 간단한 자동 조향 (앞쪽 중심선을 향해 A/D). 조향 세기(SIDE_FORCE)로 코스를 돌 수 있는지
// 결과: GOAL / FALL / timeout, 걸린 시간, 도달한 중심선 거리 / 전체 길이
import * as THREE from 'three';
import { createPhysicsWorld } from '../physicsWorld.js';
import { createPlayer } from '../PlayerBody.js';
import { createTriggers } from '../triggers.js';
import { buildStage } from '../../stage/buildStage.js';
import { createCameraFollow } from '../../stage/cameraFollow.js';
import { nearestOnPath, pointAt } from '../../stage/track.js';
import { createEmitter } from '../../shared/events.js';
import { EVENTS } from '../../shared/contracts.js';
import { getPreset, PRESET_NAMES } from '../../shared/presets.js';
import { buildLatheGeometry } from '../../editor/latheGeometry.js';

const DT = 1 / 60;
const LOOK_AHEAD = 3; // 자동 조향: 이만큼 앞의 중심선을 노린다 (m)
const DEADBAND = 0.2; // 자동 조향: 이보다 작게 어긋나면 A/D를 안 누른다 (m)
const m = new THREE.MeshBasicMaterial();

/** 앞쪽 중심선 지점이 오른쪽/왼쪽 어디에 있는지 보고 A/D를 고른다. 옆 속도는 미리 빼서 덜 흔들리게 한다. */
function autoSteer(path, pos, vel, heading) {
  const near = nearestOnPath(path, pos);
  const target = pointAt(path, near.s + LOOK_AHEAD).position;
  const rx = -heading.z;
  const rz = heading.x;
  const e = (target.x - pos.x) * rx + (target.z - pos.z) * rz - 0.5 * (vel.x * rx + vel.z * rz);
  return { right: e > DEADBAND, left: e < -DEADBAND };
}

function run(name, steer) {
  const ph = createPhysicsWorld();
  const scene = new THREE.Scene();
  const events = createEmitter();
  const stage = buildStage({
    scene,
    world: ph.world,
    events,
    materials: { track: m, goal: m, wall: m, player: m, obstacle: m },
  });
  const prof = getPreset(name);
  const p = createPlayer({
    profile: prof,
    geometry: buildLatheGeometry(prof, 24),
    world: ph.world,
    scene,
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
  let sMax = 0;
  while (!result && t < 30) {
    const pos = p.getPosition();
    cam.update(DT, pos);
    const H = cam.getHeading();
    const input = {
      forward: true,
      ...(steer ? autoSteer(stage.path, pos, p.body.velocity, H) : {}),
    };
    ph.step(DT);
    p.update(DT, input, H);
    stage.update(DT, p);
    tr.update(p.getPosition());
    t += DT;
    sMax = Math.max(sMax, nearestOnPath(stage.path, p.getPosition()).s);
  }
  return `${(result ?? 'timeout').padEnd(7)} ${t.toFixed(1).padStart(4)}s  ${sMax.toFixed(0).padStart(2)}/${stage.path.length.toFixed(0)}m`;
}

console.log('preset     W만                        자동 조향');
for (const name of PRESET_NAMES) {
  console.log(name.padEnd(10), run(name, false).padEnd(26), run(name, true));
}
