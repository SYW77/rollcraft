// 배경, 안개 등 씬 환경. 담당: 최수정
// 트랙과 회전체 시인성을 극대화하는 소프트 스카이 & 원거리 대기 안개
import * as THREE from 'three';

/** @param {THREE.Scene} scene */
export function setupEnvironment(scene) {
  const skyColor = new THREE.Color(0xb0cce5);
  scene.background = skyColor;

  // 플레이어가 멀리 있는 골 지점을 미리 볼 수 있도록 안개 시작 거리를 40 -> 120으로 설정
  scene.fog = new THREE.Fog(skyColor, 40, 120);

  return {
    dispose() {
      scene.background = null;
      scene.fog = null;
    },
  };
}
