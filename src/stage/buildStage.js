// 스테이지 생성. 담당: 손연우
// STUB: 평지 트랙 + 골 표시. level 데이터의 sections를 obstacles/*.js로 생성.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { level1 } from './levels/level1.js';
import * as splitRail from './obstacles/splitRail.js';
import * as curve from './obstacles/curve.js';
import * as steps from './obstacles/steps.js';
import * as windGap from './obstacles/windGap.js';

const OBSTACLES = { splitRail, curve, steps, windGap };
const THICK = 1; // 바닥/벽 두께 1 이상 (터널링 방지)

/**
 * @returns {{ spawn: { position: THREE.Vector3, heading: {x,z} },
 *             zones: { goal: { center, size }, killY: number },
 *             update(dt: number, player: any): void, dispose(): void }}
 */
export function buildStage({ scene, world, events, materials, level = level1 }) {
  const meshes = [];
  const bodies = [];

  // 트랙 바닥
  const { width, length } = level.track;
  const trackMesh = new THREE.Mesh(new THREE.BoxGeometry(width, THICK, length), materials.track);
  trackMesh.position.set(0, -THICK / 2, -length / 2);
  trackMesh.receiveShadow = true;
  const trackBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(width / 2, THICK / 2, length / 2)),
  });
  trackBody.position.set(0, -THICK / 2, -length / 2);
  scene.add(trackMesh);
  world.addBody(trackBody);
  meshes.push(trackMesh);
  bodies.push(trackBody);

  // 골 표시 (판정은 physics/triggers가 한다)
  const g = level.goal;
  const goalMesh = new THREE.Mesh(
    new THREE.BoxGeometry(g.size.x, g.size.y, g.size.z),
    materials.goal,
  );
  goalMesh.position.set(g.center.x, g.center.y, g.center.z);
  scene.add(goalMesh);
  meshes.push(goalMesh);

  // 장애물 구간
  const obstacles = level.sections.map(({ type, origin, params }) =>
    OBSTACLES[type].create({ scene, world, events, materials, origin, params }),
  );

  const s = level.spawn;
  return {
    spawn: {
      position: new THREE.Vector3(s.position.x, s.position.y, s.position.z),
      heading: { ...s.heading },
    },
    zones: { goal: { center: { ...g.center }, size: { ...g.size } }, killY: level.killY },
    update(dt, player) {
      obstacles.forEach((o) => o.update?.(dt, player));
    },
    dispose() {
      obstacles.forEach((o) => o.dispose());
      meshes.forEach((m) => {
        scene.remove(m);
        m.geometry.dispose();
      });
      bodies.forEach((b) => world.removeBody(b));
    },
  };
}
