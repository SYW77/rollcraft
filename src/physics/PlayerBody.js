// 플레이어 강체 + 메쉬. 담당: 원유승
// STUB: 프로파일과 무관하게 구 콜라이더 1개. 실제 구현은 profile → frustum compound body,
//       무게중심/관성 직접 계산, mesh 오프셋 보정으로 교체.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PLAYER_SIZE } from '../shared/contracts.js';
import { applyControls } from './PlayerController.js';

/**
 * @param {{ profile: any, geometry: THREE.BufferGeometry, world: CANNON.World, scene: THREE.Scene,
 *           spawn: { position: THREE.Vector3, heading: {x:number,z:number} }, material?: THREE.Material }} opts
 */
export function createPlayer({ geometry, world, scene, spawn, material }) {
  const radius = PLAYER_SIZE / 2;

  const body = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(radius),
    linearDamping: 0.1,
    angularDamping: 0.3,
  });
  world.addBody(body);

  // 메쉬: 회전체 중심을 원점으로 맞춘 뒤, 축을 진행 방향에 수직·수평으로 눕힌다.
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  const mesh = new THREE.Mesh(
    geometry,
    material ?? new THREE.MeshStandardMaterial({ color: 0xe04848 }),
  );
  mesh.castShadow = true;
  const holder = new THREE.Group(); // body 자세를 받는 노드
  mesh.rotation.z = Math.PI / 2; // Y축(회전축) → X축으로 눕힘
  holder.add(mesh);
  scene.add(holder);

  function reset(s) {
    body.position.set(s.position.x, s.position.y, s.position.z);
    body.velocity.setZero();
    body.angularVelocity.setZero();
    body.quaternion.set(0, 0, 0, 1);
    body.force.setZero();
    body.torque.setZero();
  }
  reset(spawn);

  return {
    mesh: holder,
    body,
    update(dt, input, heading) {
      applyControls(body, input, heading);
      holder.position.copy(body.position);
      holder.quaternion.copy(body.quaternion);
    },
    getPosition() {
      return new THREE.Vector3(body.position.x, body.position.y, body.position.z);
    },
    applyExternalForce(v3) {
      body.applyForce(new CANNON.Vec3(v3.x, v3.y, v3.z));
    },
    reset,
    dispose() {
      world.removeBody(body);
      scene.remove(holder);
      geometry.dispose();
    },
  };
}
