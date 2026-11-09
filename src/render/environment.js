// 배경, 안개 등 씬 환경. 담당: 최수정
// STUB: 단색 배경 + 안개.
import * as THREE from 'three';

/** @param {THREE.Scene} scene */
export function setupEnvironment(scene) {
  scene.background = new THREE.Color(0xbfd8ec);
  scene.fog = new THREE.Fog(0xbfd8ec, 30, 90);
  return {
    dispose() {
      scene.background = null;
      scene.fog = null;
    },
  };
}
