// 장애물: 밀어내는 벽 (피스톤). 담당: 손연우
//
// 트랙 양옆 벽에서 블록이 번갈아 튀어나왔다 들어간다 (kinematic 강체). 튀어나오면 트랙의 반 이상을 막아서
// 비어 있는 쪽으로 피하거나, 들어간 틈에 지나가야 한다. 벽 없는 구간이면 밀려서 떨어진다.
// 블록이 여러 개면 phase를 엇갈려 지그재그 길이 생긴다.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const DEFAULTS = {
  width: 7, // 트랙 폭
  count: 3, // 블록 개수 (진행 방향으로 spacing 간격)
  spacing: 4, // m
  depth: 1.6, // 블록 진행 방향 길이
  height: 1.1, // 블록 높이
  reach: 0.62, // 가장 많이 나왔을 때 트랙 폭의 이 비율을 막는다
  period: 3, // s (한 번 나왔다 들어가는 시간)
};

/**
 * @param {{ scene, world, events, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 *   origin = 첫 블록 앞쪽 가장자리 (트랙 중심선 위), heading = 진행 방향 (직선 구간에 놓는다)
 * @returns {{ update(): void, dispose(): void }}
 */
export function create({ scene, world, materials, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const right = { x: -heading.z, z: heading.x };
  const yaw = Math.atan2(-heading.x, -heading.z);
  const len = p.width; // 블록 옆 길이 (들어가면 벽 속에 숨는다)
  const geo = new THREE.BoxGeometry(len, p.height, p.depth);
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.6 });
  const faceGeo = new THREE.BoxGeometry(0.06, p.height * 0.5, p.depth * 0.8);

  const blocks = [];
  for (let i = 0; i < p.count; i++) {
    const side = i % 2 ? -1 : 1; // 오른쪽부터 번갈아
    const along = p.depth / 2 + i * p.spacing;
    const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
    body.addShape(new CANNON.Box(new CANNON.Vec3(len / 2, p.height / 2, p.depth / 2)));
    body.quaternion.setFromEuler(0, yaw, 0);
    world.addBody(body);
    const mesh = new THREE.Mesh(geo, materials.obstacle);
    mesh.castShadow = mesh.receiveShadow = true;
    // 미는 면에 검은 띠 (어느 쪽이 나오는지 보이게)
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.x = (-side * len) / 2;
    mesh.add(face);
    mesh.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
    scene.add(mesh);
    blocks.push({ body, mesh, side, along, phase: (i / p.count) * Math.PI * 2 });
  }

  /** 블록 중심의 옆 위치: 들어가면 벽 밖(폭/2 + len/2), 나오면 트랙 안으로 reach만큼 */
  const latAt = (b, time) => {
    const out = 0.5 - 0.5 * Math.cos((2 * Math.PI * time) / p.period + b.phase); // 0..1
    const inner = p.width / 2 - out * p.width * p.reach; // 블록 안쪽 면의 옆 위치 (중심선 기준, 바깥 +)
    return b.side * (inner + len / 2);
  };
  const place = (b, time) => {
    const lat = latAt(b, time);
    return {
      x: origin.x + heading.x * b.along + right.x * lat,
      y: origin.y + p.height / 2,
      z: origin.z + heading.z * b.along + right.z * lat,
    };
  };
  let simTime = 0; // 이 장애물의 물리 시간 (물리 스텝마다 world.dt씩. world.time은 프레임마다만 올라서 못 쓴다)
  for (const b of blocks) {
    const q = place(b, 0);
    b.body.position.set(q.x, q.y, q.z);
    b.mesh.position.set(q.x, q.y, q.z);
  }

  // 속도는 물리 스텝마다 정한다 (world 'preStep', world.dt = 고정 1/240초).
  // 프레임 dt로 정하면 다리를 그리는 동안(시간 0.2배) dt가 아주 작아져서 작은 위치 오차가 큰 속도가 되어
  // 블록이 순간적으로 엄청 빨라졌다.
  const preStep = () => {
    const dt = world.dt;
    if (!(dt > 0)) return;
    simTime += dt;
    for (const b of blocks) {
      const next = place(b, simTime);
      const pos = b.body.position;
      b.body.velocity.set((next.x - pos.x) / dt, 0, (next.z - pos.z) / dt);
    }
  };
  world.addEventListener('preStep', preStep);

  return {
    update() {
      for (const b of blocks) {
        const pos = b.body.position;
        b.mesh.position.set(pos.x, pos.y, pos.z);
      }
    },
    dispose() {
      world.removeEventListener('preStep', preStep);
      for (const b of blocks) {
        world.removeBody(b.body);
        scene.remove(b.mesh);
      }
      geo.dispose();
      faceGeo.dispose();
      faceMat.dispose();
    },
  };
}
