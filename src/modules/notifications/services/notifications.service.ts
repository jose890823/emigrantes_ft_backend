import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, In } from 'typeorm';
import {
  Notification,
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
} from '../entities/notification.entity';
import { UserNotificationPreference } from '../entities/user-notification-preference.entity';
import { User } from '../../auth/entities/user.entity';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationTemplateService } from './notification-template.service';
import {
  SendNotificationDto,
  SendBatchNotificationDto,
} from '../dto/send-notification.dto';
import { UpdatePreferencesDto } from '../dto/preferences.dto';
import {
  NotificationFilterDto,
  NotificationStatsFilterDto,
} from '../dto/notification-filter.dto';

/**
 * Main Notifications Service
 * Orchestrates all notification operations
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(UserNotificationPreference)
    private preferenceRepository: Repository<UserNotificationPreference>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private queueService: NotificationQueueService,
    private templateService: NotificationTemplateService,
  ) {}

  // ============================================
  // SENDING NOTIFICATIONS
  // ============================================

  /**
   * Send a single notification
   */
  async send(dto: SendNotificationDto): Promise<Notification> {
    // Get user
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user preferences
    const preferences = await this.getOrCreatePreferences(dto.userId);

    // Check if user allows notifications for this category and channel
    const category = dto.category || NotificationCategory.SYSTEM;
    if (!preferences.isAllowed(category, dto.channel)) {
      this.logger.log(
        `User ${dto.userId} has disabled ${dto.channel} notifications for ${category}`,
      );
      // Still create the notification but don't send it
      return this.createNotificationRecord(dto, user, NotificationStatus.CANCELLED);
    }

    // Check quiet hours (unless it's urgent or security)
    const priority = dto.priority || NotificationPriority.NORMAL;
    if (
      preferences.isInQuietHours() &&
      priority !== NotificationPriority.URGENT &&
      category !== NotificationCategory.SECURITY
    ) {
      this.logger.log(
        `User ${dto.userId} is in quiet hours, notification will be delayed`,
      );
      // Schedule for end of quiet hours
      const scheduledFor = this.calculateQuietHoursEnd(preferences);
      return this.scheduleNotification(dto, user, scheduledFor);
    }

    // Create notification record
    const notification = await this.createNotificationRecord(dto, user);

    // Queue for sending
    if (dto.scheduledFor) {
      await this.queueService.scheduleNotification(
        notification.id,
        new Date(dto.scheduledFor),
      );
    } else {
      await this.queueService.queueNotification(notification.id);
    }

    return notification;
  }

  /**
   * Send notification using template
   */
  async sendFromTemplate(
    userId: string,
    templateCode: string,
    variables: Record<string, any>,
    channel?: NotificationChannel,
    options?: {
      priority?: NotificationPriority;
      requiresAction?: boolean;
      actionUrl?: string;
      scheduledFor?: string;
    },
  ): Promise<Notification> {
    // Render template
    const rendered = await this.templateService.render(templateCode, variables);

    // Get template to determine channel if not specified
    const template = await this.templateService.findByCode(templateCode);

    return this.send({
      userId,
      channel: channel || template.channel,
      category: template.category,
      priority: options?.priority || NotificationPriority.NORMAL,
      subject: rendered.subject,
      body: rendered.body,
      templateCode,
      templateVariables: variables,
      requiresAction: options?.requiresAction,
      actionUrl: options?.actionUrl,
      scheduledFor: options?.scheduledFor,
    });
  }

  /**
   * Send batch notifications
   */
  async sendBatch(dto: SendBatchNotificationDto): Promise<Notification[]> {
    const notifications: Notification[] = [];

    for (const userId of dto.userIds) {
      try {
        const notification = await this.send({
          userId,
          channel: dto.channel,
          category: dto.category,
          priority: dto.priority,
          subject: dto.subject,
          body: dto.body,
          templateCode: dto.templateCode,
          templateVariables: dto.templateVariables,
        });
        notifications.push(notification);
      } catch (error) {
        this.logger.error(
          `Error sending notification to user ${userId}`,
          error.stack,
        );
      }
    }

    return notifications;
  }

  /**
   * Send notification to all users (broadcast)
   */
  async broadcast(
    dto: Omit<SendNotificationDto, 'userId'>,
  ): Promise<Notification[]> {
    const users = await this.userRepository.find({
      where: { isActive: true },
      select: ['id'],
    });

    const userIds = users.map((u) => u.id);

    return this.sendBatch({
      userIds,
      channel: dto.channel,
      category: dto.category,
      priority: dto.priority,
      subject: dto.subject,
      body: dto.body,
      templateCode: dto.templateCode,
      templateVariables: dto.templateVariables,
    });
  }

  // ============================================
  // QUERYING NOTIFICATIONS
  // ============================================

  /**
   * Find notifications with filters and pagination
   */
  async findAll(filter: NotificationFilterDto): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: FindOptionsWhere<Notification> = {};

    if (filter.userId) where.userId = filter.userId;
    if (filter.channel) where.channel = filter.channel;
    if (filter.category) where.category = filter.category;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.requiresAction !== undefined)
      where.requiresAction = filter.requiresAction;

    // Date range filter
    if (filter.startDate || filter.endDate) {
      const start = filter.startDate
        ? new Date(filter.startDate)
        : new Date(0);
      const end = filter.endDate ? new Date(filter.endDate) : new Date();
      where.createdAt = Between(start, end) as any;
    }

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      skip: (filter.page! - 1) * filter.limit!,
      take: filter.limit,
      order: {
        [filter.sortBy!]: filter.sortOrder,
      },
    });

    return {
      data,
      total,
      page: filter.page!,
      limit: filter.limit!,
      totalPages: Math.ceil(total / filter.limit!),
    };
  }

  /**
   * Find notification by ID
   */
  async findById(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    filter: Partial<NotificationFilterDto> = {},
  ): Promise<Notification[]> {
    return (
      await this.findAll({
        ...filter,
        userId,
        page: filter.page || 1,
        limit: filter.limit || 20,
      } as NotificationFilterDto)
    ).data;
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        readAt: null as any,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.findById(id);

    if (notification.userId !== userId) {
      throw new BadRequestException('Not authorized to modify this notification');
    }

    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(
    ids: string[],
    userId: string,
  ): Promise<void> {
    await this.notificationRepository.update(
      {
        id: In(ids),
        userId,
      },
      {
        readAt: new Date(),
      },
    );
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      {
        userId,
        readAt: null as any,
      },
      {
        readAt: new Date(),
      },
    );
  }

  // ============================================
  // USER PREFERENCES
  // ============================================

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<UserNotificationPreference> {
    return this.getOrCreatePreferences(userId);
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserNotificationPreference> {
    const preferences = await this.getOrCreatePreferences(userId);

    // Update preferences
    Object.assign(preferences, dto);

    const saved = await this.preferenceRepository.save(preferences);
    this.logger.log(`✅ Preferences updated for user ${userId}`);
    return saved;
  }

  /**
   * Reset preferences to default
   */
  async resetPreferences(userId: string): Promise<UserNotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (preferences) {
      await this.preferenceRepository.remove(preferences);
    }

    return this.getOrCreatePreferences(userId);
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get notification statistics
   */
  async getStats(filter: NotificationStatsFilterDto): Promise<{
    total: number;
    byStatus: Record<NotificationStatus, number>;
    byChannel: Record<NotificationChannel, number>;
    byCategory: Record<NotificationCategory, number>;
    deliveryRate: number;
    averageDeliveryTime: number;
  }> {
    const where: FindOptionsWhere<Notification> = {};

    if (filter.userId) where.userId = filter.userId;
    if (filter.category) where.category = filter.category;
    if (filter.channel) where.channel = filter.channel;

    if (filter.startDate || filter.endDate) {
      const start = filter.startDate
        ? new Date(filter.startDate)
        : new Date(0);
      const end = filter.endDate ? new Date(filter.endDate) : new Date();
      where.createdAt = Between(start, end) as any;
    }

    const all = await this.notificationRepository.find({ where });

    const stats = {
      total: all.length,
      byStatus: {} as Record<NotificationStatus, number>,
      byChannel: {} as Record<NotificationChannel, number>,
      byCategory: {} as Record<NotificationCategory, number>,
      deliveryRate: 0,
      averageDeliveryTime: 0,
    };

    // Count by status
    Object.values(NotificationStatus).forEach((status) => {
      stats.byStatus[status] = all.filter((n) => n.status === status).length;
    });

    // Count by channel
    Object.values(NotificationChannel).forEach((channel) => {
      stats.byChannel[channel] = all.filter((n) => n.channel === channel).length;
    });

    // Count by category
    Object.values(NotificationCategory).forEach((category) => {
      stats.byCategory[category] = all.filter(
        (n) => n.category === category,
      ).length;
    });

    // Calculate delivery rate
    const delivered = all.filter((n) => n.isDelivered()).length;
    stats.deliveryRate =
      all.length > 0 ? (delivered / all.length) * 100 : 0;

    // Calculate average delivery time (in seconds)
    const deliveredWithTime = all.filter(
      (n) => n.sentAt && n.deliveredAt,
    );
    if (deliveredWithTime.length > 0) {
      const totalTime = deliveredWithTime.reduce((sum, n) => {
        const time =
          n.deliveredAt!.getTime() - n.sentAt!.getTime();
        return sum + time;
      }, 0);
      stats.averageDeliveryTime = totalTime / deliveredWithTime.length / 1000;
    }

    return stats;
  }

  // ============================================
  // RETRY & MANAGEMENT
  // ============================================

  /**
   * Retry failed notification
   */
  async retry(id: string): Promise<void> {
    const notification = await this.findById(id);

    if (!notification.canRetry()) {
      throw new BadRequestException('Notification cannot be retried');
    }

    await this.queueService.retryNotification(id);
  }

  /**
   * Cancel pending notification
   */
  async cancel(id: string): Promise<void> {
    const notification = await this.findById(id);

    if (!notification.isPending()) {
      throw new BadRequestException(
        'Only pending or queued notifications can be cancelled',
      );
    }

    await this.queueService.cancelNotification(id);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Create notification record in database
   */
  private async createNotificationRecord(
    dto: SendNotificationDto,
    user: User,
    status: NotificationStatus = NotificationStatus.PENDING,
  ): Promise<Notification> {
    // Determine recipient based on channel
    let recipient = dto.recipient;
    if (!recipient) {
      switch (dto.channel) {
        case NotificationChannel.EMAIL:
          recipient = user.email;
          break;
        case NotificationChannel.SMS:
        case NotificationChannel.WHATSAPP:
          recipient = user.phone;
          break;
        case NotificationChannel.IN_APP:
        case NotificationChannel.PUSH:
          recipient = user.id;
          break;
      }
    }

    const notification = this.notificationRepository.create({
      userId: dto.userId,
      channel: dto.channel,
      category: dto.category || NotificationCategory.SYSTEM,
      priority: dto.priority || NotificationPriority.NORMAL,
      status,
      subject: dto.subject,
      body: dto.body,
      recipient: recipient!,
      templateId: dto.templateCode,
      templateVariables: dto.templateVariables,
      requiresAction: dto.requiresAction || false,
      actionUrl: dto.actionUrl,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      providerMetadata: dto.metadata,
      attempts: 0,
      maxAttempts: 3,
    });

    return this.notificationRepository.save(notification);
  }

  /**
   * Schedule notification for later
   */
  private async scheduleNotification(
    dto: SendNotificationDto,
    user: User,
    scheduledFor: Date,
  ): Promise<Notification> {
    const notification = await this.createNotificationRecord(dto, user);

    await this.queueService.scheduleNotification(notification.id, scheduledFor);

    return notification;
  }

  /**
   * Get or create user preferences
   */
  private async getOrCreatePreferences(
    userId: string,
  ): Promise<UserNotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferenceRepository.create({
        userId,
        enabled: true,
        emailEnabled: true,
        smsEnabled: true,
        whatsappEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        categoryPreferences: {},
        quietHoursEnabled: false,
        digestEnabled: false,
        preferredLocale: 'en',
      });
      preferences = await this.preferenceRepository.save(preferences);
    }

    return preferences;
  }

  /**
   * Calculate end of quiet hours
   */
  private calculateQuietHoursEnd(
    preferences: UserNotificationPreference,
  ): Date {
    const now = new Date();
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);

    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);

    // If end time is in the past today, schedule for tomorrow
    if (endTime < now) {
      endTime.setDate(endTime.getDate() + 1);
    }

    return endTime;
  }
}
