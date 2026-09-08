import { Injectable } from '@nestjs/common';
import { EmailProvider } from '../../infrastructure/email/resend.provider';

/**
 * EmailService — transactional email (invites, digests, quota alerts —
 * README §24). HTML templates live in ./templates and are rendered with
 * the tenant's brandColor/logo (white-label).
 */
@Injectable()
export class EmailService {
  constructor(private readonly mailer: EmailProvider) {}

  async sendInvite(to: string, inviteUrl: string, orgName: string): Promise<void> {
    await this.mailer.send({
      to,
      subject: `You've been invited to ${orgName} on Testimonial API`,
      html: `<p>Click to accept your invite: <a href="${inviteUrl}">${inviteUrl}</a></p>`,
      text: `You've been invited to ${orgName}. Accept your invite here: ${inviteUrl}`,
    });
  }
}
