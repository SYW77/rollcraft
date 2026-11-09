// frustum 스파이크: 렌더링 없이 물리만 돌려서 숫자로 확인한다. 담당: 원유승
// 실행: node src/physics/spike/frustumSpike.mjs
//
// 확인 항목
//   0. profileMath 관성이 해석해(원통·원뿔)와 맞는지
//   1. 축 방향: W를 누르면 heading 방향으로 구르는지, 회전축이 수평을 유지하는지
//   2. 튐: 착지 후와 구르는 동안 위아래로 튀지 않는지
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createPhysicsWorld } from '../physicsWorld.js';
import { createPlayer } from '../PlayerBody.js';
import { getPreset, PRESET_NAMES } from '../../shared/presets.js';
import { profileStats, profileInertia } from '../../shared/profileMath.js';
import { R_MIN } from '../../shared/contracts.js';
import { buildLatheGeometry } from '../../editor/latheGeometry.js';

const DT = 1 / 60;
const HEADING = { x: 0, z: -1 };
const NO_INPUT = { forward: false, back: false, left: false, right: false };
const FORWARD = { ...NO_INPUT, forward: true };
const fmt = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
let failures = 0;
const check = (ok, label) => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
};

// ── 0. 관성 해석해 비교 ──────────────────────────────────────────
console.log('\n[0] 관성 vs 해석해 (질량 1 기준)');
{
  const cyl = Array.from({ length: 12 }, (_, i) => ({ r: 0.6, y: i / 11 })); // 반지름 0.3, 높이 1
  // 밑면 반지름 0.5, 높이 1 (꼭짓점은 R_MIN으로 잘림). 원뿔 프리셋은 뺐지만 직접 그린 단면용으로 관성 계산은 확인한다
  const cone = Array.from({ length: 12 }, (_, i) => ({
    r: Math.max(R_MIN, 1 - i / 11),
    y: i / 11,
  }));
  const cases = [
    ['원통 축', profileInertia(cyl, 1).axial, 0.5 * 0.09],
    ['원통 가로', profileInertia(cyl, 1).transverse, (3 * 0.09 + 1) / 12],
    ['원뿔 축', profileInertia(cone, 1).axial, 0.3 * 0.25],
    ['원뿔 가로', profileInertia(cone, 1).transverse, (3 * 0.25) / 20 + 3 / 80],
    ['원뿔 무게중심', profileStats(cone).comY, 0.25],
  ];
  for (const [name, got, want] of cases) {
    const err = Math.abs(got - want) / want;
    // 원뿔은 꼭짓점이 R_MIN으로 잘린 원뿔대라 해석해와 몇 % 차이가 정상
    check(
      err < 0.05,
      `${name}: ${fmt(got, 4)} (해석해 ${fmt(want, 4)}, 오차 ${fmt(err * 100, 1)}%)`,
    );
  }
}

// ── 시뮬레이션 공통 ──────────────────────────────────────────────
function makeScene(name) {
  const physics = createPhysicsWorld();
  const ground = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(200, 0.5, 200)),
  });
  ground.position.set(0, -0.5, 0);
  physics.world.addBody(ground);
  const profile = getPreset(name);
  const spawn = { position: new THREE.Vector3(0, 1, 0), heading: HEADING };
  const player = createPlayer({
    profile,
    geometry: buildLatheGeometry(profile, 24),
    world: physics.world,
    scene: new THREE.Scene(),
    spawn,
  });
  const run = (seconds, input, onStep) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      physics.step(DT);
      player.update(DT, input, HEADING);
      onStep?.(player.body);
    }
  };
  return { player, run };
}

// ── 1·2. 프리셋별 굴림 ───────────────────────────────────────────
for (const name of PRESET_NAMES) {
  const { player, run } = makeScene(name);
  const b = player.body;
  console.log(`\n[${name}] 질량 ${fmt(player.mass)}kg, 반지름 최대 ${fmt(player.stats.maxRadius)}`);

  // 착지 후 1.5초 정지: 튐 확인
  run(1.0, NO_INPUT); // 낙하 + 자리잡기
  let yMin = Infinity,
    yMax = -Infinity,
    vyMax = 0;
  run(1.0, NO_INPUT, () => {
    yMin = Math.min(yMin, b.position.y);
    yMax = Math.max(yMax, b.position.y);
    vyMax = Math.max(vyMax, Math.abs(b.velocity.y));
  });
  check(
    yMax - yMin < 0.02 && vyMax < 0.1,
    `정지 상태 튐: y 흔들림 ${fmt(yMax - yMin)}m, |vy| 최대 ${fmt(vyMax)}m/s`,
  );

  // W 2초: 축 방향
  const start = b.position.clone();
  let axisTiltMax = 0,
    rollYMin = Infinity,
    rollYMax = -Infinity,
    rollVyMax = 0;
  run(2.0, FORWARD, () => {
    const axis = player.getAxis();
    axisTiltMax = Math.max(axisTiltMax, Math.abs(axis.y));
    rollYMin = Math.min(rollYMin, b.position.y);
    rollYMax = Math.max(rollYMax, b.position.y);
    rollVyMax = Math.max(rollVyMax, Math.abs(b.velocity.y));
  });
  const d = b.position.vsub(start);
  const along = d.x * HEADING.x + d.z * HEADING.z;
  const lateral = d.x * -HEADING.z + d.z * HEADING.x;
  const speed = Math.hypot(b.velocity.x, b.velocity.z);
  check(
    along > 1,
    `W 2초 → 앞으로 ${fmt(along, 2)}m 이동 (옆으로 ${fmt(lateral, 2)}m), 속력 ${fmt(speed, 2)}m/s`,
  );
  const tiltLimit = 0.35;
  check(
    axisTiltMax < tiltLimit,
    `회전축 기울기: |axis.y| 최대 ${fmt(axisTiltMax)} (기준 < ${tiltLimit})`,
  );
  check(
    rollYMax - rollYMin < 0.03,
    `구르는 중 튐: y 범위 ${fmt(rollYMax - rollYMin)}m, |vy| 최대 ${fmt(rollVyMax)}m/s`,
  );

  // 손 떼고 4초: 진행 방향 변화
  const h0 = Math.atan2(b.velocity.x, -b.velocity.z);
  let turned = 0,
    prev = h0;
  run(4.0, NO_INPUT, () => {
    if (Math.hypot(b.velocity.x, b.velocity.z) < 0.2) return;
    const h = Math.atan2(b.velocity.x, -b.velocity.z);
    let dh = h - prev;
    if (dh > Math.PI) dh -= 2 * Math.PI;
    if (dh < -Math.PI) dh += 2 * Math.PI;
    turned += dh;
    prev = h;
  });
  const turnedDeg = (turned * 180) / Math.PI;
  console.log(`  info  손 뗀 뒤 진행 방향 ${fmt(turnedDeg, 0)}° 회전`);
}

console.log(failures ? `\n${failures}개 실패` : '\n모두 통과');
process.exitCode = failures ? 1 : 0;
