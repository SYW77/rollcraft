// 골/낙하 판정. 담당: 원유승
import { EVENTS } from '../shared/contracts.js';

/**
 * @param {{ events: ReturnType<import('../shared/events.js').createEmitter>,
 *           zones: { goal: { center: {x,y,z}, size: {x,y,z} }, killY: number } }} opts
 */
export function createTriggers({ events, zones }) {
  let fired = false; // 한 판에 한 번만 발행

  return {
    update(p) {
      if (fired) return;
      const { center: c, size: s } = zones.goal;
      const inGoal =
        Math.abs(p.x - c.x) <= s.x / 2 &&
        Math.abs(p.y - c.y) <= s.y / 2 &&
        Math.abs(p.z - c.z) <= s.z / 2;
      if (inGoal) {
        fired = true;
        events.emit(EVENTS.GOAL);
      } else if (p.y < zones.killY) {
        fired = true;
        events.emit(EVENTS.FALL);
      }
    },
    reset() {
      fired = false;
    },
    dispose() {},
  };
}
