// 실제 스테이지(level1)에서 W만 누르고 프리셋별로 골까지 가는지 본다. 담당: 원유승
// 실행: node src/physics/spike/stageRun.mjs
// 결과: GOAL / FALL / timeout, 1초마다 (x, z) 위치. A/D 조향 없이 직진 안정성만 확인하는 용도.
import * as THREE from 'three';
import { createPhysicsWorld } from '../physicsWorld.js';
import { createPlayer } from '../PlayerBody.js';
import { createTriggers } from '../triggers.js';
import { buildStage } from '../../stage/buildStage.js';
import { createEmitter } from '../../shared/events.js';
import { EVENTS } from '../../shared/contracts.js';
import { getPreset, PRESET_NAMES } from '../../shared/presets.js';
import { buildLatheGeometry } from '../../editor/latheGeometry.js';
const m = new THREE.MeshBasicMaterial();
for (const name of PRESET_NAMES) {
  const ph = createPhysicsWorld(),
    scene = new THREE.Scene(),
    events = createEmitter();
  const stage = buildStage({
    scene,
    world: ph.world,
    events,
    materials: { track: m, goal: m, wall: m, player: m },
  });
  const prof = getPreset(name);
  const p = createPlayer({
    profile: prof,
    geometry: buildLatheGeometry(prof, 24),
    world: ph.world,
    scene,
    spawn: stage.spawn,
  });
  const tr = createTriggers({ events, zones: stage.zones });
  let result = null;
  events.on(EVENTS.GOAL, () => (result = 'GOAL'));
  events.on(EVENTS.FALL, () => (result = 'FALL'));
  const H = stage.spawn.heading;
  let t = 0,
    log = [];
  while (!result && t < 25) {
    ph.step(1 / 60);
    p.update(1 / 60, { forward: true }, H);
    tr.update(p.getPosition());
    t += 1 / 60;
    if (Math.round(t * 60) % 60 === 0) {
      const q = p.getPosition();
      log.push(`${t.toFixed(0)}s(${q.x.toFixed(1)},${q.z.toFixed(1)})`);
    }
  }
  console.log(name.padEnd(9), result ?? 'timeout', t.toFixed(1) + 's', log.join(' '));
}
