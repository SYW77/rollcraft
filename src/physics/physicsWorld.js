// 물리 월드. 담당: 원유승
import * as CANNON from 'cannon-es';

const FIXED_DT = 1 / 60;
const MAX_SUBSTEPS = 3; // 터널링 방지: 고정 타임스텝 + substep

/** @returns {{ world: CANNON.World, step(dt: number): void }} */
export function createPhysicsWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = false;
  world.defaultContactMaterial.friction = 0.6;
  world.defaultContactMaterial.restitution = 0.05;

  return {
    world,
    step(dt) {
      world.step(FIXED_DT, Math.min(dt, 0.1), MAX_SUBSTEPS);
    },
  };
}
