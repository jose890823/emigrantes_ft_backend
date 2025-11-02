import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { UserNotificationPreference } from './entities/user-notification-preference.entity';
import { User } from '../auth/entities/user.entity';

// Services
import { NotificationsService } from './services/notifications.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationQueueService } from './services/notification-queue.service';

// Channel Services
import { EmailChannelService } from './services/channels/email-channel.service';
import { SmsChannelService } from './services/channels/sms-channel.service';
import { WhatsAppChannelService } from './services/channels/whatsapp-channel.service';
import { PushChannelService } from './services/channels/push-channel.service';
import { InAppChannelService } from './services/channels/in-app-channel.service';

// Controllers
import { NotificationsController } from './notifications.controller';
import { NotificationsAdminController } from './notifications-admin.controller';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      UserNotificationPreference,
      User,
    ]),

    // Bull Queue
    BullModule.registerQueueAsync({
      name: 'notifications',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000, // 1 minute
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
      inject: [ConfigService],
    }),
  ],

  controllers: [NotificationsController, NotificationsAdminController],

  providers: [
    // Main Services
    NotificationsService,
    NotificationTemplateService,
    NotificationQueueService,

    // Channel Services
    EmailChannelService,
    SmsChannelService,
    WhatsAppChannelService,
    PushChannelService,
    InAppChannelService,
  ],

  exports: [
    NotificationsService,
    NotificationTemplateService,
    // Export channel services so other modules can send notifications directly
    EmailChannelService,
    SmsChannelService,
    WhatsAppChannelService,
  ],
})
export class NotificationsModule {}
