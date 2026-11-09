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
// 구역 좌표: origin = 구역 시작점(트랙 중심선 위), heading = 그 지점의 진행 방향.
// 구역은 heading 방향으로 length만큼 뻗는다 (직선 구간에 놓는 것을 가정).
// 바람 방향 dir은 트랙 기준: x = 진행 방향 오른쪽, z = 진행 반대(뒤). heading이 -Z이면 월드 좌표와 같다.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const AIR_DENSITY = 0.25; // kg/m³, 게임 스케일 (실제 1.2)
const DRAG_COEFF = 1.0; // 뭉툭한 물체 근사

const DEFAULTS = {
  length: 8, // 진행 방향 길이 (m)
  width: 6, // 트랙 폭 (m)
  height: 3, // 판정 높이 (m)
  speed: 3, // 바람 세기 (m/s). 가속도는 speed²에 비례
  dir: { x: 1, z: 0 }, // 바람 방향 (트랙 기준, 길이 무관). 기본: 진행 방향 오른쪽
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
 * @param {{ scene, world, events, materials, origin: {x,y,z}, heading?: {x,z}, params: object }} ctx
 * @returns {{ update?(dt: number, player: any): void, dispose(): void }}
 */
export function create({ scene, origin, heading = { x: 0, z: -1 }, params = {} }) {
  const p = { ...DEFAULTS, ...params, dir: { ...DEFAULTS.dir, ...params.dir } };
  // 트랙 기준 축: fwd = 진행 방향, right = 오른쪽 (-z, x)
  const hl = Math.hypot(heading.x, heading.z) || 1;
  const fwd = { x: heading.x / hl, z: heading.z / hl };
  const right = { x: -fwd.z, z: fwd.x };
  // 바람 방향: 트랙 기준 (x 오른쪽, z 뒤) → 월드
  const dl = Math.hypot(p.dir.x, p.dir.z) || 1;
  const dirSide = p.dir.x / dl;
  const dirBack = p.dir.z / dl;
  const dir = {
    x: right.x * dirSide - fwd.x * dirBack,
    z: right.z * dirSide - fwd.z * dirBack,
  };
  /** 트랙 기준 (옆 lat, 앞 along) → 월드 XZ */
  const toWorld = (lat, along) => ({
    x: origin.x + right.x * lat + fwd.x * along,
    z: origin.z + right.z * lat + fwd.z * along,
  });

  // 판정 상자 (heading 방향으로 돌린 상자)
  const inside = (q) => {
    const dx = q.x - origin.x;
    const dz = q.z - origin.z;
    const along = dx * fwd.x + dz * fwd.z;
    const lat = dx * right.x + dz * right.z;
    return (
      along >= 0 &&
      along <= p.length &&
      Math.abs(lat) <= p.width / 2 &&
      q.y >= origin.y &&
      q.y <= origin.y + p.height
    );
  };

  // ── 보이는 것: 반투명 구역 + 바람 줄무늬 ──
  const group = new THREE.Group();
  const zoneMat = new THREE.MeshBasicMaterial({
    color: 0x9fd8ff,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  const zone = new THREE.Mesh(new THREE.BoxGeometry(p.width, p.height, p.length), zoneMat);
  const mid = toWorld(0, p.length / 2);
  zone.position.set(mid.x, origin.y + p.height / 2, mid.z);
  zone.rotation.y = Math.atan2(-fwd.x, -fwd.z); // 상자 길이 방향(로컬 Z)을 진행 방향에 맞춘다
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
  // 줄무늬 위치는 구역 안 (u, y, along)으로 들고, u는 옆 방향 진행도
  const streaks = Array.from({ length: STREAKS }, () => ({
    u: Math.random(),
    y: origin.y + 0.1 + Math.random() * (p.height - 0.2),
    along: Math.random() * p.length,
  }));
  // 옆바람 전용 표시: 줄무늬는 트랙을 가로질러서만 흐르고 꼬리만 바람 방향을 따른다.
  function placeStreaks() {
    streaks.forEach((s, i) => {
      const lat = dirSide >= 0 ? -p.width / 2 + s.u * p.width : p.width / 2 - s.u * p.width;
      const w = toWorld(lat, s.along);
      const o = i * 6;
      streakPos[o] = w.x;
      streakPos[o + 1] = s.y;
      streakPos[o + 2] = w.z;
      streakPos[o + 3] = w.x - dir.x * STREAK_LEN;
      streakPos[o + 4] = s.y;
      streakPos[o + 5] = w.z - dir.z * STREAK_LEN;
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
