// 콜라이더 와이어프레임 디버그 뷰. 담당: 원유승
// body에 붙은 볼록 다면체 콜라이더(원뿔대 등)를 선으로 그려 메쉬와 실제 충돌 모양을 비교한다.
import * as THREE from 'three';

/**
 * @param {{ body: import('cannon-es').Body, scene: THREE.Scene, color?: number }} opts
 * @returns {{ setVisible(v: boolean): void, update(): void, dispose(): void }}
 */
export function createDebugView({ body, scene, color = 0x00c0ff }) {
  const root = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true });

  body.shapes.forEach((shape, i) => {
    if (!shape.vertices || !shape.faces) return; // 볼록 다면체만
    const pos = [];
    for (const face of shape.faces) {
      for (let k = 0; k < face.length; k++) {
        const a = shape.vertices[face[k]];
        const b = shape.vertices[face[(k + 1) % face.length]];
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(geo, material);
    lines.renderOrder = 999;
    lines.position.copy(body.shapeOffsets[i]);
    lines.quaternion.copy(body.shapeOrientations[i]);
    root.add(lines);
  });
  scene.add(root);

  return {
    setVisible(v) {
      root.visible = v;
    },
    update() {
      root.position.copy(body.position);
      root.quaternion.copy(body.quaternion);
    },
    dispose() {
      scene.remove(root);
      root.children.forEach((c) => c.geometry.dispose());
      material.dispose();
    },
  };
}
