/**
 * Every benchmark entry is a model plus the exact settings it ran with, so a
 * "thinking" and "fast" run of the same model are separate rows.
 *
 * Protocol for v1: each model in its fastest shipped mode. Open models run
 * with reasoning switched off (how they play on GeoDuel). Claude models that
 * cannot turn thinking off run at effort "low". Prices are USD per million
 * tokens, from each provider's live model list on 2026-10-05.
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

const off = { reasoning: { enabled: false } };

export const ENTRIES: Entry[] = [
  // Open weights on Together AI
  { key: "kimi-k3", provider: "together", model: "moonshotai/Kimi-K3", name: "Kimi K3", maker: "Moonshot AI", open: true, mode: "Reasoning off", inPerM: 2.7, outPerM: 13.5, maxTokens: 1500, request: off },
  { key: "qwen3-8-flash", provider: "together", model: "Qwen/Qwen3.8-Flash", name: "Qwen3.8 Flash", maker: "Alibaba Qwen", open: true, mode: "Reasoning off", inPerM: 0.15, outPerM: 0.47, maxTokens: 1500, request: off },
  { key: "deepseek-v4-1-flash", provider: "together", model: "deepseek-ai/DeepSeek-V4.1-Flash", name: "DeepSeek V4.1 Flash", maker: "DeepSeek", open: true, mode: "Reasoning off", inPerM: 0.3, outPerM: 1.2, maxTokens: 1500, request: off },
  { key: "minimax-m3", provider: "together", model: "MiniMaxAI/MiniMax-M3", name: "MiniMax M3", maker: "MiniMax", open: true, mode: "Reasoning off", inPerM: 0.3, outPerM: 1.2, maxTokens: 2500, request: off },
  { key: "glm-5-3-flash", provider: "together", model: "zai-org/GLM-5.3-Flash", name: "GLM-5.3 Flash", maker: "Z.ai", open: true, mode: "Low reasoning", inPerM: 0.15, outPerM: 0.5, maxTokens: 2500, request: { reasoning_effort: "low" } },
  { key: "qwen3-5-9b", provider: "together", model: "Qwen/Qwen3.5-9B", name: "Qwen3.5 9B", maker: "Alibaba Qwen", open: true, mode: "Reasoning off", inPerM: 0.17, outPerM: 0.25, maxTokens: 1500, request: off },
  { key: "inkling", provider: "together", model: "thinkingmachines/Inkling", name: "Inkling", maker: "Thinking Machines", open: true, mode: "Low reasoning", inPerM: 1, outPerM: 4.05, maxTokens: 2500, request: { reasoning_effort: "low" } },
  { key: "muse-glimmer-30b", provider: "together", model: "meta-models/Muse-Glimmer-30B", name: "Muse Glimmer 30B", maker: "Meta", open: true, mode: "Default", inPerM: 0.35, outPerM: 1.5, maxTokens: 2500 },

  // Closed, first-party APIs
  { key: "claude-fable-5-1", provider: "anthropic", model: "claude-fable-5-1", name: "Claude Fable 5.1", maker: "Anthropic", open: false, mode: "Effort low", inPerM: 10, outPerM: 50, maxTokens: 16000, request: { output_config: { effort: "low" } }, concurrency: 4 },
  { key: "claude-opus-5-5", provider: "anthropic", model: "claude-opus-5-5", name: "Claude Opus 5.5", maker: "Anthropic", open: false, mode: "Effort low", inPerM: 4, outPerM: 20, maxTokens: 16000, request: { output_config: { effort: "low" } }, concurrency: 4 },
  { key: "claude-sonnet-5-5", provider: "anthropic", model: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", maker: "Anthropic", open: false, mode: "Effort low", inPerM: 2, outPerM: 10, maxTokens: 16000, request: { output_config: { effort: "low" } }, concurrency: 4 },
  { key: "claude-haiku-4-5", provider: "anthropic", model: "claude-haiku-4-5", name: "Claude Haiku 4.5", maker: "Anthropic", open: false, mode: "No thinking", inPerM: 1, outPerM: 5, maxTokens: 2000, concurrency: 4 },
];

export const entryByKey = new Map(ENTRIES.map((e) => [e.key, e]));
