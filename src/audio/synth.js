// Web Audio 합성 도구: 음 이름 → 주파수, 엔벨로프를 건 오실레이터 · 노이즈. 담당: 원유승
// 음원 파일 없이 전부 코드로 만든다 (저작권 · 용량 걱정 없음).

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'A4' · 'F#3' · 'Bb2' → MIDI 번호 */
export function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + acc;
}

export const freq = (n) => 440 * 2 ** (((typeof n === 'string' ? midi(n) : n) - 69) / 12);

let noiseBuf = null;
/** 1초짜리 흰 노이즈 버퍼 (한 번 만들어 같이 쓴다) */
export function noiseBuffer(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/**
 * 음 하나: 오실레이터 → (필터) → 엔벨로프 → out
 * @param {AudioContext} ctx
 * @param {AudioNode} out
 * @param {{ t: number, f: number, dur: number, type?: OscillatorType, vol?: number,
 *           a?: number, d?: number, s?: number, r?: number, toF?: number, slide?: number,
 *           cutoff?: number, q?: number, detune?: number }} o
 *   a/d/s/r = 어택 · 디케이 · 서스테인(비율) · 릴리즈 (초). toF가 있으면 slide초 동안 주파수가 미끄러진다.
 */
export function tone(ctx, out, o) {
  const { t, f, dur, type = 'square', vol = 0.2, a = 0.005, d = 0.08, s = 0.6, r = 0.08 } = o;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  if (o.toF) osc.frequency.exponentialRampToValueAtTime(o.toF, t + (o.slide ?? dur));
  if (o.detune) osc.detune.value = o.detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.setTargetAtTime(vol * s, t + a, d / 3);
  const end = t + Math.max(dur, a);
  g.gain.setTargetAtTime(0, end, r / 3);
  let node = osc;
  if (o.cutoff) {
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(o.cutoff, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(200, o.cutoff * 0.25), end + r);
    flt.Q.value = o.q ?? 1;
    osc.connect(flt);
    node = flt;
  }
  node.connect(g).connect(out);
  osc.start(t);
  osc.stop(end + r * 2 + 0.05);
}

/**
 * 노이즈 한 번 (타악기 · 바람): 노이즈 → 필터 → 엔벨로프
 * @param {{ t: number, dur: number, vol?: number, type?: BiquadFilterType, f?: number, toF?: number, q?: number, a?: number }} o
 */
export function noise(ctx, out, o) {
  const { t, dur, vol = 0.2, type = 'highpass', f = 6000, q = 0.7, a = 0.002 } = o;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const flt = ctx.createBiquadFilter();
  flt.type = type;
  flt.frequency.setValueAtTime(f, t);
  if (o.toF) flt.frequency.exponentialRampToValueAtTime(o.toF, t + dur);
  flt.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  src.connect(flt).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

/** 킥: 사인파가 150 → 45Hz로 떨어진다 */
export function kick(ctx, out, t, vol = 0.5) {
  tone(ctx, out, {
    t,
    f: 150,
    toF: 45,
    slide: 0.12,
    dur: 0.12,
    type: 'sine',
    vol,
    d: 0.1,
    s: 0.3,
    r: 0.12,
  });
}
