// 상태머신 EDIT → PLAY → CLEAR/OVER, 키 입력, 모듈 연결. 담당: 손연우
import * as THREE from 'three';
import { EVENTS, STATES } from './shared/contracts.js';
import { createEmitter } from './shared/events.js';
import { createShapeEditor } from './editor/ShapeEditor.js';
import { buildLatheGeometry } from './editor/latheGeometry.js';
import { setupLighting } from './render/lighting.js';
import { getMaterials } from './render/materials.js';
import { setupEnvironment } from './render/environment.js';
import { createHud } from './ui/hud.js';
import { showGameOver } from './ui/gameOver.js';
import { showClear } from './ui/clear.js';
import { createPhysicsWorld } from './physics/physicsWorld.js';
import { createPlayer } from './physics/PlayerBody.js';
import { createTriggers } from './physics/triggers.js';
import { buildStage } from './stage/buildStage.js';
import { createCameraFollow } from './stage/cameraFollow.js';

const $game = document.getElementById('game');
const $ui = document.getElementById('ui');
const $editor = document.getElementById('editor');

// ── 공용 렌더링 객체 (게임 전체에서 하나) ─────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
$game.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
setupEnvironment(scene);
const lighting = setupLighting({ scene, renderer });
const materials = getMaterials();
const events = createEmitter();

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ── 키 입력 ───────────────────────────────────────────────────────
const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyR' && state !== STATES.EDIT) events.emit(EVENTS.RETRY);
});
addEventListener('keyup', (e) => keys.delete(e.code));
const readInput = () => ({
  forward: keys.has('KeyW') || keys.has('ArrowUp'),
  back: keys.has('KeyS') || keys.has('ArrowDown'),
  left: keys.has('KeyA') || keys.has('ArrowLeft'),
  right: keys.has('KeyD') || keys.has('ArrowRight'),
});

// ── 상태 ──────────────────────────────────────────────────────────
let state = null;
let editor = null;
let overlay = null;
let session = null; // PLAY 중 생성되는 것들 { physics, stage, player, triggers, cameraFollow, hud }
let lastShape = null; // { profile, segments }
let elapsed = 0;

function enterEdit() {
  endSession();
  state = STATES.EDIT;
  editor = createShapeEditor($editor, {
    initialProfile: lastShape?.profile,
    onConfirm: (shape) => events.emit(EVENTS.CONFIRM, shape),
  });
}

function startSession(shape) {
  editor?.destroy();
  editor = null;
  endSession();
  lastShape = shape;

  const physics = createPhysicsWorld();
  const stage = buildStage({ scene, world: physics.world, events, materials });
  const player = createPlayer({
    profile: shape.profile,
    geometry: buildLatheGeometry(shape.profile, shape.segments),
    world: physics.world,
    scene,
    spawn: stage.spawn,
    material: materials.player,
  });
  const triggers = createTriggers({ events, zones: stage.zones });
  // heading은 트랙 중심선을 따라간다 (stage.path)
  const cameraFollow = createCameraFollow(camera, {
    path: stage.path,
    heading: stage.spawn.heading,
  });
  const hud = createHud($ui);

  session = { physics, stage, player, triggers, cameraFollow, hud };
  enterPlay();
}

function enterPlay() {
  overlay?.destroy();
  overlay = null;
  elapsed = 0;
  session.player.reset(session.stage.spawn);
  session.triggers.reset();
  session.cameraFollow.snap(session.player.getPosition());
  session.hud.setStatus('W/S 구르기 · A/D 조향 · R 재시작');
  state = STATES.PLAY;
}

function endSession() {
  overlay?.destroy();
  overlay = null;
  if (!session) return;
  session.hud.destroy();
  session.triggers.dispose();
  session.player.dispose();
  session.stage.dispose();
  session = null;
}

events.on(EVENTS.CONFIRM, startSession);
events.on(EVENTS.RETRY, () => session && enterPlay());
events.on(EVENTS.EDIT, enterEdit);
events.on(EVENTS.GOAL, () => {
  state = STATES.CLEAR;
  overlay = showClear($ui, events, { time: elapsed });
});
events.on(EVENTS.FALL, () => {
  state = STATES.OVER;
  overlay = showGameOver($ui, events);
});

// ── 게임 루프 ─────────────────────────────────────────────────────
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (session) {
    const { physics, stage, player, triggers, cameraFollow, hud } = session;
    if (state === STATES.PLAY) {
      physics.step(dt);
      const heading = cameraFollow.getHeading();
      player.update(dt, readInput(), heading);
      stage.update(dt, player);
      elapsed += dt;
      hud.setTime(elapsed);
      triggers.update(player.getPosition());
    }
    const p = player.getPosition();
    cameraFollow.update(dt, p);
    lighting.update(p);
  }

  renderer.render(scene, camera);
});

enterEdit();
