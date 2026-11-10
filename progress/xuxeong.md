# 최수정 진행 기록 (형상 · 렌더링 · UI)

<!-- 최신 날짜를 맨 위에 추가해요. 형식은 progress.md를 참고해요. -->

## 2026-11-11

**한 일**

- [feat] 클리어(기록 시간/최고 기록 배지) 및 게임오버(장애물 공략 팁) 글래스모피즘 모달 카드 UI 고도화 (`clear.js`, `gameOver.js`, `overlay.js`, `ui.css`)
- [feat] 부드러운 그림자(PCFSoftShadowMap) 및 회전체 림 라이트, 섀도우 바이어스 보정 구현 (`lighting.js`)
- [feat] 트랙 주행 격자 및 플레이어 회전 줄무늬 절차적 텍스처/머티리얼 구현 (`materials.js`)
- [feat] 원거리 시야 확보를 위한 소프트 스카이 및 대기 안개 거리 최적화 (`environment.js`)
- [fix] `latheGeometry.js` 상단/하단 캡 삼각형 인덱스 감기 방향 수정 (백페이스 컬링으로 인한 캡 투명 현상 해결)
- [feat] HUD에 "모양 바꾸기 (E)" 버튼 추가 및 `EVENTS.EDIT` 연동 (`hud.js`, `ui.css`)
- [test] `origin/main` (불규칙 계단, E키 연동) 최신 브랜치 머지 및 `npm run build` 통과 확인

**다음 할 일**

- 변신 작업대(P1) 오버레이 UI 구현 및 main 연동 검토 (`workbenchOverlay.js`)
- 에디터 프리뷰 및 캔버스 드로잉 감도 미세 튜닝

**막힌 것 · 다른 사람에게 요청**

- 없음

## 2026-11-09

**한 일**

- [feat] 3D 회전체 BufferGeometry 직접 생성 수학적 계산 구현 (`latheGeometry.js`: 정점, 법선, UV, 인덱스, 캡)
- [feat] 2D 캔버스 자유 드로잉 좌표를 공용 계약에 맞는 12점 균일 리샘플링 및 $y$ 단조 보정 알고리즘 구현 (`profileUtil.js`)
- [feat] 2D 단면 드로잉(회전 대칭 가이드/제어점 드래그/Undo/Clear)과 3D 실시간 미리보기 뷰어 연동 (`ShapeEditor.js`, `EditorPreview.js`, `editor.css`)
- [test] `src/editor/dev.html` 및 메인 게임 루프 연동 빌드 확인 (`npm run build` 통과)

**다음 할 일**

- 에디터 드로잉 반응성 및 UX 피드백 반영
- 플레이어 추적 그림자 조명(`lighting.js`) 및 인게임 재질/배경(`materials.js`, `environment.js`) 비주얼 강화
- HUD 및 게임오버/클리어 UI 스타일 고도화

**막힌 것 · 다른 사람에게 요청**

- 현재 없음 (기본 계약 규격대로 D1/D2 뼈대 및 메쉬 생성 파이프라인 연동 완료)

