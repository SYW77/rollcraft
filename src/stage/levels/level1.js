// 레벨 1 구간 배치. 담당: 손연우
// 트랙은 조각(직선 · 곡선)을 순서대로 이어 붙인다 (stage/track.js).
// 장애물은 { type, at, params }: at = 트랙 중심선을 따라 시작점부터의 거리(m).
// 스폰은 트랙 시작, 골은 트랙 끝에 자동으로 놓인다.
//
// 아래 piece()가 조각을 추가하면서 그 조각의 시작 거리를 돌려주므로, 장애물 위치(at)를 손으로 계산하지 않는다.
// 조각을 끼워 넣거나 길이를 바꿔도 뒤쪽 장애물 위치가 같이 따라간다.
//
// 코스 흐름 (≈ 150m. 구간마다 유리한 모양이 다르다 → 작업대에서 F로 바꿔 가며 푸는 퍼즐)
//   1부  분할 레일 → 작업대 A → 곡선(벽) → 계단 → 급커브(왼쪽, 벽 없음)      : 구가 유리
//   2부  작업대 B → 강풍 7m/s → 분할 레일 2                                 : 원통이 유리
//   3부  작업대 C → 곡선 2(벽) → 계단 2 → 급커브 2(오른쪽, 벽 없음) → 골     : 다시 구가 유리
// 구간별 근거 (헤드리스)
//   분할 레일  원반처럼 축 방향으로 짧은 모양만 틈으로 낙하
//   곡선(벽)   원통 · 아령은 벽에 붙어 멈춤
//   계단       반지름 큰 모양 (구 > 아령, 원통은 걸림). 턱 사이 평지에서 다시 속도를 붙인다
//   급커브     아령은 조향만으로, 구는 감속하면 통과, 원통은 직진해 낙하
//   강풍       바람 쪽 면적이 작은 원통은 0.1m만 밀림, 구는 거의 완벽하게 A/D로 버텨야 함
// 풀이 예: 작업대 A에서 구 → B에서 원통 → C에서 구

const pieces = [];
let length = 0;
/** 트랙 조각을 추가하고, 그 조각이 시작하는 중심선 거리를 돌려준다 */
function piece(p) {
  const start = length;
  pieces.push(p);
  length += p.type === 'arc' ? (p.radius * Math.abs(p.angle) * Math.PI) / 180 : p.length;
  return start;
}

const WB = { length: 2.5 }; // 작업대 패드 길이
const RAIL = { length: 6, gap: 0.6, railWidth: 0.5 };
const TIGHT = 5; // 급커브 반지름

// ── 1부: 구 ────────────────────────────────────────────────────────
piece({ type: 'straight', length: 10 }); // 출발 · 조작 익히기
const railA = piece({ type: 'straight', length: RAIL.length, floor: false }); // 분할 레일 (바닥 없음)
const benchA = piece({ type: 'straight', length: 6 });
piece({ type: 'arc', radius: 9, angle: 90, walls: true }); // 오른쪽 곡선, 벽 있음
const stepsA = piece({ type: 'straight', length: 20 });
const curveA = piece({ type: 'arc', radius: TIGHT, angle: -90, walls: false }); // 급커브: 왼쪽

// ── 2부: 원통 ──────────────────────────────────────────────────────
const benchB = piece({ type: 'straight', length: 4 });
const wind = piece({ type: 'straight', length: 14 }); // 강풍, 벽 없음 → 밀리면 낙하
const railB = piece({ type: 'straight', length: RAIL.length, floor: false }); // 분할 레일 2

// ── 3부: 다시 구 ───────────────────────────────────────────────────
const benchC = piece({ type: 'straight', length: 6 });
piece({ type: 'arc', radius: 9, angle: -90, walls: true }); // 왼쪽 곡선, 벽 있음
const stepsB = piece({ type: 'straight', length: 20 });
const curveB = piece({ type: 'arc', radius: TIGHT, angle: 90, walls: false }); // 급커브 2: 오른쪽
piece({ type: 'straight', length: 14 }); // 골까지

export const level1 = {
  track: {
    width: 6,
    start: { x: 0, z: 0 },
    heading: { x: 0, z: -1 }, // -Z 방향으로 출발
    pieces,
  },
  length, // 트랙 중심선 전체 길이 (≈ 150m)
  spawnOffset: 2, // 트랙 시작점에서 이만큼 앞에 스폰
  spawnHeight: 1,
  goalDepth: 2, // 골 상자 깊이 (진행 방향)
  killY: -10,
  sections: [
    // 1부
    { type: 'splitRail', at: railA, params: RAIL },
    { type: 'workbench', at: benchA + 1, params: WB },
    { type: 'steps', at: stepsA + 1.5, params: {} }, // 턱 0.15 · 0.2 · 0.26, 길이 13.5m
    { type: 'curve', at: curveA, params: { radius: TIGHT, angle: -90 } },
    // 2부
    { type: 'workbench', at: benchB + 0.5, params: WB },
    { type: 'windGap', at: wind + 1, params: { length: 10, speed: 7 } }, // 원유승 구현, 오른쪽 옆바람
    { type: 'splitRail', at: railB, params: RAIL },
    // 3부
    { type: 'workbench', at: benchC + 1, params: WB },
    { type: 'steps', at: stepsB + 1.5, params: {} },
    { type: 'curve', at: curveB, params: { radius: TIGHT, angle: 90 } },
  ],
};
