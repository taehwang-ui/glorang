import Anthropic from "@anthropic-ai/sdk";
import { modelCapabilities } from "./config";

// ANTHROPIC_API_KEY (또는 ant auth login 프로필)을 환경에서 읽는다. 키를 코드에 넣지 않는다.
const g = globalThis as unknown as { __anthropic?: Anthropic };
export const anthropic: Anthropic = g.__anthropic ?? (g.__anthropic = new Anthropic());

/**
 * 모델 계열별 공통 요청 옵션.
 * - Opus 5 계열: 적응형 사고는 기본이므로 thinking 은 생략하고 effort 로 깊이만 낮춘다.
 *   안전 분류기 거부 시 서버측 폴백(fallbacks: "default")으로 같은 요청을 다른 모델에서 이어간다.
 * - Haiku 4.5: effort/fallbacks 미지원이라 아무것도 붙이지 않는다.
 */
export function modelRequestOptions(model: string, effort: "low" | "medium" = "low") {
  const caps = modelCapabilities(model);
  return {
    ...(caps.effort ? { output_config: { effort } } : {}),
    ...(caps.fallbacks
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  };
}
