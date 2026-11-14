// Draw Climber 방식 플레이어: 블록 동물 몸통 + 그린 선 다리. 담당: 원유승
// 생김새(동물 · 다리 메쉬)와 다리 선 계산은 climberLook.js (대기 화면 미리보기와 같이 쓴다).
//
// 물체 두 개를 경첩(HingeConstraint) 모터로 잇는다.
//   몸통: 캐릭터. 회전을 잠가(fixedRotation) 항상 똑바로 서 있고, 방향(요)만 코드로 정한다.
//   다리: 그린 선을 몸통 양옆에 붙인 것. 경첩 축(몸통 좌우)으로 모터가 돌린다 → 다리가 땅을 짚고 몸통을 민다.
// 다리 충돌은 선 구간마다 얇은 상자 (가볍고 안정적), 화면은 굵고 끝이 둥근 관 (펜으로 그린 선 느낌).
//
// 좌표 (몸통 로컬): X = 좌우(경첩 축, 오른쪽 +), Y = 위, Z = 뒤 (앞 = −Z). 다리 평면 = 로컬 YZ.
// 그리기 칸: 빈 캔버스, 정규화 좌표 [-1, 1] (오른쪽 = 앞(−Z), 위 = +Y).
// 그린 선의 시작점(펜을 댄 곳)이 경첩에 붙는다. 오른쪽 다리는 그린 그대로, 왼쪽 다리는 같은 선을 축 둘레로
// 180° 돌려 붙인다 → 자전거 페달 · 풍차 날개처럼 한쪽이 땅을 짚을 때 다른 쪽은 위에 있어 번갈아 민다.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  BODY,
  HEAD,
  LEG_DEPTH,
  LEG_SIDE_X,
  legLine,
  sideLine,
  makeAnimal,
  makeLegs,
  disposeLook,
} from './climberLook.js';

// ── 치수 (몸통 · 다리 위치는 climberLook.js와 같이 쓴다) ──
const LEG_THICK = 0.09; // 충돌 상자 두께 (다리 평면 안)
const BODY_MASS = 1;
const LEG_MASS_PER_M = 0.05;
const LEG_MIN_MASS = 0.3; // 다리가 너무 가벼우면 경첩이 물렁해진다

// ── 조작 ──
const G = 9.82;
const GRAVITY_SCALE = 0.8; // 플레이어만 조금 가볍게
const MOTOR_SPEED = 6; // rad/s (짧은 다리 기준 최대)
// 다리 끝 속도 상한 (m/s): 긴 다리를 같은 각속도로 돌리면 끝이 너무 빨라 몸통을 7m씩 띄워 벽을 넘는다.
// 회전 속도 = min(MOTOR_SPEED, TIP_SPEED / 다리 길이) → 긴 다리는 천천히 돈다.
const TIP_SPEED = 4.5; // 3.5면 긴 다리가 너무 느려 시험 코스 계단을 못 오름
const MOTOR_TORQUE_PER_KG = 16; // N·m/kg (전체 질량 기준) 모터 힘 상한
const HOLD_TORQUE_RATIO = 0.5; // W/S를 안 누르면 이 비율 힘으로 다리를 붙잡는다 (지팡이처럼 버팀)
const STEER_RATE = 1.6; // rad/s (A/D)
const STEER_MAX = 0.7; // rad. 트랙 방향에서 이 이상은 안 꺾는다
const STEER_RETURN = 1.5; // 1/s. A/D를 떼면 트랙 방향으로 돌아오는 빠르기
const HARD_MAX_SPEED = 15;

const GROUP_WORLD = 1;
const GROUP_BODY = 2;
const GROUP_LEGS = 4;

/**
 * @param {{ stroke: {x:number, y:number}[], animal?: string, world: CANNON.World, scene: THREE.Scene,
 *           spawn: { position: THREE.Vector3, heading: {x:number,z:number} } }} opts
 *   animal = climberLook.ANIMALS의 id (생김새만 다름, 물리는 같음). 기본 고양이.
 *   stroke = 그리기 칸 좌표 [-1, 1] (가운데 = 경첩, 위 = +y). 비어 있으면 다리 없음 (허브만).
 *   spawn.position.y는 무시하고 다리 길이에 맞춰 띄운다.
 * @returns PlayerBody의 플레이어와 같은 모양의 객체 (+ legsBody, reach, legSegments)
 */
