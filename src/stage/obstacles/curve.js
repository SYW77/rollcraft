// 장애물: 급커브 표지. 담당: 손연우
//
// 급커브 자체는 트랙 조각 { type: 'arc', radius: 5, angle: ±90, walls: false }로 만든다 (바깥 벽 없음 → 못 돌면 낙하).
// 이 파일은 그 곡선의 바깥 가장자리에 셰브론(꺾쇠) 표지판을 세워서 "여기서 꺾인다"를 미리 보여 준다.
// 표지판은 보이기만 하고 충돌체는 없다 (있으면 바깥 벽 역할을 해서 급커브의 의미가 없어짐).
//
// 헤드리스 측정 (반지름 4 · 6 · 9m 모두 같은 경향, 2026-11-13 조작 값 기준)
// - 아령: A/D 조향만으로 통과 (양 끝이 넓어 옆 힘을 받으면 잘 돈다)
// - 구: 그대로 들어가면 바깥으로 튕겨 나감 → 커브 앞에서 S로 감속하면 통과
// - 원통: 회전축이 고정되어 조향 · 감속해도 직진하다 낙하
//
// params는 같은 위치의 트랙 arc 조각과 맞춘다: { radius, angle } (angle 양수 = 오른쪽)
import * as THREE from 'three';

const DEFAULTS = {
  radius: 5,
  angle: -90,
  width: 6, // 트랙 폭
  signs: 5, // 표지판 개수
  offset: 0.6, // 트랙 바깥 가장자리에서 떨어진 거리 (m)
};

/**
 * @param {{ scene, world, events, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 *   origin = 곡선이 시작하는 트랙 중심선 위 지점, heading = 그 지점의 진행 방향
 * @returns {{ update?(dt: number, player: any): void, dispose(): void }}
 */
export function create({ scene, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const theta = (p.angle * Math.PI) / 180;
  const sign = Math.sign(theta) || 1; // +1 오른쪽, -1 왼쪽
  const right = { x: -heading.z, z: heading.x };
  // 곡선 중심: 도는 쪽으로 radius만큼
  const cx = origin.x + right.x * p.radius * sign;
  const cz = origin.z + right.z * p.radius * sign;
  const outerR = p.radius + p.width / 2 + p.offset;

  const group = new THREE.Group();
  const geometries = [];
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.6 });
  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0xffb020,
    emissive: 0xff8a00,
    emissiveIntensity: 0.5,
    side: THREE.DoubleSide,
  });
  const boardGeo = new THREE.BoxGeometry(1.1, 0.7, 0.06);
  const postGeo = new THREE.BoxGeometry(0.08, 0.9, 0.08);
  // 셰브론(>) 모양: 두 개의 기울어진 막대
  const barGeo = new THREE.BoxGeometry(0.42, 0.11, 0.02);
  geometries.push(boardGeo, postGeo, barGeo);

  for (let i = 0; i < p.signs; i++) {
    const f = (i + 0.5) / p.signs; // 곡선 위 비율
    const phi = f * Math.abs(theta);
    // track.js의 arc와 같은 식: p(φ) = origin + R (h sinφ + sign · right (1 − cosφ))
    const sp = Math.sin(phi);
    const cp = 1 - Math.cos(phi);
    const px = origin.x + p.radius * (heading.x * sp + sign * right.x * cp);
    const pz = origin.z + p.radius * (heading.z * sp + sign * right.z * cp);
    // 중심 → 중심선 점 방향(바깥쪽)으로 outerR만큼
    const ux = (px - cx) / p.radius;
    const uz = (pz - cz) / p.radius;
    const pos = { x: cx + ux * outerR, z: cz + uz * outerR };
    // 그 지점의 진행 방향 = h cosφ + sign · right sinφ
    const tx = heading.x * Math.cos(phi) + sign * right.x * Math.sin(phi);
    const tz = heading.z * Math.cos(phi) + sign * right.z * Math.sin(phi);

    const sign3 = new THREE.Group();
    sign3.position.set(pos.x, origin.y, pos.z);
    sign3.rotation.y = Math.atan2(tx, tz); // 로컬 +Z = 진행 방향 → 앞면(-Z 쪽)이 다가오는 플레이어를 본다
    const post = new THREE.Mesh(postGeo, boardMat);
    post.position.y = 0.45;
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 1.15;
    board.castShadow = true;
    sign3.add(post, board);
    // 화살표: 도는 쪽(안쪽)을 가리키는 꺾쇠. 플레이어 시점에서 왼쪽으로 돌면 '<'
    const dir = sign; // +1이면 '>' (오른쪽), -1이면 '<'
    for (const k of [-1, 1]) {
      const bar = new THREE.Mesh(barGeo, arrowMat);
      bar.position.set(0, 1.15 + k * 0.11, -0.05);
      bar.rotation.z = k * dir * 0.7;
      sign3.add(bar);
    }
    group.add(sign3);
  }
  scene.add(group);

  return {
    dispose() {
      scene.remove(group);
      geometries.forEach((g) => g.dispose());
      boardMat.dispose();
      arrowMat.dispose();
    },
  };
}
