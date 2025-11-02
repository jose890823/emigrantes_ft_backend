import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './services/notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Notification } from './entities/notification.entity';
import { UserNotificationPreference } from './entities/user-notification-preference.entity';
import {
  UpdatePreferencesDto,
  UpdateCategoryPreferenceDto,
} from './dto/preferences.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';

@ApiTags('Notifications - User')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ============================================
  // USER NOTIFICATIONS
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Get my notifications',
    description: 'Get all notifications for the current user with filters and pagination',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'channel',
    required: false,
    enum: ['email', 'sms', 'whatsapp', 'push', 'in_app'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'cancelled'],
  })
  @ApiResponse({
    status: 200,
    description: 'List of notifications',
    type: [Notification],
  })
  async getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query() filter: NotificationFilterDto,
  ) {
    return this.notificationsService.findAll({
      ...filter,
      userId,
    });
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Get the count of unread in-app notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count',
    schema: {
      example: { count: 5 },
    },
  })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get notification by ID',
    description: 'Get details of a specific notification',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification found',
    type: Notification,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async getNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const notification = await this.notificationsService.findById(id);

    // Ensure user owns this notification
    if (notification.userId !== userId) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to view this notification',
        },
      };
    }

    return notification;
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a notification as read (for in-app notifications)',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: Notification,
  })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('mark-all-read')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all in-app notifications as read for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  // ============================================
  // NOTIFICATION PREFERENCES
  // ============================================

  @Get('preferences/me')
  @ApiOperation({
    summary: 'Get my notification preferences',
    description: 'Get notification preferences for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences',
    type: UserNotificationPreference,
  })
  async getMyPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences/me')
  @ApiOperation({
    summary: 'Update my notification preferences',
    description: 'Update notification preferences (channels, categories, quiet hours, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated',
    type: UserNotificationPreference,
  })
  async updateMyPreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(userId, dto);
  }

  @Post('preferences/category')
  @ApiOperation({
    summary: 'Update category preference',
    description: 'Enable or disable a specific channel for a category',
  })
  @ApiResponse({
    status: 200,
    description: 'Category preference updated',
  })
  async updateCategoryPreference(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCategoryPreferenceDto,
  ) {
    const preferences = await this.notificationsService.getPreferences(userId);
    preferences.setCategoryPreference(dto.category, dto.channel, dto.enabled);

    await this.notificationsService.updatePreferences(userId, {
      categoryPreferences: preferences.categoryPreferences,
    });

    return {
      success: true,
      message: 'Category preference updated',
    };
  }

  @Post('preferences/reset')
  @ApiOperation({
    summary: 'Reset preferences to default',
    description: 'Reset all notification preferences to system defaults',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences reset to defaults',
    type: UserNotificationPreference,
  })
  async resetPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.resetPreferences(userId);
  }

  // ============================================
  // STATISTICS (USER)
  // ============================================

  @Get('stats/me')
  @ApiOperation({
    summary: 'Get my notification statistics',
    description: 'Get notification statistics for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'User notification statistics',
  })
  async getMyStats(@CurrentUser('id') userId: string) {
    return this.notificationsService.getStats({ userId });
  }
}
