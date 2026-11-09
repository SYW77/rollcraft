# 최수정 진행 기록 (형상 · 렌더링 · UI)

<!-- 최신 날짜를 맨 위에 추가해요. 형식은 progress.md를 참고해요. -->

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

