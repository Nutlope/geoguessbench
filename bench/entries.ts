/**
 * Every benchmark entry is a model plus the exact settings it ran with.
 *
 * Protocol for v2: every model thinks at medium effort, with the same 32,000
 * token output cap (reasoning included). "Medium" is spelled differently per
 * provider:
 * - Claude: output_config.effort "medium" (adaptive thinking is always on).
 * - OpenAI: reasoning.effort "medium".
 * - Together open models: reasoning_effort "medium".
 * - DeepSeek V4.1 has no named medium; it takes 1 to 100, so it gets 50,
 *   passed through chat_template_kwargs because the top-level field is
 *   coerced to a string.
 * Prices are USD per million tokens from each provider's live price list on
 * 2026-10-06.
 */
export type Provider = "together" | "anthropic" | "openai";

export type Entry = {
  key: string;
  provider: Provider;
  model: string;
  name: string;
  maker: string;
  open: boolean;
  mode: string;
  inPerM: number;
  outPerM: number;
  maxTokens: number;
  /** Extra request fields (Together/OpenAI body, or Anthropic params). */
  request?: Record<string, unknown>;
  concurrency?: number;
};

const MAX = 32000;
const MEDIUM = "Medium effort";
const med = { reasoning_effort: "medium" };
const OPEN_CONCURRENCY = 12;

export const ENTRIES: Entry[] = [
  // Closed, first-party APIs
  { key: "claude-fable-5-1", provider: "anthropic", model: "claude-fable-5-1", name: "Claude Fable 5.1", maker: "Anthropic", open: false, mode: MEDIUM, inPerM: 10, outPerM: 50, maxTokens: MAX, request: { output_config: { effort: "medium" } }, concurrency: 4 },
  { key: "claude-opus-5-5", provider: "anthropic", model: "claude-opus-5-5", name: "Claude Opus 5.5", maker: "Anthropic", open: false, mode: MEDIUM, inPerM: 4, outPerM: 20, maxTokens: MAX, request: { output_config: { effort: "medium" } }, concurrency: 4 },
  { key: "claude-sonnet-5-5", provider: "anthropic", model: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", maker: "Anthropic", open: false, mode: MEDIUM, inPerM: 2, outPerM: 10, maxTokens: MAX, request: { output_config: { effort: "medium" } }, concurrency: 4 },
  { key: "gpt-6-astra", provider: "openai", model: "gpt-6-astra", name: "GPT-6 Astra", maker: "OpenAI", open: false, mode: MEDIUM, inPerM: 10, outPerM: 50, maxTokens: MAX, request: { reasoning: { effort: "medium" } }, concurrency: 4 },
  { key: "gpt-6-1-sol", provider: "openai", model: "gpt-6.1-sol", name: "GPT-6.1 Sol", maker: "OpenAI", open: false, mode: MEDIUM, inPerM: 2, outPerM: 10, maxTokens: MAX, request: { reasoning: { effort: "medium" } }, concurrency: 4 },
  { key: "gpt-6-luna", provider: "openai", model: "gpt-6-luna", name: "GPT-6 Luna", maker: "OpenAI", open: false, mode: MEDIUM, inPerM: 0.1, outPerM: 0.5, maxTokens: MAX, request: { reasoning: { effort: "medium" } }, concurrency: 4 },

  // Open weights on Together AI
  { key: "kimi-k3", provider: "together", model: "moonshotai/Kimi-K3", name: "Kimi K3", maker: "Moonshot AI", open: true, mode: MEDIUM, inPerM: 2.7, outPerM: 13.5, maxTokens: MAX, request: med, concurrency: OPEN_CONCURRENCY },
  { key: "qwen3-8-flash", provider: "together", model: "Qwen/Qwen3.8-Flash", name: "Qwen3.8 Flash", maker: "Alibaba Qwen", open: true, mode: MEDIUM, inPerM: 0.15, outPerM: 0.47, maxTokens: MAX, request: med, concurrency: OPEN_CONCURRENCY },
  { key: "deepseek-v4-1-flash", provider: "together", model: "deepseek-ai/DeepSeek-V4.1-Flash", name: "DeepSeek V4.1 Flash", maker: "DeepSeek", open: true, mode: "Effort 50 of 100", inPerM: 0.3, outPerM: 1.2, maxTokens: MAX, request: { chat_template_kwargs: { reasoning_effort: 50 } }, concurrency: OPEN_CONCURRENCY },
  { key: "minimax-m3", provider: "together", model: "MiniMaxAI/MiniMax-M3", name: "MiniMax M3", maker: "MiniMax", open: true, mode: MEDIUM, inPerM: 0.3, outPerM: 1.2, maxTokens: MAX, request: med, concurrency: OPEN_CONCURRENCY },
  { key: "glm-5-3-flash", provider: "together", model: "zai-org/GLM-5.3-Flash", name: "GLM-5.3 Flash", maker: "Z.ai", open: true, mode: MEDIUM, inPerM: 0.15, outPerM: 0.5, maxTokens: MAX, request: med, concurrency: OPEN_CONCURRENCY },
  { key: "qwen3-5-9b", provider: "together", model: "Qwen/Qwen3.5-9B", name: "Qwen3.5 9B", maker: "Alibaba Qwen", open: true, mode: MEDIUM, inPerM: 0.17, outPerM: 0.25, maxTokens: MAX, request: med, concurrency: OPEN_CONCURRENCY },
  { key: "muse-glimmer-30b", provider: "together", model: "meta-models/Muse-Glimmer-30B", name: "Muse Glimmer 30B", maker: "Meta", open: true, mode: MEDIUM, inPerM: 0.35, outPerM: 1.5, maxTokens: MAX, request: med, concurrency: OPEN_CONCURRENCY },
];

export const entryByKey = new Map(ENTRIES.map((e) => [e.key, e]));
