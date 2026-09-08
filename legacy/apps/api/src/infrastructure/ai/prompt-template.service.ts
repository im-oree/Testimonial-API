import { Injectable } from '@nestjs/common';
import { AiInputRejectedError } from '@testimonial-api/domain';

/**
 * PromptTemplateService — renders ai_task_configs.prompt_template with
 * {{var}} substitutions.
 *
 * Injection hardening happens HERE (before any LLM sees text):
 *  • unknown variables are an error (typo-proof templates)
 *  • variable values containing meta-characters (nested {{, <|, ]]/ INST
 *    fences, classic "ignore previous instructions" phrasings) are rejected
 *    outright — the request never reaches a model (AiGuardrailsService runs
 *    first for deep checks; this service guards the template layer).
 */
const VAR_RE = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
const SUSPICIOUS_VALUE =
  /(\{\{|<\|)|(\[\/?INST\])|(ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules))|(disregard\s+(the\s+)?(above|previous))|(you\s+are\s+now\s+)|(do\s+anything\s+now)/i;

@Injectable()
export class PromptTemplateService {
  /** Every variable name used by a template, in first-use order. */
  extractVars(template: string): string[] {
    const out: string[] = [];
    for (const match of template.matchAll(VAR_RE)) {
      if (!out.includes(match[1])) out.push(match[1]);
    }
    return out;
  }

  /** Render template. Throws AiInputRejectedError on missing/unknown var or injection attempt. */
  render(template: string, vars: Record<string, string | number | boolean | null | undefined>): string {
    const expected = this.extractVars(template);
    for (const name of expected) {
      const value = vars[name];
      if (value === undefined || value === null) {
        throw new AiInputRejectedError(`missing template variable "{{${name}}}"`);
      }
    }
    // Balanced-brace sanity: a template itself must not smuggle extra braces.
    const openCount = (template.match(/{/g) ?? []).length;
    const closeCount = (template.match(/}/g) ?? []).length;
    if (openCount !== closeCount * 1 && openCount !== closeCount) {
      throw new AiInputRejectedError('unbalanced braces in prompt template');
    }

    return template.replace(VAR_RE, (_whole, name: string) => {
      const raw = String(vars[name]);
      if (SUSPICIOUS_VALUE.test(raw)) {
        throw new AiInputRejectedError(`prompt-injection pattern detected in variable "{{${name}}}"`);
      }
      return raw;
    });
  }

  /** Strip characters that would break template round-tripping (defense in depth). */
  sanitizeValue(raw: string): string {
    if (SUSPICIOUS_VALUE.test(raw)) {
      throw new AiInputRejectedError('prompt-injection pattern detected in value');
    }
    return raw;
  }
}
