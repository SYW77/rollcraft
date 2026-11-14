// level1의 곡선 구간만 떼어서 프리셋별로 통과하는지 본다. 담당: 원유승
// 실행: node src/physics/spike/curveRun.mjs
// 코스가 작업대에서 모양을 바꿔 가며 푸는 구조라, 한 모양으로 처음부터 끝까지 가는 stageRun만으로는
// 조향을 판단할 수 없다. 각 곡선 조각 앞 APPROACH m에 스폰해서 곡선 끝 + EXIT m를 지나면 PASS.
// 모드:
//   steer  W + 자동 조향 (앞쪽 중심선을 향해 A/D)
//   slow   steer + 곡선 들어가기 전부터 SLOW_SPEED 넘으면 S (구가 감속하면 급커브를 도는지)
// 결과: PASS / FALL / STUCK(시간 초과), 걸린 시간, 곡선 시작 기준 도달 거리 / 곡선 길이
import * as THREE from 'three';
import { createPhysicsWorld } from '../physicsWorld.js';
import { createPlayer } from '../PlayerBody.js';
import { buildStage } from '../../stage/buildStage.js';
import { createCameraFollow } from '../../stage/cameraFollow.js';
import { nearestOnPath, pointAt } from '../../stage/track.js';
import { createEmitter } from '../../shared/events.js';
import { level1 } from '../../stage/levels/level1.js';
import { getPreset, PRESET_NAMES } from '../../shared/presets.js';
import { buildLatheGeometry } from '../../editor/latheGeometry.js';

const DT = 1 / 60;
const APPROACH = 5; // 곡선 앞 이만큼에서 출발 (m)
const EXIT = 3; // 곡선 끝을 이만큼 지나면 통과 (m)
const TIMEOUT = 20; // s
const LOOK_AHEAD = 3; // 자동 조향: 이만큼 앞의 중심선을 노린다 (m)
const DEADBAND = 0.2; // 자동 조향: 이보다 작게 어긋나면 A/D를 안 누른다 (m)
const SLOW_SPEED = 2.5; // slow 모드 목표 속력 (m/s)
const m = new THREE.MeshBasicMaterial();

/** 앞쪽 중심선 지점이 오른쪽/왼쪽 어디에 있는지 보고 A/D를 고른다. 옆 속도는 미리 빼서 덜 흔들리게 한다. */
function autoSteer(path, pos, vel, heading) {
  const near = nearestOnPath(path, pos);
  const target = pointAt(path, near.s + LOOK_AHEAD).position;
  const rx = -heading.z;
  const rz = heading.x;
  const e = (target.x - pos.x) * rx + (target.z - pos.z) * rz - 0.5 * (vel.x * rx + vel.z * rz);
  return { right: e > DEADBAND, left: e < -DEADBAND };
}

/** level1 트랙 조각 중 곡선의 [시작, 끝] 거리와 이름 */
function curves() {
  const out = [];
  let s = 0;
  for (const p of level1.track.pieces) {
    const len = p.type === 'arc' ? (p.radius * Math.abs(p.angle) * Math.PI) / 180 : p.length;
    if (p.type === 'arc') {
      const dir = p.angle > 0 ? '오른' : '왼';
      const kind = p.walls ? '벽' : '급';
      out.push({ name: `${kind} R${p.radius} ${dir}`, start: s, end: s + len });
    }
    s += len;
  }
  return out;
}

const ph = createPhysicsWorld();
const stage = buildStage({
  scene: new THREE.Scene(),
  world: ph.world,
  events: createEmitter(),
  materials: { track: m, goal: m, wall: m, player: m, obstacle: m },
});

function run(name, curve, slow) {
  const s0 = curve.start - APPROACH;
  const pose = pointAt(stage.path, s0);
  const spawn = {
    position: new THREE.Vector3(pose.position.x, level1.spawnHeight, pose.position.z),
    heading: pose.heading,
  };
  const prof = getPreset(name);
  const p = createPlayer({
    profile: prof,
    geometry: buildLatheGeometry(prof, 24),
    world: ph.world,
    scene: new THREE.Scene(),
    spawn,
  });
  const cam = createCameraFollow(new THREE.PerspectiveCamera(), {
    path: stage.path,
    heading: pose.heading,
  });
  cam.snap(p.getPosition());
  let t = 0;
  let sMax = s0;
  let result = null;
  while (!result && t < TIMEOUT) {
    const pos = p.getPosition();
    cam.update(DT, pos);
    const H = cam.getHeading();
    const v = p.body.velocity;
    const fast = slow && Math.hypot(v.x, v.z) > SLOW_SPEED;
    const input = { forward: !fast, back: fast, ...autoSteer(stage.path, pos, v, H) };
    ph.step(DT);
    p.update(DT, input, H);
    stage.update(DT, p);
    t += DT;
    const near = nearestOnPath(stage.path, p.getPosition());
    // 트랙 밖으로 나가 다른 구간 중심선에 가까워지는 경우를 막으려고 연속으로 이어질 때만 갱신
    if (near.s < sMax + 1) sMax = Math.max(sMax, near.s);
    if (p.body.position.y < -2) result = 'FALL';
    else if (sMax > curve.end + EXIT) result = 'PASS';
  }
  p.dispose();
  const got = Math.min(sMax, curve.end) - curve.start;
  return `${(result ?? 'STUCK').padEnd(5)} ${t.toFixed(1).padStart(4)}s ${got.toFixed(1).padStart(4)}/${(curve.end - curve.start).toFixed(1)}m`;
}

const cs = curves();
const pad = 25;
console.log('곡선'.padEnd(12), PRESET_NAMES.map((n) => n.padEnd(pad)).join(''));
for (const c of cs) {
  for (const slow of [false, true]) {
    const label = `${c.name} ${slow ? 'slow' : 'W'}`;
    console.log(label.padEnd(14), PRESET_NAMES.map((n) => run(n, c, slow).padEnd(pad)).join(''));
  }
}
