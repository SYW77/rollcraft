// 상태머신 (타이틀 →) 카운트다운 → PLAY → CLEAR/OVER, 키 입력, 모듈 연결. 담당: 손연우
//
// 흐름: 타이틀(싱글 플레이 · 멀티 플레이(준비 중) · 설정 · 게임 종료) → 대기 화면(동물 · 다리 그리기 · 미리보기, 출발!) → 카운트다운 3·2·1 → PLAY → CLEAR/OVER.
// R = 카운트다운부터 재시작, 결과 화면의 "다시 그리기"(E) = 대기 화면으로.
// Esc (또는 오른쪽 위 버튼): 달리는 중 · 카운트다운 중이면 일시정지 메뉴, 클리어 · 게임오버 화면이면 타이틀로.
// 타이틀 · 카운트다운은 STATES에 없다 (계약이라 늘리지 않음). 그동안 state = null이고 물리는 멈춘다.
// Draw Climber 방식: 플레이어는 다리 없는 블록 고양이로 출발하고,
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
import { showTitle, showQuitScreen } from './ui/title.js';
import { loadSettings, showSettings } from './ui/settings.js';
import { showLobby } from './ui/lobby.js';
import { showCountdown } from './ui/countdown.js';
import { createPauseButton, showPauseMenu } from './ui/pauseMenu.js';
import { createPhysicsWorld } from './physics/physicsWorld.js';
import { createClimber } from './physics/climber.js';
import { createTriggers } from './physics/triggers.js';
import { buildStage } from './stage/buildStage.js';
import { circuit1 } from './stage/levels/circuit1.js';
import { createLapCounter } from './stage/laps.js';
import { showBanner } from './ui/banner.js';
import { createCameraFollow } from './stage/cameraFollow.js';

const $game = document.getElementById('game');
const $ui = document.getElementById('ui');

// 그리는 동안 시간 배율 (Draw Climber처럼 느려진다)
const DRAW_TIME_SCALE = 0.2;
const TITLE_ORBIT = { radius: 9, height: 4.5, speed: 0.15 }; // 타이틀 뒤 카메라: 출발 지점 둘레를 천천히 돈다
const PLAY_STATUS = 'W 달리기 · A/D 방향 · R 재시작';

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

// ── 설정 (그림자 · 화질) ──────────────────────────────────────────
let settings = loadSettings();
const PIXEL_RATIO = { high: Math.min(devicePixelRatio, 2), medium: 1, low: 0.75 };
function applySettings(s) {
  renderer.shadowMap.enabled = s.shadows;
  // 그림자를 켜고 끄면 재질 셰이더를 다시 만들어야 한다
  scene.traverse((o) => [].concat(o.material ?? []).forEach((m) => (m.needsUpdate = true)));
  renderer.setPixelRatio(PIXEL_RATIO[s.quality] ?? 1);
  resize();
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
applySettings(settings); // resize도 같이

// ── 키 입력 ───────────────────────────────────────────────────────
const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.repeat || title || lobby) return; // 타이틀 · 대기 화면은 각자 키를 받는다
  if (e.code === 'Escape') onEscape();
  if (pause) return; // 일시정지 중에는 메뉴(Esc · 버튼)만
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
let title = null; // showTitle() 핸들 (타이틀 화면 중)
let countdown = null; // showCountdown() 핸들 (카운트다운 중)
let titleAngle = 0;
let lobby = null; // showLobby() 핸들 (대기 화면 중)
let popup = null; // 타이틀 위에 뜬 설정 · 종료 화면
let animal = 'cat'; // 고른 동물 (climberLook.ANIMALS의 id)
let pause = null; // showPauseMenu() 핸들 (일시정지 중)
let pausedInCountdown = false; // 카운트다운 중에 멈췄으면 계속할 때 카운트다운을 다시 센다

function makePlayer(physics, stage) {
  return createClimber({ stroke: legs, animal, world: physics.world, scene, spawn: stage.spawn });
}

