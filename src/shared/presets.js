// 프리셋 4종 (구, 원통, 원뿔, 아령). 담당: 원유승
// STUB: 모양은 대략적인 값. 핸들링 튜닝 때 수치 조정 예정.
import { PROFILE_POINTS, R_MIN, R_MAX } from './contracts.js';

const clampR = (r) => Math.min(R_MAX, Math.max(R_MIN, r));

/** y를 0~1로 PROFILE_POINTS개 균등 분할하고 r = fn(y)로 프로파일을 만든다. */
function fromFunction(fn) {
  return Array.from({ length: PROFILE_POINTS }, (_, i) => {
    const y = i / (PROFILE_POINTS - 1);
    return { r: clampR(fn(y)), y };
  });
}

export const PRESETS = Object.freeze({
  sphere: fromFunction((y) => Math.sqrt(Math.max(0, 1 - (2 * y - 1) ** 2))),
  cylinder: fromFunction(() => 0.6),
  cone: fromFunction((y) => 1 - y),
  dumbbell: fromFunction((y) => 0.25 + 0.75 * (2 * y - 1) ** 4),
});

export const PRESET_NAMES = Object.freeze(Object.keys(PRESETS));

/** 프리셋 복사본을 돌려준다 (호출 측에서 수정해도 원본은 그대로). */
export function getPreset(name) {
  const p = PRESETS[name];
  if (!p) throw new Error(`Unknown preset: ${name}`);
  return p.map((pt) => ({ ...pt }));
}
