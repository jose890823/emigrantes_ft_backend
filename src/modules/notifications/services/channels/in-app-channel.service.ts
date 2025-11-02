import { Injectable } from '@nestjs/common';
import {
  BaseChannelService,
  NotificationPayload,
  SendResult,
} from './base-channel.service';
import { NotificationChannel } from '../../entities/notification.entity';

/**
 * In-App notification channel
 * These notifications are stored in the database and displayed in the app UI
 */
@Injectable()
export class InAppChannelService extends BaseChannelService {
  constructor() {
    super(InAppChannelService.name);
    // In-app notifications are always "configured" as they don't rely on external services
    this.isConfigured = true;
    this.logger.log('📱 In-App Channel inicializado correctamente');
  }

  getChannel(): NotificationChannel {
    return NotificationChannel.IN_APP;
  }

  /**
   * Send in-app notification
   * For in-app notifications, we just mark them as "sent" since they're already in the database
   * The actual display happens when the user opens the app and fetches their notifications
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    try {
      // Validate recipient (userId in this case)
      if (!this.validateRecipient(payload.recipient)) {
        return {
          success: false,
          error: 'Invalid user ID format',
        };
      }

      // For in-app notifications, we don't need to send anything externally
      // The notification is already stored in the database
      // Just log and return success
      this.logSuccess(payload.recipient, 'in-app');

      return {
        success: true,
        messageId: `in-app-${Date.now()}`,
        providerId: 'in-app',
        metadata: {
          provider: 'in-app',
          channel: 'database',
        },
      };
    } catch (error) {
      return this.handleError(error, payload.recipient);
    }
  }

  /**
   * Validate user ID format (UUID)
   */
  validateRecipient(recipient: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(recipient);
  }

  /**
   * Send batch in-app notifications
   */
  async sendBatch(
    payloads: NotificationPayload[],
  ): Promise<Map<string, SendResult>> {
    const results = new Map<string, SendResult>();

    for (const payload of payloads) {
      const result = await this.send(payload);
      results.set(payload.recipient, result);
    }

    return results;
  }

  /**
   * Mark in-app notification as read
   * This would be called from the NotificationsService when user reads a notification
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    // This is handled by the main NotificationsService
    // Just log for debugging
    this.logger.log(`Notification ${notificationId} marked as read`);
    return true;
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<boolean> {
    this.logger.log(`${notificationIds.length} notifications marked as read`);
    return true;
  }
}
