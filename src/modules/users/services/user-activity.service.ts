import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivity, ActivityType } from '../entities/user-activity.entity';

/**
 * User Activity Service
 * Handles logging and retrieval of user activities for audit trail
 */
@Injectable()
export class UserActivityService {
  private readonly logger = new Logger(UserActivityService.name);

  constructor(
    @InjectRepository(UserActivity)
    private activityRepository: Repository<UserActivity>,
  ) {}

  /**
   * Log a user activity
   */
  async logActivity(params: {
    userId: string;
    activityType: ActivityType;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    performedBy?: string;
  }): Promise<UserActivity> {
    const activity = this.activityRepository.create({
      userId: params.userId,
      activityType: params.activityType,
      description: params.description,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      metadata: params.metadata || null,
      performedBy: params.performedBy || null,
    });

    const saved = await this.activityRepository.save(activity);

    this.logger.log(
      `📝 Activity logged: ${params.activityType} for user ${params.userId}`,
    );

    return saved;
  }

  /**
   * Get user activity history
   */
  async getUserActivities(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      activityType?: ActivityType;
    },
  ): Promise<{
    data: UserActivity[];
    total: number;
  }> {
    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.userId = :userId', { userId })
      .leftJoinAndSelect('activity.performer', 'performer')
      .orderBy('activity.createdAt', 'DESC');

    // Filter by activity type if provided
    if (options?.activityType) {
      queryBuilder.andWhere('activity.activityType = :activityType', {
        activityType: options.activityType,
      });
    }

    // Apply pagination
    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  /**
   * Get recent activities for a user (last 50)
   */
  async getRecentActivities(userId: string): Promise<UserActivity[]> {
    const { data } = await this.getUserActivities(userId, { limit: 50 });
    return data;
  }

  /**
   * Get activities by type for a user
   */
  async getActivitiesByType(
    userId: string,
    activityType: ActivityType,
  ): Promise<UserActivity[]> {
    return this.activityRepository.find({
      where: {
        userId,
        activityType,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 100,
    });
  }

  /**
   * Count activities by type for a user
   */
  async countActivitiesByType(
    userId: string,
    activityType: ActivityType,
  ): Promise<number> {
    return this.activityRepository.count({
      where: {
        userId,
        activityType,
      },
    });
  }

  /**
   * Delete old activities (older than specified days)
   */
  async deleteOldActivities(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.activityRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(
      `🗑️  Deleted ${result.affected} activities older than ${daysOld} days`,
    );

    return result.affected || 0;
  }

  /**
   * Get activity statistics for a user
   */
  async getUserActivityStats(userId: string): Promise<{
    totalActivities: number;
    lastActivity: Date | null;
    activitiesByType: Record<string, number>;
  }> {
    const activities = await this.activityRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const stats = {
      totalActivities: activities.length,
      lastActivity: activities.length > 0 ? activities[0].createdAt : null,
      activitiesByType: {} as Record<string, number>,
    };

    // Count by type
    activities.forEach((activity) => {
      const type = activity.activityType;
      stats.activitiesByType[type] = (stats.activitiesByType[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get all activities performed by an admin
   */
  async getActivitiesPerformedBy(
    adminId: string,
    limit: number = 100,
  ): Promise<UserActivity[]> {
    return this.activityRepository.find({
      where: {
        performedBy: adminId,
      },
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }
}
