// 서킷 레벨 점검: 고리가 닫히는지(끝 위치 · 방향 · 높이), 길끼리 겹치는지, 기울기. 담당: 손연우
// 실행: node src/stage/spike/courseCheck.mjs [레벨 id ...]
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { buildTrack } from '../track.js';
import { LEVELS } from '../levels/index.js';

const ids = process.argv.slice(2);
for (const L of LEVELS.filter((l) => !ids.length || ids.includes(l.id))) {
  const t = L.level.track;
  const tr = buildTrack({
    scene: new THREE.Scene(),
    world: new CANNON.World(),
    materials: {},
    width: t.width,
    start: t.start,
    heading: t.heading,
    pieces: t.pieces,
    wallHeight: t.wallHeight,
  });
  const pts = tr.path.points;
  const e = tr.end;
  const gap = Math.hypot(e.position.x - t.start.x, e.position.z - t.start.z);
  const dh = Math.hypot(e.heading.x - t.heading.x, e.heading.z - t.heading.z);
  // 겹침: 중심선 거리로 15m 넘게 떨어진 두 점이 XZ로 가까우면 (높이 차 4m 미만) 겹침
  let worst = { d: Infinity };
  const L2 = tr.path.length;
  for (let i = 0; i < pts.length; i += 2) {
    for (let j = i + 2; j < pts.length; j += 2) {
      const ds = Math.min(pts[j].s - pts[i].s, L2 - (pts[j].s - pts[i].s));
      if (ds < 15) continue;
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z);
      if (Math.abs(pts[i].y - pts[j].y) < 4 && d < worst.d) worst = { d, a: pts[i].s, b: pts[j].s };
    }
  }
  let maxGrade = 0;
  for (let i = 1; i < pts.length; i++) {
    const run = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    if (run > 1e-6) maxGrade = Math.max(maxGrade, Math.abs(pts[i].y - pts[i - 1].y) / run);
  }
  const ys = pts.map((p) => p.y);
  console.log(
    `${L.id.padEnd(8)} 길이 ${tr.path.length.toFixed(1)}m · 끝 틈 ${gap.toFixed(2)}m (dx ${(e.position.x - t.start.x).toFixed(2)}, dz ${(e.position.z - t.start.z).toFixed(2)}) · 방향 차 ${dh.toFixed(3)} · 끝 높이 ${e.y.toFixed(2)}`,
  );
  console.log(
    `         높이 ${Math.min(...ys).toFixed(1)}~${Math.max(...ys).toFixed(1)}m · 최대 기울기 ${(maxGrade * 100).toFixed(0)}% (${((Math.atan(maxGrade) * 180) / Math.PI).toFixed(1)}°) · 가장 가까운 남의 길 ${worst.d.toFixed(1)}m (s ${worst.a?.toFixed(0)} ↔ ${worst.b?.toFixed(0)}, 폭 ${t.width})`,
  );
}
