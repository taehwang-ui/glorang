import { z } from "zod";

/** 수업 후 학부모·학생용 리포트. 구조화 출력(output_config.format)으로 받는다. */
export const LessonReportSchema = z.object({
  summary_ko: z.string().describe("학부모용 3~4문장 요약. 아이가 무엇을 말했고 어떻게 참여했는지."),
  strengths_ko: z.array(z.string()).max(3).describe("잘한 점 최대 3개, 구체적으로."),
  corrections: z
    .array(
      z.object({
        student_said: z.string().describe("학생이 실제로 한 말"),
        better: z.string().describe("자연스러운 영어 표현"),
        note_ko: z.string().describe("한 줄 한국어 설명"),
      }),
    )
    .max(5)
    .describe("다시 볼 만한 교정 최대 5개. 사소한 발음 오인식은 제외."),
  new_expressions: z
    .array(
      z.object({
        expression: z.string(),
        meaning_ko: z.string(),
      }),
    )
    .max(6)
    .describe("수업에서 나온 새 표현·단어 최대 6개"),
  next_lesson_focus_ko: z.string().describe("다음 수업에서 집중할 것 한두 문장"),
  level_signal: z
    .enum(["below", "on", "above"])
    .describe("선택한 레벨 대비 실제 수행: below(쉬운 레벨 권장), on(적절), above(높은 레벨 권장)"),
  praise_for_student_en: z.string().describe("아이에게 그대로 읽어줄 한 문장 영어 칭찬"),
});

export type LessonReport = z.infer<typeof LessonReportSchema>;
