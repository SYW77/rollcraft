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
- [refactor] 원뿔 프리셋 제거: 앞으로 못 가서 코스에 필요 없음. 프리셋은 구 · 원통 · 아령 3종. 물리의 원뿔 선회 한계는 직접 그린 단면용으로 남김
- `origin/main` 합침 (연우 트랙 조각 · 카메라 heading, 수정 캔버스 에디터)
- [feat] `windGap`이 트랙 진행 방향(`ctx.heading`)을 따름: 구역 · 판정 · 줄무늬를 heading으로 돌림. 바람 방향 `dir`은 트랙 기준(x = 오른쪽, z = 뒤)
- [fix] 검증 스크립트를 새 트랙에 맞춤
  - `windRun.mjs`: 60m 직선 트랙 + `at` 형식. 트랙 방향 인자(°)로 돌려서 확인. 구 밀림 0°/90°/-135°에서 0.78/0.77/0.62m
  - `stageRun.mjs`: heading을 `cameraFollow`에서 받음. W만 / 자동 조향 두 모드. 자동 조향 시 구 · 아령 GOAL, 원통은 42m에서 낙하

**다음 할 일**

- 곡선 조향 튜닝: 원통이 자동 조향으로도 level1 곡선을 못 돎 (`SIDE_FORCE` 등). 그다음 바람 세기 튜닝(에디터로 중간 모양들)
- 트랙 방향에 따라 굴림이 달라지는 문제: 바람 0에서도 원통 · 아령의 옆 밀림이 방향마다 다르고, 트랙이 +X 방향이면 아령이 바람 없이 떨어짐. 아령 방향 틀어짐 문제와 같은 원인으로 보임 (cannon 마찰 방향이 월드 축 기준인지 확인)
- cannon 마찰이 접촉점 수만큼 커지는지 확인 (옆바람이 바퀴 모양을 거의 못 미는 원인 후보)

**막힌 것 · 다른 사람에게 요청**

- @SYW77 원뿔 프리셋은 뺐어요. 코스는 구 · 원통 · 아령 기준으로 봐 주세요
- @SYW77 `windGap` 새 형식: `{ type: 'windGap', at: 20, params: { length: 10, speed: 3 } }`. `at`부터 진행 방향으로 length만큼 구역이 생기고 바람은 기본으로 오른쪽으로 불어요. 직선 구간에 놓아 주세요
- @SYW77 `stageRun.mjs`가 이제 실제 게임처럼 트랙 heading을 따라요. 코스 바꾸면 `node src/physics/spike/stageRun.mjs`로 프리셋별 완주를 볼 수 있어요
