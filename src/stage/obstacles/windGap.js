// 장애물: 강풍 구간 (P1). 담당: 원유승
//
// 트랙을 가로지르는 옆바람 구역. 플레이어가 구역 안에 있는 동안 항력을 건다.
//   F = ½ × 공기밀도 × 항력계수 × A × |u| × u × d̂     (u = w − v·d̂: 바람 방향으로 본 상대 속도)
//   w = 바람 세기, d̂ = 바람 방향, v = 플레이어 속도, A = 바람 방향에서 본 투영면적 (profileStats.projectedArea)
// 바람 방향 성분만 쓴다. 전체 상대 속도를 쓰면 구역 안에서 앞으로 가는 속도까지 공기 저항으로 깎인다.
// 같은 바람이라도 가볍고 바람 쪽으로 넓은 모양일수록 많이 밀린다. 옆으로 누운 원통은 축 방향(작은 원)이
// 바람을 받으면 덜 밀리고, 옆면(큰 사각형)이 받으면 많이 밀린다.
// 상대 속도를 쓰므로 바람과 같은 속도로 흘러가면 힘이 0이 되어 무한히 가속하지 않는다.
// 수치: 플레이어 밀도가 2kg/m³(PlayerBody DENSITY)로 풍선처럼 가벼워서 실제 공기 밀도 1.2를 쓰면 힘이 너무 세다.
// 게임 스케일 값으로 낮췄다. 기본 3m/s에서 구 ≈ 0.9, 아령 ≈ 2.7m/s² (W만 누르면 10m 구간에서 구는 버티고 아령은 떨어진다).
//
// 구역 좌표: origin = 구역 시작점(트랙 중심선 위). 트랙 진행 방향(-Z)으로 length만큼 뻗는다.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const AIR_DENSITY = 0.25; // kg/m³, 게임 스케일 (실제 1.2)
const DRAG_COEFF = 1.0; // 뭉툭한 물체 근사

const DEFAULTS = {
  length: 8, // 진행 방향 길이 (m)
  width: 6, // 트랙 폭 (m)
  height: 3, // 판정 높이 (m)
  speed: 3, // 바람 세기 (m/s). 가속도는 speed²에 비례
  dir: { x: 1, z: 0 }, // 바람 방향 (XZ, 길이 무관). 기본: +X (진행 방향 오른쪽)
  gust: 0.3, // 돌풍 세기 비율 (0 = 일정). speed × (1 ± gust)로 출렁인다
  gustPeriod: 2, // 돌풍 주기 (s)
};

const STREAKS = 60; // 바람 줄무늬 개수
const STREAK_LEN = 0.6; // m

const wLocal = new CANNON.Vec3();
const qInv = new CANNON.Quaternion();

/**
 * 플레이어에 걸 바람 힘 (순수 함수, 테스트용으로 export).
 * @param {{ x: number, z: number }} wind  바람 속도 (m/s, XZ). 방향 = 바람 방향
 * @param {CANNON.Body} body
 * @param {{ projectedArea: (dir: {x:number,y:number,z:number}) => number }} stats
 * @returns {{ x: number, z: number }} 힘 (N)
 */
export function windForce(wind, body, stats) {
  const w = Math.hypot(wind.x, wind.z);
  if (w < 1e-6) return { x: 0, z: 0 };
  const dx = wind.x / w;
  const dz = wind.z / w;
  const u = w - (body.velocity.x * dx + body.velocity.z * dz); // 바람 방향 상대 속도
  // 바람 방향을 물체 로컬 좌표로 바꿔서 그 방향에서 본 면적을 구한다
  body.quaternion.conjugate(qInv);
  qInv.vmult(wLocal.set(dx, 0, dz), wLocal);
  const area = stats.projectedArea(wLocal);
  const f = 0.5 * AIR_DENSITY * DRAG_COEFF * area * Math.abs(u) * u;
  return { x: f * dx, z: f * dz };
}

/**
 * @param {{ scene, world, events, materials, origin: {x,y,z}, params: object }} ctx
 * @returns {{ update?(dt: number, player: any): void, dispose(): void }}
 */
export function create({ scene, origin, params = {} }) {
  const p = { ...DEFAULTS, ...params, dir: { ...DEFAULTS.dir, ...params.dir } };
  const dl = Math.hypot(p.dir.x, p.dir.z) || 1;
  const dir = { x: p.dir.x / dl, z: p.dir.z / dl };

  // 판정 상자 (AABB)
  const min = { x: origin.x - p.width / 2, y: origin.y, z: origin.z - p.length };
  const max = { x: origin.x + p.width / 2, y: origin.y + p.height, z: origin.z };
  const inside = (q) =>
    q.x >= min.x && q.x <= max.x && q.y >= min.y && q.y <= max.y && q.z >= min.z && q.z <= max.z;

  // ── 보이는 것: 반투명 구역 + 바람 줄무늬 ──
  const group = new THREE.Group();
  const zoneMat = new THREE.MeshBasicMaterial({
    color: 0x9fd8ff,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  const zone = new THREE.Mesh(new THREE.BoxGeometry(p.width, p.height, p.length), zoneMat);
  zone.position.set(origin.x, origin.y + p.height / 2, origin.z - p.length / 2);
  group.add(zone);

  const streakPos = new Float32Array(STREAKS * 6);
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  const streakMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  });
  group.add(new THREE.LineSegments(streakGeo, streakMat));
  // 줄무늬 위치는 구역 안 (u, y, z)로 들고, u는 바람 방향 진행도
  const streaks = Array.from({ length: STREAKS }, () => ({
    u: Math.random(),
    y: min.y + 0.1 + Math.random() * (p.height - 0.2),
    z: min.z + Math.random() * p.length,
  }));
  // 옆바람 전용 표시: 줄무늬는 X 방향으로만 흐르고 꼬리만 바람 방향을 따른다.
  function placeStreaks() {
    streaks.forEach((s, i) => {
      const x = dir.x >= 0 ? min.x + s.u * p.width : max.x - s.u * p.width;
      const o = i * 6;
      streakPos[o] = x;
      streakPos[o + 1] = s.y;
      streakPos[o + 2] = s.z;
      streakPos[o + 3] = x - dir.x * STREAK_LEN;
      streakPos[o + 4] = s.y;
      streakPos[o + 5] = s.z - dir.z * STREAK_LEN;
    });
    streakGeo.attributes.position.needsUpdate = true;
  }
  placeStreaks();
  scene.add(group);

  let t = 0;
  const wind = { x: 0, z: 0 };

  return {
    /** 현재 바람 속도 (m/s, XZ). 디버그 표시용 */
    getWind: () => ({ ...wind }),
    update(dt, player) {
      t += dt;
      const s = p.speed * (1 + p.gust * Math.sin((2 * Math.PI * t) / p.gustPeriod));
      wind.x = dir.x * s;
      wind.z = dir.z * s;

      const step = (s * dt) / Math.max(p.width, 1e-6);
      streaks.forEach((k) => {
        k.u += step;
        if (k.u > 1) k.u -= 1;
      });
      placeStreaks();

      if (!player || !inside(player.body.position)) return;
      const f = windForce(wind, player.body, player.stats);
      player.applyExternalForce({ x: f.x, y: 0, z: f.z });
    },
    dispose() {
      scene.remove(group);
      zone.geometry.dispose();
      zoneMat.dispose();
      streakGeo.dispose();
      streakMat.dispose();
    },
  };
}
