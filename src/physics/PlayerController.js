// 키 입력 → 토크/힘. 담당: 원유승
// 물리 내부 스텝마다 호출된다 (PlayerBody의 preStep). 튜닝 전 값.
import * as CANNON from 'cannon-es';

// 구르기 토크 = 질량 × 이 값. 질량에 비례시키면 가속도가 무게와 무관하고 모양(반지름·질량 분포)에만 달려서
// 가벼운 모양이 헛도는 일이 없다. 원통 기준 가속도 ≈ 3.5m/s² (마찰 한계 5.9의 약 60%).
const ROLL_TORQUE_PER_KG = 1.6;
const SIDE_FORCE = 4; // A/D 옆 힘 (구처럼 axle이 없는 모양만). 눕는 모양은 아래 요 조향으로 꺾는다.
const MAX_ROLL_SPEED = 7; // 수평 속력이 이 값을 넘으면 앞으로 구르는 토크를 끊는다
const HARD_MAX_SPEED = 15; // 터널링 방지용 안전 제한 (경사 등으로 넘는 경우만)
// 트랙션 컨트롤: 바닥 접촉점이 이 속도보다 빠르게 미끄러지면(헛돌면) 토크를 끊는다.
// 없으면 가벼운 모양이 제자리에서 헛돌며 튀고, 원뿔은 밑면으로 섰다가 날아간다.
const SLIP_TOLERANCE = 0.4; // m/s
// 굴리는 방향 부호는 거의 멈췄을 때만 화면(heading) 기준으로 다시 맞춘다.
// 원뿔처럼 구르며 방향이 계속 도는 모양이 도중에 반대로 토크를 받아 뒤집히는 것을 막는다.
const REALIGN_SPEED = 0.5; // m/s
// 안정성 제어: 이동 방향이 휘는 선회 가속도(속력 × 방향 변화율)가 마찰 한계의 이 비율을 넘으면 토크를 끊는다.
// 원뿔은 꼭짓점 둘레로 원을 그리며 구르므로 √(μ g R) ≈ 2m/s 이상 밀면 바깥으로 쏠려 뒤집힌다.
const LATERAL_GRIP_RATIO = 0.8;
const LATERAL_SMOOTH_TIME = 0.1; // s. 다각형 콜라이더는 면을 넘을 때마다 방향이 계단식으로 바뀌어서 평균을 낸다.
// cannon은 실제로 겹칠 때만 접촉을 만들어서, 바닥에 붙어 있어도 스텝마다 접촉이 생겼다 없어졌다 한다.
// 이 시간 넘게 접촉이 없을 때만 공중으로 본다.
const AIR_GRACE_TIME = 0.1; // s
// 직진 안정화: A/D를 안 누를 때 수직축 회전(요)만 감쇠한다. 빠르게 구르는 아령·원통이 작은 흔들림이 쌓여
// 갑자기 옆으로 꺾이는 것을 막는다. 순수하게 구르는 원뿔은 각속도가 수평이라 자연스러운 호에는 영향이 없다.
const YAW_DAMPING = 4; // 1/s
// 옆 미끄러짐 보정 (구처럼 axle이 없는 모양만): A/D를 안 누를 때 진행 방향에 수직인 속도를 굴려서 없앤다.
// 구는 오른쪽 축 토크만 받으면 모서리에서 튄 옆 속도가 그대로 남아 직진해도 트랙 밖으로 흘러간다.
// 원하는 속도 변화 Δv를 만드는 토크 축 = UP × Δv (앞으로 굴리는 토크 -right = UP × forward와 같은 규칙).
const LATERAL_HOLD_PER_KG = 3; // 토크/kg per (m/s). 최대값은 ROLL_TORQUE_PER_KG로 자른다.
// 요 조향 (axle 모양만): A/D로 회전축을 수직축 둘레로 돌린다 (바퀴 핸들처럼). 옆으로 미는 힘(SIDE_FORCE)은
// 옆 마찰에 거의 다 먹혀서 눕는 모양은 방향이 안 바뀐다. 목표 요 속도까지 Iy × 응답으로 토크를 건다.
// 목표 요 속도 = STEER_RATE × steer. steer는 바닥에 닿는 폭으로 정한다 (PlayerBody):
// 옆면 전체가 닿는 원통은 바닥을 긁어야 해서 잘 안 꺾이고, 양 끝만 닿는 아령은 두 바퀴처럼 잘 꺾인다.
const STEER_RATE = 2; // rad/s
const STEER_RESPONSE = 8; // 1/s
const FRICTION = 0.6; // physicsWorld의 기본 마찰과 맞춘다
const G = 9.82;

