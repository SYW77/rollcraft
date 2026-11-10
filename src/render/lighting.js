// 조명 + 실시간 그림자. 담당: 최수정
// 부드러운 그림자(PCFSoftShadowMap) + 회전체 섀도우 바이어스 보정 + 플레이어 추적 그림자 맵
import * as THREE from 'three';

/**
 * @param {{ scene: THREE.Scene, renderer: THREE.WebGLRenderer }} ctx
 * @returns {{ update(playerPos: THREE.Vector3): void, dispose(): void }}
 */
export function setupLighting({ scene, renderer }) {
  // 1. 고품질 부드러운 그림자 활성화
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 2. 반구광 (하늘빛/지면빛 자연스러운 앰비언트)
  const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.75);

  // 3. 주 태양광 (그림자를 드리우는 주 방향광)
  const sun = new THREE.DirectionalLight(0xfffbeb, 1.8);
  const offset = new THREE.Vector3(8, 16, 6);

  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); // 계획서 준수: 2048 이하 유지 (60fps 보장)

  // 회전체 곡면의 그림자 깨짐(Shadow Acne) 및 피터팬 현상 방지
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;

  // 플레이어 주변을 감싸는 정사영 그림자 카메라 바운드
  Object.assign(sun.shadow.camera, {
    left: -14,
    right: 14,
    top: 14,
    bottom: -14,
    near: 1,
    far: 45,
  });

  // 4. 보조 림 라이트 (푸른빛 필 라이트 - 3D 회전체의 곡면 윤곽 및 하이라이트 극대화)
  const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
  rimLight.position.set(-6, 8, -8);

  scene.add(hemi, sun, sun.target, rimLight);

  return {
    update(playerPos) {
      if (!playerPos) return;
      sun.position.copy(playerPos).add(offset);
      sun.target.position.copy(playerPos);
      rimLight.position.set(playerPos.x - 6, playerPos.y + 8, playerPos.z - 8);
    },
    dispose() {
      scene.remove(hemi, sun, sun.target, rimLight);
      sun.shadow.map?.dispose();
    },
  };
}
