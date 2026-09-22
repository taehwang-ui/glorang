/**
 * 튜터 런타임 설정. 모델과 환율은 환경변수로 바꿀 수 있다.
 *
 * TUTOR_MODEL      기본 claude-opus-5. 비용을 더 낮추려면 claude-haiku-4-5.
 * KRW_PER_USD      원가 계산용 환율 (기본 1,400원).
 */
export const DEFAULT_MODEL = "claude-opus-5";

export function tutorModel(): string {
  return process.env.TUTOR_MODEL?.trim() || DEFAULT_MODEL;
}

export function krwPerUsd(): number {
  const raw = Number(process.env.KRW_PER_USD);
  return Number.isFinite(raw) && raw > 0 ? raw : 1400;
}

/** 모델별 요청 옵션 지원 여부 (효과/폴백 파라미터는 모델 계열에 따라 400을 낼 수 있다). */
export function modelCapabilities(model: string) {
  const haiku = model.startsWith("claude-haiku");
  const opusOrFable = /^claude-(opus-5|fable)/.test(model);
  return {
    /** output_config.effort — Haiku 4.5 는 거부하므로 제외 */
    effort: !haiku,
    /** 서버측 refusal 폴백 (fallbacks: "default") — Opus 5 / Fable 계열 */
    fallbacks: opusOrFable,
  };
}

/** 미화 기준 토큰 백만 개당 단가 (USD). 캐시 읽기 0.1x, 캐시 쓰기(5분) 1.25x. */
export interface ModelPricing {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const PRICING: Record<string, ModelPricing> = {
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

export function pricingFor(model: string): ModelPricing {
  const hit = Object.keys(PRICING).find((k) => model.startsWith(k));
  return hit ? PRICING[hit] : PRICING[DEFAULT_MODEL];
}