export function createClimber({ stroke, animal = 'cat', world, scene, spawn }) {
  const line = legLine(stroke);
  let reach = Math.max(BODY.h / 2 + 0.05, 0.3);
  for (const [z, y] of line) reach = Math.max(reach, Math.hypot(z, y));

  // 몸통: 회전 잠금, 상자 두 개 (몸 + 머리)
  const body = new CANNON.Body({
    mass: BODY_MASS,
    fixedRotation: true,
    linearDamping: 0.05,
    collisionFilterGroup: GROUP_BODY,
    collisionFilterMask: GROUP_WORLD,
  });
  body.addShape(new CANNON.Box(new CANNON.Vec3(BODY.w / 2, BODY.h / 2, BODY.d / 2)));
  body.addShape(
    new CANNON.Box(new CANNON.Vec3(HEAD.s / 2, HEAD.s / 2, HEAD.s / 2)),
    new CANNON.Vec3(0, HEAD.y, HEAD.z),
  );
  body.updateMassProperties();

  // 다리: 선 구간마다 얇은 상자, 양옆 (왼쪽은 180° 돌린 선)
  const legLen = line
    .slice(1)
    .reduce((s, p, i) => s + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]), 0);
  const legs = new CANNON.Body({
    mass: Math.max(LEG_MIN_MASS, LEG_MASS_PER_M * legLen * 2),
    linearDamping: 0.05,
    angularDamping: 0.05,
    collisionFilterGroup: GROUP_LEGS,
    collisionFilterMask: GROUP_WORLD,
  });
  for (const sx of [-1, 1]) {
    const sl = sideLine(line, sx);
    for (let i = 1; i < sl.length; i++) {
      const [az, ay] = sl[i - 1];
      const [bz, by] = sl[i];
      const L = Math.hypot(bz - az, by - ay);
      if (L < 1e-4) continue;
      const q = new CANNON.Quaternion();
      q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.atan2(-(by - ay), bz - az)); // 로컬 Z → 구간 방향
      const half = new CANNON.Vec3(LEG_DEPTH / 2, LEG_THICK / 2, (L + LEG_THICK) / 2);
      legs.addShape(
        new CANNON.Box(half),
        new CANNON.Vec3(sx * LEG_SIDE_X, (ay + by) / 2, (az + bz) / 2),
        q,
      );
    }
  }
  // 다리가 없으면 허브 크기 공 하나 (경첩이 빈 물체에 걸리지 않게, 땅에는 안 닿을 크기)
  if (!legs.shapes.length) legs.addShape(new CANNON.Sphere(0.05));
  legs.updateMassProperties();

  const hinge = new CANNON.HingeConstraint(body, legs, {
    pivotA: new CANNON.Vec3(0, 0, 0),
    axisA: new CANNON.Vec3(1, 0, 0),
    pivotB: new CANNON.Vec3(0, 0, 0),
    axisB: new CANNON.Vec3(1, 0, 0),
    collideConnected: false,
  });
  hinge.enableMotor();
  world.addBody(body);
  world.addBody(legs);
  world.addConstraint(hinge);

  const totalMass = body.mass + legs.mass;
  const motorSpeed = Math.min(MOTOR_SPEED, TIP_SPEED / reach);
  const torqueCap = MOTOR_TORQUE_PER_KG * totalMass;

  // 화면
  const holder = new THREE.Group();
  holder.add(makeAnimal(animal));
  const legsHolder = new THREE.Group();
  legsHolder.add(makeLegs(line));
  scene.add(holder, legsHolder);

  let input = { forward: false, back: false, left: false, right: false };
  let heading = spawn.heading;
  let steerYaw = 0; // A/D로 쌓인 방향 (heading 기준)
  const externalForce = new CANNON.Vec3();
  const yawQ = new CANNON.Quaternion();
  const UP = new CANNON.Vec3(0, 1, 0);

  function yawOf(h) {
    // 로컬 앞(−Z)을 h로: 각 = atan2(−h.x, −h.z)
    return Math.atan2(-h.x, -h.z) + steerYaw;
  }

  const onPreStep = () => {
    const dt = world.dt > 0 ? world.dt : 1 / 240;
    // 방향: 몸통 회전을 직접 정한다 (회전 잠금이라 충돌로 돌지 않음)
    const side = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (side)
      steerYaw = Math.max(-STEER_MAX, Math.min(STEER_MAX, steerYaw - side * STEER_RATE * dt));
    else steerYaw *= Math.exp(-STEER_RETURN * dt);
    yawQ.setFromAxisAngle(UP, yawOf(heading));
    body.quaternion.copy(yawQ);
    body.angularVelocity.setZero();

    // 모터: W = 앞으로 굴리는 방향. 다리 평면에서 앞(−Z)으로 구르려면 +X 축 기준 음의 회전.
    const roll = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    hinge.setMotorSpeed(roll * motorSpeed);
    hinge.setMotorMaxForce(roll ? torqueCap : torqueCap * HOLD_TORQUE_RATIO);

    // 가벼움 + 외력
    body.force.y += body.mass * G * (1 - GRAVITY_SCALE);
    legs.force.y += legs.mass * G * (1 - GRAVITY_SCALE);
    body.force.vadd(externalForce, body.force);

    for (const b of [body, legs]) {
      const s = b.velocity.length();
      if (s > HARD_MAX_SPEED) b.velocity.scale(HARD_MAX_SPEED / s, b.velocity);
    }
  };
  world.addEventListener('preStep', onPreStep);

  function sync() {
    holder.position.copy(body.position);
    holder.quaternion.copy(body.quaternion);
    legsHolder.position.copy(legs.position);
    legsHolder.quaternion.copy(legs.quaternion);
  }

  function place(position, h, legAngle = 0) {
    heading = h;
    steerYaw = 0;
    body.position.set(position.x, position.y, position.z);
    body.quaternion.setFromAxisAngle(UP, yawOf(h));
    legs.position.copy(body.position);
    const spin = new CANNON.Quaternion();
    spin.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), legAngle);
    body.quaternion.mult(spin, legs.quaternion);
  }

  function reset(s) {
    place(new THREE.Vector3(s.position.x, reach + 0.1, s.position.z), s.heading);
    for (const b of [body, legs]) {
      b.velocity.setZero();
      b.angularVelocity.setZero();
      b.force.setZero();
      b.torque.setZero();
    }
    externalForce.setZero();
    sync();
  }
  reset(spawn);

  // windGap용 투영면적 (옆에서 본 다리 원판 일부 + 몸통 단면)
  const span = 2 * reach;
  const width = 2 * (LEG_SIDE_X + LEG_DEPTH / 2);

  return {
    mesh: holder,
    legsMesh: legsHolder,
    body,
    legsBody: legs,
    mass: totalMass,
    animal,
    axle: true,
    reach,
    legSegments: Math.max(0, line.length - 1),
    stats: {
      projectedArea(dir) {
        const L = Math.hypot(dir.x, dir.y, dir.z) || 1;
        return (Math.abs(dir.x) * span * span * 0.3 + Math.hypot(dir.y, dir.z) * width * span) / L;
      },
    },
    update(dt, nextInput, nextHeading) {
      input = nextInput;
      heading = nextHeading;
      externalForce.setZero();
      sync();
    },
    getPosition() {
      return new THREE.Vector3(body.position.x, body.position.y, body.position.z);
    },
    /** 경첩 축 (월드, 단위벡터) */
    getAxis() {
      const a = body.quaternion.vmult(new CANNON.Vec3(1, 0, 0));
      return new THREE.Vector3(a.x, a.y, a.z);
    },
    applyExternalForce(v3) {
      externalForce.x += v3.x;
      externalForce.y += v3.y;
      externalForce.z += v3.z;
    },
    /** 달리는 중 다리 교체용: 지금 상태를 다른 클라이머에 옮긴다 */
    snapshot() {
      return {
        position: body.position.clone(),
        velocity: body.velocity.clone(),
        heading,
        steerYaw,
        reach,
      };
    },
    /** snapshot()을 받아 그 자리에서 이어 달린다. 다리가 길어졌으면 땅에 박히지 않게 띄운다. */
    restore(snap) {
      const p = snap.position;
      place(
        new THREE.Vector3(p.x, p.y + Math.max(0, reach - snap.reach) + 0.05, p.z),
        snap.heading,
      );
      steerYaw = snap.steerYaw;
      body.quaternion.setFromAxisAngle(UP, yawOf(snap.heading));
      body.quaternion.mult(new CANNON.Quaternion(), legs.quaternion);
      for (const b of [body, legs]) {
        b.velocity.copy(snap.velocity);
        b.angularVelocity.setZero();
      }
      sync();
    },
    reset,
    dispose() {
      world.removeEventListener('preStep', onPreStep);
      world.removeConstraint(hinge);
      world.removeBody(body);
      world.removeBody(legs);
      scene.remove(holder, legsHolder);
      disposeLook(holder);
      disposeLook(legsHolder);
    },
  };
}
