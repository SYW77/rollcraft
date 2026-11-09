// windGap 확인: level1 트랙 중간(z = -20 ~ -30)에 옆바람 구간을 넣고 W만 눌러 프리셋별로 얼마나 밀리는지 본다.
// 담당: 원유승
// 실행: node src/physics/spike/windRun.mjs [바람세기 m/s]
// 결과: 프리셋별 바람 받기 전 1초당 질량 대비 힘(가속도), 구간 통과 중 옆으로 밀린 거리, 최종 결과.
import * as THREE from 'three';
import { createPhysicsWorld } from '../physicsWorld.js';
import { createPlayer } from '../PlayerBody.js';
import { createTriggers } from '../triggers.js';
import { buildStage } from '../../stage/buildStage.js';
import { windForce } from '../../stage/obstacles/windGap.js';
import { level1 } from '../../stage/levels/level1.js';
import { createEmitter } from '../../shared/events.js';
import { EVENTS } from '../../shared/contracts.js';
import { getPreset, PRESET_NAMES } from '../../shared/presets.js';
import { buildLatheGeometry } from '../../editor/latheGeometry.js';

const speed = Number(process.argv[2] ?? 3);
const Z0 = -20;
const LEN = 10;
const level = {
  ...level1,
  sections: [
    { type: 'windGap', origin: { x: 0, y: 0, z: Z0 }, params: { length: LEN, speed, gust: 0 } },
  ],
};
const m = new THREE.MeshBasicMaterial();
console.log(`바람 ${speed} m/s, 구간 z ${Z0} ~ ${Z0 - LEN}`);
for (const name of PRESET_NAMES) {
  const ph = createPhysicsWorld();
  const scene = new THREE.Scene();
  const events = createEmitter();
  const stage = buildStage({
    scene,
    world: ph.world,
    events,
    materials: { track: m, goal: m, wall: m, player: m, obstacle: m },
    level,
  });
  const prof = getPreset(name);
  const p = createPlayer({
    profile: prof,
    geometry: buildLatheGeometry(prof, 24),
    world: ph.world,
    scene,
    spawn: stage.spawn,
  });
  // 정지 상태에서 바람이 주는 가속도 (자세 그대로)
  const f0 = windForce({ x: speed, z: 0 }, p.body, p.stats);
  const tr = createTriggers({ events, zones: stage.zones });
  let result = null;
  events.on(EVENTS.GOAL, () => (result = 'GOAL'));
  events.on(EVENTS.FALL, () => (result = 'FALL'));
  const H = stage.spawn.heading;
  let t = 0;
  let xIn = null;
  let xOut = null;
  while (!result && t < 25) {
    ph.step(1 / 60);
    p.update(1 / 60, { forward: true }, H);
    stage.update(1 / 60, p);
    tr.update(p.getPosition());
    t += 1 / 60;
    const q = p.getPosition();
    if (xIn === null && q.z <= Z0) xIn = q.x;
    if (xOut === null && q.z <= Z0 - LEN) xOut = q.x;
  }
  const drift = xIn === null ? '-' : ((xOut ?? p.getPosition().x) - xIn).toFixed(2) + 'm';
  console.log(
    name.padEnd(9),
    `질량 ${p.mass.toFixed(2)}kg`,
    `바람가속 ${(Math.hypot(f0.x, f0.z) / p.mass).toFixed(2)}m/s²`,
    `구간 밀림 ${drift}`.padEnd(14),
    result ?? 'timeout',
    t.toFixed(1) + 's',
  );
}
