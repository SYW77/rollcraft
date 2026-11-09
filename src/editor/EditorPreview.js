// 에디터 3D 미리보기 (별도 WebGLRenderer). 담당: 최수정
// 회전체 메쉬를 실시간으로 렌더링하고, 회전/와이어프레임 토글을 지원합니다.
// destroy 시 dispose + forceContextLoss 처리로 WebGL 컨텍스트 누수를 방지합니다.
import * as THREE from 'three';
import { buildLatheGeometry } from './latheGeometry.js';
import { PLAYER_SIZE } from '../shared/contracts.js';

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
  scene.background = new THREE.Color(0x18181b); // 깔끔한 다크 테마

  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
  camera.position.set(0, 0.7, 2.2);
  camera.lookAt(0, PLAYER_SIZE * 0.5, 0);

  // 2. Lighting (곡면과 법선이 선명하게 보이도록 구성)
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
  dirLight1.position.set(2, 4, 3);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 1.0); // 푸른 반사광
  dirLight2.position.set(-3, -1, -2);
  scene.add(dirLight2);

  // 3. Grid / Axis Helper (바닥 기준면)
  const grid = new THREE.GridHelper(2, 10, 0x3f3f46, 0x27272a);
  grid.position.y = 0;
  scene.add(grid);

  // 4. Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.appendChild(renderer.domElement);

  // 5. Material & Mesh
  const material = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.2,
    roughness: 0.35,
    wireframe: false,
    side: THREE.DoubleSide,
  });

  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
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
  const clock = new THREE.Clock();

  function animate() {
    animId = requestAnimationFrame(animate);
    const delta = clock.getDelta();

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
