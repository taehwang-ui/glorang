@AGENTS.md

# 프로젝트 메모

꾸그(Gguge) 1:1 AI 영어 스피킹 튜터. Next.js 16 App Router + TypeScript + @anthropic-ai/sdk.

- 검사: `pnpm check` (typecheck + lint + vitest). 빌드: `pnpm build`.
- 선생님 지침은 `src/lib/tutor/prompt.ts` 의 `TUTOR_CORE_PROMPT`. 프롬프트 캐시 공유를 위해 가변 값(이름, 날짜, ID)을 넣지 않는다.
- 가격 규칙은 `src/lib/billing/meter.ts`, 원가 모델은 `src/lib/billing/cost.ts` + `docs/cost-model.md`.
- 모델 선택은 `TUTOR_MODEL` 환경변수. 모델별 요청 옵션 분기는 `src/lib/tutor/claude.ts`.
- 턴 출력은 구조화 출력(`src/lib/tutor/board.ts` 의 `TurnOutputSchema`): say / hint / mood / board. 필드를 바꾸면 프롬프트의 "# Board" 절과 데모의 `JSON_SHAPE` 도 함께 바꾼다.
- 선생님 지침을 바꾸면 `node scripts/sync-demo-prompt.mjs` 로 `demo/coco-demo.html` 에 동기화한다.
