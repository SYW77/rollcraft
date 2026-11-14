// 장애물: 굴러오는 통나무. 담당: 손연우
//
// 오르막 꼭대기에서 통나무가 일정 간격으로 나와 플레이어 쪽(내리막)으로 굴러 내려온다.
// 통나무는 질량 있는 강체라 부딪히면 밀려난다. 다리가 크면 타고 넘고, 작으면 밀려 내려간다.
// 구역 끝(아래쪽)을 despawn만큼 지나거나 트랙 밖으로 떨어진 통나무는 다시 꼭대기로 돌려보낸다 (개수 고정).
// 오르막 조각(rise)과 같이 쓴다: origin = 오르막 아래 시작점, length = 오르막 길이.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const DEFAULTS = {
  length: 16, // 구역 길이 (m): 아래 시작점부터 꼭대기까지
  rise: 2, // 구역 끝(꼭대기)의 높이 (오르막 조각의 rise와 맞춘다)
  width: 7, // 트랙 폭: 통나무 길이 = 폭 - 1
  radius: 0.35, // 통나무 반지름
  count: 3, // 동시에 굴러다니는 개수
  interval: 2.2, // 나오는 간격 (s)
  push: 2.5, // 꼭대기에서 내려보내는 처음 속도 (m/s)
  mass: 4,
  despawn: 1, // 구역 아래 끝을 이만큼 지나면 사라진다 (m). 다음 장애물과 사이 평지보다 짧게
};

/**
 * @param {{ scene, world, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 * @returns {{ update(dt: number): void, dispose(): void }}
 */
export function create({ scene, world, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const yaw = Math.atan2(-heading.x, -heading.z);
  const logLen = p.width - 1;
  // 통나무 축 = 트랙 옆 방향. CANNON.Cylinder는 Y축 → 옆으로 눕힌다
  const lay = new CANNON.Quaternion().setFromEuler(0, yaw, Math.PI / 2, 'YXZ');
  const top = {
    x: origin.x + heading.x * (p.length - 0.6),
    y: origin.y + p.rise + p.radius + 0.1,
    z: origin.z + heading.z * (p.length - 0.6),
  };

  const geo = new THREE.CylinderGeometry(p.radius, p.radius, logLen, 14);
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9 });
  const ringGeo = new THREE.CircleGeometry(p.radius * 0.92, 14);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xe0b77a, roughness: 0.8 });

  const logs = [];
  for (let i = 0; i < p.count; i++) {
    const body = new CANNON.Body({ mass: p.mass, angularDamping: 0.1, linearDamping: 0.02 });
    body.addShape(new CANNON.Cylinder(p.radius, p.radius, logLen, 12));
    world.addBody(body);
    const mesh = new THREE.Mesh(geo, barkMat);
    for (const s of [-1, 1]) {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = (s * logLen) / 2 + s * 0.001;
      ring.rotation.x = (s * -Math.PI) / 2;
      mesh.add(ring);
    }
    mesh.castShadow = true;
    scene.add(mesh);
    logs.push({ body, mesh, wait: i * p.interval });
    park(logs[i]);
  }

  /** 꼭대기 위 보이지 않는 곳에서 대기 */
  function park(l) {
    l.body.type = CANNON.Body.STATIC;
    l.body.position.set(top.x, top.y - 50, top.z);
    l.body.velocity.setZero();
    l.body.angularVelocity.setZero();
    l.mesh.visible = false;
  }
  function launch(l) {
    l.body.type = CANNON.Body.DYNAMIC;
    l.body.position.set(top.x, top.y, top.z);
    l.body.quaternion.copy(lay);
    l.body.velocity.set(-heading.x * p.push, 0, -heading.z * p.push);
    l.body.angularVelocity.setZero();
    l.body.wakeUp();
    l.mesh.visible = true;
  }

  return {
    update(dt) {
      for (const l of logs) {
        if (!l.mesh.visible) {
          l.wait -= dt;
          if (l.wait <= 0) launch(l);
          continue;
        }
        const b = l.body;
        l.mesh.position.set(b.position.x, b.position.y, b.position.z);
        l.mesh.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
        // 구역 아래 끝을 지났거나 떨어졌으면 다시 대기
        const along = (b.position.x - origin.x) * heading.x + (b.position.z - origin.z) * heading.z;
        if (along < -p.despawn || b.position.y < origin.y - 3) {
          park(l);
          l.wait = p.interval * (p.count - 1) + 0.3;
        }
      }
    },
    dispose() {
      for (const l of logs) {
        world.removeBody(l.body);
        scene.remove(l.mesh);
      }
      geo.dispose();
      ringGeo.dispose();
      barkMat.dispose();
      ringMat.dispose();
    },
  };
}
