// 카메라 추적 + 진행 방향(heading) 제공. 담당: 손연우
// STUB: heading 고정 (-Z 방향), 뒤에서 부드럽게 따라감.
import * as THREE from 'three';

/** @param {THREE.PerspectiveCamera} camera */
export function createCameraFollow(camera) {
  const heading = { x: 0, z: -1 }; // XZ 단위벡터. 물리는 이 값을 받아서 쓴다.
  const target = new THREE.Vector3();
  const BACK = 7;
  const UP = 4;

  return {
    update(dt, playerPos) {
      target.set(playerPos.x - heading.x * BACK, playerPos.y + UP, playerPos.z - heading.z * BACK);
      camera.position.lerp(target, 1 - Math.exp(-5 * dt));
      camera.lookAt(playerPos);
    },
    snap(playerPos) {
      camera.position.set(
        playerPos.x - heading.x * BACK,
        playerPos.y + UP,
        playerPos.z - heading.z * BACK,
      );
      camera.lookAt(playerPos);
    },
    getHeading() {
      return { ...heading };
    },
  };
}