function startSession() {
  endSession();
  const physics = createPhysicsWorld();
  const stage = buildStage({ scene, world: physics.world, events, materials, level: circuit1 });
  const player = makePlayer(physics, stage);
  const triggers = createTriggers({ events, zones: stage.zones });
  // heading은 트랙 중심선을 따라간다 (stage.path). 클라이머는 다리 축을 heading 옆으로 맞춘다.
  const cameraFollow = createCameraFollow(camera, {
    path: stage.path,
    heading: stage.spawn.heading,
  });
  const hud = createHud($ui);
  const pad = createLegPad($ui, events);
  const pauseBtn = createPauseButton($ui, { onClick: onEscape });
  // 서킷이면 바퀴 세기 (떨어지면 게임오버 대신 조금 뒤에서 다시 출발)
  const laps = stage.laps
    ? createLapCounter({
        path: stage.path,
        pieces: stage.pieces,
        laps: stage.laps,
        startS: stage.startS,
      })
    : null;
  session = { physics, stage, player, triggers, cameraFollow, hud, pad, pauseBtn, laps };
}

/** 타이틀 화면: 물리를 멈추고 카메라가 출발 지점 둘레를 돈다 */
function goTitle() {
  if (title) return;
  closeLobby();
  closePause();
  overlay?.destroy();
  overlay = null;
  countdown?.destroy();
  countdown = null;
  state = null;
  session.player.reset(session.stage.spawn);
  session.triggers.reset();
  $ui.classList.add('ui-is-title');
  title = showTitle($ui, {
    onSingle() {
      title.destroy();
      title = null;
      openLobby();
    },
    onMulti() {
      showBanner($ui, '멀티 플레이는 준비 중이에요', { tone: 'blue', duration: 1.6 });
    },
    onSettings() {
      openPopup((close) =>
        showSettings($ui, {
          settings,
          onChange(s) {
            settings = s;
            applySettings(s);
          },
          onClose: close,
        }),
      );
    },
    onQuit() {
      // 스크립트로 연 창이 아니면 브라우저가 닫기를 막는다 → 종료 화면을 보여 준다
      window.close();
      setTimeout(() => {
        if (!window.closed) openPopup((close) => showQuitScreen($ui, { onBack: close }));
      }, 150);
    },
  });
}

/** 타이틀 위에 창 하나 (설정 · 종료). 떠 있는 동안 타이틀 메뉴는 키를 받지 않는다. */
function openPopup(make) {
  if (popup) return;
  title?.setEnabled(false);
  popup = make(() => {
    popup?.destroy();
    popup = null;
    title?.setEnabled(true);
  });
}

/** 대기 화면: 동물 고르기 · 다리 그리기 · 미리보기. 출발!하면 그 다리 · 동물로 카운트다운부터. */
function openLobby() {
  if (lobby) return;
  closePause();
  overlay?.destroy();
  overlay = null;
  countdown?.destroy();
  countdown = null;
  state = null;
  $ui.classList.add('ui-is-title'); // HUD · 그리기 칸 · 일시정지 버튼 숨김
  lobby = showLobby($ui, {
    legs,
    animal,
    onReady(r) {
      legs = r.legs;
      animal = r.animal;
      closeLobby();
      $ui.classList.remove('ui-is-title');
      session.pad.show(legs);
      swapLegs();
      enterPlay();
    },
    onBack() {
      closeLobby();
      goTitle();
    },
  });
}

function closeLobby() {
  lobby?.destroy();
  lobby = null;
}

/** 출발 지점에서 카운트다운 후 PLAY. 카운트다운 동안 다리를 미리 그려 둘 수 있다. */
function enterPlay() {
  overlay?.destroy();
  overlay = null;
  countdown?.destroy();
  session.hud.setStatus(PLAY_STATUS);
  elapsed = 0;
  session.hud.setTime(0);
  session.laps?.reset();
  session.hud.setLap(1, session.laps?.laps ?? 0);
  session.player.reset(session.stage.spawn);
  session.triggers.reset();
  session.cameraFollow.snap(session.player.getPosition());
  state = null;
  closePause();
  startCountdown();
}

