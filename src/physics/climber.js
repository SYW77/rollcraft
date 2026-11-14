// [프로토타입] Draw Climber 방식 플레이어: 블록 고양이 몸통 + 그린 선 다리. 담당: 원유승
//
// 물체 두 개를 경첩(HingeConstraint) 모터로 잇는다.
//   몸통: 캐릭터. 회전을 잠가(fixedRotation) 항상 똑바로 서 있고, 방향(요)만 코드로 정한다.
//   다리: 그린 선을 몸통 양옆에 붙인 것. 경첩 축(몸통 좌우)으로 모터가 돌린다 → 다리가 땅을 짚고 몸통을 민다.
// 다리 충돌은 선 구간마다 얇은 상자 (가볍고 안정적), 화면은 굵고 끝이 둥근 관 (펜으로 그린 선 느낌).
//
// 좌표 (몸통 로컬): X = 좌우(경첩 축, 오른쪽 +), Y = 위, Z = 뒤 (앞 = −Z). 다리 평면 = 로컬 YZ.
// 그리기 칸: 가운데 = 경첩, 오른쪽 = 앞(−Z), 위 = +Y. 정규화 좌표 [-1, 1].
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ── 치수 ──
const BODY = { w: 0.5, h: 0.42, d: 0.55 }; // 몸통 상자 (폭 = 축 방향)
const HEAD = { s: 0.36, y: 0.33, z: -0.14 }; // 머리 상자 (몸통 중심 기준 위치)
const LEG_REACH = 1.1; // 그리기 칸 가장자리 = 경첩에서 이만큼 (m)
const LEG_RADIUS = 0.05; // 화면용 관 반지름
const LEG_THICK = 0.09; // 충돌 상자 두께 (다리 평면 안)
const LEG_DEPTH = 0.1; // 충돌 상자 폭 (축 방향)
const LEG_SIDE_X = BODY.w / 2 + 0.06 + LEG_DEPTH / 2; // 다리가 붙는 위치 (몸통 옆면 바깥)
const SEG_LEN = 0.12;
const MAX_SEGS = 24;
const BODY_MASS = 1;
const LEG_MASS_PER_M = 0.05;
const LEG_MIN_MASS = 0.3; // 다리가 너무 가벼우면 경첩이 물렁해진다

// ── 조작 ──
const G = 9.82;
const GRAVITY_SCALE = 0.8; // 플레이어만 조금 가볍게
const MOTOR_SPEED = 6; // rad/s
const MOTOR_TORQUE_PER_KG = 16; // N·m/kg (전체 질량 기준) 모터 힘 상한
const HOLD_TORQUE_RATIO = 0.5; // W/S를 안 누르면 이 비율 힘으로 다리를 붙잡는다 (지팡이처럼 버팀)
const STEER_RATE = 1.6; // rad/s (A/D)
const HARD_MAX_SPEED = 15;

const GROUP_WORLD = 1;
const GROUP_BODY = 2;
const GROUP_LEGS = 4;

const COLORS = {
  fur: 0xf2a33a,
  cream: 0xfbe3b8,
  ink: 0x2a241f,
  pink: 0xe8798a,
  hub: 0xd9892a,
};

/** 선 길이를 따라 고르게 다시 고른다 */
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const L = Math.hypot(bx - ax, by - ay);
    let s = step - carry;
    while (s <= L) {
      out.push([ax + ((bx - ax) * s) / L, ay + ((by - ay) * s) / L]);
      s += step;
    }
    carry = L - (s - step);
  }
  const last = pts[pts.length - 1];
  const prev = out[out.length - 1];
  if (Math.hypot(last[0] - prev[0], last[1] - prev[1]) > step * 0.3) out.push(last);
  return out;
}

/** 그리기 칸 좌표 → 다리 평면 점 [z, y] (m). 오른쪽 = 앞(−Z). */
function legLine(stroke) {
  const pts = (stroke ?? []).map((p) => [-p.x * LEG_REACH, p.y * LEG_REACH]);
  if (pts.length < 2) return [];
  let line = resample(pts, SEG_LEN);
  if (line.length > MAX_SEGS + 1) line = resample(pts, (SEG_LEN * (line.length - 1)) / MAX_SEGS);
  return line;
}

