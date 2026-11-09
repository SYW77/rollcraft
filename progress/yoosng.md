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

**다음 할 일**

- 핸들링 튜닝: 프리셋 모양 수치, 토크 · 조향 세기 (지금은 튜닝 전 값)
- `windGap.js` 장애물 물리

**막힌 것 · 다른 사람에게 요청**

- @SYW77 원뿔은 W만 누르면 꼭짓점 둘레로 원을 그려요(의도한 동작). A/D로 계속 잡아야 직진해서, 코스 설계할 때 참고해 주세요
