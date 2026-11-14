// 배경음: 맵마다 짧은 루프 곡 (8마디). 담당: 원유승
// 곡 = 템포 + 마디별 화음 + 멜로디(16분음표 16칸) + 베이스 · 드럼 패턴. 악기는 synth.js로 합성.
// 멜로디 칸: 음 이름 = 새 음, '~' = 앞 음을 이어서, '.' = 쉼.
import { freq, tone, noise, kick } from './synth.js';

/** 멜로디 줄 → [{ step, note, len }] */
function parse(bar) {
  const cells = bar.trim().split(/\s+/);
  if (cells.length !== 16) throw new Error(`마디는 16칸이어야 해요: ${bar}`);
  const out = [];
  cells.forEach((c, i) => {
    if (c === '~') {
      if (out.length && out[out.length - 1].step + out[out.length - 1].len === i)
        out[out.length - 1].len++;
    } else if (c !== '.') out.push({ step: i, note: c, len: 1 });
  });
  return out;
}

const steps = (s) => s.split('').flatMap((c, i) => (c === 'x' ? [i] : []));

// ── 악기 (t = 시작 시각, len = 길이 초) ──
const INSTR = {
  square: (ctx, out, f, t, len, v = 1) =>
    tone(ctx, out, {
      t,
      f,
      dur: len * 0.9,
      type: 'square',
      vol: 0.07 * v,
      d: 0.1,
      s: 0.5,
      r: 0.06,
    }),
  pluck: (ctx, out, f, t, len, v = 1) =>
    tone(ctx, out, {
      t,
      f,
      dur: len * 0.8,
      type: 'sawtooth',
      vol: 0.09 * v,
      d: 0.15,
      s: 0.25,
      r: 0.1,
      cutoff: 2600,
      q: 4,
    }),
  bell: (ctx, out, f, t, len, v = 1) => {
    tone(ctx, out, { t, f, dur: len, type: 'triangle', vol: 0.12 * v, d: 0.3, s: 0.15, r: 0.4 });
    tone(ctx, out, { t, f: f * 3, dur: 0.05, type: 'sine', vol: 0.03 * v, d: 0.1, s: 0, r: 0.3 });
  },
  epiano: (ctx, out, f, t, len, v = 1) => {
    tone(ctx, out, { t, f, dur: len, type: 'sine', vol: 0.12 * v, d: 0.4, s: 0.35, r: 0.3 });
    tone(ctx, out, {
      t,
      f: f * 2,
      dur: 0.1,
      type: 'triangle',
      vol: 0.025 * v,
      d: 0.15,
      s: 0,
      r: 0.2,
    });
  },
  pad: (ctx, out, f, t, len, v = 1) =>
    tone(ctx, out, {
      t,
      f,
      dur: len,
      type: 'sawtooth',
      vol: 0.022 * v,
      a: 0.2,
      d: 0.5,
      s: 0.8,
      r: 0.4,
      cutoff: 1100,
      detune: 6,
    }),
  bass: (ctx, out, f, t, len, v = 1) =>
    tone(ctx, out, {
      t,
      f,
      dur: len * 0.8,
      type: 'triangle',
      vol: 0.2 * v,
      d: 0.15,
      s: 0.6,
      r: 0.05,
    }),
};

const DRUMS = {
  kick: (ctx, out, t, v) => kick(ctx, out, t, 0.45 * v),
  snare: (ctx, out, t, v) => {
    noise(ctx, out, { t, dur: 0.16, vol: 0.16 * v, type: 'bandpass', f: 1800, q: 0.8 });
    tone(ctx, out, {
      t,
      f: 220,
      toF: 160,
      dur: 0.06,
      type: 'triangle',
      vol: 0.08 * v,
      s: 0,
      r: 0.05,
    });
  },
  clap: (ctx, out, t, v) => {
    for (const dt of [0, 0.012, 0.024])
      noise(ctx, out, { t: t + dt, dur: 0.09, vol: 0.08 * v, type: 'bandpass', f: 1400, q: 1.5 });
  },
  hat: (ctx, out, t, v) => noise(ctx, out, { t, dur: 0.04, vol: 0.05 * v, f: 8000 }),
  shaker: (ctx, out, t, v) => noise(ctx, out, { t, dur: 0.06, vol: 0.03 * v, f: 5000, a: 0.02 }),
  sleigh: (ctx, out, t, v) => {
    noise(ctx, out, { t, dur: 0.12, vol: 0.045 * v, type: 'bandpass', f: 9000, q: 3 });
    noise(ctx, out, { t: t + 0.03, dur: 0.1, vol: 0.03 * v, type: 'bandpass', f: 7000, q: 3 });
  },
  tom: (ctx, out, t, v) =>
    tone(ctx, out, { t, f: 140, toF: 90, dur: 0.15, type: 'sine', vol: 0.25 * v, s: 0.2, r: 0.15 }),
  brush: (ctx, out, t, v) =>
    noise(ctx, out, { t, dur: 0.18, vol: 0.06 * v, type: 'bandpass', f: 3000, q: 0.6, a: 0.03 }),
};

