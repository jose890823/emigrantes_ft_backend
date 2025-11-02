import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import {
  BaseChannelService,
  NotificationPayload,
  SendResult,
} from './base-channel.service';
import { NotificationChannel } from '../../entities/notification.entity';

/**
 * WhatsApp notification channel using Twilio
 */
@Injectable()
export class WhatsAppChannelService extends BaseChannelService {
  private twilioClient: Twilio | null = null;
  private twilioWhatsAppNumber: string;

  constructor(private configService: ConfigService) {
    super(WhatsAppChannelService.name);

    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioWhatsAppNumber =
      this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') || '';

    if (!accountSid || !authToken || !this.twilioWhatsAppNumber) {
      this.logger.warn(
        '⚠️  Twilio WhatsApp no configurado - WhatsApp notifications en modo simulado',
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.isConfigured = true;
      this.logger.log(
        '💬 WhatsApp Channel (Twilio) inicializado correctamente',
      );
    } catch (error) {
      this.logger.error(
        'Error inicializando Twilio para WhatsApp',
        error.stack,
      );
      this.isConfigured = false;
    }
  }

  getChannel(): NotificationChannel {
    return NotificationChannel.WHATSAPP;
  }

  /**
   * Send WhatsApp notification
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    if (!this.isAvailable()) {
      this.logSimulated(payload.recipient, payload.subject);
      return {
        success: false,
        error: 'WhatsApp service not configured',
        metadata: { simulated: true },
      };
    }

    try {
      // Validate phone number
      if (!this.validateRecipient(payload.recipient)) {
        return {
          success: false,
          error: 'Invalid WhatsApp number format',
        };
      }

      // Construct WhatsApp message (can include formatting)
      const message = this.formatWhatsAppMessage(
        payload.subject,
        payload.body,
      );

      // Send WhatsApp message via Twilio
      const result = await this.twilioClient!.messages.create({
        body: message,
        from: `whatsapp:${this.twilioWhatsAppNumber}`,
        to: `whatsapp:${payload.recipient}`,
      });

      this.logSuccess(payload.recipient, result.sid);

      return {
        success: true,
        messageId: result.sid,
        providerId: result.sid,
        metadata: {
          provider: 'twilio_whatsapp',
          status: result.status,
          segments: result.numSegments,
          price: result.price,
          priceUnit: result.priceUnit,
        },
      };
    } catch (error) {
      return this.handleError(error, payload.recipient);
    }
  }

  /**
   * Validate WhatsApp phone number format (E.164 format)
   */
  validateRecipient(recipient: string): boolean {
    // Remove 'whatsapp:' prefix if present
    const cleanNumber = recipient.replace(/^whatsapp:/, '');
    // E.164 format: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(cleanNumber);
  }

  /**
   * Format WhatsApp message with proper styling
   */
  private formatWhatsAppMessage(subject: string, body: string): string {
    // WhatsApp supports basic formatting:
    // *bold* _italic_ ~strikethrough~ ```monospace```
    return `*${subject}*\n\n${body}`;
  }

  /**
   * Send WhatsApp with media (image, document, etc)
   */
  async sendWithMedia(
    payload: NotificationPayload & { mediaUrl: string },
  ): Promise<SendResult> {
    if (!this.isAvailable()) {
      this.logSimulated(payload.recipient, payload.subject);
      return {
        success: false,
        error: 'WhatsApp service not configured',
        metadata: { simulated: true },
      };
    }

    try {
      if (!this.validateRecipient(payload.recipient)) {
        return {
          success: false,
          error: 'Invalid WhatsApp number format',
        };
      }

      const message = this.formatWhatsAppMessage(
        payload.subject,
        payload.body,
      );

      const result = await this.twilioClient!.messages.create({
        body: message,
        from: `whatsapp:${this.twilioWhatsAppNumber}`,
        to: `whatsapp:${payload.recipient}`,
        mediaUrl: [payload.mediaUrl],
      });

      this.logSuccess(payload.recipient, result.sid);

      return {
        success: true,
        messageId: result.sid,
        providerId: result.sid,
        metadata: {
          provider: 'twilio_whatsapp',
          status: result.status,
          mediaUrl: payload.mediaUrl,
        },
      };
    } catch (error) {
      return this.handleError(error, payload.recipient);
    }
  }

  /**
   * Send batch WhatsApp messages
   */
  async sendBatch(
    payloads: NotificationPayload[],
  ): Promise<Map<string, SendResult>> {
    const results = new Map<string, SendResult>();

    // WhatsApp has strict rate limits, process more slowly
    const batchSize = 3;
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      const promises = batch.map(async (payload) => {
        const result = await this.send(payload);
        results.set(payload.recipient, result);
        // Delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      });
      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Get message status from Twilio
   */
  async getMessageStatus(messageSid: string): Promise<any> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const message = await this.twilioClient!.messages(messageSid).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching WhatsApp message status for ${messageSid}`,
        error.stack,
      );
      return null;
    }
  }
}
