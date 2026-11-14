// 검증 스크립트들이 같이 쓰는 다리 모양 (그리기 칸 좌표 [-1, 1], 첫 점이 몸통에 붙음). 담당: 원유승
const arc = (n, f) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
const circle = (r) =>
  arc(48, (t) => ({ x: r * Math.cos(t * 2 * Math.PI), y: r * Math.sin(t * 2 * Math.PI) }));

export const LEGS = {
  '큰 원': circle(0.9),
  '작은 원': circle(0.45),
  '중간 원': circle(0.62),
  별: arc(80, (t) => {
    const a = t * 2 * Math.PI;
    const r = Math.round((a * 5) / Math.PI) % 2 ? 0.3 : 0.9;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  }),
  '긴 막대': [
    { x: -0.95, y: 0 },
    { x: 0.95, y: 0 },
  ],
  '짧은 막대': [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
  ],
  '갈고리 Z': [
    { x: -0.8, y: 0.6 },
    { x: -0.8, y: 0 },
    { x: 0.8, y: 0 },
    { x: 0.8, y: -0.6 },
  ],
  L자: [
    { x: 0, y: 0 },
    { x: 0.9, y: 0 },
    { x: 0.9, y: 0.6 },
  ],
  S자: arc(40, (t) => ({ x: -0.9 + 1.8 * t, y: 0.5 * Math.sin(t * 2 * Math.PI) })),
};
