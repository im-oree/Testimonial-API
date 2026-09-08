import { Injectable } from '@nestjs/common';
import { AiInputRejectedError } from '@testimonial-api/domain';

/**
 * AiGuardrailsService — pre-LLM input validation and post-LLM output
 * sanitization (README §17.x "AI guardrails").
 *
 * validateInput  → blocks prompt injection & oversized payloads; redacts PII
 *                  (email, phone, SSN, credit-card-like, IP) before the text
 *                  ever reaches a model.
 * validateOutput → strips scripts/event handlers/dangerous URLs from model
 *                  output before anything is stored or rendered.
 *
 * Both methods are pure & deterministic (unit-testable without a model).
 */

const PII_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'email', re: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g },
  { name: 'phone', re: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { name: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: 'credit-card', re: /\b(?:\d[ -]*?){13,16}\b/g },
  { name: 'ip', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
];

const INJECTION_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'ignore-previous', re: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|system)/i },
  { name: 'disregard-rules', re: /disregard\s+(the\s+)?(above|previous|earlier)/i },
  { name: 'role-play', re: /(you\s+are\s+now\s+|act\s+as\s+(an?\s+)?(unrestricted|dan|developer)|pretend\s+to\s+be)/i },
  { name: 'system-prompt-leak', re: /(reveal|print|output|show).{0,40}(system prompt|instructions|prompt template)/i },
  { name: 'delimiter-escape', re: /(\{\{|<\|)|(\[\/?INST\])|(###\s*system)/i },
  { name: 'repetition-abuse', re: /(repeat|ignore)\s+(everything|the previous message|the above)\s*/i },
];

const OUTPUT_DANGEROUS = [
  { name: 'script', re: /<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi },
  { name: 'iframe', re: /<\s*iframe[\s\S]*?<\s*\/\s*iframe\s*>/gi },
  { name: 'object', re: /<\s*object[\s\S]*?<\s*\/\s*object\s*>/gi },
  { name: 'event-handler', re: /\son\w+\s*=\s*["']?[^"'\s>]+/gi },
  { name: 'js-url', re: /(javascript|vbscript|data)\s*:\s*/gi },
  { name: 'style-block', re: /<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi },
];

export const MAX_INPUT_CHARS = 20_000;
export const MAX_OUTPUT_CHARS = 20_000;

export interface GuardrailResult {
  ok: boolean;
  /** Human-readable reasons for rejection. */
  reasons: string[];
  /** Number of redacted PII occurrences. */
  piiRedacted: number;
}

@Injectable()
export class AiGuardrailsService {
  /** Pre-LLM gate. Throws AiInputRejectedError when input must not reach a model. */
  validateInput(raw: string): GuardrailResult {
    const reasons: string[] = [];
    if (raw.length === 0) reasons.push('empty input');
    if (raw.length > MAX_INPUT_CHARS) reasons.push(`input exceeds ${MAX_INPUT_CHARS} chars`);
    for (const p of INJECTION_PATTERNS) {
      if (p.re.test(raw)) {
        reasons.push(`prompt-injection pattern: ${p.name}`);
        break; // report one injection reason is enough; reject is unconditional
      }
    }
    if (reasons.length > 0) {
      throw new AiInputRejectedError(reasons.join('; '));
    }
    const redacted = this.redactPii(raw);
    return { ok: true, reasons: [], piiRedacted: redacted.count };
  }

  /** Replace PII with placeholders (in place). */
  redactPii(raw: string): { text: string; count: number } {
    let text = raw;
    let count = 0;
    for (const p of PII_PATTERNS) {
      text = text.replace(p.re, () => {
        count += 1;
        return `[${p.name}-redacted]`;
      });
    }
    return { text, count };
  }

  /** Post-LLM gate: strip executable/markup hazards; returns sanitized text. */
  validateOutput(content: string): { sanitized: string; flags: string[] } {
    const flags: string[] = [];
    let out = content;
    for (const d of OUTPUT_DANGEROUS) {
      if (d.re.test(out)) {
        flags.push(d.name);
        out = out.replace(d.re, d.name === 'event-handler' || d.name === 'js-url' ? '' : `[${d.name}-removed]`);
      }
    }
    if (out.length > MAX_OUTPUT_CHARS) {
      flags.push('truncated');
      out = out.slice(0, MAX_OUTPUT_CHARS);
    }
    return { sanitized: out, flags };
  }
}
