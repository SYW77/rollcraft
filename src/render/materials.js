// 공용 재질. 담당: 최수정
import * as THREE from 'three';

let cache = null;

/** @returns {{ track: THREE.Material, wall: THREE.Material, obstacle: THREE.Material, goal: THREE.Material, player: THREE.Material }} */
export function getMaterials() {
  if (!cache) {
    cache = {
      track: new THREE.MeshStandardMaterial({ color: 0x8a9bb0, roughness: 0.9 }),
      wall: new THREE.MeshStandardMaterial({ color: 0x5c6b7a, roughness: 0.8 }),
      obstacle: new THREE.MeshStandardMaterial({ color: 0xd9822b, roughness: 0.6 }),
      goal: new THREE.MeshStandardMaterial({
        color: 0x33cc66,
        emissive: 0x115522,
        transparent: true,
        opacity: 0.6,
      }),
      player: new THREE.MeshStandardMaterial({ color: 0xe04848, roughness: 0.4, metalness: 0.1 }),
    };
  }
  return cache;
}
