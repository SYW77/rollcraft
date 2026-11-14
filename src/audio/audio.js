// 소리 전체: 배경음 + 효과음, 음량, 흐리게(그리는 중 · 일시정지). 담당: 원유승
//
// 브라우저는 사용자가 클릭 · 키를 누르기 전에는 소리를 못 낸다 → 첫 입력에서 AudioContext를 깨운다.
// 그 전에 고른 곡은 기억해 뒀다가 깨어나면 튼다.
// 연결: 곡 → musicGain → 저역 필터(흐리게) → master, 효과음 → sfxGain → master → 스피커
import { createSequencer } from './music.js';
import { SFX } from './sfx.js';

const MUSIC_LEVEL = 0.55; // 음량 설정 1일 때 배경음 크기
const SFX_LEVEL = 0.75;

/**
 * @returns {{ music(id: string | null): void, sfx(name: string, opts?: object): void,
 *             setVolume(v: { music?: number, sfx?: number }): void, muffle(on: boolean): void }}
 */
export function createAudio() {
  let ctx = null;
  let seq = null;
  let musicGain = null;
  let sfxGain = null;
  let filter = null;
  let want; // 깨어나기 전에 고른 곡 (undefined = 없음)
  const vol = { music: 0.7, sfx: 1 };
  let muffled = false;

  function wake() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const master = ctx.createDynamicsCompressor(); // 여러 소리가 겹쳐도 찢어지지 않게
      master.connect(ctx.destination);
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = muffled ? 700 : 20000;
      filter.connect(master);
      musicGain = ctx.createGain();
      musicGain.gain.value = vol.music * MUSIC_LEVEL;
      musicGain.connect(filter);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = vol.sfx * SFX_LEVEL;
      sfxGain.connect(master);
      seq = createSequencer(ctx, musicGain);
    }
    if (ctx.state === 'suspended') ctx.resume();
    if (want !== undefined) {
      seq.play(want, true);
      want = undefined;
    }
  }
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, wake, { capture: true });
  // 탭을 가리면 멈춘다 (가린 탭에서는 타이머가 느려져 박자가 어긋난다)
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  return {
    /** 배경음 바꾸기 (TRACKS id, null = 끔). 다음 마디부터 바뀐다 */
    music(id) {
      if (!seq) want = id;
      else seq.play(id);
    },
    /** 효과음 (sfx.js의 SFX 이름) */
    sfx(name, opts) {
      if (!ctx || ctx.state !== 'running' || !vol.sfx) return;
      SFX[name]?.(ctx, sfxGain, ctx.currentTime + 0.005, opts);
    },
    setVolume(v) {
      if (v.music !== undefined) vol.music = v.music;
      if (v.sfx !== undefined) vol.sfx = v.sfx;
      if (!ctx) return;
      musicGain.gain.setTargetAtTime(vol.music * MUSIC_LEVEL, ctx.currentTime, 0.05);
      sfxGain.gain.setTargetAtTime(vol.sfx * SFX_LEVEL, ctx.currentTime, 0.05);
    },
    /** 배경음을 먹먹하게 (그리는 동안 · 일시정지) */
    muffle(on) {
      muffled = on;
      if (!ctx) return;
      filter.frequency.setTargetAtTime(on ? 700 : 20000, ctx.currentTime, 0.08);
    },
  };
}
