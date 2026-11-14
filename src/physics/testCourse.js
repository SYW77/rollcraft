// [프로토타입] 다리 모양 비교용 시험 코스 (physics dev.html · climberSpike). 담당: 원유승
// 원점에서 −z 방향으로: 낮은 턱 → 높은 턱 → 벽 → 계단 → 경사로 → 높은 벽. 폭 6m, 바닥은 따로 깐다.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/** { name, z: 장애물 시작(−z 쪽으로 진행), 상자들 } */
export const COURSE = [
  { name: '턱 0.25', z: -6, boxes: [{ z: 0, len: 2, top: 0.25 }] },
  { name: '턱 0.5', z: -12, boxes: [{ z: 0, len: 2, top: 0.5 }] },
  { name: '벽 0.9', z: -18, boxes: [{ z: 0, len: 0.4, top: 0.9 }] },
  {
    name: '계단',
    z: -24,
    boxes: [
      { z: 0, len: 1, top: 0.3 },
      { z: 1, len: 1, top: 0.6 },
      { z: 2, len: 1, top: 0.9 },
      { z: 3, len: 3, top: 0.9 },
    ],
  },
  { name: '경사로', z: -34, ramp: { len: 5, angle: 20 } },
  { name: '벽 1.4', z: -44, boxes: [{ z: 0, len: 0.4, top: 1.4 }] },
];
export const COURSE_END = -50;
const WIDTH = 6;

/**
 * @param {CANNON.World} world
 * @param {THREE.Scene} [scene]
 * @returns {{ dispose(): void }}
 */
export function buildTestCourse(world, scene) {
  const bodies = [];
  const meshes = [];
  const mat = scene && new THREE.MeshStandardMaterial({ color: 0x6f8fb0 });
  function box(cx, cy, cz, hx, hy, hz, rotX = 0) {
    const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)) });
    b.position.set(cx, cy, cz);
    if (rotX) b.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), rotX);
    world.addBody(b);
    bodies.push(b);
    if (scene) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), mat);
      mesh.position.set(cx, cy, cz);
      mesh.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      scene.add(mesh);
      meshes.push(mesh);
    }
  }
  for (const ob of COURSE) {
    for (const bx of ob.boxes ?? []) {
      // 진행 방향 −z: 장애물 시작 z에서 len만큼 더 −z로
      box(0, bx.top / 2, ob.z - bx.z - bx.len / 2, WIDTH / 2, bx.top / 2, bx.len / 2);
    }
    if (ob.ramp) {
      const { len, angle } = ob.ramp;
      const t = (angle * Math.PI) / 180;
      const th = 0.2;
      // 오르막 판: 시작(z)에서 −z로 올라간다. 판 윗면이 바닥에서 시작하도록 중심을 잡는다.
      const cz = ob.z - (len / 2) * Math.cos(t);
      const cy = (len / 2) * Math.sin(t) - (th / 2) * Math.cos(t);
      box(0, cy, cz, WIDTH / 2, th / 2, len / 2, t);
      // 꼭대기 평평한 판
      const topY = len * Math.sin(t);
      box(0, topY / 2, ob.z - len * Math.cos(t) - 1.5, WIDTH / 2, topY / 2, 1.5);
    }
  }
  return {
    dispose() {
      bodies.forEach((b) => world.removeBody(b));
      meshes.forEach((m) => {
        scene.remove(m);
        m.geometry.dispose();
      });
      mat?.dispose();
    },
  };
}
