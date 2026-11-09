// 프로파일 → 회전체 메쉬. 담당: 최수정
// BufferGeometry를 직접 생성하여 정점, 법선, UV, 인덱스, 캡을 수학적으로 계산합니다.
import * as THREE from 'three';
import { PLAYER_SIZE } from '../shared/contracts.js';

/**
 * Y축을 회전축으로 하는 회전체 메쉬 생성.
 * - 프로파일 점 배열을 Y축 중심으로 segments만큼 회전하여 원주형 표면 생성
 * - 해석적 법선(analytical normals) 및 UV 계산
 * - 상단/하단 r=0 중심 캡 생성 (독립 법선으로 선명한 엣지 보장)
 *
 * @param {import('../shared/contracts.js').Profile} profile 길이 PROFILE_POINTS의 { r, y } 배열
 * @param {number} segments 원주 분할 수 (8 ~ 64)
 * @returns {THREE.BufferGeometry}
 */
export function buildLatheGeometry(profile, segments) {
  if (!profile || profile.length < 2) {
    throw new Error('profile must have at least 2 points');
  }

  const segs = Math.max(3, Math.floor(segments));
  const scale = PLAYER_SIZE / 2; // r 최대 1.0 -> 최대 지름 PLAYER_SIZE
  const pointCount = profile.length;

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // 1. 프로파일 2D 접선 및 법선 (r, y 평면) 사전 계산
  // curve tangent T = (dr, dy), outward normal N2D = (dy, -dr) / length
  const n2d = [];
  for (let i = 0; i < pointCount; i++) {
    let dr;
    let dy;
    if (i === 0) {
      dr = (profile[1].r - profile[0].r) * scale;
      dy = (profile[1].y - profile[0].y) * PLAYER_SIZE;
    } else if (i === pointCount - 1) {
      dr = (profile[i].r - profile[i - 1].r) * scale;
      dy = (profile[i].y - profile[i - 1].y) * PLAYER_SIZE;
    } else {
      dr = (profile[i + 1].r - profile[i - 1].r) * scale;
      dy = (profile[i + 1].y - profile[i - 1].y) * PLAYER_SIZE;
    }

    const len = Math.hypot(dr, dy);
    if (len > 1e-6) {
      n2d.push({ nr: dy / len, ny: -dr / len });
    } else {
      n2d.push({ nr: 1, ny: 0 });
    }
  }

  // 2. 측면(Body) 정점, 법선, UV 생성
  // 그리드 크기: pointCount * (segs + 1)
  const phiStep = (Math.PI * 2) / segs;

  for (let i = 0; i < pointCount; i++) {
    const pt = profile[i];
    const r = pt.r * scale;
    const y = pt.y * PLAYER_SIZE;
    const { nr, ny } = n2d[i];
    const v = i / (pointCount - 1);

    for (let j = 0; j <= segs; j++) {
      const phi = j * phiStep;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      // 위치
      positions.push(r * sinPhi, y, r * cosPhi);

      // 법선 (외측 방향)
      normals.push(nr * sinPhi, ny, nr * cosPhi);

      // UV
      uvs.push(j / segs, v);
    }
  }

  // 3. 측면 인덱스 구성 (CCW 전면)
  const cols = segs + 1;
  for (let i = 0; i < pointCount - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      const c = (i + 1) * cols + (j + 1);
      const d = i * cols + (j + 1);

      // a -> d -> c, a -> c -> b (CCW)
      indices.push(a, d, c);
      indices.push(a, c, b);
    }
  }

  // 4. 하단 캡 (Bottom Cap, y = profile[0].y, 법선 (0, -1, 0))
  const botY = profile[0].y * PLAYER_SIZE;
  const botR = profile[0].r * scale;
  const botCenterIdx = positions.length / 3;

  // 중심 정점
  positions.push(0, botY, 0);
  normals.push(0, -1, 0);
  uvs.push(0.5, 0.5);

  // 둘레 정점
  const botRimStartIdx = positions.length / 3;
  for (let j = 0; j <= segs; j++) {
    const phi = j * phiStep;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    positions.push(botR * sinPhi, botY, botR * cosPhi);
    normals.push(0, -1, 0);
    uvs.push(0.5 + 0.5 * sinPhi, 0.5 + 0.5 * cosPhi);
  }

  // 하단 캡 삼각형 인덱스 (외측에서 볼 때 CCW)
  for (let j = 0; j < segs; j++) {
    indices.push(botCenterIdx, botRimStartIdx + j, botRimStartIdx + j + 1);
  }

  // 5. 상단 캡 (Top Cap, y = profile[last].y, 법선 (0, 1, 0))
  const topY = profile[pointCount - 1].y * PLAYER_SIZE;
  const topR = profile[pointCount - 1].r * scale;
  const topCenterIdx = positions.length / 3;

  // 중심 정점
  positions.push(0, topY, 0);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);

  // 둘레 정점
  const topRimStartIdx = positions.length / 3;
  for (let j = 0; j <= segs; j++) {
    const phi = j * phiStep;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    positions.push(topR * sinPhi, topY, topR * cosPhi);
    normals.push(0, 1, 0);
    uvs.push(0.5 + 0.5 * sinPhi, 0.5 + 0.5 * cosPhi);
  }

  // 상단 캡 삼각형 인덱스 (위에서 볼 때 CCW)
  for (let j = 0; j < segs; j++) {
    indices.push(topCenterIdx, topRimStartIdx + j + 1, topRimStartIdx + j);
  }

  // 6. Three.js BufferGeometry 어셈블
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}
