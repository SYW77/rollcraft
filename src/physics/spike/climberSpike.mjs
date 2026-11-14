// [프로토타입] Draw Climber 방식: 다리 모양별로 시험 코스를 어디까지 가는지 본다. 담당: 원유승
// 실행: node src/physics/spike/climberSpike.mjs
// 다리는 그리기 칸 좌표([-1, 1], 가운데 = 몸통)로 그린 선. 20초 동안 W만 누른다.
// 결과: 장애물마다 통과 시각(초), 못 넘으면 '-'. 마지막 칸 = 도달 거리
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createPhysicsWorld } from '../physicsWorld.js';
import { createClimber } from '../climber.js';
import { buildTestCourse, COURSE, COURSE_END } from '../testCourse.js';

const DT = 1 / 60;
const H = { x: 0, z: -1 };
const arc = (n, f) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
const LEGS = {
  '없음(상자)': [],
  '작은 원': arc(40, (t) => ({
    x: 0.45 * Math.cos(t * 2 * Math.PI),
    y: 0.45 * Math.sin(t * 2 * Math.PI),
  })),
  '큰 원': arc(48, (t) => ({
    x: 0.9 * Math.cos(t * 2 * Math.PI),
    y: 0.9 * Math.sin(t * 2 * Math.PI),
  })),
  '긴 막대': [
    { x: -0.95, y: 0 },
    { x: 0.95, y: 0 },
  ],
  '짧은 막대': [
    { x: -0.45, y: 0 },
    { x: 0.45, y: 0 },
  ],
  십자: [
    { x: -0.8, y: 0 },
    { x: 0.8, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0.8 },
    { x: 0, y: -0.8 },
  ],
  '갈고리 Z': [
    { x: -0.8, y: 0.6 },
    { x: -0.8, y: 0 },
    { x: 0.8, y: 0 },
    { x: 0.8, y: -0.6 },
  ],
  S자: arc(40, (t) => ({ x: -0.9 + 1.8 * t, y: 0.5 * Math.sin(t * 2 * Math.PI) })),
  '별(5갈래)': arc(80, (t) => {
    const a = t * 2 * Math.PI;
    const r = Math.round((a * 5) / Math.PI) % 2 ? 0.3 : 0.9;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  }),
};

function run(legs) {
  const ph = createPhysicsWorld();
  const g = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(50, 0.5, 100)) });
  g.position.set(0, -0.5, -40);
  ph.world.addBody(g);
  buildTestCourse(ph.world);
  const p = createClimber({
    stroke: legs,
    world: ph.world,
    scene: new THREE.Scene(),
    spawn: { position: new THREE.Vector3(0, 0, 0), heading: H },
  });
  const passed = COURSE.map(() => null);
  let t = 0;
  let zMin = 0;
  let t0 = performance.now();
  let steps = 0;
  while (t < 20) {
    ph.step(DT);
    p.update(DT, { forward: true }, H);
    t += DT;
    steps++;
    const z = p.body.position.z;
    zMin = Math.min(zMin, z);
    // 장애물을 다 넘은 지점 = 다음 장애물 시작 (마지막은 코스 끝)
    COURSE.forEach((ob, i) => {
      const after = i + 1 < COURSE.length ? COURSE[i + 1].z + 1 : COURSE_END;
      if (passed[i] === null && z < after) passed[i] = t;
    });
    if (p.body.position.y < -3) break;
  }
  const ms = (performance.now() - t0) / (steps * 4);
  return { p, passed, zMin, ms, fell: p.body.position.y < -3 };
}

console.log(
  '다리         질량  ' + COURSE.map((c) => c.name.padEnd(7)).join('') + ' 도달   ms/step',
);
for (const [name, legs] of Object.entries(LEGS)) {
  const r = run(legs);
  console.log(
    `${name.padEnd(10)}${r.p.mass.toFixed(2).padStart(5)}  ` +
      r.passed.map((x) => (x === null ? '-' : `${x.toFixed(1)}s`).padEnd(7)).join('') +
      ` ${(-r.zMin).toFixed(0).padStart(3)}m  ${r.ms.toFixed(3)}`,
  );
}
