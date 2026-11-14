// 서킷 바퀴 세기 · 다시 출발 지점. 담당: 손연우
//
// 중심선을 따라 얼마나 갔는지(progress)를 매 프레임 더한다. 결승선 = 중심선 거리 0 (= 한 바퀴 길이).
// - 중심선 거리 s는 0..L에서 이어 붙으므로, 한 프레임 변화 ds가 반 바퀴보다 크면 결승선을 넘은 것으로 보고 감는다.
// - 거꾸로 가면 progress가 줄어든다 → 지름길 · 역주행으로는 바퀴가 안 올라간다.
// 떨어지면 respawnPose(): 지금 위치보다 조금 뒤, 바닥이 있는 곳.
import { nearestOnPath, pointAt } from './track.js';

const RESPAWN_BACK = 6; // 떨어진 곳에서 이만큼 뒤로 (m)
const RESPAWN_MARGIN = 2; // 바닥 없는 조각이면 그 조각 시작보다 이만큼 더 뒤로

/**
 * @param {{ path: import('./track.js').TrackPath, pieces: import('./track.js').TrackPiece[],
 *           laps: number, startS: number }} opts  startS = 출발 지점의 중심선 거리
 */
export function createLapCounter({ path, pieces, laps, startS }) {
  const L = path.length;
  // 바닥 없는 구간 [시작, 끝]
  const holes = [];
  {
    let s = 0;
    for (const p of pieces) {
      const len = p.type === 'arc' ? (p.radius * Math.abs(p.angle) * Math.PI) / 180 : p.length;
      if (p.floor === false) holes.push([s, s + len]);
      s += len;
    }
  }
  let progress = 0; // 출발 지점부터 중심선을 따라 간 거리 (뒤로 가면 줄어듦)
  let lastS = startS;

  const wrap = (s) => ((s % L) + L) % L;
  /** 지금 바퀴 (1부터). 결승선을 laps번 넘으면 laps + 1 */
  const lapOf = (prog) => 1 + Math.floor((prog + startS) / L);

  return {
    laps,
    /** @returns {{ lap: number, lapChanged: boolean, finished: boolean }} */
    update(pos) {
      const s = nearestOnPath(path, pos).s;
      let ds = s - lastS;
      if (ds > L / 2) ds -= L;
      else if (ds < -L / 2) ds += L;
      const before = lapOf(progress);
      progress += ds;
      lastS = s;
      const lap = lapOf(progress);
      return { lap: Math.min(lap, laps), lapChanged: lap > before, finished: lap > laps };
    },
    /** 떨어졌을 때 다시 놓을 자리: 조금 뒤, 바닥 있는 곳 */
    respawnPose() {
      let s = lastS - RESPAWN_BACK;
      for (let guard = 0; guard < holes.length + 1; guard++) {
        const ws = wrap(s);
        const hole = holes.find(([a, b]) => ws >= a - RESPAWN_MARGIN && ws <= b);
        if (!hole) break;
        s = hole[0] - RESPAWN_MARGIN - 1;
      }
      const pose = pointAt(path, wrap(s));
      // 위치가 바뀌었으니 progress도 그만큼 되돌린다 (다음 update에서 큰 점프로 세지 않게)
      let ds = wrap(s) - lastS;
      if (ds > L / 2) ds -= L;
      else if (ds < -L / 2) ds += L;
      progress += ds;
      lastS = wrap(s);
      return pose;
    },
    reset() {
      progress = 0;
      lastS = startS;
    },
  };
}
