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
import * as ceiling from './obstacles/ceiling.js';
import * as finishLine from './obstacles/finishLine.js';
import * as sweeper from './obstacles/sweeper.js';
import * as pusher from './obstacles/pusher.js';
import * as conveyor from './obstacles/conveyor.js';
import * as rollingLogs from './obstacles/rollingLogs.js';
import * as blocks from './obstacles/blocks.js';
import { applyTheme } from './themes.js';
import { buildScenery } from './scenery.js';

const OBSTACLES = {
  splitRail,
  curve,
  steps,
  windGap,
  workbench,
  ceiling,
  finishLine,
  sweeper,
  pusher,
  conveyor,
  rollingLogs,
  blocks,
};

/**
 * @returns {{ spawn: { position: THREE.Vector3, heading: {x,z} },
 *             zones: { goal: { center, size } | null, killY: number },
 *             path: import('./track.js').TrackPath,
 *             laps: number, startS: number, pieces: import('./track.js').TrackPiece[],
 *             update(dt: number, player: any): void, dispose(): void }}
 *   path = 트랙 중심선 (cameraFollow가 heading 계산에 쓴다)
 */
export function buildStage({ scene, world, events, materials: baseMaterials, level = level1 }) {
  const t = level.track;
  // 테마가 있는 레벨: 하늘 · 땅 · 트랙 재질을 테마로 바꾸고 주변에 배경을 깐다
  const themed = level.theme ? applyTheme(scene, level.theme) : null;
  const materials = themed ? { ...baseMaterials, ...themed.materials } : baseMaterials;
  const groundY = level.groundY ?? -3;
  const track = buildTrack({
    scene,
    world,
    materials,
    groundY: themed ? groundY : undefined,
    width: t.width,
    start: t.start,
    heading: t.heading,
    pieces: t.pieces,
    wallHeight: t.wallHeight,
    wallCap: t.wallCap,
  });

  // 골: 트랙 끝 직전. triggers는 축 정렬 상자로 판정하므로 끝 방향이 X축/Z축에 가까울 때 정확하다.
  // 서킷(level.laps)은 골 상자가 없다: 결승선(finishLine 장애물)을 laps번 넘으면 완주 (stage/laps.js).
  let goal = null;
  let goalMesh = null;
  if (!level.laps) {
    const end = track.end;
    const depth = level.goalDepth;
    const alongX = Math.abs(end.heading.x) > Math.abs(end.heading.z);
    const goalH = level.goalHeight ?? 3; // 판정 높이 (높이 튀는 플레이어는 크게)
    const center = {
      x: end.position.x - end.heading.x * (depth / 2),
      y: goalH / 2 - 0.5,
      z: end.position.z - end.heading.z * (depth / 2),
    };
    const size = alongX ? { x: depth, y: goalH, z: t.width } : { x: t.width, y: goalH, z: depth };
    goalMesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), materials.goal);
    goalMesh.position.set(center.x, center.y, center.z);
    scene.add(goalMesh);
    goal = { center, size };
  }

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

  const scenery = themed
    ? buildScenery({
        scene,
        world,
        path: track.path,
        theme: themed.theme,
        materials,
        width: t.width,
        groundY,
        seed: level.seed,
      })
    : null;

  const sp = pointAt(track.path, level.spawnOffset);
  return {
    spawn: {
      position: new THREE.Vector3(sp.position.x, sp.position.y + level.spawnHeight, sp.position.z),
      heading: { ...sp.heading },
      groundY: sp.position.y,
    },
    zones: { goal, killY: level.killY },
    path: track.path,
    laps: level.laps ?? 0, // 0 = 골 상자 레벨, n = n바퀴 서킷
    startS: level.spawnOffset, // 출발 지점의 중심선 거리 (바퀴 세기 기준)
    pieces: t.pieces,
    update(dt, player) {
      obstacles.forEach((o) => o.update?.(dt, player));
    },
    dispose() {
      obstacles.forEach((o) => o.dispose());
      track.dispose();
      scenery?.dispose();
      themed?.dispose();
      if (goalMesh) {
        scene.remove(goalMesh);
        goalMesh.geometry.dispose();
      }
    },
  };
}
