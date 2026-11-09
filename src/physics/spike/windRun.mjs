// windGap 확인: 60m 직선 트랙의 20 ~ 30m 지점에 옆바람 구간을 넣고 W만 눌러 프리셋별로 얼마나 밀리는지 본다.
// 바람만 보려고 level1의 곡선 대신 직선 하나만 쓴다. 트랙 방향을 돌려도 결과가 같아야 한다 (heading 대응 확인).
// 담당: 원유승
// 실행: node src/physics/spike/windRun.mjs [바람세기 m/s] [트랙 방향 °, 0 = -Z, 90 = +X]
// 결과: 프리셋별 정지 상태 바람 가속도, 구간 통과 중 옆으로 밀린 거리(+ = 진행 방향 오른쪽), 최종 결과.
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
const yawDeg = Number(process.argv[3] ?? 0);
const yaw = (yawDeg * Math.PI) / 180;
const H = { x: Math.sin(yaw), z: -Math.cos(yaw) }; // 트랙 진행 방향
const R = { x: -H.z, z: H.x }; // 오른쪽
const AT = 20; // 구간 시작 (트랙 중심선 거리)
const LEN = 10;
const level = {
  ...level1,
  track: { ...level1.track, heading: H, pieces: [{ type: 'straight', length: 60 }] },
  sections: [{ type: 'windGap', at: AT, params: { length: LEN, speed, gust: 0 } }],
};
const start = level.track.start;
const along = (q) => (q.x - start.x) * H.x + (q.z - start.z) * H.z;
const lateral = (q) => (q.x - start.x) * R.x + (q.z - start.z) * R.z;
const m = new THREE.MeshBasicMaterial();
console.log(`바람 ${speed} m/s, 트랙 방향 ${yawDeg}°, 구간 ${AT} ~ ${AT + LEN}m`);
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
  const f0 = windForce({ x: R.x * speed, z: R.z * speed }, p.body, p.stats);
  const tr = createTriggers({ events, zones: stage.zones });
  let result = null;
  events.on(EVENTS.GOAL, () => (result = 'GOAL'));
  events.on(EVENTS.FALL, () => (result = 'FALL'));
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
    if (xIn === null && along(q) >= AT) xIn = lateral(q);
    if (xOut === null && along(q) >= AT + LEN) xOut = lateral(q);
  }
  const drift = xIn === null ? '-' : ((xOut ?? lateral(p.getPosition())) - xIn).toFixed(2) + 'm';
  console.log(
    name.padEnd(9),
    `질량 ${p.mass.toFixed(2)}kg`,
    `바람가속 ${(Math.hypot(f0.x, f0.z) / p.mass).toFixed(2)}m/s²`,
    `구간 밀림 ${drift}`.padEnd(14),
    result ?? 'timeout',
    t.toFixed(1) + 's',
  );
}
