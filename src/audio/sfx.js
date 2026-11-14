// 효과음 (전부 합성). 담당: 원유승
// 각 함수: (ctx, out, t, opts) → t에 소리를 예약한다.
import { freq, tone, noise, kick } from './synth.js';

const arp = (ctx, out, t, notes, gap, o) =>
  notes.forEach((n, i) => tone(ctx, out, { t: t + i * gap, f: freq(n), ...o }));

export const SFX = {
  /** 버튼 누름 */
  click: (ctx, out, t) =>
    tone(ctx, out, {
      t,
      f: 880,
      toF: 1320,
      slide: 0.04,
      dur: 0.04,
      type: 'square',
      vol: 0.11,
      s: 0.2,
      r: 0.03,
    }),
  /** 메뉴에서 위아래로 고르기 */
  move: (ctx, out, t) =>
    tone(ctx, out, { t, f: 660, dur: 0.03, type: 'triangle', vol: 0.08, s: 0.3, r: 0.03 }),
  /** 카운트다운 3 · 2 · 1 */
  count: (ctx, out, t) =>
    tone(ctx, out, { t, f: 660, dur: 0.14, type: 'square', vol: 0.12, d: 0.1, s: 0.6, r: 0.06 }),
  /** 출발! */
  go: (ctx, out, t) => {
    tone(ctx, out, { t, f: 1320, dur: 0.45, type: 'square', vol: 0.12, d: 0.2, s: 0.5, r: 0.2 });
    tone(ctx, out, { t, f: 990, dur: 0.45, type: 'square', vol: 0.06, d: 0.2, s: 0.5, r: 0.2 });
  },
  /** 한 바퀴 */
  lap: (ctx, out, t) =>
    arp(ctx, out, t, ['E6', 'A6'], 0.09, {
      dur: 0.25,
      type: 'triangle',
      vol: 0.18,
      d: 0.15,
      s: 0.3,
      r: 0.25,
    }),
  /** 마지막 바퀴 */
  finalLap: (ctx, out, t) =>
    arp(ctx, out, t, ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], 0.07, {
      dur: 0.1,
      type: 'square',
      vol: 0.09,
      s: 0.5,
      r: 0.08,
    }),
  /** 완주 팡파르 */
  finish: (ctx, out, t) => {
    arp(ctx, out, t, ['G4', 'C5', 'E5', 'G5'], 0.1, {
      dur: 0.12,
      type: 'square',
      vol: 0.1,
      s: 0.5,
      r: 0.06,
    });
    for (const n of ['C5', 'E5', 'G5', 'C6'])
      tone(ctx, out, {
        t: t + 0.42,
        f: freq(n),
        dur: 0.9,
        type: 'square',
        vol: 0.06,
        d: 0.3,
        s: 0.6,
        r: 0.4,
      });
    noise(ctx, out, { t: t + 0.42, dur: 0.6, vol: 0.08, f: 7000 });
    kick(ctx, out, t + 0.42, 0.5);
  },
  /** 게임오버 (힘 빠지는 세 음) */
  gameOver: (ctx, out, t) =>
    arp(ctx, out, t, ['G4', 'F#4', 'F4'], 0.28, {
      dur: 0.24,
      type: 'sawtooth',
      vol: 0.14,
      s: 0.7,
      r: 0.15,
      cutoff: 1500,
    }),
  /** 떨어짐: 미끄럼 휘파람 */
  fall: (ctx, out, t) => {
    tone(ctx, out, {
      t,
      f: 900,
      toF: 180,
      slide: 0.55,
      dur: 0.55,
      type: 'sine',
      vol: 0.16,
      s: 0.9,
      r: 0.1,
    });
    noise(ctx, out, { t: t + 0.5, dur: 0.25, vol: 0.12, type: 'lowpass', f: 400 });
  },
  /** 다시 출발: 뿅 */
  respawn: (ctx, out, t) =>
    tone(ctx, out, {
      t,
      f: 300,
      toF: 900,
      slide: 0.15,
      dur: 0.15,
      type: 'square',
      vol: 0.08,
      s: 0.6,
      r: 0.06,
    }),
  /** 다리 교체: 뾱 + 반짝 */
  legs: (ctx, out, t) => {
    tone(ctx, out, {
      t,
      f: 520,
      toF: 1040,
      slide: 0.08,
      dur: 0.08,
      type: 'sine',
      vol: 0.2,
      s: 0.4,
      r: 0.05,
    });
    arp(ctx, out, t + 0.06, ['E6', 'B6', 'E7'], 0.04, {
      dur: 0.05,
      type: 'triangle',
      vol: 0.06,
      s: 0.2,
      r: 0.1,
    });
  },
  /** 그리기 시작 (시간이 느려짐): 내려가는 바람 소리 */
  slowIn: (ctx, out, t) =>
    noise(ctx, out, { t, dur: 0.35, vol: 0.3, type: 'bandpass', f: 2400, toF: 400, q: 2, a: 0.03 }),
  /** 펜 긁는 소리 (그리는 동안 조금씩) */
  scribble: (ctx, out, t, o = {}) =>
    noise(ctx, out, {
      t,
      dur: 0.05,
      vol: 0.09 * (o.v ?? 1),
      type: 'bandpass',
      f: 2500 + Math.random() * 2500,
      q: 3,
    }),
  /** 발소리: 다리가 땅을 짚을 때. o.v = 세기 0..1 */
  step: (ctx, out, t, o = {}) => {
    const v = o.v ?? 1;
    const p = 0.85 + Math.random() * 0.3;
    tone(ctx, out, {
      t,
      f: 170 * p,
      toF: 70,
      slide: 0.06,
      dur: 0.06,
      type: 'sine',
      vol: 0.16 * v,
      s: 0.2,
      r: 0.05,
    });
    noise(ctx, out, { t, dur: 0.04, vol: 0.03 * v, type: 'lowpass', f: 1800 * p });
  },
  /** 대기 화면에서 맵 · 동물 고르기 */
  select: (ctx, out, t) =>
    arp(ctx, out, t, ['C6', 'G6'], 0.05, { dur: 0.06, type: 'square', vol: 0.06, s: 0.3, r: 0.05 }),
};
