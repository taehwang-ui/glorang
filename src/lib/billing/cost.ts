import { pricingFor, krwPerUsd, type ModelPricing } from "@/lib/tutor/config";

/** API usage 누적치 (Anthropic usage 필드와 같은 의미) */
export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  requests: number;
}

export const emptyUsage = (): UsageTotals => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  requests: 0,
});

export function addUsage(
  total: UsageTotals,
  u: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  },
): UsageTotals {
  return {
    inputTokens: total.inputTokens + u.input_tokens,
    outputTokens: total.outputTokens + u.output_tokens,
    cacheReadTokens: total.cacheReadTokens + (u.cache_read_input_tokens ?? 0),
    cacheWriteTokens: total.cacheWriteTokens + (u.cache_creation_input_tokens ?? 0),
    requests: total.requests + 1,
  };
}

export function usageUsd(u: UsageTotals, p: ModelPricing): number {
  return (
    (u.inputTokens * p.input +
      u.outputTokens * p.output +
      u.cacheReadTokens * p.cacheRead +
      u.cacheWriteTokens * p.cacheWrite) /
    1_000_000
  );
}

export function usageKrw(u: UsageTotals, model: string, rate = krwPerUsd()): number {
  return usageUsd(u, pricingFor(model)) * rate;
}

/**
 * 1시간 수업의 원가 시나리오. docs/cost-model.md 의 수치와 tests/cost.test.ts 가 이 함수를 기준으로 한다.
 *
 * 가정 (아이 발화 주기 ~90초):
 *  - 학생 턴 40회. 시스템 프롬프트 ~1,200 토큰(캐시 읽기). 턴당 이력 증가 ~120 토큰(학생 40 + 튜터 80).
 *  - 이전 이력은 전부 캐시 읽기, 직전 턴 120 토큰은 캐시 쓰기, 학생 새 발화 40 토큰은 일반 입력.
 *  - 출력 = 튜터 발화 80 토큰 + 사고(thinking) 토큰(모델별 가정).
 *  - 수업 후 리포트 1회: 입력 ~6,000 토큰(캐시 없음), 출력 ~700 토큰.
 */
export interface HourScenario {
  turns: number;
  systemTokens: number;
  historyPerTurn: number;
  studentTokens: number;
  tutorTokens: number;
  thinkingTokens: number;
  reportInputTokens: number;
  reportOutputTokens: number;
}

export const DEFAULT_HOUR_SCENARIO: HourScenario = {
  turns: 40,
  systemTokens: 1200,
  historyPerTurn: 120,
  studentTokens: 40,
  tutorTokens: 80,
  thinkingTokens: 100,
  reportInputTokens: 6000,
  reportOutputTokens: 700,
};

export function estimateHourUsage(s: HourScenario = DEFAULT_HOUR_SCENARIO): UsageTotals {
  let cacheRead = 0;
  let cacheWrite = 0;
  let input = 0;
  let output = 0;
  for (let i = 0; i < s.turns; i++) {
    cacheRead += s.systemTokens + s.historyPerTurn * i;
    cacheWrite += i === 0 ? 0 : s.historyPerTurn;
    input += s.studentTokens;
    output += s.tutorTokens + s.thinkingTokens;
  }
  // 첫 턴은 시스템 프롬프트를 캐시에 쓴다.
  cacheWrite += s.systemTokens;
  cacheRead -= s.systemTokens;
  input += s.reportInputTokens;
  output += s.reportOutputTokens;
  return {
    inputTokens: input,
    outputTokens: output,
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    requests: s.turns + 1,
  };
}

export function estimateHourKrw(model: string, rate = 1400, s?: HourScenario): number {
  return usageUsd(estimateHourUsage(s), pricingFor(model)) * rate;
}
