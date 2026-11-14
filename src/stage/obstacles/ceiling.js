// 장애물: 낮은 천장 (클라이머용). 담당: 손연우
//
// 트랙 위 height 높이에 판을 덮는다. 다리가 큰 클라이머는 다리 끝이 천장에 걸려 못 지나가고,
// 작은 다리로 다시 그려야 통과한다 (Draw Climber의 "여기선 이 모양" 구간).
// 판 앞뒤 가장자리에 줄무늬 띠를 둘러 멀리서도 높이가 보이게 한다.
import * as THREE from 'three';
import { createBoxSet } from '../staticBox.js';

const DEFAULTS = {
  length: 6, // 진행 방향 길이 (m)
  height: 1.3, // 트랙 윗면에서 천장 아랫면까지 (m)
  thickness: 1.5, // 얇으면 큰 다리가 모터 힘으로 밀고 뚫고 지나간다 (0.4에서 확인)
  width: 6, // 트랙 폭과 맞춘다
};

/**
 * @param {{ scene, world, events, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 * @returns {{ dispose(): void }}
 */
export function create({ scene, world, materials, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const boxes = createBoxSet({ scene, world });
  const cx = origin.x + heading.x * (p.length / 2);
  const cz = origin.z + heading.z * (p.length / 2);
  boxes.add({
    x: cx,
    z: cz,
    top: origin.y + p.height + p.thickness,
    dir: heading,
    length: p.length,
    width: p.width,
    height: p.thickness,
    material: materials.obstacle,
    castShadow: true,
  });

  // 앞 가장자리 경고 띠 (충돌 없음)
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0x553300 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(p.width, 0.12, 0.05), stripeMat);
  stripe.position.set(
    origin.x - heading.x * 0.03,
    origin.y + p.height + 0.06,
    origin.z - heading.z * 0.03,
  );
  stripe.rotation.y = Math.atan2(-heading.x, -heading.z);
  scene.add(stripe);

  return {
    dispose() {
      boxes.dispose();
      scene.remove(stripe);
      stripe.geometry.dispose();
      stripeMat.dispose();
    },
  };
}