/**
 * @typedef {{ bpm: number, lead: keyof INSTR, chords: string[][], melody: string[],
 *             bass: string[], bassSteps: number[], drums: Record<string, number[]>, padVol?: number }} Track
 */

/** @type {Record<string, Track>} */
export const TRACKS = {
  // 타이틀 · 대기 화면: 느긋한 전자 피아노
  menu: {
    bpm: 96,
    lead: 'epiano',
    chords: [
      ['C4', 'E4', 'G4', 'B4'],
      ['A3', 'C4', 'E4', 'G4'],
      ['F3', 'A3', 'C4', 'E4'],
      ['G3', 'B3', 'D4', 'F4'],
    ],
    melody: [
      'E5 ~ ~ ~ G5 ~ ~ . D5 ~ ~ ~ . . . .',
      'C5 ~ ~ ~ E5 ~ ~ . B4 ~ ~ ~ . . . .',
      'A4 ~ ~ ~ C5 ~ ~ . F5 ~ ~ ~ E5 ~ D5 ~',
      'D5 ~ ~ ~ B4 ~ ~ ~ G4 ~ ~ ~ . . . .',
      'G5 ~ ~ ~ E5 ~ ~ . C5 ~ D5 ~ E5 ~ ~ .',
      'E5 ~ ~ ~ C5 ~ ~ . A4 ~ ~ ~ . . . .',
      'F5 ~ ~ ~ A5 ~ ~ . G5 ~ F5 ~ E5 ~ C5 ~',
      'D5 ~ ~ ~ ~ ~ ~ ~ . . . . . . . .',
    ],
    bass: ['C2', 'A1', 'F1', 'G1'],
    bassSteps: [0, 10],
    drums: { kick: steps('x.........x.....'), hat: steps('....x.......x...') },
    padVol: 1.2,
  },
  // 초원: 경쾌한 칩튠
  meadow: {
    bpm: 132,
    lead: 'square',
    chords: [
      ['G3', 'B3', 'D4'],
      ['D3', 'F#3', 'A3'],
      ['E3', 'G3', 'B3'],
      ['C3', 'E3', 'G3'],
    ],
    melody: [
      'D5 . B4 . G4 . B4 . D5 ~ ~ . E5 . D5 .',
      'C5 . A4 . F#4 . A4 . D5 ~ ~ . C5 . A4 .',
      'B4 . G4 . E4 . G4 . B4 ~ ~ . C5 . B4 .',
      'A4 . G4 . E4 . G4 . A4 ~ B4 ~ C5 ~ D5 ~',
      'G5 ~ ~ . F#5 . E5 . D5 ~ ~ . B4 . D5 .',
      'A4 ~ ~ . F#4 . A4 . D5 ~ ~ ~ . . . .',
      'E5 . D5 . B4 . D5 . E5 ~ G5 ~ E5 . D5 .',
      'C5 ~ ~ . E5 ~ ~ . D5 ~ ~ ~ . . . .',
    ],
    bass: ['G2', 'D2', 'E2', 'C2'],
    bassSteps: [0, 3, 6, 8, 11, 14],
    drums: {
      kick: steps('x.......x.x.....'),
      snare: steps('....x.......x...'),
      hat: steps('x.x.x.x.x.x.x.x.'),
    },
  },
  // 사막: 프리지안 도미넌트 음계, 뜯는 소리 + 톰 · 셰이커
  desert: {
    bpm: 116,
    lead: 'pluck',
    chords: [
      ['D3', 'F#3', 'A3'],
      ['Eb3', 'G3', 'Bb3'],
      ['D3', 'F#3', 'A3'],
      ['C3', 'Eb3', 'G3'],
    ],
    melody: [
      'A4 . . Bb4 A4 . G4 . F#4 . . . Eb4 . D4 .',
      'G4 . . Bb4 . . G4 . Eb4 ~ ~ . F#4 . G4 .',
      'A4 . D5 . C5 . Bb4 . A4 ~ ~ . G4 . F#4 .',
      'G4 . Eb4 . F#4 ~ ~ . D4 ~ ~ ~ . . . .',
      'D5 . . Eb5 D5 . C5 . Bb4 . . . A4 . G4 .',
      'Bb4 . . C5 . . Bb4 . G4 ~ ~ . A4 . Bb4 .',
      'A4 . . . D5 ~ ~ . C5 . Bb4 . A4 . G4 .',
      'F#4 ~ ~ . G4 . Eb4 . D4 ~ ~ ~ . . . .',
    ],
    bass: ['D2', 'Eb2', 'D2', 'C2'],
    bassSteps: [0, 7, 10],
    drums: {
      kick: steps('x......x..x.....'),
      tom: steps('............x.x.'),
      clap: steps('....x.......x...'),
      shaker: steps('xxxxxxxxxxxxxxxx'),
    },
  },
  // 설산: 종소리 + 썰매 방울
  snow: {
    bpm: 108,
    lead: 'bell',
    chords: [
      ['A3', 'C4', 'E4'],
      ['F3', 'A3', 'C4'],
      ['C4', 'E4', 'G4'],
      ['G3', 'B3', 'D4'],
    ],
    melody: [
      'E5 . A5 . E5 . C5 . B4 . C5 . E5 ~ ~ .',
      'F5 . A5 . F5 . C5 . A4 . C5 . F5 ~ ~ .',
      'G5 . E5 . C5 . E5 . G5 . A5 . G5 ~ ~ .',
      'D5 . G5 . B4 . D5 . G4 ~ ~ . B4 . D5 .',
      'A5 ~ ~ . G5 . E5 . C5 ~ ~ . E5 . A5 .',
      'C6 ~ ~ . A5 . F5 . C5 ~ ~ . F5 . A5 .',
      'G5 ~ ~ . E5 . G5 . C6 ~ B5 ~ A5 . G5 .',
      'B5 ~ ~ . A5 . G5 . D5 ~ ~ ~ . . . .',
    ],
    bass: ['A1', 'F1', 'C2', 'G1'],
    bassSteps: [0, 6, 8],
    drums: {
      kick: steps('x.......x.......'),
      brush: steps('....x.......x...'),
      sleigh: steps('x.x.x.x.x.x.x.x.'),
    },
    padVol: 1.3,
  },
};

