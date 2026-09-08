import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Transactional email provider.
 *
 * Uses the Resend HTTP API directly when RESEND_API_KEY is set (no SDK dep);
 * otherwise falls back to structured logging so local/dev flows still
 * "send" without an account. Invites, digests, alerts (README §24).
 */
@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);

  async send(input: SendEmailInput): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.log(`[email:dev] to=${input.to} subject="${input.subject}" (RESEND_API_KEY not set)`);
      return;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'Testimonial API <no-reply@testimonialapi.dev>',
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend send failed (${res.status}): ${body}`);
    }
  }
}
