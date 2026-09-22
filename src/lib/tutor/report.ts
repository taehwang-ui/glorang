import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anthropic, modelRequestOptions } from "./claude";
import { LessonReportSchema, type LessonReport } from "./report-schema";
import { topicById, type SessionProfile } from "./prompt";

const REPORT_SYSTEM = `You write short, honest lesson reports for parents of Korean children after a 1:1 English speaking lesson with an AI tutor.
Write Korean fields in warm, plain Korean (존댓말). Be specific: quote what the student actually said.
Do not exaggerate. If the student spoke very little, say so kindly and suggest what would help.
Ignore transcription noise: do not count obviously garbled speech-to-text as a grammar error.`;

export function transcriptText(messages: Anthropic.Beta.BetaMessageParam[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    const text =
      typeof m.content === "string"
        ? m.content
        : m.content
            .map((b) => (b.type === "text" ? b.text : ""))
            .filter(Boolean)
            .join("\n");
    if (!text) continue;
    lines.push(`${m.role === "user" ? "Student" : "Tutor"}: ${text}`);
  }
  return lines.join("\n");
}

export async function generateReport(input: {
  model: string;
  profile: SessionProfile;
  messages: Anthropic.Beta.BetaMessageParam[];
}): Promise<{ report: LessonReport; usage: Anthropic.Beta.BetaUsage }> {
  const { model, profile, messages } = input;
  const topic = topicById(profile.topicId);

  const response = await anthropic.beta.messages.parse({
    model,
    max_tokens: 4000,
    ...modelRequestOptions(model, "medium"),
    system: REPORT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Student: ${profile.studentName}, age ${profile.age}, level ${profile.level}. Topic: ${topic.en}. Lesson length: ${profile.durationMin} minutes.
Lines in [square brackets] are system notes, not the student's words.

<transcript>
${transcriptText(messages)}
</transcript>

Write the lesson report.`,
      },
    ],
    output_config: { format: betaZodOutputFormat(LessonReportSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("report generation was refused");
  }
  if (!response.parsed_output) {
    throw new Error("report output did not match the schema");
  }
  return { report: response.parsed_output, usage: response.usage };
}