const right = new CANNON.Vec3();
const rollAxis = new CANNON.Vec3();
const spinAxis = new CANNON.Vec3();
const forward = new CANNON.Vec3();
const tmp = new CANNON.Vec3();
const UP = new CANNON.Vec3(0, 1, 0);
const LOCAL_AXIS = new CANNON.Vec3(0, 1, 0);
const cp = new CANNON.Vec3();

/**
 * 바닥 접촉점 중 가장 많이 미끄러지는 점의 미끄러짐 속도 (m/s). 접촉이 없으면 Infinity (공중).
 * 최대값을 쓰는 이유: 원뿔을 억지로 곧게 밀면 밑면 쪽은 구르고 꼭짓점 쪽만 미끄러진다.
 * 접촉점 속도 = v + ω × r  (r = 무게중심 → 접촉점). 상대 물체는 정지해 있다고 본다.
 * @param {CANNON.World} world
 * @param {CANNON.Body} body
 */
export function contactSlip(world, body) {
  let worst = -1;
  for (const eq of world.contacts) {
    const r = eq.bi === body ? eq.ri : eq.bj === body ? eq.rj : null;
    if (!r) continue;
    body.angularVelocity.cross(r, cp);
    cp.vadd(body.velocity, cp);
    worst = Math.max(worst, cp.length());
  }
  return worst < 0 ? Infinity : worst;
}

/**
 * 플레이어 한 명분의 조작기. 굴리는 방향 부호와 선회 가속도를 상태로 들고 있다.
 * @param {{ axle: boolean, steer?: number }} opts
 *   axle = true: 옆면으로 눕는 모양(원통·원뿔·아령). 물체 자신의 회전축으로 토크를 건다.
 *   axle = false: 구·달걀처럼 아무 방향으로나 구르는 모양. 회전축이 의미가 없어 화면 기준 오른쪽 축으로 건다.
 *   (profileMath.restingSide로 판정)
 *   steer = 요 조향 세기 0~1 (axle 모양만). 1이면 STEER_RATE까지 돈다.
 * @returns {{ apply(body: CANNON.Body, input: import('../shared/contracts.js').Input,
 *                   heading: import('../shared/contracts.js').Heading, slip: number): void,
 *             reset(): void }}
 */
