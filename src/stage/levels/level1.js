// 레벨 1 구간 배치. 담당: 손연우
// 트랙은 조각(직선 · 곡선)을 순서대로 이어 붙인다 (stage/track.js).
// 장애물은 { type, at, params }: at = 트랙 중심선을 따라 시작점부터의 거리(m).
// 스폰은 트랙 시작, 골은 트랙 끝에 자동으로 놓인다.
//
// 코스 흐름 (구간마다 유리한 모양이 다르다 → 작업대에서 바꿔 가며 푸는 퍼즐)
//   분할 레일   s  8~14   원반처럼 짧은 모양만 낙하 (구 · 원통 · 아령 통과)
//   작업대 A    s 15~17.5
//   계단        s 33.5~47 반지름 큰 모양 (구 > 아령, 원통은 걸림)
//   급커브      s 50~58   바깥 벽 없음. 아령은 조향만으로, 구는 감속하면 통과, 원통은 낙하
//   작업대 B    s 58.5~61
//   강풍        s 62.5~72.5 바람 쪽 면적이 작은 원통이 유리 (구는 거의 완벽하게 A/D로 버텨야 함)
// 헤드리스 완주 점검: 작업대 A에서 구 → (구로 끝까지, 또는 B에서 원통). 원통 · 아령은 곡선을 잘 못 돈다.
// 프리셋 하나로 완주하려면 구 + 정밀한 조작(급커브 감속, 강풍 조향)이 필요하다.

const ARC1 = (9 * Math.PI) / 2; // 첫 곡선 길이 (반지름 9, 90°)
const CURVE_AT = 8 + 6 + 4 + ARC1 + 18; // 급커브 시작 거리 (≈ 50.14)
const CURVE_END = CURVE_AT + (5 * Math.PI) / 2; // 급커브 끝 (≈ 57.99)

export const level1 = {
  track: {
    width: 6,
    start: { x: 0, z: 0 },
    heading: { x: 0, z: -1 }, // -Z 방향으로 출발
    pieces: [
      { type: 'straight', length: 8 },
      { type: 'straight', length: 6, floor: false }, // 분할 레일 구간 (s = 8~14)
      { type: 'straight', length: 4 },
      { type: 'arc', radius: 9, angle: 90, walls: true }, // 오른쪽으로 꺾음 (벽 있음)
      { type: 'straight', length: 18 }, // 계단
      { type: 'arc', radius: 5, angle: -90, walls: false }, // 급커브: 왼쪽, 바깥 벽 없음
      { type: 'straight', length: 20 }, // 작업대 B + 강풍 구간, 벽 없음 → 밀리면 낙하
    ],
  },
  spawnOffset: 2, // 트랙 시작점에서 이만큼 앞에 스폰
  spawnHeight: 1,
  goalDepth: 2, // 골 상자 깊이 (진행 방향)
  killY: -10,
  sections: [
    // 분할 레일: at과 length를 위의 floor: false 조각과 맞춘다
    { type: 'splitRail', at: 8, params: { length: 6, gap: 0.6, railWidth: 0.5 } },
    // 변신 작업대 A (P1): 레일을 지난 뒤, 계단 앞
    { type: 'workbench', at: 15, params: { length: 2.5 } },
    // 불규칙 계단: 기본값 (턱 0.15 · 0.2 · 0.26, 사이 평지 4.5m). 길이 13.5m
    { type: 'steps', at: 33.5, params: {} },
    // 급커브 표지 (곡선 자체는 위의 arc 조각). radius · angle을 arc 조각과 맞춘다
    { type: 'curve', at: CURVE_AT, params: { radius: 5, angle: -90 } },
    // 변신 작업대 B (P1): 급커브를 빠져나온 직후, 강풍 앞 (바람엔 원통이 유리)
    { type: 'workbench', at: CURVE_END + 0.5, params: { length: 2.5 } },
    // 강풍(P1, 원유승): 오른쪽 옆바람 7m/s, 길이 10m. 작업대 B 뒤 1.5m부터
    // 헤드리스(59m 출발): W만 → 원통 · 막대만 버팀. 조향 봇 → 구는 2.7m 밀려 트랙 끝(3m)에서 겨우 버팀, 아령 1.6m.
    // 원통은 0.1m만 밀려 쉽게 통과 → 작업대 B에서 원통으로 바꾸는 게 정답. 8m/s면 구는 조향해도 낙하
    { type: 'windGap', at: CURVE_END + 4.5, params: { length: 10, speed: 7 } },
  ],
};
