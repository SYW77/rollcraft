// 카메라 추적 + 진행 방향(heading) 제공. 담당: 손연우
//
// heading = 플레이어에게 가장 가까운 트랙 중심선 지점의 진행 방향 (XZ 단위벡터).
// - 물리(PlayerController)는 이 값을 "화면 앞"으로 받아 쓴다. 오른쪽 = (-h.z, h.x).
// - 곡선 구간에 들어가면 heading이 트랙을 따라 부드럽게 돈다 (각도 지수 평활).
// - path가 없으면 처음 heading(-Z)을 그대로 쓴다 (dev.html 등).
// 카메라는 heading 뒤쪽 위에서 따라가며 약간 앞쪽을 본다.
// setLook(yaw, pitch)로 시점을 플레이어 둘레로 돌릴 수 있다 (마우스로 둘러보기). heading(조작 방향)은 그대로.
import * as THREE from 'three';
import { nearestOnPath } from './track.js';

const BACK = 7; // 플레이어 뒤로 떨어진 거리
const UP = 4; // 높이
const LOOK_AHEAD = 2; // 플레이어보다 이만큼 앞을 본다
const POS_RATE = 5; // 위치 추적 속도 (1/s)
const HEADING_RATE = 3; // heading 회전 속도 (1/s). 크면 곡선에서 카메라가 빨리 돈다.

/**
 * @param {THREE.PerspectiveCamera} camera
 * @param {{ path?: import('./track.js').TrackPath, heading?: {x:number,z:number} }} [opts]
 */
export function createCameraFollow(camera, { path, heading: initial } = {}) {
  let yaw = headingToYaw(initial ?? { x: 0, z: -1 });
  let lookYaw = 0; // 둘러보기: 뒤쪽 기준으로 돈 각도 (rad, 양수 = 오른쪽으로)
  let lookPitch = 0; // 둘러보기: 기본 높이각에 더할 각도 (rad, 양수 = 더 위에서)
  const DIST = Math.hypot(BACK, UP);
  const BASE_PITCH = Math.atan2(UP, BACK);
  const target = new THREE.Vector3();
  const look = new THREE.Vector3();

  const heading = () => ({ x: Math.sin(yaw), z: -Math.cos(yaw) });

  function desiredYaw(playerPos) {
    if (!path) return yaw;
    return headingToYaw(nearestOnPath(path, playerPos).heading);
  }

  function place(playerPos, rate) {
    const vy = yaw + lookYaw;
    const h = { x: Math.sin(vy), z: -Math.cos(vy) };
    const pitch = Math.min(1.35, Math.max(0.12, BASE_PITCH + lookPitch));
    const back = DIST * Math.cos(pitch);
    target.set(
      playerPos.x - h.x * back,
      playerPos.y + DIST * Math.sin(pitch),
      playerPos.z - h.z * back,
    );
    if (rate === Infinity) camera.position.copy(target);
    else camera.position.lerp(target, rate);
    // 둘러볼 때는 플레이어 자체를 본다 (앞쪽 보기는 뒤에서 볼 때만)
    const ahead = LOOK_AHEAD * Math.max(0, Math.cos(lookYaw));
    look.set(playerPos.x + h.x * ahead, playerPos.y, playerPos.z + h.z * ahead);
    camera.lookAt(look);
  }

  return {
    update(dt, playerPos) {
      // 가장 짧은 쪽으로 돌도록 각도 차이를 [-π, π]로 감는다
      const diff = wrapAngle(desiredYaw(playerPos) - yaw);
      yaw = wrapAngle(yaw + diff * (1 - Math.exp(-HEADING_RATE * dt)));
      place(playerPos, 1 - Math.exp(-POS_RATE * dt));
    },
    /** 재시작 등에서 즉시 제자리로 */
    snap(playerPos) {
      yaw = desiredYaw(playerPos);
      place(playerPos, Infinity);
    },
    getHeading() {
      return heading();
    },
    /** 둘러보기 각도 (0, 0 = 기본 뒤쪽 시점) */
    setLook(yawOffset, pitchOffset) {
      lookYaw = yawOffset;
      lookPitch = pitchOffset;
    },
  };
}

/** heading (x, z) → yaw. yaw 0 = -Z, 양수 = 오른쪽(+X)으로 돈 방향 */
function headingToYaw(h) {
  return Math.atan2(h.x, -h.z);
}

function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
