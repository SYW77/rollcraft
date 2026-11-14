// 골/낙하 판정. 담당: 원유승
// 서킷(바퀴 수 레이스)은 골 상자가 없다 (zones.goal = null) → 낙하만 본다. 완주는 stage/laps.js가 센다.
import { EVENTS } from '../shared/contracts.js';

/**
 * @param {{ events: ReturnType<import('../shared/events.js').createEmitter>,
 *           zones: { goal: { center: {x,y,z}, size: {x,y,z} } | null, killY: number } }} opts
 */
export function createTriggers({ events, zones }) {
  let fired = false; // 한 판에 한 번만 발행

  return {
    update(p) {
      if (fired) return;
      const g = zones.goal;
      const inGoal =
        !!g &&
        Math.abs(p.x - g.center.x) <= g.size.x / 2 &&
        Math.abs(p.y - g.center.y) <= g.size.y / 2 &&
        Math.abs(p.z - g.center.z) <= g.size.z / 2;
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
