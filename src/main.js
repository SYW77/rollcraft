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
import { showWorkbench } from './ui/workbenchOverlay.js';
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
  if (state === STATES.EDIT || e.repeat) return;
  if (e.code === 'Escape' && workbench) closeWorkbench(); // 작업대 취소 → 그대로 재개
  if (e.code === 'KeyF' && state === STATES.PLAY && nearPad && !workbench) openWorkbench(nearPad);
  if (e.code === 'KeyR') events.emit(EVENTS.RETRY);
  // E: 클리어 · 게임오버 화면에서만 모양 설정으로 (주행 중 변신은 작업대 F로 한다)
  if (e.code === 'KeyE' && (state === STATES.CLEAR || state === STATES.OVER)) {
    events.emit(EVENTS.EDIT);
  }
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
// 변신 작업대(P1): 패드에 올라오면 안내만 하고, F를 눌러야 연다 (그냥 지나가면 흐름이 안 끊김).
// 열려 있는 동안 PLAY 상태 그대로 물리 · 시간만 멈춘다 (STATES는 계약이라 늘리지 않음)
let nearPad = null; // 지금 올라와 있는 패드 { position, heading, contains(pos) } (stage가 보낸 값)
let workbench = null; // showWorkbench() 핸들
let workbenchAt = null; // 열려 있는 작업대의 패드
const PLAY_STATUS = 'W/S 구르기 · A/D 조향 · R 재시작 · 작업대에서 F 변신';
const PAD_STATUS = '🔧 변신 작업대 · F 눌러 모양 바꾸기 (그냥 지나가도 돼요)';

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
  hud.setStatus(PLAY_STATUS);

  session = { physics, stage, player, triggers, cameraFollow, hud };
  enterPlay();
}

function enterPlay() {
  overlay?.destroy();
  overlay = null;
  closeWorkbench();
  nearPad = null;
  session.hud.setStatus(PLAY_STATUS);
  elapsed = 0;
  session.player.reset(session.stage.spawn);
  session.triggers.reset();
  session.cameraFollow.snap(session.player.getPosition());
  state = STATES.PLAY;
}

function endSession() {
  overlay?.destroy();
  overlay = null;
  closeWorkbench();
  nearPad = null;
  if (!session) return;
  session.hud.destroy();
  session.triggers.dispose();
  session.player.dispose();
  session.stage.dispose();
  session = null;
}

// ── 변신 작업대 (P1) ──────────────────────────────────────────────
function openWorkbench(at) {
  workbenchAt = at ?? null;
  workbench = showWorkbench($ui, events, lastShape);
  session.hud.setStatus('변신 작업대: 모양을 고르고 확정 · Esc 취소');
}

function closeWorkbench() {
  if (!workbench) return;
  workbench.destroy();
  workbench = null;
  workbenchAt = null;
  keys.clear(); // 에디터에서 누른 키가 주행 입력으로 남지 않게
  session?.hud.setStatus(nearPad ? PAD_STATUS : PLAY_STATUS); // 취소하면 아직 패드 위일 수 있음
}

/** 기존 플레이어를 지우고 작업대 위치에서 새 모양으로 다시 만든다 (속도 0). */
function transformInPlace(shape) {
  const old = session.player;
  const at = workbenchAt ?? {
    position: old.getPosition(),
    heading: session.cameraFollow.getHeading(),
  };
  old.dispose();
  session.player = createPlayer({
    profile: shape.profile,
    geometry: buildLatheGeometry(shape.profile, shape.segments),
    world: session.physics.world,
    scene,
    spawn: {
      // 높이는 레벨 스폰과 같게 (새 모양이 바닥에 박히지 않도록 살짝 위에서 떨어뜨림)
      position: new THREE.Vector3(at.position.x, session.stage.spawn.position.y, at.position.z),
      heading: { ...at.heading },
    },
    material: materials.player,
  });
  closeWorkbench();
}

// 패드에 올라옴 → 안내만. 실제로 여는 건 F키 (위 keydown)
events.on(EVENTS.WORKBENCH_ENTER, (pad) => {
  if (state !== STATES.PLAY || !session || workbench) return;
  nearPad = pad;
  session.hud.setStatus(PAD_STATUS);
});

/** 매 프레임: 패드에서 내려왔으면 안내를 거둔다 */
function updatePadHint(playerPos) {
  if (!nearPad || nearPad.contains?.(playerPos) !== false) return;
  nearPad = null;
  session.hud.setStatus(PLAY_STATUS);
}

events.on(EVENTS.CONFIRM, (shape) => {
  const next = { profile: shape.profile, segments: shape.segments };
  if (shape.inPlace && session && workbench) {
    lastShape = next; // 재시작(R)해도 바뀐 모양으로 처음부터
    transformInPlace(next);
  } else {
    startSession(next);
  }
});
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
    if (state === STATES.PLAY && !workbench) {
      physics.step(dt);
      const heading = cameraFollow.getHeading();
      player.update(dt, readInput(), heading);
      stage.update(dt, player);
      elapsed += dt;
      hud.setTime(elapsed);
      triggers.update(player.getPosition());
      updatePadHint(player.getPosition());
    }
    const p = player.getPosition();
    cameraFollow.update(dt, p);
    lighting.update(p);
  }

  renderer.render(scene, camera);
});

enterEdit();
