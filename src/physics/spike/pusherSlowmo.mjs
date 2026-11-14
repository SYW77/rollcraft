// 피스톤이 느린 시간(다리 그리는 중, 0.2배)에서도 같은 빠르기로 움직이는지 본다. 담당: 원유승
// 실행: node src/physics/spike/pusherSlowmo.mjs
// 결과: 배속별 블록의 가장 빠른 속도(m/s). 배속과 상관없이 폭 × reach × π / period (기본 4.26)여야 한다.
// (고치기 전: 프레임 dt로 속도를 정해서 1배속 7.5, 0.2배속 9.6까지 튐)
import * as THREE from 'three';
import { createPhysicsWorld } from '../physicsWorld.js';
import * as pusher from '../../stage/obstacles/pusher.js';

for (const scale of [1, 0.2]) {
  const ph = createPhysicsWorld();
  const p = pusher.create({
    scene: new THREE.Scene(),
    world: ph.world,
    materials: { obstacle: new THREE.MeshBasicMaterial() },
    origin: { x: 0, y: 0, z: 0 },
    heading: { x: 0, z: -1 },
    params: { width: 7, count: 3, spacing: 4.5, period: 3.2 },
  });
  let maxV = 0;
  for (let i = 0; i < 60 * 20; i++) {
    const dt = (1 / 60) * scale * (0.8 + Math.random() * 0.4); // 프레임 시간이 조금씩 흔들린다
    ph.step(dt);
    p.update(dt);
    for (const b of ph.world.bodies) maxV = Math.max(maxV, b.velocity.length());
  }
  console.log(`배속 ${scale}: 가장 빠른 블록 속도 ${maxV.toFixed(2)} m/s`);
  p.dispose();
}
