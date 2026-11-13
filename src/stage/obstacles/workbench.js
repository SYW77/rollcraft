// 장애물(P1): 변신 작업대 존. 담당: 손연우
//
// 트랙 위에 빛나는 바닥 패드 + 아치 기둥("F 변신" 간판)을 놓고, 플레이어가 패드에 올라오면
// EVENTS.WORKBENCH_ENTER를 한 번 보낸다. 바로 열지 않는다: main은 "F 변신" 안내만 띄우고,
// 패드 위에서 F를 눌렀을 때만 일시정지 + ui/workbenchOverlay를 연다 (그냥 지나가면 흐름이 안 끊김).
// - 패드에서 완전히 나가야 다시 알린다.
// - 판정만 하고 충돌체는 없다 (기둥은 트랙 밖에 세워서 길을 막지 않음).
// payload: { position: {x,y,z}, heading: {x,z}, contains(pos): boolean }
//   position · heading = 패드 중앙과 진행 방향 (main이 새 플레이어를 여기에 놓음), contains = 아직 패드 위인지
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

  // 가로대 위 간판 "F 변신" (브라우저에서만. 헤드리스 검증 스크립트에는 document가 없음)
  let label = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const g = canvas.getContext('2d');
    g.fillStyle = 'rgba(10, 20, 30, 0.85)';
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#39c6ff';
    g.lineWidth = 6;
    g.strokeRect(3, 3, 506, 122);
    g.fillStyle = '#ffffff';
    g.font = 'bold 64px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('🔧 F  변신', 256, 66);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    label = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }),
    );
    // 그룹 로컬 -Z = 진행 방향. 평면 앞면(+Z)이 다가오는 플레이어 쪽을 본다.
    label.position.set(0, 3.1, 0);
    group.add(label);
  }
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
      const isIn = inside(player.getPosition());
      // 올라와 있으면 더 밝게, 아니면 은은하게 깜빡임
      padMat.emissiveIntensity = isIn ? 1.1 : 0.45 + 0.25 * Math.sin(t * 4);
      if (isIn && armed) {
        armed = false;
        events.emit(EVENTS.WORKBENCH_ENTER, {
          position: { ...center },
          heading: { x: heading.x, z: heading.z },
          contains: inside,
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
      if (label) {
        label.geometry.dispose();
        label.material.map.dispose();
        label.material.dispose();
      }
    },
  };
}
