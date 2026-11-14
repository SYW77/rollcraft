// 에디터 3D 미리보기 (별도 WebGLRenderer). 담당: 최수정
// 회전체를 게임과 같은 플레이어 재질로 보여 주고, 회전 · 와이어프레임을 켜고 끈다.
// destroy 때 dispose + forceContextLoss로 WebGL 컨텍스트를 돌려준다 (작업대에서 여러 번 열림).
import * as THREE from 'three';
import { buildLatheGeometry } from './latheGeometry.js';
import { PLAYER_SIZE } from '../shared/contracts.js';
import { getMaterials } from '../render/materials.js';

/**
 * @param {HTMLElement} container
 * @returns {{ setShape(profile: any, segments: number): void, toggleWireframe(): boolean, destroy(): void }}
 */
export function createEditorPreview(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ed-preview-wrap';

  // 캔버스 컨테이너
  const viewport = document.createElement('div');
  viewport.className = 'ed-preview';
  wrapper.appendChild(viewport);

  // 컨트롤 툴바 (와이어프레임 토글, 회전 토글)
  const toolbar = document.createElement('div');
  toolbar.className = 'ed-preview-tools';
  toolbar.innerHTML = `
    <button type="button" class="ed-tool-btn ed-btn-wire">와이어프레임</button>
    <button type="button" class="ed-tool-btn ed-btn-spin ed-active">회전</button>
  `;
  wrapper.appendChild(toolbar);
  container.appendChild(wrapper);

  const width = 320;
  const height = 240;

  // 1. Scene & Camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfbf8f2); // 패널 종이색과 맞춘다

  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
  camera.position.set(0, 0.7, 2.2);
  camera.lookAt(0, PLAYER_SIZE * 0.5, 0);

  // 2. 조명: 게임과 같은 따뜻한 햇빛 하나 + 반구광
  scene.add(new THREE.HemisphereLight(0xf6eee2, 0x6b5440, 1.1));
  const sun = new THREE.DirectionalLight(0xffe4c4, 1.8);
  sun.position.set(2, 4, 3);
  scene.add(sun);

  // 3. Grid / Axis Helper (바닥 기준면)
  const grid = new THREE.GridHelper(2, 10, 0xc9bfae, 0xe4dccf);
  grid.position.y = 0;
  scene.add(grid);

  // 4. Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.appendChild(renderer.domElement);

  // 5. Material & Mesh
  // 게임 플레이어 재질을 복제 (텍스처는 공유, dispose해도 원본 텍스처는 남는다)
  const material = getMaterials().player.clone();
  material.side = THREE.DoubleSide;

  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x2a241f,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });

  const meshGroup = new THREE.Group();
  scene.add(meshGroup);

  let solidMesh = null;
  let wireOverlayMesh = null;
  let showWireframe = false;
  let autoRotate = true;

  // 6. 마우스 드래그로 시점 회전 (Orbit 조작)
  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;

  const onPointerDown = (e) => {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevMouseX;
    const dy = e.clientY - prevMouseY;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;

    meshGroup.rotation.y += dx * 0.01;
    meshGroup.rotation.x = Math.max(-0.5, Math.min(0.5, meshGroup.rotation.x + dy * 0.01));
  };

  const onPointerUp = () => {
    isDragging = false;
  };

  viewport.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // 버튼 이벤트
  const wireBtn = toolbar.querySelector('.ed-btn-wire');
  wireBtn.onclick = () => {
    showWireframe = !showWireframe;
    wireBtn.classList.toggle('ed-active', showWireframe);
    if (wireOverlayMesh) wireOverlayMesh.visible = showWireframe;
  };

  const spinBtn = toolbar.querySelector('.ed-btn-spin');
  spinBtn.onclick = () => {
    autoRotate = !autoRotate;
    spinBtn.classList.toggle('ed-active', autoRotate);
  };

  // 7. 렌더 루프
  let animId = null;
  let last = performance.now();

  function animate(now = performance.now()) {
    animId = requestAnimationFrame(animate);
    const delta = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (autoRotate && !isDragging) {
      meshGroup.rotation.y += delta * 0.8;
    }

    renderer.render(scene, camera);
  }
  animate();

  function updateMeshes(geometry) {
    if (solidMesh) {
      meshGroup.remove(solidMesh);
      solidMesh.geometry.dispose();
    }
    if (wireOverlayMesh) {
      meshGroup.remove(wireOverlayMesh);
      wireOverlayMesh.geometry.dispose();
    }

    solidMesh = new THREE.Mesh(geometry, material);
    meshGroup.add(solidMesh);

    // 분할선이 선명하게 보이도록 와이어프레임 오버레이 추가
    wireOverlayMesh = new THREE.Mesh(geometry, wireMaterial);
    wireOverlayMesh.visible = showWireframe;
    meshGroup.add(wireOverlayMesh);
  }

  return {
    setShape(profile, segments) {
      if (!profile || profile.length < 2) return;
      const geom = buildLatheGeometry(profile, segments);
      updateMeshes(geom);
    },

    toggleWireframe() {
      wireBtn.click();
      return showWireframe;
    },

    destroy() {
      if (animId) cancelAnimationFrame(animId);

      viewport.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (solidMesh) solidMesh.geometry.dispose();
      if (wireOverlayMesh) wireOverlayMesh.geometry.dispose();
      material.dispose();
      wireMaterial.dispose();
      grid.geometry.dispose();
      grid.material.dispose();

      // 컨텍스트 누수 방지 (dispose + forceContextLoss)
      renderer.dispose();
      renderer.forceContextLoss();

      wrapper.remove();
    },
  };
}