// ── 화면 ──

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** 블록 고양이 (몸통 로컬 좌표) */
function makeCat() {
  const g = new THREE.Group();
  g.add(box(BODY.w, BODY.h, BODY.d, COLORS.fur, 0, 0, 0));
  g.add(box(BODY.w * 0.7, BODY.h * 0.5, 0.02, COLORS.cream, 0, -0.04, -BODY.d / 2 - 0.005)); // 가슴
  const hy = HEAD.y;
  const hz = HEAD.z;
  const s = HEAD.s;
  g.add(box(s, s, s, COLORS.fur, 0, hy, hz));
  g.add(box(s * 0.6, s * 0.35, 0.02, COLORS.cream, 0, hy - 0.07, hz - s / 2 - 0.005)); // 주둥이
  for (const sx of [-1, 1]) {
    g.add(box(0.05, 0.07, 0.02, COLORS.ink, sx * 0.09, hy + 0.04, hz - s / 2 - 0.01)); // 눈
    const ear = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.13, 4),
      new THREE.MeshStandardMaterial({ color: COLORS.fur }),
    );
    ear.rotation.y = Math.PI / 4;
    ear.position.set(sx * 0.11, hy + s / 2 + 0.06, hz);
    g.add(ear);
  }
  g.add(box(0.05, 0.035, 0.02, COLORS.pink, 0, hy - 0.04, hz - s / 2 - 0.02)); // 코
  const tail = box(0.07, 0.3, 0.07, COLORS.fur, 0, 0.2, BODY.d / 2 + 0.03);
  tail.rotation.x = -0.5;
  g.add(tail);
  return g;
}

/** 다리 (다리 로컬 좌표): 양옆에 굵은 관 + 둥근 끝 + 허브 */
function makeLegs(line) {
  const g = new THREE.Group();
  const ink = new THREE.MeshStandardMaterial({ color: COLORS.ink, roughness: 0.6 });
  const hubMat = new THREE.MeshStandardMaterial({ color: COLORS.hub });
  const markMat = new THREE.MeshStandardMaterial({ color: COLORS.cream });
  for (const sx of [-1, 1]) {
    const x = sx * LEG_SIDE_X;
    if (line.length >= 2) {
      const path = new THREE.CurvePath();
      for (let i = 1; i < line.length; i++) {
        path.add(
          new THREE.LineCurve3(
            new THREE.Vector3(x, line[i - 1][1], line[i - 1][0]),
            new THREE.Vector3(x, line[i][1], line[i][0]),
          ),
        );
      }
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(path, Math.max(8, (line.length - 1) * 4), LEG_RADIUS, 8, false),
        ink,
      );
      tube.castShadow = true;
      g.add(tube);
      for (const p of [line[0], line[line.length - 1]]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(LEG_RADIUS, 12, 8), ink);
        cap.position.set(x, p[1], p[0]);
        g.add(cap);
      }
    }
    // 허브: 축에 꽂힌 원판 + 회전이 보이는 표시
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 20), hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = sx * (BODY.w / 2 + 0.03);
    g.add(hub);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.14, 0.03), markMat);
    mark.position.x = sx * (BODY.w / 2 + 0.06);
    g.add(mark);
  }
  return g;
}

/**
 * @param {{ stroke: {x:number, y:number}[], world: CANNON.World, scene: THREE.Scene,
 *           spawn: { position: THREE.Vector3, heading: {x:number,z:number} } }} opts
 *   stroke = 그리기 칸 좌표 [-1, 1] (가운데 = 경첩, 위 = +y). 비어 있으면 다리 없음 (허브만).
 *   spawn.position.y는 무시하고 다리 길이에 맞춰 띄운다.
 * @returns PlayerBody의 플레이어와 같은 모양의 객체 (+ legsBody, reach, legSegments)
 */
export function createClimber({ stroke, world, scene, spawn }) {
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

  // 다리: 선 구간마다 얇은 상자, 양옆
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
  for (let i = 1; i < line.length; i++) {
    const [az, ay] = line[i - 1];
    const [bz, by] = line[i];
    const L = Math.hypot(bz - az, by - ay);
    if (L < 1e-4) continue;
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.atan2(-(by - ay), bz - az)); // 로컬 Z → 구간 방향
    const half = new CANNON.Vec3(LEG_DEPTH / 2, LEG_THICK / 2, (L + LEG_THICK) / 2);
    for (const sx of [-1, 1]) {
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
  const torqueCap = MOTOR_TORQUE_PER_KG * totalMass;

  // 화면
  const holder = new THREE.Group();
  holder.add(makeCat());
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
    steerYaw -= side * STEER_RATE * dt;
    yawQ.setFromAxisAngle(UP, yawOf(heading));
    body.quaternion.copy(yawQ);
    body.angularVelocity.setZero();

    // 모터: W = 앞으로 굴리는 방향. 다리 평면에서 앞(−Z)으로 구르려면 +X 축 기준 음의 회전.
    const roll = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    hinge.setMotorSpeed(roll * MOTOR_SPEED);
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
      for (const root of [holder, legsHolder]) {
        root.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
      }
    },
  };
}
