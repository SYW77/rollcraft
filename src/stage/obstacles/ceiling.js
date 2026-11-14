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
  style: null, // 'ice'면 얼음 동굴: 얼음색 판 + 앞뒤 고드름
};

/**
 * @param {{ scene, world, events, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 * @returns {{ dispose(): void }}
 */
export function create({ scene, world, materials, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const boxes = createBoxSet({ scene, world });
  const ice = p.style === 'ice';
  const iceMat = ice
    ? new THREE.MeshStandardMaterial({
        color: 0xa9d8f5,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9,
        flatShading: true,
      })
    : null;
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
    material: iceMat ?? materials.obstacle,
    castShadow: true,
  });

  // 얼음 동굴: 앞뒤 가장자리에 고드름 (보이기만)
  const icicles = new THREE.Group();
  const icicleGeo = ice ? new THREE.ConeGeometry(0.09, 1, 5) : null;
  if (ice) {
    const right = { x: -heading.z, z: heading.x };
    const n = Math.round(p.width / 0.45);
    for (const edge of [0.15, p.length - 0.15]) {
      for (let i = 0; i < n; i++) {
        const lat = -p.width / 2 + (i + 0.5) * (p.width / n);
        const len = 0.18 + ((i * 7 + (edge ? 3 : 0)) % 5) * 0.06; // 길이를 들쭉날쭉하게 (고정)
        const m = new THREE.Mesh(icicleGeo, iceMat);
        m.scale.y = len;
        m.rotation.x = Math.PI; // 끝이 아래로
        m.position.set(
          origin.x + heading.x * edge + right.x * lat,
          origin.y + p.height - len / 2,
          origin.z + heading.z * edge + right.z * lat,
        );
        icicles.add(m);
      }
    }
    scene.add(icicles);
  }

  // 앞 가장자리 경고 띠 (충돌 없음). 얼음 동굴은 고드름이 대신한다
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0x553300 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(p.width, 0.12, 0.05), stripeMat);
  stripe.position.set(
    origin.x - heading.x * 0.03,
    origin.y + p.height + 0.06,
    origin.z - heading.z * 0.03,
  );
  stripe.rotation.y = Math.atan2(-heading.x, -heading.z);
  if (!ice) scene.add(stripe);

  return {
    dispose() {
      boxes.dispose();
      scene.remove(stripe);
      stripe.geometry.dispose();
      stripeMat.dispose();
      scene.remove(icicles);
      icicleGeo?.dispose();
      iceMat?.dispose();
    },
  };
}
