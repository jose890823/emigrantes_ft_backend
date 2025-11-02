import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  BaseChannelService,
  NotificationPayload,
  SendResult,
} from './base-channel.service';
import { NotificationChannel } from '../../entities/notification.entity';

/**
 * Email notification channel using Resend
 */
@Injectable()
export class EmailChannelService extends BaseChannelService {
  private resend: Resend | null = null;
  private fromEmail: string;
  private fromName: string;

  constructor(private configService: ConfigService) {
    super(EmailChannelService.name);

    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@emigrantes-ft.com';
    this.fromName =
      this.configService.get<string>('RESEND_FROM_NAME') || 'Emigrantes FT';

    if (!apiKey || apiKey === '') {
      this.logger.warn(
        '⚠️  Resend no configurado - Email notifications en modo simulado',
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      this.logger.log('📧 Email Channel (Resend) inicializado correctamente');
    } catch (error) {
      this.logger.error('Error inicializando Resend', error.stack);
      this.isConfigured = false;
    }
  }

  getChannel(): NotificationChannel {
    return NotificationChannel.EMAIL;
  }

  /**
   * Send email notification
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    if (!this.isAvailable()) {
      this.logSimulated(payload.recipient, payload.subject);
      return {
        success: false,
        error: 'Email service not configured',
        metadata: { simulated: true },
      };
    }

    try {
      // Validate recipient email
      if (!this.validateRecipient(payload.recipient)) {
        return {
          success: false,
          error: 'Invalid email address',
        };
      }

      // Send email via Resend
      const result = await this.resend!.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: payload.recipient,
        subject: payload.subject,
        html: payload.bodyHtml || this.textToHtml(payload.body),
        text: payload.body,
        replyTo: payload.metadata?.replyTo,
        tags: payload.metadata?.tags,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
          metadata: { errorDetails: result.error },
        };
      }

      this.logSuccess(payload.recipient, result.data?.id);

      return {
        success: true,
        messageId: result.data?.id,
        providerId: result.data?.id,
        metadata: {
          provider: 'resend',
        },
      };
    } catch (error) {
      return this.handleError(error, payload.recipient);
    }
  }

  /**
   * Validate email address format
   */
  validateRecipient(recipient: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(recipient);
  }

  /**
   * Convert plain text to simple HTML
   */
  private textToHtml(text: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
    ${text.split('\n').map((line) => `<p style="margin: 10px 0;">${line}</p>`).join('')}
  </div>
  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Emigrantes FT. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send bulk emails (batch)
   */
  async sendBatch(
    payloads: NotificationPayload[],
  ): Promise<Map<string, SendResult>> {
    const results = new Map<string, SendResult>();

    // Process in parallel with limit
    const batchSize = 10;
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      const promises = batch.map(async (payload) => {
        const result = await this.send(payload);
        results.set(payload.recipient, result);
      });
      await Promise.all(promises);
    }

    return results;
  }
}
