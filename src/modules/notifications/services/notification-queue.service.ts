import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus } from '../entities/notification.entity';
import { EmailChannelService } from './channels/email-channel.service';
import { SmsChannelService } from './channels/sms-channel.service';
import { WhatsAppChannelService } from './channels/whatsapp-channel.service';
import { PushChannelService } from './channels/push-channel.service';
import { InAppChannelService } from './channels/in-app-channel.service';
import { NotificationChannel } from '../entities/notification.entity';

/**
 * Interface for notification job data
 */
export interface NotificationJobData {
  notificationId: string;
  attempt: number;
}

/**
 * Queue configuration constants
 */
const QUEUE_NAME = 'notifications';
const JOB_ATTEMPTS = 3;
const BACKOFF_DELAY = 60000; // 1 minute
const BACKOFF_TYPE = 'exponential';

/**
 * Notification Queue Service
 * Handles queuing and processing of notifications with retry logic
 */
@Processor(QUEUE_NAME)
@Injectable()
export class NotificationQueueService implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAME) private notificationQueue: Queue,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private emailChannel: EmailChannelService,
    private smsChannel: SmsChannelService,
    private whatsappChannel: WhatsAppChannelService,
    private pushChannel: PushChannelService,
    private inAppChannel: InAppChannelService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Notification Queue Service initialized');

    // Log queue status
    const waiting = await this.notificationQueue.getWaitingCount();
    const active = await this.notificationQueue.getActiveCount();
    const failed = await this.notificationQueue.getFailedCount();
    this.logger.log(`Queue status - Waiting: ${waiting}, Active: ${active}, Failed: ${failed}`);
  }

  /**
   * Add notification to queue
   */
  async queueNotification(notificationId: string, delay = 0): Promise<void> {
    try {
      await this.notificationQueue.add(
        {
          notificationId,
          attempt: 1,
        } as NotificationJobData,
        {
          delay,
          attempts: JOB_ATTEMPTS,
          backoff: {
            type: BACKOFF_TYPE,
            delay: BACKOFF_DELAY,
          },
          removeOnComplete: true, // Clean up completed jobs
          removeOnFail: false, // Keep failed jobs for debugging
        },
      );

      // Update notification status to queued
      await this.notificationRepository.update(notificationId, {
        status: NotificationStatus.QUEUED,
      });

      this.logger.log(`✅ Notification ${notificationId} added to queue`);
    } catch (error) {
      this.logger.error(
        `Error queuing notification ${notificationId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Schedule notification for future delivery
   */
  async scheduleNotification(
    notificationId: string,
    scheduledFor: Date,
  ): Promise<void> {
    const delay = scheduledFor.getTime() - Date.now();

    if (delay <= 0) {
      // If scheduled time is in the past or now, send immediately
      await this.queueNotification(notificationId, 0);
    } else {
      await this.queueNotification(notificationId, delay);
      this.logger.log(
        `📅 Notification ${notificationId} scheduled for ${scheduledFor.toISOString()}`,
      );
    }
  }

  /**
   * Process notification job
   * This is the main processor that Bull will call
   */
  @Process()
  async processNotification(job: Job<NotificationJobData>): Promise<void> {
    const { notificationId, attempt } = job.data;

    this.logger.log(
      `📬 Processing notification ${notificationId} (attempt ${attempt}/${JOB_ATTEMPTS})`,
    );

    try {
      // Fetch notification from database
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
      }

      // Update status to sending
      notification.status = NotificationStatus.SENDING;
      notification.attempts = attempt;
      await this.notificationRepository.save(notification);

      // Get appropriate channel service
      const channelService = this.getChannelService(notification.channel);

      if (!channelService) {
        throw new Error(`Channel ${notification.channel} not found`);
      }

      // Send notification
      const result = await channelService.send({
        recipient: notification.recipient,
        subject: notification.subject,
        body: notification.body,
        bodyHtml: notification.body, // TODO: Get HTML version if available
        metadata: notification.providerMetadata || {},
      });

      if (result.success) {
        // Update notification as sent
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();
        notification.providerMetadata = {
          ...notification.providerMetadata,
          ...result.metadata,
          messageId: result.messageId,
          providerId: result.providerId,
        };
        await this.notificationRepository.save(notification);

        this.logger.log(
          `✅ Notification ${notificationId} sent successfully via ${notification.channel}`,
        );
      } else {
        // Mark as failed but let Bull retry
        throw new Error(result.error || 'Unknown send error');
      }
    } catch (error) {
      this.logger.error(
        `❌ Error processing notification ${notificationId}`,
        error.stack,
      );

      // Update notification with error
      await this.updateNotificationError(
        notificationId,
        error.message,
        attempt,
      );

      // Re-throw to trigger Bull's retry mechanism
      throw error;
    }
  }

  /**
   * Handle failed job (after all retries exhausted)
   */
  @Process({ name: '__failed__' })
  async handleFailedJob(job: Job<NotificationJobData>): Promise<void> {
    const { notificationId } = job.data;
    this.logger.error(
      `💥 Notification ${notificationId} failed after ${JOB_ATTEMPTS} attempts`,
    );

    // Mark notification as permanently failed
    await this.notificationRepository.update(notificationId, {
      status: NotificationStatus.FAILED,
    });
  }

  /**
   * Get channel service by channel type
   */
  private getChannelService(channel: NotificationChannel) {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.emailChannel;
      case NotificationChannel.SMS:
        return this.smsChannel;
      case NotificationChannel.WHATSAPP:
        return this.whatsappChannel;
      case NotificationChannel.PUSH:
        return this.pushChannel;
      case NotificationChannel.IN_APP:
        return this.inAppChannel;
      default:
        return null;
    }
  }

  /**
   * Update notification with error details
   */
  private async updateNotificationError(
    notificationId: string,
    errorMessage: string,
    attempt: number,
  ): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
      });

      if (notification) {
        notification.attempts = attempt;
        notification.errorMessage = errorMessage;
        notification.errorDetails = {
          lastAttempt: new Date().toISOString(),
          attemptNumber: attempt,
        };

        // Only mark as failed if we've exhausted all retries
        if (attempt >= JOB_ATTEMPTS) {
          notification.status = NotificationStatus.FAILED;
        }

        await this.notificationRepository.save(notification);
      }
    } catch (error) {
      this.logger.error(
        `Error updating notification error for ${notificationId}`,
        error.stack,
      );
    }
  }

  /**
   * Retry failed notification
   */
  async retryNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!notification.canRetry()) {
      throw new Error('Notification cannot be retried (max attempts reached)');
    }

    // Reset status and error
    notification.status = NotificationStatus.PENDING;
    notification.errorMessage = null;
    notification.errorDetails = null;
    await this.notificationRepository.save(notification);

    // Queue again
    await this.queueNotification(notificationId);

    this.logger.log(`🔄 Notification ${notificationId} queued for retry`);
  }

  /**
   * Cancel queued notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    // Find and remove job from queue
    const jobs = await this.notificationQueue.getJobs([
      'waiting',
      'delayed',
      'active',
    ]);
    const job = jobs.find((j) => j.data.notificationId === notificationId);

    if (job) {
      await job.remove();
      this.logger.log(`❌ Notification ${notificationId} removed from queue`);
    }

    // Update notification status
    await this.notificationRepository.update(notificationId, {
      status: NotificationStatus.CANCELLED,
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return {
      waiting: await this.notificationQueue.getWaitingCount(),
      active: await this.notificationQueue.getActiveCount(),
      completed: await this.notificationQueue.getCompletedCount(),
      failed: await this.notificationQueue.getFailedCount(),
      delayed: await this.notificationQueue.getDelayedCount(),
    };
  }

  /**
   * Clean old completed jobs
   */
  async cleanOldJobs(olderThanDays = 7): Promise<void> {
    const timestamp = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    await this.notificationQueue.clean(timestamp, 'completed');
    await this.notificationQueue.clean(timestamp, 'failed');
    this.logger.log(
      `🧹 Cleaned jobs older than ${olderThanDays} days from queue`,
    );
  }
}
