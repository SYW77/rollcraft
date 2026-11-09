# 손연우 진행 기록 (스테이지 · 카메라 · 통합)

<!-- 최신 날짜를 맨 위에 추가해요. 형식은 progress.md를 참고해요. -->

## 2026-11-09

**한 일**

- [feat] 트랙 조각 시스템 `src/stage/track.js`: 직선 · 곡선(arc) 조각을 이어 붙여 바닥/벽(Box 콜라이더)과 중심선(path) 생성
  - 곡선은 7.5°마다 상자 하나로 근사. 윗면이 전부 y = 0이라 이음매가 평평함 (Trimesh는 원뿔대와 충돌이 불안정해서 안 씀)
  - `pointAt(path, s)`: 중심선 거리 → 위치 · 진행 방향 (장애물 배치용), `nearestOnPath`: 카메라 heading용
- [feat] `level1`: 직선 18 → 오른쪽 90° → 직선 14 → 왼쪽 90° → 직선 18 (곡선 구간만 벽). 스폰은 트랙 시작, 골은 트랙 끝에 자동 배치
- [feat] `cameraFollow`: heading = 플레이어에서 가장 가까운 중심선 지점의 진행 방향 (각도 지수 평활). 곡선에서 카메라가 트랙을 따라 돔
- `main.js`: 카메라에 `stage.path` 전달, R 재시작 때 카메라 즉시 제자리(snap)
- 장애물 `ctx`에 `heading` 추가 (`origin`은 이제 레벨의 `at` = 중심선 거리로 계산). 레벨 섹션 형식: `{ type, at, params }`
- 확인: 헤드리스 주행(W만): 구 GOAL, 원통 · 아령은 첫 곡선 벽에서 멈춤(의도), 원뿔은 제자리 호 회전. 자동 조향 추가 시 구 · 아령 GOAL, 원통은 46m 지점 낙하
- [feat] 장애물 `splitRail`: 바닥 없는 구간(트랙 조각 `floor: false`)에 레일 두 줄, 가운데 틈 0.6m. level1의 s = 8~14m에 배치
  - 레일 구간 결과: 구 · 원통 · 아령 · 막대 통과, 짧고 넓은 원반(두께 0.25)은 틈으로 낙하. 틈 0.8m면 원반도 통과해서 변별력 없음
- [fix] 트랙/장애물 상자를 강체 하나(shape 여러 개)로 묶음 (`src/stage/staticBox.js`)
  - 상자마다 강체를 만들면(80여 개) cannon-es `SAPBroadphase`가 충돌 쌍을 놓쳐서 구가 2m/s 이상으로 레일에 진입하면 그대로 통과해 떨어졌음. `NaiveBroadphase`로 바꾸거나 강체 하나로 묶으면 정상

**다음 할 일**

- 장애물 `steps`, `curve` 구현 후 `level1`에 배치
- 솔버빌리티 점검: 절충 형상 하나로 완주 가능한지

**막힌 것 · 다른 사람에게 요청**

- @yoosng `buildStage`가 이제 `path`(트랙 중심선)도 반환해요. `stageRun.mjs`는 heading을 스폰 값으로 고정해서 곡선에서 떨어지니, `createCameraFollow(camera, { path: stage.path })`의 `getHeading()`을 쓰면 실제 게임과 같아져요
- @yoosng 원통 · 아령은 A/D 옆 힘(`SIDE_FORCE`)이 약해서 곡선을 돌기 어려워요. 핸들링 튜닝 때 참고 부탁해요
- @yoosng `windGap.create`의 `ctx`에도 `heading`이 들어가요 (바람 방향 정할 때 쓸 수 있음)
- @yoosng `physicsWorld.js`의 `SAPBroadphase`가 강체가 많을 때 충돌 쌍을 놓쳐요. 스테이지 쪽은 강체를 묶어서 피했지만, 장애물이 늘면 다시 생길 수 있어요. `NaiveBroadphase`(강체 수가 적으면 충분히 빠름)로 바꾸는 걸 검토해 주세요. 장애물 상자는 `src/stage/staticBox.js`의 `createBoxSet`을 쓰면 같이 묶여요
