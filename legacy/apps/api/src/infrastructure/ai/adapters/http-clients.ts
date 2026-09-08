import type { AiCompletionRequest } from '@testimonial-api/domain';
import { AiProviderError } from '@testimonial-api/domain';

/**
 * Shared HTTP helpers for the real provider adapters. Plain fetch — no vendor
 * SDKs. Latency, token estimation, status mapping and retryable-flagging all
 * live here so every vendor adapter is a ~20-line declaration.
 */

export interface ChatCompletionsBody {
  model: string;
  messages: { role: 'system' | 'user'; content: string }[];
  max_tokens?: number;
  max_completion_tokens?: number;
  temperature: number;
  response_format?: { type: 'json_object' };
}

export function buildChatBody(request: AiCompletionRequest, opts: { useMaxCompletionTokens?: boolean } = {}): ChatCompletionsBody {
  const messages: ChatCompletionsBody['messages'] = [];
  if (request.systemPrompt) messages.push({ role: 'system', content: request.systemPrompt });
  messages.push({ role: 'user', content: request.prompt });
  const body: ChatCompletionsBody = {
    model: request.model,
    messages,
    temperature: request.temperature,
  };
  if (opts.useMaxCompletionTokens) body.max_completion_tokens = request.maxTokens;
  else body.max_tokens = request.maxTokens;
  if (request.responseFormat === 'json' || request.responseSchema) {
    // OpenAI-compatible JSON mode: works for OpenAI, Groq, Azure, custom.
    body.response_format = { type: 'json_object' };
  }
  return body;
}

