// 장애물: 회전 막대. 담당: 손연우
//
// 트랙 가운데 기둥에 긴 막대가 붙어 수평으로 돈다 (질량 없는 kinematic 강체 → 플레이어를 밀어낸다).
// 막대 높이(barY ~ barY + barH)가 낮아서 작은 다리는 막대에 걸려 밀려나고,
// 다리가 크면 몸통이 막대 위로 지나가거나 막대를 타고 넘는다. 타이밍을 보고 지나가도 된다.
// 기둥도 충돌체라 가운데로는 못 지나간다.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const DEFAULTS = {
  width: 7, // 트랙 폭: 막대 길이 = 폭 - 0.4
  speed: 1.1, // rad/s (양수 = 위에서 보아 시계 방향)
  barY: 0.15, // 막대 아랫면 높이 (트랙 윗면 기준)
  barH: 0.45, // 막대 높이
  phase: 0, // 시작 각도 (rad)
};

/**
 * @param {{ scene, world, events, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 *   origin = 기둥 위치 (트랙 중심선 위)
 * @returns {{ update(dt: number): void, dispose(): void }}
 */
export function create({ scene, world, materials, origin, params }) {
  const p = { ...DEFAULTS, ...params };
  const len = p.width - 0.4;
  const postH = p.barY + p.barH + 0.5;

  const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
  body.addShape(
    new CANNON.Box(new CANNON.Vec3(len / 2, p.barH / 2, 0.15)),
    new CANNON.Vec3(0, p.barY + p.barH / 2, 0),
  );
  body.addShape(new CANNON.Cylinder(0.3, 0.3, postH, 10), new CANNON.Vec3(0, postH / 2, 0));
  body.position.set(origin.x, origin.y, origin.z);
  body.quaternion.setFromEuler(0, p.phase, 0);
  body.angularVelocity.set(0, -p.speed, 0);
  world.addBody(body);

  const group = new THREE.Group();
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const geos = [
    new THREE.BoxGeometry(len, p.barH, 0.3),
    new THREE.CylinderGeometry(0.3, 0.3, postH, 16),
    new THREE.BoxGeometry(0.35, p.barH + 0.02, 0.32),
    new THREE.SphereGeometry(0.34, 16, 8),
  ];
  const bar = new THREE.Mesh(geos[0], materials.obstacle);
  bar.position.y = p.barY + p.barH / 2;
  const post = new THREE.Mesh(geos[1], materials.wall ?? materials.obstacle);
  post.position.y = postH / 2;
  const cap = new THREE.Mesh(geos[3], materials.obstacle);
  cap.position.y = postH;
  group.add(bar, post, cap);
  // 막대 줄무늬 (돌고 있는 게 잘 보이게)
  for (let i = 1; i < 6; i++) {
    const s = new THREE.Mesh(geos[2], stripeMat);
    s.position.set(-len / 2 + (len * i) / 6, bar.position.y, 0);
    group.add(s);
  }
  group.traverse((o) => (o.castShadow = o.receiveShadow = true));
  scene.add(group);

  const sync = () => {
    group.position.set(body.position.x, body.position.y, body.position.z);
    group.quaternion.set(
      body.quaternion.x,
      body.quaternion.y,
      body.quaternion.z,
      body.quaternion.w,
    );
  };
  sync();

  return {
    update() {
      sync();
    },
    dispose() {
      world.removeBody(body);
      scene.remove(group);
      geos.forEach((g) => g.dispose());
      stripeMat.dispose();
    },
  };
}