const LOOKAHEAD = 0.12; // 이만큼 앞까지 미리 예약 (초)
const TICK_MS = 25;

/**
 * 곡 재생기. play(id)로 다음 마디부터 곡을 바꾼다 (null = 멈춤).
 * @param {AudioContext} ctx
 * @param {AudioNode} out
 */
export function createSequencer(ctx, out) {
  const parsed = Object.fromEntries(
    Object.entries(TRACKS).map(([id, tr]) => [id, tr.melody.map(parse)]),
  );
  let track = null; // 지금 곡 id
  let next = null; // 바꿀 곡 (undefined = 그대로)
  let step = 0; // 곡 안의 16분음표 번호
  let nextTime = 0;
  let timer = null;

  function scheduleStep(id, i, t) {
    const tr = TRACKS[id];
    const sp = 60 / tr.bpm / 4; // 16분음표 길이
    const bar = Math.floor(i / 16) % tr.melody.length;
    const s = i % 16;
    const chordBar = bar % tr.chords.length;
    // 멜로디
    for (const n of parsed[id][bar]) {
      if (n.step === s) INSTR[tr.lead](ctx, out, freq(n.note), t, n.len * sp, 1);
    }
    // 화음 (마디 첫 칸에 한 마디 길이)
    if (s === 0) {
      for (const n of tr.chords[chordBar])
        INSTR.pad(ctx, out, freq(n), t, 16 * sp * 0.95, tr.padVol ?? 1);
    }
    // 베이스: 뒤쪽 칸은 5도 위로 번갈아
    const bi = tr.bassSteps.indexOf(s);
    if (bi >= 0) {
      const root = freq(tr.bass[chordBar]);
      INSTR.bass(ctx, out, bi % 2 && tr.bassSteps.length > 2 ? root * 1.5 : root, t, sp * 2);
    }
    for (const [name, list] of Object.entries(tr.drums)) {
      if (list.includes(s)) DRUMS[name](ctx, out, t, s % 4 === 0 ? 1 : 0.7);
    }
    return sp;
  }

  function tick() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      // 곡 바꾸기는 마디 첫 칸에서
      if (next !== undefined && step % 16 === 0) {
        track = next;
        next = undefined;
        step = 0;
      }
      if (!track) {
        nextTime = ctx.currentTime + 0.05;
        step = 0;
        if (next === undefined) return;
        continue;
      }
      const sp = scheduleStep(track, step, nextTime);
      nextTime += sp;
      step = (step + 1) % (TRACKS[track].melody.length * 16);
    }
  }

  return {
    get current() {
      return next !== undefined ? next : track;
    },
    /** 곡 바꾸기. now = true면 마디를 기다리지 않고 바로 */
    play(id, now = false) {
      const want = id && TRACKS[id] ? id : null;
      if (want === (next !== undefined ? next : track)) return;
      next = want;
      if (now || !track) {
        track = want;
        next = undefined;
        step = 0;
        nextTime = ctx.currentTime + 0.05;
      }
      if (!timer) timer = setInterval(tick, TICK_MS);
      tick();
    },
    /** 오프라인 점검용: id 곡의 처음 n칸을 t0부터 한 번에 예약 */
    prerender(id, n, t0 = 0) {
      let t = t0;
      for (let i = 0; i < n; i++) t += scheduleStep(id, i, t);
      return t;
    },
    stop() {
      clearInterval(timer);
      timer = null;
      track = null;
      next = undefined;
    },
  };
}
