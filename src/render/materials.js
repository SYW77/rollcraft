// 공용 재질. 담당: 최수정
// 트랙, 벽, 장애물, 골, 플레이어 머티리얼 정의
// 구름 속도감과 3D 입체감을 직관적으로 느낄 수 있도록 절차적 텍스처 및 PBR 튜닝 적용
import * as THREE from 'three';

let cache = null;

/**
 * 트랙 주행 시 속도감과 타일 감각을 제공하는 절차적 격자 텍스처
 */
function createTrackGridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // 베이스 다크 슬레이트
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(0, 0, 256, 256);

  // 내부 타일 패널
  ctx.fillStyle = '#334155';
  ctx.fillRect(4, 4, 248, 248);

  // 그리드 테두리
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 248);

  // 중앙 차선 점선 (진행 방향 인지)
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 6;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 회전체가 굴러갈 때 회전 스핀(Angular Velocity)을 명확히 볼 수 있는 줄무늬 텍스처
 */
function createPlayerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // 선명한 스포츠 레드 베이스
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(0, 0, 512, 256);

  // 둘레 방향(u) 회전 스트라이프 (구를 때 회전이 선명하게 회전함)
  ctx.fillStyle = '#be123c';
  for (let x = 0; x < 512; x += 64) {
    ctx.fillRect(x, 0, 32, 256);
  }

  // 액센트 화이트 핀스트라이프
  ctx.fillStyle = '#ffffff';
  for (let x = 0; x < 512; x += 128) {
    ctx.fillRect(x, 0, 6, 256);
  }

  // 높이 방향(v) 중앙 가이드 링
  ctx.fillStyle = '#fde047'; // 골드 링
  ctx.fillRect(0, 122, 512, 12);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * @returns {{ track: THREE.Material, wall: THREE.Material, obstacle: THREE.Material, goal: THREE.Material, player: THREE.Material }}
 */
export function getMaterials() {
  if (!cache) {
    const trackTex = createTrackGridTexture();
    const playerTex = createPlayerTexture();

    cache = {
      track: new THREE.MeshStandardMaterial({
        map: trackTex,
        roughness: 0.75,
        metalness: 0.1,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
        metalness: 0.2,
      }),
      obstacle: new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // 시인성이 높은 주황/경고색
        roughness: 0.35,
        metalness: 0.25,
      }),
      goal: new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.75,
        roughness: 0.2,
      }),
      player: new THREE.MeshStandardMaterial({
        map: playerTex,
        roughness: 0.35,
        metalness: 0.2,
      }),
    };
  }
  return cache;
}
