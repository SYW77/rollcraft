// 물리 월드. 담당: 원유승
import * as CANNON from 'cannon-es';

// 1/240초 고정 스텝: 다각형 원뿔대 콜라이더가 구를 때 모서리마다 튀는 현상이
// 1/60초보다 크게 줄어든다 (frustum 스파이크, 5~7m/s에서 튐 3~5cm → 1cm 안팎).
const FIXED_DT = 1 / 240;
const MAX_SUBSTEPS = 10; // 프레임이 느려도 (최대 ~24fps) 시뮬레이션 시간이 밀리지 않게

/** @returns {{ world: CANNON.World, step(dt: number): void }} */
export function createPhysicsWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  // Naive: 모든 강체 쌍을 검사한다. 강체가 몇 개(스테이지 3 + 플레이어)뿐이라 비용이 거의 없다.
  // SAPBroadphase는 강체가 많을 때(상자 80여 개) 충돌 쌍을 놓쳐서 레일을 뚫고 떨어졌다 (PR #5).
  world.broadphase = new CANNON.NaiveBroadphase();
  world.allowSleep = false;
  world.defaultContactMaterial.friction = 0.6;
  world.defaultContactMaterial.restitution = 0.05;

  return {
    world,
    // 주의: cannon은 내부 스텝마다 force/torque를 지운다.
    // 계속 가해야 하는 힘은 world의 'preStep' 이벤트에서 매 스텝 다시 건다 (PlayerBody 참고).
    step(dt) {
      world.step(FIXED_DT, Math.min(dt, 0.1), MAX_SUBSTEPS);
    },
  };
}
