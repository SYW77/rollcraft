// 인터페이스 계약 (1일차 동결). 변경은 이 파일만 고치는 작은 PR + 3인 승인.
// 담당: 최수정

export const PROFILE_POINTS = 12; // 리샘플 후 점 개수 (물리 구간 11개)
export const R_MIN = 0.05; // 정규화 반지름 하한
export const R_MAX = 1.0; // 정규화 반지름 상한
export const SEGMENTS_MIN = 8;
export const SEGMENTS_MAX = 64;
export const SEGMENTS_DEFAULT = 24;
export const PLAYER_SIZE = 1.0; // 정규화 후 최대 치수 (월드 단위)

/**
 * @typedef {{ r: number, y: number }} ProfilePoint
 * @typedef {ProfilePoint[]} Profile
 *   길이 PROFILE_POINTS, y 단조 증가(오버행 없음), r in [R_MIN, R_MAX].
 *   에디터가 보장하고 나머지 모듈은 신뢰한다.
 *
 * @typedef {{ x: number, y: number }} LegPoint
 * @typedef {LegPoint[]} Legs  플레이어가 그린 다리 선 (Draw Climber 방식)
 *   그리기 칸 좌표를 [-1, 1]로 정규화 (가운데 = (0, 0), 오른쪽 +x = 진행 방향, 위 +y).
 *   그린 순서대로의 점 목록 (선 하나). 비어 있으면 다리 없음. 그리기 칸이 보장하고 나머지 모듈은 신뢰한다.
 *   선의 시작점(첫 점)이 몸통 회전축에 붙는다. 반대쪽 다리는 같은 선을 축 둘레로 180° 돌려 붙인다 (페달처럼).
 *
 * @typedef {{ x: number, z: number }} Heading  XZ 평면 단위벡터 (cameraFollow가 제공)
 * @typedef {{ forward: boolean, back: boolean, left: boolean, right: boolean }} Input
 */

/** 이벤트 이름. payload는 주석 참고. */
export const EVENTS = Object.freeze({
  GOAL: 'goal', // physics/triggers -> main
  FALL: 'fall', // physics/triggers -> main
  WORKBENCH_ENTER: 'workbench-enter', // stage -> main (P1)
  CONFIRM: 'confirm', // editor -> main, payload { profile, segments }
  RETRY: 'retry', // ui -> main
  EDIT: 'edit', // ui -> main
  LEGS: 'legs', // ui(그리기 칸) -> main, payload Legs. 다 그렸을 때 (주행 중이면 그 자리에서 다리 교체)
  DRAWING: 'drawing', // ui(그리기 칸) -> main, payload boolean. 그리기 시작 true / 끝 false (그리는 동안 느리게)
});

/** main.js 상태머신의 상태 */
export const STATES = Object.freeze({
  EDIT: 'EDIT',
  PLAY: 'PLAY',
  CLEAR: 'CLEAR',
  OVER: 'OVER',
});
