// 결승선 (서킷): 바닥 체크무늬 띠 + 머리 위 아치. 충돌 없음 (보이기만). 담당: 손연우
// 아치는 다리가 큰 클라이머도 안 닿게 높이 둔다.
import * as THREE from 'three';

const DEFAULTS = {
  width: 5, // 트랙 폭
  depth: 1.2, // 체크무늬 띠 진행 방향 길이
  archHeight: 4.2,
  label: 'FINISH',
};

// 헤드리스 검증(Node)에는 document가 없다 → 텍스처 없이 만든다
const canDraw = typeof document !== 'undefined';

function checkerTexture() {
  if (!canDraw) return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const g = c.getContext('2d');
  const n = 16;
  const s = c.width / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 4; j++) {
      g.fillStyle = (i + j) % 2 ? '#ffffff' : '#13213f';
      g.fillRect(i * s, j * (c.height / 4), s, c.height / 4);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

function labelTexture(text) {
  if (!canDraw) return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#1f5eff';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#ffd23f';
  g.fillRect(0, c.height - 10, c.width, 10);
  g.font = 'italic 900 64px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.fillText(text, c.width / 2, c.height / 2 - 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * @param {{ scene, world, events, materials, origin: {x,y,z}, heading: {x,z}, params: object }} ctx
 * @returns {{ dispose(): void }}
 */
export function create({ scene, origin, heading, params }) {
  const p = { ...DEFAULTS, ...params };
  const group = new THREE.Group();
  group.position.set(origin.x, origin.y, origin.z);
  group.rotation.y = Math.atan2(-heading.x, -heading.z); // 로컬 −Z → 진행 방향

  const stripTex = checkerTexture();
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(p.width, p.depth),
    new THREE.MeshStandardMaterial({ map: stripTex, roughness: 0.8 }),
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.y = 0.01;
  strip.receiveShadow = true;
  group.add(strip);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x13213f });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, p.archHeight, 0.3), postMat);
    post.position.set(side * (p.width / 2 + 0.4), p.archHeight / 2, 0);
    post.castShadow = true;
    group.add(post);
  }
  const labelTex = labelTexture(p.label);
  const bannerMats = [postMat, postMat, postMat, postMat];
  const front = new THREE.MeshStandardMaterial({ map: labelTex });
  bannerMats.push(front, front); // BoxGeometry 면 순서: +x, -x, +y, -y, +z, -z
  const banner = new THREE.Mesh(new THREE.BoxGeometry(p.width + 1.1, 0.9, 0.2), bannerMats);
  banner.position.y = p.archHeight - 0.2;
  banner.castShadow = true;
  group.add(banner);

  scene.add(group);
  return {
    dispose() {
      scene.remove(group);
      group.traverse((o) => o.geometry?.dispose());
      stripTex?.dispose();
      labelTex?.dispose();
      postMat.dispose();
      front.dispose();
      strip.material.dispose();
    },
  };
}
