# 원유승 진행 기록 (물리 · 조작)

## 2026-11-09

**한 일**

- 비공개 레포 `yoosng/rollcraft` 생성, 팀원 2명 초대
- Vite + three + cannon-es 뼈대 세팅: 폴더 구조, 계약 stub, CODEOWNERS. EDIT → PLAY → CLEAR 한 바퀴 동작 확인
- `TeamRules.md`, `AGENTS.md`, `CLAUDE.md`, `progress.md` 작성
- 교수님께 cannon-es 사용 허가 받음
- 에이전트 세션 시작 로그인 화면 추가 (`AGENTS.md`), Claude Code에서 동작 확인
- [feat] `profileMath.js`: 부피 · 무게중심 · 투영면적 · 관성 · 누웠을 때 옆면(`restingSide`)
- [feat] frustum 스파이크 완료: 구간마다 원뿔대(`CANNON.Cylinder`, 32각) compound 콜라이더. 축 방향 · 튐(1cm 미만) · 원뿔 호 회전 모두 통과
  - 물리 스텝 1/240초, 조작은 매 내부 스텝(`preStep`)에 적용
  - 조작: 트랙션 컨트롤, 최고 속도 제한, 원뿔 선회 한계, 직진 요 감쇠, 구 옆 미끄러짐 보정
- [feat] physics `dev.html`: 콜라이더 와이어프레임(C), 프리셋 전환(1~4), 속력 · 튐 표시
- 검증 스크립트 `src/physics/spike/` (`frustumSpike.mjs`, `stageRun.mjs`): level1에서 W만 눌러 구 · 원통 · 아령 골 도착, 전체 게임 CLEAR 확인
- [feat] `windGap.js` 옆바람 구간: 바람 방향 투영면적 × 상대 속도² 항력, 돌풍, 반투명 구역 + 바람 줄무늬. 레벨 `params`로 세기 · 방향 · 길이 · 폭 · 돌풍 조절
  - 지금은 원통 · 아령처럼 옆으로 누운 모양은 바퀴처럼 옆 마찰로 버티고, 구는 밀려서 A/D로 버텨야 함 (3m/s, 10m 구간에서 구 0.8m 밀림)
  - 바람 받는 동안 구 옆 미끄러짐 보정은 끔. 확인 스크립트 `windRun.mjs`

**다음 할 일**

- 캔버스 에디터가 나오면: 핸들링 튜닝(토크 · 조향 세기), 바람 세기 튜닝(중간 모양들로)
- 아령이 바람 구간을 나온 뒤 방향이 틀어져 떨어지는 문제 확인
- cannon 마찰이 접촉점 수만큼 커지는지 확인 (옆바람이 바퀴 모양을 거의 못 미는 원인 후보)

**막힌 것 · 다른 사람에게 요청**

- @SYW77 원뿔은 W만 누르면 꼭짓점 둘레로 원을 그려요(의도한 동작). A/D로 계속 잡아야 직진해서, 코스 설계할 때 참고해 주세요
- @SYW77 `windGap` 쓸 수 있어요: `{ type: 'windGap', origin: { x: 0, y: 0, z: -20 }, params: { length: 10, speed: 3 } }`. origin부터 -Z로 length만큼 구역이 생겨요
- @xuxeong 캔버스 에디터 언제쯤 나올지 알려 주세요. 물리 튜닝을 그 뒤에 하려고 해요