/** OpenAI-compatible chat.completions call. */
export async function postChatCompletions(opts: {
  request: AiCompletionRequest;
  apiKey: string;
  url: string;
  extraHeaders?: Record<string, string>;
}): Promise<{ content: string; inputTokens: number; outputTokens: number; finishReason: 'stop' | 'length' | 'error'; latencyMs: number }> {
  const { request, apiKey, url, extraHeaders } = opts;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(buildChatBody(request)),
      signal: AbortSignal.timeout(request.timeoutMs ?? 10_000),
    });
  } catch (err) {
    const aborted = err instanceof Error && /abort|timeout/i.test(err.message);
    throw new AiProviderError(`LLM request to ${url} failed: ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
      statusCode: aborted ? 408 : undefined,
    });
  }
  const raw = await res.text();
  if (!res.ok) {
    const err = new AiProviderError(`LLM ${res.status} from ${url}: ${raw.slice(0, 300)}`, { statusCode: res.status });
    if (res.status === 429) (err as Error & { retryable?: boolean }).retryable = true;
    throw err;
  }
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new AiProviderError(`LLM returned non-JSON from ${url}`);
  }
  const choices = Array.isArray(json.choices) ? (json.choices as Array<Record<string, unknown>>) : [];
  const message = choices[0]?.message as Record<string, unknown> | undefined;
  const content = typeof message?.content === 'string' ? message.content : '';
  if (!content) throw new AiProviderError(`LLM returned empty content from ${url}`);
  const usage = (json.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };
  const finish = typeof choices[0]?.finish_reason === 'string' ? choices[0].finish_reason : 'stop';
  return {
    content,
    inputTokens: usage.prompt_tokens ?? Math.ceil(request.prompt.length / 4),
    outputTokens: usage.completion_tokens ?? Math.ceil(content.length / 4),
    finishReason: finish === 'length' ? 'length' : 'stop',
    latencyMs: Math.max(1, Date.now() - started),
  };
}

/** Anthropic /v1/messages body. */
export function buildAnthropicBody(request: AiCompletionRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    max_tokens: request.maxTokens,
    temperature: request.temperature,
    messages: [{ role: 'user', content: request.prompt }],
  };
  if (request.systemPrompt) body.system = request.systemPrompt;
  return body;
}

export async function postAnthropicMessages(opts: {
  request: AiCompletionRequest;
  apiKey: string;
  url: string;
  anthropicVersion: string;
}): Promise<{ content: string; inputTokens: number; outputTokens: number; finishReason: 'stop' | 'length' | 'error'; latencyMs: number }> {
  const { request, apiKey, url, anthropicVersion } = opts;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': anthropicVersion,
      },
      body: JSON.stringify(buildAnthropicBody(request)),
      signal: AbortSignal.timeout(request.timeoutMs ?? 10_000),
    });
  } catch (err) {
    throw new AiProviderError(`Anthropic request failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
  const raw = await res.text();
  if (!res.ok) {
    const err = new AiProviderError(`Anthropic ${res.status}: ${raw.slice(0, 300)}`, { statusCode: res.status });
    if (res.status === 429) (err as Error & { retryable?: boolean }).retryable = true;
    throw err;
  }
  const json = JSON.parse(raw) as Record<string, unknown>;
  const blocks = Array.isArray(json.content) ? (json.content as Array<Record<string, unknown>>) : [];
  const content = blocks
    .filter((b) => b.type === 'text')
    .map((b) => String(b.text ?? ''))
    .join('');
  if (!content) throw new AiProviderError('Anthropic returned empty content');
  const usage = (json.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
  const finish = json.stop_reason === 'max_tokens' ? 'length' : 'stop';
  return {
    content,
    inputTokens: usage.input_tokens ?? Math.ceil(request.prompt.length / 4),
    outputTokens: usage.output_tokens ?? Math.ceil(content.length / 4),
    finishReason: finish,
    latencyMs: Math.max(1, Date.now() - started),
  };
}

/** Gemini generateContent call. */
export async function postGeminiGenerateContent(opts: {
  request: AiCompletionRequest;
  apiKey: string;
  url: string;
}): Promise<{ content: string; inputTokens: number; outputTokens: number; finishReason: 'stop' | 'length' | 'error'; latencyMs: number }> {
  const { request, apiKey, url } = opts;
  const started = Date.now();
  const parts: Record<string, unknown>[] = [];
  if (request.systemPrompt) parts.push({ text: request.systemPrompt });
  parts.push({ text: request.prompt });
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: request.temperature, maxOutputTokens: request.maxTokens } }),
      signal: AbortSignal.timeout(request.timeoutMs ?? 10_000),
    });
  } catch (err) {
    throw new AiProviderError(`Gemini request failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
  const raw = await res.text();
  if (!res.ok) {
    const err = new AiProviderError(`Gemini ${res.status}: ${raw.slice(0, 300)}`, { statusCode: res.status });
    if (res.status === 429) (err as Error & { retryable?: boolean }).retryable = true;
    throw err;
  }
  const json = JSON.parse(raw) as Record<string, unknown>;
  const candidates = Array.isArray(json.candidates) ? (json.candidates as Array<Record<string, unknown>>) : [];
  const contentParts = (candidates[0]?.content as { parts?: Array<{ text?: string }> } | undefined)?.parts;
  const content = (contentParts ?? []).map((p) => p.text ?? '').join('');
  if (!content) throw new AiProviderError('Gemini returned empty content');
  const usage = (json.usageMetadata ?? {}) as { promptTokenCount?: number; candidatesTokenCount?: number };
  return {
    content,
    inputTokens: usage.promptTokenCount ?? Math.ceil(request.prompt.length / 4),
    outputTokens: usage.candidatesTokenCount ?? Math.ceil(content.length / 4),
    finishReason: 'stop',
    latencyMs: Math.max(1, Date.now() - started),
  };
}

/** Shallow liveness probe: vendor /models (404 ⇒ no such route ⇒ healthy). */
export async function probeModelsUrl(opts: {
  url: string;
  apiKey: string;
  header: 'bearer' | 'x-api-key' | 'x-goog-api-key';
}): Promise<boolean> {
  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (opts.header === 'bearer') headers.authorization = `Bearer ${opts.apiKey}`;
    if (opts.header === 'x-api-key') headers['x-api-key'] = opts.apiKey;
    if (opts.header === 'x-goog-api-key') headers['x-goog-api-key'] = opts.apiKey;
    const res = await fetch(opts.url, { headers, signal: AbortSignal.timeout(5000) });
    if (res.status === 404) return true; // vendor without models route
    return res.ok;
  } catch {
    return false;
  }
}