function startCountdown() {
  countdown?.destroy();
  countdown = showCountdown($ui, {
    onDone() {
      countdown = null;
      state = STATES.PLAY;
    },
  });
}

// ── 일시정지 ──────────────────────────────────────────────────────
/** Esc · 오른쪽 위 버튼 */
function onEscape() {
  if (title || lobby) return;
  if (pause) return closePause(true);
  if (state === STATES.CLEAR || state === STATES.OVER) return goTitle();
  openPause();
}

function openPause() {
  if (pause || !session) return;
  // 카운트다운 중이면 카운트다운을 멈추고, 계속할 때 다시 센다
  pausedInCountdown = !!countdown;
  countdown?.destroy();
  countdown = null;
  if (state === STATES.PLAY) state = null; // 물리 멈춤 (계속하기에서 되돌린다)
  drawing = false;
  keys.clear();
  pause = showPauseMenu($ui, {
    onResume: () => closePause(true),
    onRestart: () => events.emit(EVENTS.RETRY),
    onTitle: goTitle,
  });
}

/** resume = true면 멈췄던 곳에서 이어서 (카운트다운 중이었으면 카운트다운부터) */
function closePause(resume = false) {
  if (!pause) return;
  pause.destroy();
  pause = null;
  if (!resume) return;
  if (pausedInCountdown) startCountdown();
  else state = STATES.PLAY;
}

function endSession() {
  overlay?.destroy();
  overlay = null;
  countdown?.destroy();
  countdown = null;
  if (!session) return;
  session.pad.destroy();
  session.pauseBtn.destroy();
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
events.on(EVENTS.RETRY, () => session && !title && !lobby && enterPlay()); // enterPlay가 일시정지 메뉴도 닫는다
// "다시 그리기"(E): 대기 화면으로 (지금 다리 · 동물이 그대로 들어 있어 고칠 수 있다)
events.on(EVENTS.EDIT, () => {
  if (!session || title || lobby) return;
  openLobby();
});
events.on(EVENTS.GOAL, () => {
  state = STATES.CLEAR;
  overlay = showClear($ui, events, { time: elapsed });
});
/** 서킷에서 떨어지면: 조금 뒤 바닥에 다시 놓고 계속 달린다 (시간은 계속 흐름) */
function respawn() {
  const pose = session.laps.respawnPose();
  session.player.reset({ position: pose.position, heading: pose.heading });
  session.triggers.reset();
  showBanner($ui, '다시 출발!', { tone: 'blue', duration: 1 });
}

events.on(EVENTS.FALL, () => {
  if (session?.laps && state === STATES.PLAY) return respawn();
  state = STATES.OVER;
  overlay = showGameOver($ui, events);
});

startSession();
goTitle();

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
      if (session.laps && state === STATES.PLAY) {
        const r = session.laps.update(player.getPosition());
        if (r.finished) {
          showBanner($ui, '완주!', { tone: 'yellow', duration: 1.2 });
          events.emit(EVENTS.GOAL);
        } else if (r.lapChanged) {
          hud.setLap(r.lap, session.laps.laps);
          const last = r.lap === session.laps.laps;
          showBanner($ui, last ? '마지막 바퀴!' : `LAP ${r.lap}`, {
            tone: last ? 'yellow' : 'blue',
          });
        }
      }
    }
    const p = player.getPosition();
    if (title || lobby) {
      titleAngle += realDt * TITLE_ORBIT.speed;
      const c = stage.spawn.position;
      camera.position.set(
        c.x + Math.sin(titleAngle) * TITLE_ORBIT.radius,
        TITLE_ORBIT.height,
        c.z + Math.cos(titleAngle) * TITLE_ORBIT.radius,
      );
      camera.lookAt(c.x, 0.8, c.z);
    } else {
      cameraFollow.update(realDt, p);
    }
    lighting.update(p);
  }

  renderer.render(scene, camera);
});
