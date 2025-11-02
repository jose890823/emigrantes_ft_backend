import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './services/notifications.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationQueueService } from './services/notification-queue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import {
  SendNotificationDto,
  SendBatchNotificationDto,
} from './dto/send-notification.dto';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto/template.dto';
import {
  NotificationFilterDto,
  NotificationStatsFilterDto,
} from './dto/notification-filter.dto';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';

@ApiTags('Notifications - Admin')
@Controller('notifications/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class NotificationsAdminController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly templateService: NotificationTemplateService,
    private readonly queueService: NotificationQueueService,
  ) {}

  // ============================================
  // SEND NOTIFICATIONS (ADMIN)
  // ============================================

  @Post('send')
  @ApiOperation({
    summary: 'Send notification (Admin)',
    description: 'Send a notification to a specific user',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification sent',
    type: Notification,
  })
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send(dto);
  }

  @Post('send-batch')
  @ApiOperation({
    summary: 'Send batch notifications (Admin)',
    description: 'Send the same notification to multiple users',
  })
  @ApiResponse({
    status: 201,
    description: 'Batch notifications sent',
    type: [Notification],
  })
  async sendBatch(@Body() dto: SendBatchNotificationDto) {
    return this.notificationsService.sendBatch(dto);
  }

  @Post('broadcast')
  @ApiOperation({
    summary: 'Broadcast notification (Admin)',
    description: 'Send notification to all active users',
  })
  @ApiResponse({
    status: 201,
    description: 'Broadcast sent',
    type: [Notification],
  })
  async broadcast(@Body() dto: Omit<SendNotificationDto, 'userId'>) {
    return this.notificationsService.broadcast(dto);
  }

  // ============================================
  // MANAGE NOTIFICATIONS (ADMIN)
  // ============================================

  @Get('all')
  @ApiOperation({
    summary: 'Get all notifications (Admin)',
    description: 'Get all notifications with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all notifications',
  })
  async getAllNotifications(@Query() filter: NotificationFilterDto) {
    return this.notificationsService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get notification by ID (Admin)',
    description: 'Get any notification by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification found',
    type: Notification,
  })
  async getNotification(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.findById(id);
  }

  @Post(':id/retry')
  @ApiOperation({
    summary: 'Retry failed notification (Admin)',
    description: 'Retry sending a failed notification',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification queued for retry',
  })
  async retryNotification(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationsService.retry(id);
    return {
      success: true,
      message: 'Notification queued for retry',
    };
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel notification (Admin)',
    description: 'Cancel a pending or queued notification',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification cancelled',
  })
  async cancelNotification(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationsService.cancel(id);
    return {
      success: true,
      message: 'Notification cancelled',
    };
  }

  // ============================================
  // TEMPLATES (ADMIN)
  // ============================================

  @Get('templates/all')
  @ApiOperation({
    summary: 'Get all templates (Admin)',
    description: 'Get all notification templates',
  })
  @ApiResponse({
    status: 200,
    description: 'List of templates',
    type: [NotificationTemplate],
  })
  async getAllTemplates(@Query() filters?: any) {
    return this.templateService.findAll(filters);
  }

  @Get('templates/:id')
  @ApiOperation({
    summary: 'Get template by ID (Admin)',
    description: 'Get a specific template',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Template found',
    type: NotificationTemplate,
  })
  async getTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templateService.findById(id);
  }

  @Post('templates')
  @ApiOperation({
    summary: 'Create template (Admin)',
    description: 'Create a new notification template',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created',
    type: NotificationTemplate,
  })
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
  }

  @Put('templates/:id')
  @ApiOperation({
    summary: 'Update template (Admin)',
    description: 'Update a notification template',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated',
    type: NotificationTemplate,
  })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templateService.update(id, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({
    summary: 'Delete template (Admin)',
    description: 'Delete a notification template',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Template deleted',
  })
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    await this.templateService.delete(id);
    return {
      success: true,
      message: 'Template deleted',
    };
  }

  @Post('templates/:id/clone')
  @ApiOperation({
    summary: 'Clone template (Admin)',
    description: 'Clone a template to create a custom version',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID to clone',
  })
  @ApiResponse({
    status: 201,
    description: 'Template cloned',
    type: NotificationTemplate,
  })
  async cloneTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newCode') newCode: string,
  ) {
    return this.templateService.clone(id, newCode);
  }

  @Post('templates/seed')
  @ApiOperation({
    summary: 'Seed default templates (Admin)',
    description: 'Seed default system templates',
  })
  @ApiResponse({
    status: 200,
    description: 'Default templates seeded',
  })
  async seedTemplates() {
    await this.templateService.seedDefaultTemplates();
    return {
      success: true,
      message: 'Default templates seeded successfully',
    };
  }

  @Get('templates/stats/summary')
  @ApiOperation({
    summary: 'Get template statistics (Admin)',
    description: 'Get usage statistics for all templates',
  })
  @ApiResponse({
    status: 200,
    description: 'Template statistics',
  })
  async getTemplateStats() {
    return this.templateService.getStats();
  }

  // ============================================
  // STATISTICS & MONITORING (ADMIN)
  // ============================================

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get notification statistics (Admin)',
    description: 'Get comprehensive notification statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification statistics',
  })
  async getStats(@Query() filter: NotificationStatsFilterDto) {
    return this.notificationsService.getStats(filter);
  }

  @Get('queue/stats')
  @ApiOperation({
    summary: 'Get queue statistics (Admin)',
    description: 'Get current queue status and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics',
  })
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Post('queue/clean')
  @ApiOperation({
    summary: 'Clean old jobs (Admin)',
    description: 'Clean completed and failed jobs older than specified days',
  })
  @ApiResponse({
    status: 200,
    description: 'Old jobs cleaned',
  })
  async cleanOldJobs(@Body('days') days: number = 7) {
    await this.queueService.cleanOldJobs(days);
    return {
      success: true,
      message: `Jobs older than ${days} days cleaned from queue`,
    };
  }
}
