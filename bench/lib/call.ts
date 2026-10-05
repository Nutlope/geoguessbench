/**
 * Provider calls. Each returns the visible text plus usage, or throws.
 * Images always go in as base64 JPEG (identical bytes for every model).
 * No refusal fallbacks: a benchmark answer must come from the model named.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { Entry } from "../entries";
import { SYSTEM, USER } from "./prompt";

export type CallResult = { text: string; inTok: number; outTok: number; reasoningChars: number; stop?: string };

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

export async function callModel(e: Entry, jpegB64: string): Promise<CallResult> {
  if (e.provider === "together") return together(e, jpegB64);
  if (e.provider === "anthropic") return claude(e, jpegB64);
  return gpt(e, jpegB64);
}

async function together(e: Entry, b64: string): Promise<CallResult> {
  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(180_000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`, "User-Agent": "GeoGuessBench/0.1" },
    body: JSON.stringify({
      model: e.model, stream: true, stream_options: { include_usage: true }, max_tokens: e.maxTokens, ...(e.request ?? {}),
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: [{ type: "text", text: USER }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } }] }],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Together ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "", reasoning = 0, inTok = 0, outTok = 0, stop: string | undefined;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const f of frames) {
      const line = f.trim();
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
      if (p === "[DONE]") continue;
      try {
        const c = JSON.parse(p);
        const d = c.choices?.[0]?.delta;
        if (d?.content) text += d.content;
        const r = d?.reasoning_content ?? d?.reasoning;
        if (r) reasoning += r.length;
        if (c.choices?.[0]?.finish_reason) stop = c.choices[0].finish_reason;
        if (c.usage?.completion_tokens != null) { inTok = c.usage.prompt_tokens ?? 0; outTok = c.usage.completion_tokens; }
        if (c.error) throw new Error(`Together stream error: ${JSON.stringify(c.error).slice(0, 200)}`);
      } catch (err) { if (String(err).includes("stream error")) throw err; }
    }
  }
  return { text, inTok, outTok, reasoningChars: reasoning, stop };
}

async function claude(e: Entry, b64: string): Promise<CallResult> {
  anthropic ??= new Anthropic({ maxRetries: 0, timeout: 300_000 });
  const msg = await anthropic.messages
    .stream({
      model: e.model, max_tokens: e.maxTokens, system: SYSTEM, ...(e.request ?? {}),
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }, { type: "text", text: USER }] }],
    } as Anthropic.MessageStreamParams)
    .finalMessage();
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const reasoningChars = msg.content.reduce((a, b) => a + (b.type === "thinking" ? b.thinking.length : 0), 0);
  return { text, inTok: msg.usage.input_tokens, outTok: msg.usage.output_tokens, reasoningChars, stop: msg.stop_reason ?? undefined };
}

async function gpt(e: Entry, b64: string): Promise<CallResult> {
  openai ??= new OpenAI({ maxRetries: 0, timeout: 300_000 });
  const r = await openai.responses.create({
    model: e.model, max_output_tokens: e.maxTokens, instructions: SYSTEM, ...(e.request ?? {}),
    input: [{ role: "user", content: [{ type: "input_text", text: USER }, { type: "input_image", image_url: `data:image/jpeg;base64,${b64}`, detail: "high" }] }],
  } as OpenAI.Responses.ResponseCreateParamsNonStreaming);
  return { text: r.output_text, inTok: r.usage?.input_tokens ?? 0, outTok: r.usage?.output_tokens ?? 0, reasoningChars: 0, stop: r.status };
}
