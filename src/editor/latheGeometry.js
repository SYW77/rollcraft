// 프로파일 → 회전체 메쉬. 담당: 최수정
// STUB: THREE.LatheGeometry로 대체 (계획서의 폴백). 직접 BufferGeometry 생성(법선, 캡)으로 교체 예정.
import * as THREE from 'three';
import { PLAYER_SIZE } from '../shared/contracts.js';

/**
 * Y축을 회전축으로 하는 회전체. 원점 = 프로파일 y의 바닥, 높이 = PLAYER_SIZE 기준.
 * @param {import('../shared/contracts.js').Profile} profile
 * @param {number} segments
 * @returns {THREE.BufferGeometry}
 */
export function buildLatheGeometry(profile, segments) {
  const scale = PLAYER_SIZE / 2; // r 최대 1.0 → 지름 PLAYER_SIZE
  const pts = [
    new THREE.Vector2(0, profile[0].y * PLAYER_SIZE), // 아래 캡 (r = 0)
    ...profile.map((p) => new THREE.Vector2(p.r * scale, p.y * PLAYER_SIZE)),
    new THREE.Vector2(0, profile[profile.length - 1].y * PLAYER_SIZE), // 위 캡
  ];
  return new THREE.LatheGeometry(pts, segments);
}
