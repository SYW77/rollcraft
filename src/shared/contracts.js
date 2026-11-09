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
});

/** main.js 상태머신의 상태 */
export const STATES = Object.freeze({
  EDIT: 'EDIT',
  PLAY: 'PLAY',
  CLEAR: 'CLEAR',
  OVER: 'OVER',
});
