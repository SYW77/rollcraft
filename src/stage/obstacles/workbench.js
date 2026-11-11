// 장애물(P1): 변신 작업대 존. 담당: 손연우
//
// 트랙 위에 빛나는 바닥 패드 + 아치 기둥을 놓고, 플레이어가 패드 영역에 들어오면
// EVENTS.WORKBENCH_ENTER를 한 번 보낸다. main이 일시정지하고 ui/workbenchOverlay로 에디터를 띄운다.
// - 패드에서 완전히 나가야 다시 발동한다 (변신 직후 같은 자리에서 또 열리지 않게).
// - 판정만 하고 충돌체는 없다 (기둥은 트랙 밖에 세워서 길을 막지 않음).
// payload: { position: {x,y,z}, heading: {x,z} } — 패드 중앙과 진행 방향. main이 새 플레이어를 여기에 놓는다.
import * as THREE from 'three';
import { EVENTS } from '../../shared/contracts.js';

const DEFAULTS = {
  length: 2.5, // 진행 방향 길이 (m)
  width: 6, // 트랙 폭과 맞춘다
  color: 0x39c6ff,
};

/**
 * @param {{ scene, world, events, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 *   origin = 트랙 중심선 위 지점 (y = 트랙 윗면), heading = 그 지점의 진행 방향
 * @returns {{ update?(dt: number, player: any): void, dispose(): void }}
 */
export function create({ scene, events, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const right = { x: -heading.z, z: heading.x };
  const center = {
    x: origin.x + heading.x * (p.length / 2),
    y: origin.y,
    z: origin.z + heading.z * (p.length / 2),
  };
  const yaw = Math.atan2(-heading.x, -heading.z);

  // ── 보이는 것: 바닥 패드 + 양옆 기둥 + 위 가로대 ─────────────────
  const group = new THREE.Group();
  group.position.set(center.x, center.y, center.z);
  group.rotation.y = yaw;
  const geometries = [];
  const padMat = new THREE.MeshStandardMaterial({
    color: p.color,
    emissive: p.color,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.55,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a3540, roughness: 0.5 });
  const add = (geo, mat, x, y, z) => {
    geometries.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = mat === frameMat;
    group.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(p.width, 0.02, p.length), padMat, 0, 0.011, 0);
  const postX = p.width / 2 + 0.35;
  add(new THREE.BoxGeometry(0.3, 2.6, 0.3), frameMat, -postX, 1.3, 0);
  add(new THREE.BoxGeometry(0.3, 2.6, 0.3), frameMat, postX, 1.3, 0);
  add(new THREE.BoxGeometry(postX * 2 + 0.3, 0.3, 0.3), frameMat, 0, 2.6, 0);
  scene.add(group);

  // ── 판정: 진행 방향 기준 직사각형 안에 있는지 ────────────────────
  const inside = (pos) => {
    const dx = pos.x - center.x;
    const dz = pos.z - center.z;
    const along = dx * heading.x + dz * heading.z;
    const side = dx * right.x + dz * right.z;
    return Math.abs(along) <= p.length / 2 && Math.abs(side) <= p.width / 2 && pos.y > -1;
  };
  let armed = true;
  let t = 0;

  return {
    update(dt, player) {
      t += dt;
      padMat.emissiveIntensity = 0.45 + 0.25 * Math.sin(t * 4); // 깜빡임
      const isIn = inside(player.getPosition());
      if (isIn && armed) {
        armed = false;
        events.emit(EVENTS.WORKBENCH_ENTER, {
          position: { ...center },
          heading: { x: heading.x, z: heading.z },
        });
      } else if (!isIn) {
        armed = true;
      }
    },
    dispose() {
      scene.remove(group);
      geometries.forEach((g) => g.dispose());
      padMat.dispose();
      frameMat.dispose();
    },
  };
}
