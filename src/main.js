// 상태머신 PLAY → CLEAR/OVER, 키 입력, 모듈 연결. 담당: 손연우
//
// Draw Climber 방식: 시작하면 바로 PLAY. 플레이어는 다리 없는 블록 고양이로 출발하고,
// 화면 아래 그리기 칸(ui/legPad)에 선을 그리면 그 선이 양옆 다리가 되어 돈다.
// 달리는 중 다시 그리면 그 자리에서 다리를 바꾼다 (그리는 동안은 시간이 느려진다).
// (예전 흐름: EDIT 단면 에디터 → PLAY, 작업대 F 변신. STATES.EDIT은 계약이라 남겨 두고 쓰지 않는다.)
import * as THREE from 'three';
import { EVENTS, STATES } from './shared/contracts.js';
import { createEmitter } from './shared/events.js';
import { setupLighting } from './render/lighting.js';
import { getMaterials } from './render/materials.js';
import { setupEnvironment } from './render/environment.js';
import { createHud } from './ui/hud.js';
import { showGameOver } from './ui/gameOver.js';
import { showClear } from './ui/clear.js';
import { createLegPad } from './ui/legPad.js';
import { createPhysicsWorld } from './physics/physicsWorld.js';
import { createClimber } from './physics/climber.js';
import { createTriggers } from './physics/triggers.js';
import { buildStage } from './stage/buildStage.js';
import { createCameraFollow } from './stage/cameraFollow.js';

const $game = document.getElementById('game');
const $ui = document.getElementById('ui');

// 그리는 동안 시간 배율 (Draw Climber처럼 느려진다)
const DRAW_TIME_SCALE = 0.2;
const PLAY_STATUS =
  'W 달리기 · A/D 방향 · 아래 칸에 다리 그리기 (달리면서 다시 그려도 돼요) · R 재시작';

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
  if (e.repeat) return;
  if (e.code === 'KeyR') events.emit(EVENTS.RETRY);
  // E: 클리어 · 게임오버 화면에서 다리를 지우고 처음부터
  if (e.code === 'KeyE' && (state === STATES.CLEAR || state === STATES.OVER)) {
    events.emit(EVENTS.EDIT);
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const readInput = () => ({
  forward: keys.has('KeyW') || keys.has('ArrowUp'),
  back: keys.has('KeyS') || keys.has('ArrowDown'),
  left: keys.has('KeyA') || keys.has('ArrowLeft'),
  right: keys.has('KeyD') || keys.has('ArrowRight'),
});

// ── 상태 ──────────────────────────────────────────────────────────
let state = null;
let overlay = null;
let session = null; // { physics, stage, player, triggers, cameraFollow, hud, pad }
/** @type {import('./shared/contracts.js').Legs} */
let legs = []; // 지금 다리 (재시작해도 유지)
let drawing = false;
let elapsed = 0;

function makePlayer(physics, stage) {
  return createClimber({ stroke: legs, world: physics.world, scene, spawn: stage.spawn });
}

function startSession() {
  endSession();
  const physics = createPhysicsWorld();
  const stage = buildStage({ scene, world: physics.world, events, materials });
  const player = makePlayer(physics, stage);
  const triggers = createTriggers({ events, zones: stage.zones });
  // heading은 트랙 중심선을 따라간다 (stage.path). 클라이머는 다리 축을 heading 옆으로 맞춘다.
  const cameraFollow = createCameraFollow(camera, {
    path: stage.path,
    heading: stage.spawn.heading,
  });
  const hud = createHud($ui);
  const pad = createLegPad($ui, events);
  session = { physics, stage, player, triggers, cameraFollow, hud, pad };
  enterPlay();
}

function enterPlay() {
  overlay?.destroy();
  overlay = null;
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
  if (!session) return;
  session.pad.destroy();
  session.hud.destroy();
  session.triggers.dispose();
  session.player.dispose();
  session.stage.dispose();
  session = null;
}

/** 다리를 바꾼다. 달리는 중이면 지금 위치 · 속도를 이어받고, 아니면 다음 재시작부터 쓴다. */
function swapLegs() {
  const { physics, stage } = session;
  const old = session.player;
  const snap = state === STATES.PLAY ? old.snapshot() : null;
  old.dispose();
  session.player = makePlayer(physics, stage);
  if (snap) session.player.restore(snap);
  else session.player.reset(stage.spawn);
}

events.on(EVENTS.LEGS, (next) => {
  legs = next;
  if (session) swapLegs();
});
events.on(EVENTS.DRAWING, (on) => {
  drawing = !!on;
});
events.on(EVENTS.RETRY, () => session && enterPlay());
// "모양 바꾸기"(E): 다리를 지우고 처음부터 다시 그린다
events.on(EVENTS.EDIT, () => {
  if (!session) return;
  legs = [];
  session.pad.clear();
  swapLegs();
  enterPlay();
});
events.on(EVENTS.GOAL, () => {
  state = STATES.CLEAR;
  overlay = showClear($ui, events, { time: elapsed });
});
events.on(EVENTS.FALL, () => {
  state = STATES.OVER;
  overlay = showGameOver($ui, events);
});

startSession();

// ── 게임 루프 ─────────────────────────────────────────────────────
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const realDt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (session) {
    const { physics, stage, triggers, cameraFollow, hud } = session;
    const player = session.player; // 다리 교체로 바뀔 수 있어 매 프레임 다시 읽는다
    if (state === STATES.PLAY) {
      const dt = drawing ? realDt * DRAW_TIME_SCALE : realDt;
      physics.step(dt);
      const heading = cameraFollow.getHeading();
      player.update(dt, readInput(), heading);
      stage.update(dt, player);
      elapsed += dt;
      hud.setTime(elapsed);
      triggers.update(player.getPosition());
    }
    const p = player.getPosition();
    cameraFollow.update(realDt, p);
    lighting.update(p);
  }

  renderer.render(scene, camera);
});
