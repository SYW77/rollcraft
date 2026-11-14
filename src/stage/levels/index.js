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
    desc: '입문 · 높은 벽 · 언덕 · 급커브',
    level: meadow,
  },
  {
    id: 'desert',
    name: '사막 협곡',
    desc: '고원 오르막 · 옆바람 · 구덩이',
    level: desert,
  },
  {
    id: 'snow',
    name: '설산 고개',
    desc: '회전 막대 · 긴 오르막 · 센 바람',
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
