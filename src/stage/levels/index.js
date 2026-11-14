// 고를 수 있는 맵 목록 (대기 화면 · 멀티 방). 담당: 손연우
// id는 멀티 방에서 주고받는 이름이라 바꾸지 않는다. 첫 번째가 기본 맵.
import { meadow } from './meadow.js';
import { desert } from './desert.js';
import { snow } from './snow.js';
import { THEMES } from '../themes.js';

export const LEVELS = [
  {
    id: 'meadow',
    name: '초원 언덕길',
    desc: '풍차 · 컨베이어 · 통나무 · 피스톤',
    level: meadow,
  },
  {
    id: 'desert',
    name: '사막 협곡',
    desc: '높은 벽 · 고원 바람 · 좁은 다리 · 레일',
    level: desert,
  },
  {
    id: 'snow',
    name: '설산 고개',
    desc: '통나무 오르막 · 벽 계단 · 얼음 동굴',
    level: snow,
  },
];

const css = (c) => `#${c.toString(16).padStart(6, '0')}`;
/** 대기 화면 맵 카드에 보일 정보 */
export const mapViews = () =>
  LEVELS.map(({ id, name, desc, level }) => ({
    id,
    name,
    desc,
    laps: level.laps,
    sky: css(THEMES[level.theme].sky),
    ground: css(THEMES[level.theme].ground),
  }));

/** id로 맵 찾기 (없으면 기본 맵) */
export const levelById = (id) => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
