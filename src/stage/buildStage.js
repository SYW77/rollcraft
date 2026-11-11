// 스테이지 생성. 담당: 손연우
// level 데이터로 트랙(직선 · 곡선 조각)을 깔고, sections를 obstacles/*.js로 생성한다.
import * as THREE from 'three';
import { level1 } from './levels/level1.js';
import { buildTrack, pointAt } from './track.js';
import * as splitRail from './obstacles/splitRail.js';
import * as curve from './obstacles/curve.js';
import * as steps from './obstacles/steps.js';
import * as windGap from './obstacles/windGap.js';
import * as workbench from './obstacles/workbench.js';

const OBSTACLES = { splitRail, curve, steps, windGap, workbench };

/**
 * @returns {{ spawn: { position: THREE.Vector3, heading: {x,z} },
 *             zones: { goal: { center, size }, killY: number },
 *             path: import('./track.js').TrackPath,
 *             update(dt: number, player: any): void, dispose(): void }}
 *   path = 트랙 중심선 (cameraFollow가 heading 계산에 쓴다)
 */
export function buildStage({ scene, world, events, materials, level = level1 }) {
  const t = level.track;
  const track = buildTrack({
    scene,
    world,
    materials,
    width: t.width,
    start: t.start,
    heading: t.heading,
    pieces: t.pieces,
  });

  // 골: 트랙 끝 직전. triggers는 축 정렬 상자로 판정하므로 끝 방향이 X축/Z축에 가까울 때 정확하다.
  const end = track.end;
  const depth = level.goalDepth;
  const alongX = Math.abs(end.heading.x) > Math.abs(end.heading.z);
  const goalCenter = {
    x: end.position.x - end.heading.x * (depth / 2),
    y: 1,
    z: end.position.z - end.heading.z * (depth / 2),
  };
  const goalSize = alongX ? { x: depth, y: 3, z: t.width } : { x: t.width, y: 3, z: depth };
  const goalGeo = new THREE.BoxGeometry(goalSize.x, goalSize.y, goalSize.z);
  const goalMesh = new THREE.Mesh(goalGeo, materials.goal);
  goalMesh.position.set(goalCenter.x, goalCenter.y, goalCenter.z);
  scene.add(goalMesh);

  // 장애물 구간: at(중심선 거리) → origin + heading
  const obstacles = level.sections.map(({ type, at, params }) => {
    const pose = pointAt(track.path, at);
    return OBSTACLES[type].create({
      scene,
      world,
      events,
      materials,
      origin: pose.position,
      heading: pose.heading,
      params,
    });
  });

  const sp = pointAt(track.path, level.spawnOffset);
  return {
    spawn: {
      position: new THREE.Vector3(sp.position.x, level.spawnHeight, sp.position.z),
      heading: { ...sp.heading },
    },
    zones: { goal: { center: goalCenter, size: goalSize }, killY: level.killY },
    path: track.path,
    update(dt, player) {
      obstacles.forEach((o) => o.update?.(dt, player));
    },
    dispose() {
      obstacles.forEach((o) => o.dispose());
      track.dispose();
      scene.remove(goalMesh);
      goalGeo.dispose();
    },
  };
}
