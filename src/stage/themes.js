// 맵 테마: 하늘 · 안개 · 땅 · 트랙 재질. 담당: 손연우
// 레벨의 theme(id)로 고른다. 재질은 테마마다 따로 만들고 dispose()로 지운다.
// 헤드리스 검증(Node)에는 document가 없다 → 텍스처 없이 색만 쓴다.
import * as THREE from 'three';

/**
 * @typedef {{ id: string, sky: number, fogNear: number, fogFar: number, ground: number,
 *             road: number, line: number, edge: number, wall: number, obstacle: number, skirt: number,
 *             hemiGround?: number }} Theme
 */

/** @type {Record<string, Theme>} */
export const THEMES = {
  meadow: {
    id: 'meadow',
    sky: 0x9fd4f5,
    fogNear: 45,
    fogFar: 150,
    ground: 0x79c25e,
    road: 0x7d8594,
    line: 0xf4f1e8,
    edge: 0xe8503a,
    wall: 0xf4f1e8,
    obstacle: 0xff8a3d,
    skirt: 0x8b6b4a,
  },
  desert: {
    id: 'desert',
    sky: 0xf6dcae,
    fogNear: 40,
    fogFar: 140,
    ground: 0xe3b577,
    road: 0xb9804c,
    line: 0xf7e2b5,
    edge: 0x7a3f22,
    wall: 0xa25d35,
    obstacle: 0x2fa7a0,
    skirt: 0xb06d3c,
  },
  snow: {
    id: 'snow',
    sky: 0xcfe3f2,
    fogNear: 35,
    fogFar: 130,
    ground: 0xf3f7fb,
    road: 0x6d88a2,
    line: 0xe9f4ff,
    edge: 0x2f4f73,
    wall: 0xe6f0f8,
    obstacle: 0xe0435a,
    skirt: 0x9db3c8,
  },
};

const canDraw = typeof document !== 'undefined';
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

/** 길 텍스처: 바탕색 + 양쪽 가장자리 띠 + 가운데 점선 */
function roadTexture(t) {
  if (!canDraw) return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = hex(t.road);
  g.fillRect(0, 0, 128, 128);
  // 잔무늬 (밋밋하지 않게)
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  g.fillStyle = hex(t.edge);
  g.fillRect(0, 0, 8, 128);
  g.fillRect(120, 0, 8, 128);
  g.fillStyle = hex(t.line);
  g.fillRect(8, 0, 3, 128);
  g.fillRect(117, 0, 3, 128);
  g.fillRect(62, 0, 4, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * 테마 재질과 하늘 · 안개를 씬에 건다.
 * @param {THREE.Scene} scene
 * @param {string} id
 * @returns {{ theme: Theme, materials: Record<string, THREE.Material>, dispose(): void }}
 */
export function applyTheme(scene, id) {
  const t = THEMES[id] ?? THEMES.meadow;
  const map = roadTexture(t);
  const materials = {
    track: new THREE.MeshStandardMaterial(
      map ? { map, roughness: 0.85 } : { color: t.road, roughness: 0.85 },
    ),
    wall: new THREE.MeshStandardMaterial({ color: t.wall, roughness: 0.7 }),
    obstacle: new THREE.MeshStandardMaterial({ color: t.obstacle, roughness: 0.45 }),
    skirt: new THREE.MeshStandardMaterial({ color: t.skirt, roughness: 0.95 }),
    ground: new THREE.MeshStandardMaterial({ color: t.ground, roughness: 1 }),
  };
  const prev = { background: scene.background, fog: scene.fog };
  const sky = new THREE.Color(t.sky);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, t.fogNear, t.fogFar);
  return {
    theme: t,
    materials,
    dispose() {
      scene.background = prev.background;
      scene.fog = prev.fog;
      Object.values(materials).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
  };
}
