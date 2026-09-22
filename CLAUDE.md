@AGENTS.md

# 프로젝트 메모

꾸그(Gguge) 1:1 AI 영어 스피킹 튜터. Next.js 16 App Router + TypeScript + @anthropic-ai/sdk.

- 검사: `pnpm check` (typecheck + lint + vitest). 빌드: `pnpm build`.
- 선생님 지침은 `src/lib/tutor/prompt.ts` 의 `TUTOR_CORE_PROMPT`. 프롬프트 캐시 공유를 위해 가변 값(이름, 날짜, ID)을 넣지 않는다.
- 가격 규칙은 `src/lib/billing/meter.ts`, 원가 모델은 `src/lib/billing/cost.ts` + `docs/cost-model.md`.
- 모델 선택은 `TUTOR_MODEL` 환경변수. 모델별 요청 옵션 분기는 `src/lib/tutor/claude.ts`.
- 턴 출력은 구조화 출력(`src/lib/tutor/board.ts` 의 `TurnOutputSchema`): say / hint / mood / board. 필드를 바꾸면 프롬프트의 "# Board" 절과 데모의 `JSON_SHAPE` 도 함께 바꾼다.
- 선생님 지침을 바꾸면 `node scripts/sync-demo-prompt.mjs` 로 `demo/coco-demo.html` 에 동기화한다.
- 진입: 꾸그 토큰(`GGUGE_HANDOFF_SECRET`) 또는 초대 코드(`INVITE_CODES`) → `/start` → 쿠키 → `/welcome`. 세션은 `ownerId` 로 소유자 검사(`src/lib/tutor/access.ts`). 잔액은 `src/lib/entry/balance.ts` 인메모리.
- 주제별 수업 계획은 `src/lib/tutor/lessons.ts` 의 `LESSONS:BEGIN/END` 마커 사이 객체 리터럴만 두고(데모 동기화 스크립트가 파싱), 세션 system 블록에 들어간다.
