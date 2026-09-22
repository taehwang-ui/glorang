// 구조화 출력용 JSON 스키마를 출력한다 (데모의 브라우저 직접 호출 모드에서 씀).
// 사용: node --experimental-strip-types scripts/print-schemas.mts
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { TurnOutputSchema } from "../src/lib/tutor/board.ts";
import { LessonReportSchema } from "../src/lib/tutor/report-schema.ts";

const turn = betaZodOutputFormat(TurnOutputSchema) as unknown as { schema: unknown };
const report = betaZodOutputFormat(LessonReportSchema) as unknown as { schema: unknown };
console.log(JSON.stringify({ turn: turn.schema, report: report.schema }));
