// 장애물: 컨베이어 띠. 담당: 손연우
//
// 트랙 위에 띠 칸을 바둑판처럼 깐다. 칸마다 흐르는 방향 · 빠르기가 다르다 (speed > 0 = 앞으로, < 0 = 뒤로, 0 = 보통 바닥).
// 앞으로 흐르는 파란 칸을 이어 밟으면 빨라지고, 뒤로 흐르는 주황 칸에 걸리면 느려진다 → A / D로 길을 골라 간다.
// tiles를 주면 그대로 쓰고, 없으면 cols × rows 칸을 pattern대로 채운다.
// 구현: kinematic 상자에 속도를 주고 매 프레임 제자리로 되돌린다 → 접촉 마찰이 "흐르는 표면"처럼 작동한다.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const DEFAULTS = {
  length: 12, // 진행 방향 길이 (m)
  thick: 0.1, // 띠 두께 (트랙 위로 이만큼 올라온다)
  width: 7, // 트랙 폭
  cols: 4, // 옆으로 칸 수
  rows: 4, // 앞으로 칸 수
  forward: 3, // 앞으로 흐르는 칸 빠르기 (m/s)
  back: -2.5, // 뒤로 흐르는 칸 빠르기
  // 칸 종류: F = 앞, B = 뒤, . = 보통 바닥. 줄마다 (앞에서부터) cols 글자
  pattern: ['F.BF', 'BF.B', '.BFB', 'FB.F'],
  // tiles: [{ lat, along, width, length, speed }] (lat = 칸 가운데 옆 위치, 오른쪽 +; along = 칸 시작 거리)
};

/** pattern → 칸 목록 */
function makeTiles(p) {
  const w = p.width / p.cols;
  const l = p.length / p.rows;
  const tiles = [];
  for (let r = 0; r < p.rows; r++) {
    const row = p.pattern[r % p.pattern.length];
    for (let c = 0; c < p.cols; c++) {
      const k = row[c % row.length];
      if (k === '.') continue;
      tiles.push({
        lat: -p.width / 2 + w * (c + 0.5),
        along: l * r,
        width: w - 0.06,
        length: l - 0.06,
        speed: k === 'F' ? p.forward : p.back,
      });
    }
  }
  return tiles;
}

const canDraw = typeof document !== 'undefined';

/** 띠 무늬: 흐르는 방향을 가리키는 꺾쇠. forward면 앞(-v 방향) */
function beltTexture(forward) {
  if (!canDraw) return null;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = forward ? '#1f5eff' : '#2b2f38';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = forward ? '#ffffff' : '#ff8a3d';
  g.save();
  if (forward) {
    g.translate(32, 32);
    g.rotate(Math.PI);
    g.translate(-32, -32);
  }
  g.beginPath();
  g.moveTo(8, 20);
  g.lineTo(32, 44);
  g.lineTo(56, 20);
  g.lineTo(56, 32);
  g.lineTo(32, 56);
  g.lineTo(8, 32);
  g.closePath();
  g.fill();
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * @param {{ scene, world, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 *   origin = 띠 시작점 (트랙 중심선 위), heading = 진행 방향 (직선 구간에 놓는다)
 * @returns {{ update(dt: number): void, dispose(): void }}
 */
export function create({ scene, world, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const yaw = Math.atan2(-heading.x, -heading.z);
  const right = { x: -heading.z, z: heading.x };
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x13213f, roughness: 0.6 });

  const belts = (p.tiles ?? makeTiles(p)).map((lane) => {
    const mid = lane.along + lane.length / 2;
    const home = new CANNON.Vec3(
      origin.x + heading.x * mid + right.x * lane.lat,
      origin.y + p.thick / 2,
      origin.z + heading.z * mid + right.z * lane.lat,
    );
    const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
    body.addShape(new CANNON.Box(new CANNON.Vec3(lane.width / 2, p.thick / 2, lane.length / 2)));
    body.quaternion.setFromEuler(0, yaw, 0);
    body.position.copy(home);
    body.velocity.set(heading.x * lane.speed, 0, heading.z * lane.speed);
    world.addBody(body);

    const tex = beltTexture(lane.speed > 0);
    if (tex) tex.repeat.set(lane.width, lane.length);
    const mat = new THREE.MeshStandardMaterial(
      tex ? { map: tex, roughness: 0.7 } : { color: 0x2b2f38 },
    );
    const geo = new THREE.BoxGeometry(lane.width, p.thick, lane.length);
    const mesh = new THREE.Mesh(geo, [sideMat, sideMat, mat, sideMat, sideMat, sideMat]);
    mesh.position.set(home.x, home.y, home.z);
    mesh.rotation.y = yaw;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return { body, home, tex, mat, geo, mesh, speed: lane.speed };
  });

  return {
    update(dt) {
      for (const b of belts) {
        b.body.position.copy(b.home); // 띠 표면은 흐르지만 띠 자체는 제자리
        // 상자 윗면 v는 로컬 +Z(뒤)로 갈수록 커진다 → 앞으로 흐르면 offset을 늘린다
        if (b.tex) b.tex.offset.y += dt * b.speed;
      }
    },
    dispose() {
      for (const b of belts) {
        world.removeBody(b.body);
        scene.remove(b.mesh);
        b.geo.dispose();
        b.mat.dispose();
        b.tex?.dispose();
      }
      sideMat.dispose();
    },
  };
}
