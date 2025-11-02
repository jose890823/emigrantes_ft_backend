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
 * SMS notification channel using Twilio
 */
@Injectable()
export class SmsChannelService extends BaseChannelService {
  private twilioClient: Twilio | null = null;
  private twilioPhoneNumber: string;

  constructor(private configService: ConfigService) {
    super(SmsChannelService.name);

    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioPhoneNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    if (!accountSid || !authToken || !this.twilioPhoneNumber) {
      this.logger.warn(
        '⚠️  Twilio no configurado - SMS notifications en modo simulado',
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.isConfigured = true;
      this.logger.log('📱 SMS Channel (Twilio) inicializado correctamente');
    } catch (error) {
      this.logger.error('Error inicializando Twilio para SMS', error.stack);
      this.isConfigured = false;
    }
  }

  getChannel(): NotificationChannel {
    return NotificationChannel.SMS;
  }

  /**
   * Send SMS notification
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    if (!this.isAvailable()) {
      this.logSimulated(payload.recipient, payload.subject);
      return {
        success: false,
        error: 'SMS service not configured',
        metadata: { simulated: true },
      };
    }

    try {
      // Validate phone number
      if (!this.validateRecipient(payload.recipient)) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      // Construct SMS message (subject + body for SMS)
      const message = `${payload.subject}\n\n${payload.body}`;

      // Truncate if too long (SMS limit is ~160 chars for single message, 1600 for concatenated)
      const truncatedMessage =
        message.length > 1600 ? message.substring(0, 1597) + '...' : message;

      // Send SMS via Twilio
      const result = await this.twilioClient!.messages.create({
        body: truncatedMessage,
        from: this.twilioPhoneNumber,
        to: payload.recipient,
      });

      this.logSuccess(payload.recipient, result.sid);

      return {
        success: true,
        messageId: result.sid,
        providerId: result.sid,
        metadata: {
          provider: 'twilio',
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
   * Validate phone number format (E.164 format)
   */
  validateRecipient(recipient: string): boolean {
    // E.164 format: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(recipient);
  }

  /**
   * Send batch SMS
   */
  async sendBatch(
    payloads: NotificationPayload[],
  ): Promise<Map<string, SendResult>> {
    const results = new Map<string, SendResult>();

    // Process in parallel with limit (Twilio rate limits)
    const batchSize = 5;
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      const promises = batch.map(async (payload) => {
        const result = await this.send(payload);
        results.set(payload.recipient, result);
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
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
        `Error fetching message status for ${messageSid}`,
        error.stack,
      );
      return null;
    }
  }
}