export function createController({ axle, steer = 1 }) {
  let rollSign = 0; // 0 = 아직 안 정함
  let prevDirX = 0;
  let prevDirZ = 0; // 직전 스텝의 수평 이동 방향 (단위벡터, 0이면 없음)
  let turnRate = 0; // 평활화한 이동 방향 회전 속도 (rad/s, 부호 있음)
  let lastSlip = 0;
  let airTime = 0;

  return {
    reset() {
      rollSign = 0;
      prevDirX = prevDirZ = 0;
      turnRate = 0;
      lastSlip = 0;
      airTime = 0;
    },
    /** slip = contactSlip() 결과 */
    apply(body, input, heading, slip, pushed = false) {
      // heading (x, z)에 대해 오른쪽 벡터 = (-z, x).
      right.set(-heading.z, 0, heading.x);
      const roll = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
      const side = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const v = body.velocity;

      // 토크 축 = 물체 자신의 회전축 (축에 모터가 달린 바퀴처럼). 원통·구·아령은 축이 수평이라 right와 같고,
      // 원뿔은 기울어진 축의 수직 성분이 꼭짓점 둘레로 도는 데 필요한 선회를 만들어 준다.
      // rollAxis = 그 축의 수평 성분 (진행 방향 계산용). 세워져서 수평 성분이 거의 없으면 right로 넘어뜨린다.
      body.quaternion.vmult(LOCAL_AXIS, spinAxis);
      rollAxis.set(spinAxis.x, 0, spinAxis.z);
      if (!axle || rollAxis.length() < 0.2) {
        rollAxis.copy(right);
        spinAxis.copy(right);
      }
      rollAxis.normalize();
      const facing = rollAxis.dot(right);
      if (rollSign === 0 || (Math.hypot(v.x, v.z) < REALIGN_SPEED && Math.abs(facing) > 0.3)) {
        rollSign = facing < 0 ? -1 : 1;
      }
      rollAxis.scale(rollSign, rollAxis);
      spinAxis.scale(rollSign, spinAxis);
      UP.cross(rollAxis, forward); // 이 축으로 앞으로 구를 때의 진행 방향

      const vAlong = v.dot(forward);

      // 선회 가속도 = 속력 × 이동 방향의 회전 속도
      // 부호 있는 회전 속도를 평균 낸 뒤 절댓값을 쓴다 (좌우로 흔들리는 잡음은 서로 상쇄).
      const hs = Math.hypot(v.x, v.z);
      const dt = body.world?.dt > 0 ? body.world.dt : 1 / 240;
      let instant = 0;
      if (hs > 0.3) {
        const dx = v.x / hs;
        const dz = v.z / hs;
        if (prevDirX || prevDirZ) {
          instant = Math.atan2(prevDirX * dz - prevDirZ * dx, prevDirX * dx + prevDirZ * dz) / dt;
        }
        prevDirX = dx;
        prevDirZ = dz;
      } else {
        prevDirX = prevDirZ = 0;
      }
      turnRate += (instant - turnRate) * Math.min(1, dt / LATERAL_SMOOTH_TIME);
      const overGrip = hs * Math.abs(turnRate) > LATERAL_GRIP_RATIO * FRICTION * G;

      // 접촉이 잠깐 끊긴 스텝은 직전 미끄러짐 값을 쓴다
      if (slip === Infinity) {
        airTime += dt;
        slip = airTime < AIR_GRACE_TIME ? lastSlip : Infinity;
      } else {
        airTime = 0;
        lastSlip = slip;
      }
      // 앞으로 구르는 토크 = 굴림 축 기준 음의 회전
      if (
        roll &&
        // 앞으로: 수평 속력 전체로 자른다. 꺾는 중에는 속도가 굴림 방향에서 벗어나 vAlong만 보면 계속 빨라진다.
        (roll > 0 ? hs : -vAlong) < MAX_ROLL_SPEED &&
        slip < SLIP_TOLERANCE &&
        !(roll > 0 && overGrip)
      ) {
        spinAxis.scale(-ROLL_TORQUE_PER_KG * body.mass * roll, tmp);
        body.torque.vadd(tmp, body.torque);
      }
      const iy = 1 / Math.max(body.invInertiaWorld.elements[4], 1e-9); // 월드 수직축 관성 (근사)
      if (!side && slip !== Infinity) {
        body.torque.y -= YAW_DAMPING * iy * body.angularVelocity.y;
      }
      if (axle && side && slip !== Infinity) {
        // 오른쪽으로 꺾기 = 위에서 볼 때 시계 방향 = 음의 요
        const target = -side * STEER_RATE * steer;
        body.torque.y += STEER_RESPONSE * iy * (target - body.angularVelocity.y);
      }
      if (!axle && !side && !pushed && slip !== Infinity) {
        const vLat = v.dot(right);
        const mag = Math.min(LATERAL_HOLD_PER_KG * Math.abs(vLat), ROLL_TORQUE_PER_KG) * body.mass;
        // Δv = -vLat·right → 축 = UP × (-right) = forward_h 방향 (heading 기준 앞)
        tmp.set(heading.x, 0, heading.z);
        tmp.scale(-Math.sign(vLat) * mag, tmp);
        body.torque.vadd(tmp, body.torque);
      }
      if (!axle && side) {
        right.scale(SIDE_FORCE * side, tmp);
        body.force.vadd(tmp, body.force);
      }

      const speed = v.length();
      if (speed > HARD_MAX_SPEED) v.scale(HARD_MAX_SPEED / speed, v);
    },
  };
}
