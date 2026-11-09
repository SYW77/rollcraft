// 플레이어 강체 + 메쉬. 담당: 원유승
//
// 프로파일의 원뿔대 구간마다 CANNON.Cylinder(위·아래 반지름이 다른 원뿔대) 하나씩 붙인 compound body.
// - body 원점 = 무게중심. 각 구간 콜라이더는 (구간 중앙 높이 - 무게중심) 만큼 Y로 띄워 붙인다.
// - 질량 = 밀도 × 부피 → 큰 모양은 무겁고 굴리기 어렵다.
// - 관성 = profileInertia로 직접 계산 (cannon 기본값은 바운딩 박스 근사라 원뿔·아령이 틀린다).
// - body 로컬 Y축 = 회전축. 스폰 때 회전축을 진행 방향의 오른쪽(수평)으로 눕힌다.
// - 조작과 외력은 world 'preStep'에서 매 내부 스텝 건다 (cannon은 스텝마다 힘을 지운다).
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  frustumSegments,
  profileStats,
  profileInertia,
  restingSide,
} from '../shared/profileMath.js';
import { createController, contactSlip } from './PlayerController.js';

const DENSITY = 2; // 지름 1 구 ≈ 1.05kg
const COLLIDER_SIDES = 32; // 원뿔대 옆면 분할 수. 적으면 구를 때 덜컹거린다 (16 → 32에서 튐 약 절반).
const LOCAL_AXIS = new CANNON.Vec3(0, 1, 0);
const AXLE_SIDE_RATIO = 0.5; // 가장 긴 옆면이 높이의 이 비율 이상이면 옆으로 눕는 모양(axle 조작)

/**
 * @param {{ profile: import('../shared/contracts.js').Profile, geometry: THREE.BufferGeometry,
 *           world: CANNON.World, scene: THREE.Scene,
 *           spawn: { position: THREE.Vector3, heading: {x:number,z:number} }, material?: THREE.Material }} opts
 */
export function createPlayer({ profile, geometry, world, scene, spawn, material }) {
  const stats = profileStats(profile);
  const mass = DENSITY * stats.volume;
  const inertia = profileInertia(profile, mass);

  const body = new CANNON.Body({ mass, linearDamping: 0.1, angularDamping: 0.3 });
  for (const g of frustumSegments(profile)) {
    const shape = new CANNON.Cylinder(g.r2, g.r1, g.h, COLLIDER_SIDES); // (위, 아래, 높이)
    body.addShape(shape, new CANNON.Vec3(0, g.centerY - stats.comY, 0));
  }
  // addShape가 바운딩 박스로 관성을 다시 계산하므로, 모양을 다 붙인 뒤 덮어쓴다.
  body.inertia.set(inertia.transverse, inertia.axial, inertia.transverse);
  body.invInertia.set(1 / inertia.transverse, 1 / inertia.axial, 1 / inertia.transverse);
  body.updateInertiaWorld(true);
  world.addBody(body);

  // 조작 입력과 외력: update()/applyExternalForce()가 값만 바꾸고, 실제 힘은 매 스텝 건다.
  let input = { forward: false, back: false, left: false, right: false };
  let heading = spawn.heading;
  const externalForce = new CANNON.Vec3();
  const axle = restingSide(profile).length >= AXLE_SIDE_RATIO * stats.height;
  const controller = createController({ axle });
  const onPreStep = () => {
    controller.apply(
      body,
      input,
      heading,
      contactSlip(world, body),
      externalForce.lengthSquared() > 0,
    );
    body.force.vadd(externalForce, body.force);
  };
  world.addEventListener('preStep', onPreStep);

  // 메쉬: lathe 원점(프로파일 바닥)을 무게중심으로 옮겨 body와 일치시킨다.
  geometry.translate(0, -stats.comY, 0);
  const mesh = new THREE.Mesh(
    geometry,
    material ?? new THREE.MeshStandardMaterial({ color: 0xe04848 }),
  );
  mesh.castShadow = true;
  const holder = new THREE.Group(); // body 자세를 받는 노드
  holder.add(mesh);
  scene.add(holder);

  function sync() {
    holder.position.copy(body.position);
    holder.quaternion.copy(body.quaternion);
  }

  function reset(s) {
    body.position.set(s.position.x, s.position.y, s.position.z);
    body.velocity.setZero();
    body.angularVelocity.setZero();
    // 회전축(로컬 Y) → 진행 방향의 오른쪽 수평 벡터
    const right = new CANNON.Vec3(-s.heading.z, 0, s.heading.x);
    body.quaternion.setFromVectors(LOCAL_AXIS, right);
    body.force.setZero();
    body.torque.setZero();
    externalForce.setZero();
    controller.reset();
    sync();
  }
  reset(spawn);

  return {
    mesh: holder,
    body,
    mass,
    axle, // true = 옆면으로 눕는 모양 (자기 축 조작), false = 둥근 모양 (화면 기준 조작)
    stats, // 월드 단위 부피·무게중심·투영면적 (windGap 등에서 사용)
    /** 매 프레임 physics.step() 뒤에 호출. 이번 프레임 입력을 저장하고 외력은 비운다. */
    update(dt, nextInput, nextHeading) {
      input = nextInput;
      heading = nextHeading;
      externalForce.setZero();
      sync();
    },
    getPosition() {
      return new THREE.Vector3(body.position.x, body.position.y, body.position.z);
    },
    /** 회전축의 월드 방향 (단위벡터) */
    getAxis() {
      const a = body.quaternion.vmult(LOCAL_AXIS);
      return new THREE.Vector3(a.x, a.y, a.z);
    },
    /** 다음 physics.step() 동안 계속 걸리는 힘 (무게중심). 매 프레임 update() 뒤에 다시 호출해야 유지된다. */
    applyExternalForce(v3) {
      externalForce.x += v3.x;
      externalForce.y += v3.y;
      externalForce.z += v3.z;
    },
    reset,
    dispose() {
      world.removeEventListener('preStep', onPreStep);
      world.removeBody(body);
      scene.remove(holder);
      geometry.dispose();
    },
  };
}
