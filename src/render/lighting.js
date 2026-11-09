// 조명 + 실시간 그림자. 담당: 최수정
// STUB: 반구광 + 방향광 1개. 그림자 맵이 플레이어를 따라감.
import * as THREE from 'three';

/**
 * @param {{ scene: THREE.Scene, renderer: THREE.WebGLRenderer }} ctx
 * @returns {{ update(playerPos: THREE.Vector3): void, dispose(): void }}
 */
export function setupLighting({ scene, renderer }) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.8);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  const offset = new THREE.Vector3(6, 12, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); // 계획서: 2048 이하
  Object.assign(sun.shadow.camera, {
    left: -15,
    right: 15,
    top: 15,
    bottom: -15,
    near: 1,
    far: 50,
  });
  scene.add(hemi, sun, sun.target);

  return {
    update(playerPos) {
      sun.position.copy(playerPos).add(offset);
      sun.target.position.copy(playerPos);
    },
    dispose() {
      scene.remove(hemi, sun, sun.target);
      sun.shadow.map?.dispose();
    },
  };
}
