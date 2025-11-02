import { Logger } from '@nestjs/common';
import { NotificationChannel } from '../../entities/notification.entity';

/**
 * Interface for notification payload
 */
export interface NotificationPayload {
  recipient: string; // Email address, phone number, etc.
  subject: string;
  body: string;
  bodyHtml?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for send result
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  providerId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Abstract base class for notification channels
 */
export abstract class BaseChannelService {
  protected readonly logger: Logger;
  protected isConfigured = false;

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  /**
   * Get the channel type
   */
  abstract getChannel(): NotificationChannel;

  /**
   * Check if the channel is available (properly configured)
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Send a notification through this channel
   */
  abstract send(payload: NotificationPayload): Promise<SendResult>;

  /**
   * Validate recipient format for this channel
   */
  abstract validateRecipient(recipient: string): boolean;

  /**
   * Get channel configuration status
   */
  getStatus(): {
    channel: NotificationChannel;
    configured: boolean;
    available: boolean;
  } {
    return {
      channel: this.getChannel(),
      configured: this.isConfigured,
      available: this.isAvailable(),
    };
  }

  /**
   * Handle send errors consistently
   */
  protected handleError(error: any, recipient: string): SendResult {
    this.logger.error(
      `Error sending ${this.getChannel()} to ${recipient}`,
      error.stack,
    );

    return {
      success: false,
      error: error.message || 'Unknown error',
      metadata: {
        errorDetails: error,
      },
    };
  }

  /**
   * Log successful send
   */
  protected logSuccess(recipient: string, messageId?: string): void {
    this.logger.log(
      `✅ ${this.getChannel()} sent to ${recipient}${messageId ? ` (${messageId})` : ''}`,
    );
  }

  /**
   * Log simulated send (when channel is not configured)
   */
  protected logSimulated(recipient: string, subject: string): void {
    this.logger.log(
      `📨 [SIMULATED] ${this.getChannel()} to ${recipient}: ${subject}`,
    );
  }
}
