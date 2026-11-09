# AGENTS.md — RollCraft AI 작업 지침

> 이 파일은 팀원 모두의 AI 도구(Claude Code, Antigravity 등)가 읽는 공통 지침이에요.
> 사람이 읽는 전체 규칙은 `TeamRules.md`에 있어요. 규칙을 바꿀 때는 두 파일을 같이 고쳐요.

## 세션 시작: 로그인 (가장 먼저)

새 세션의 **첫 응답은 항상 아래 로그인 화면**이에요. 사용자의 첫 메시지가 작업 요청이어도 먼저 로그인 화면을 보여 주고, 로그인이 끝나면 그 요청을 이어서 처리해요. 화면은 코드 블록 안에 그대로 출력해요.

```
 ____   ___  _     _      ____ ____      _    _____ _____
|  _ \ / _ \| |   | |    / ___|  _ \    / \  |  ___|_   _|
| |_) | | | | |   | |   | |   | |_) |  / _ \ | |_    | |
|  _ <| |_| | |___| |___| |___|  _ <  / ___ \|  _|   | |
|_| \_\\___/|_____|_____|\____|_| \_\/_/   \_\_|     |_|

          T E A M   J  ·  C G   T E R M   P R O J E C T

  ════════════════════════════════════════════════════════
     이름을 입력하시오

       1. 유승    물리 · 조작
       2. 수정    형상 · 렌더링 · UI
       3. 연우    스테이지 · 카메라 · 통합

     ▶ 번호 또는 이름 입력 _
  ════════════════════════════════════════════════════════
```

- 번호(`1`), 이름(`유승`, `원유승`), GitHub 아이디(`yoosng`) 모두 받아요. 셋 중 누구인지 알 수 없으면 화면을 다시 보여 줘요.

| 번호 | 이름   | GitHub  | 진행 기록             |
| ---- | ------ | ------- | --------------------- |
| 1    | 원유승 | yoosng  | `progress/yoosng.md`  |
| 2    | 최수정 | xuxeong | `progress/xuxeong.md` |
| 3    | 손연우 | SYW77   | `progress/SYW77.md`   |

- 로그인이 끝나면 짧게 환영 인사를 해요: `▶ 원유승 님 로그인 완료 · 물리 · 조작` 한 줄, 담당 폴더, 그리고 그 사람 progress 파일의 최근 "다음 할 일".
- 이 세션 동안 로그인한 사람을 작업자로 여겨요. 담당 폴더, 커밋, 진행 기록은 모두 이 사람 기준이에요.

## 프로젝트

RollCraft: 2D로 그린 단면을 회전시켜 만든 3D 물체(lathe)를 굴려 장애물 코스를 통과하는 퍼즐 러너예요. CG 텀프로젝트(Team J)예요.

- 스택: Vite + three + cannon-es, 순수 JavaScript(ES modules). TypeScript와 프레임워크는 쓰지 않아요.
- 실행: `npm install` → `npm run dev` → `http://localhost:5173/`
- 모듈 단독 테스트: `/src/physics/dev.html`, `/src/stage/dev.html`, `/src/editor/dev.html`
- 확인: 작업 후 `npm run build`가 통과하고 `npm run format`으로 포맷을 맞춰야 해요.

## 폴더와 담당

**로그인한 사람의 담당 폴더만 수정해요.**
남의 폴더 수정이 필요하면 코드를 고치지 말고, 무엇을 왜 바꿔야 하는지 사용자에게 알려요. 담당은 `.github/CODEOWNERS`에 있어요.

| 담당                              | GitHub  | 폴더 · 파일                                                                                            |
| --------------------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| 손연우 (스테이지 · 카메라 · 통합) | SYW77   | `src/stage/`, `src/main.js`, 루트 설정 파일                                                            |
| 최수정 (형상 · 렌더링 · UI)       | xuxeong | `src/editor/`, `src/render/`, `src/ui/`                                                                |
| 원유승 (물리 · 조작)              | yoosng  | `src/physics/`, `src/shared/profileMath.js`, `src/shared/presets.js`, `src/stage/obstacles/windGap.js` |
| 3인 공동                          | —       | `src/shared/contracts.js`, `src/shared/events.js`                                                      |

## 공용 계약: 함부로 바꾸지 않기

- `src/shared/contracts.js`와 `src/shared/events.js`는 세 명의 코드가 모두 의존하는 인터페이스 계약이에요.
- 이 두 파일, 그리고 다른 모듈이 import하는 함수의 이름·인자·반환값은 **사용자가 명시적으로 요청하지 않으면 바꾸지 않아요.**
- 바꿔야 할 것 같으면 먼저 사용자에게 제안해요. 팀 3명이 합의한 뒤 그 파일만 고친 작은 PR로 올려요.
- 지금 많은 파일이 stub이에요. 시그니처는 그대로 두고 내부만 구현해요.

## Git

- 커밋 메시지: `[타입] 요약` (타입: `feat`, `fix`, `refactor`, `docs`, `chore`). 요약은 한국어로 짧게 써요. 예: `[feat] 원뿔 compound 콜라이더 추가`
- 커밋 하나에는 변경 하나만 담아요.
- 자기 담당 폴더나 문서만 고쳤으면 `git pull --rebase` 후 `main`에 바로 푸시해도 돼요.
- 남의 폴더, 공용 계약, 큰 작업은 `<영역>/<작업>` 브랜치(예: `physics/frustum-collider`)에서 작업한 뒤 PR로 올려요. 머지는 Squash and merge로 해요.
- **금지:** `git push --force`, 이미 푸시한 브랜치 rebase, `node_modules/`·`dist/`·`.env` 커밋
- 커밋, 푸시, PR 생성은 사용자가 요청할 때만 해요.

## 진행 기록

- 작업을 마치면 로그인한 사람의 파일(`progress/yoosng.md`, `progress/SYW77.md`, `progress/xuxeong.md`) 맨 위에 그날 날짜로 기록해요. 형식은 `progress.md`를 따라요.
- 남의 progress 파일과 `progress.md`는 고치지 않아요.

자세한 내용은 `TeamRules.md`를 읽고 따라요.
