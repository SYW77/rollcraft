// 레벨 파일 도우미: 트랙 조각과 장애물 구간을 이어 붙인다. 담당: 손연우
//
// piece(): 조각 하나를 추가하고 그 조각이 시작하는 중심선 거리를 돌려준다 (장애물 at을 손으로 계산하지 않게).
// 구간(zone) 도우미: 장애물 구간을 앞 달리는 길(lead)과 함께 깐다.
//   big    크게: 높은 벽 (1.4m면 작은 원 · 짧은 막대가 못 오름). pit을 주면 벽 앞에 구덩이
//   wind   바람: 벽 없는 옆바람 구간. speed 10이면 작은 원 · 짧은 막대만 버티고 나머지는 날아간다 (작게).
//          6이면 긴 막대 · S자만 떨어진다
// big과 센 wind를 번갈아 놓으면 한 다리로는 못 돈다.
// zones에는 구간 종류와 시작 거리만 적는다 (보이는 것 없음, 검증 스크립트용).
// 넓은 구덩이(2.6m 이상)는 진입 속도 · 다리 각도에 따라 결과가 들쭉날쭉하다.
// 수치 근거: node src/physics/spike/sectionLab.mjs, 맵 점검: node src/physics/spike/switchRun.mjs [맵]
import { pieceLength } from '../track.js';

/**
 * @param {number} width 트랙 폭
 * @returns {{ pieces: object[], sections: object[], zones: { kind: string, at: number }[], readonly length: number,
 *             piece(p: object): number, run(len: number, extra?: object): number,
 *             turn(radius: number, angle: number, extra?: object): number,
 *             big(o?: object): number, wind(o?: object): number }}
 */
export function createCourse(width = 7) {
  const pieces = [];
  const sections = [];
  let length = 0;

  /** 조각을 추가하고 그 조각이 시작하는 중심선 거리를 돌려준다. 기본은 양옆 벽 있음. */
  function piece(p) {
    const start = length;
    pieces.push({ walls: true, ...p });
    length += pieceLength(p);
    return start;
  }
  const zones = [];
  /** 구간 앞 달리는 길 (lead m) */
  function lead(kind, len, label) {
    const at = piece({ type: 'straight', length: len, label });
    zones.push({ kind, at });
    return at;
  }

  return {
    pieces,
    sections,
    zones,
    get length() {
      return length;
    },
    piece,
    run: (len, extra = {}) => piece({ type: 'straight', length: len, ...extra }),
    turn: (radius, angle, extra = {}) =>
      piece({ type: 'arc', radius, angle, label: '코너', ...extra }),
    /** 크게: 높은 벽 (tops 여러 개면 벽 여러 개). pit(m)이 있으면 벽 앞에 구덩이 */
    big({ tops = [1.4], gaps = 3, pit = 0, lead: l = 8, label = '높은 벽' } = {}) {
      const start = lead('big', l, label);
      if (pit) {
        piece({ type: 'straight', length: pit, floor: false, walls: false, label: '구덩이' });
        piece({ type: 'straight', length: 3, label });
      }
      const n = tops.length;
      const len = n + (n - 1) * gaps + 3;
      const at = piece({ type: 'straight', length: len, label });
      const t = [];
      const d = [];
      tops.forEach((h, i) => {
        if (i) {
          t.push(0);
          d.push(gaps);
        }
        t.push(h);
        d.push(1);
      });
      sections.push({ type: 'steps', at: at + 1, params: { tops: t, depth: d, width } });
      return start;
    },
    /** 바람: 벽 없는 옆바람 */
    wind({ len = 12, speed = 6, lead: l = 8, label = '강풍', dir } = {}) {
      const start = lead('wind', l, label);
      const at = piece({ type: 'straight', length: len, walls: false, label });
      sections.push({
        type: 'windGap',
        at: at + 1,
        params: {
          length: len - 2,
          width,
          speed,
          ...(dir && { dir }),
        },
      });
      return start;
    },
  };
}
