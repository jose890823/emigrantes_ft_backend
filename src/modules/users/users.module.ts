import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

// Entities
import { User } from '../auth/entities/user.entity';

// Services
import { UsersService } from './services/users.service';
import { SmsService } from './services/sms.service';
import { FileUploadService } from './services/file-upload.service';

// Controllers
import { UsersController } from './users.controller';
import { UsersAdminController } from './users-admin.controller';

// Shared
import { EncryptionService } from '../../shared/encryption.service';

@Module({
  imports: [
    // TypeORM
    TypeOrmModule.forFeature([User]),

    // Multer for file uploads
    MulterModule.register({
      storage: memoryStorage(), // Store in memory for processing
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],

  controllers: [UsersController, UsersAdminController],

  providers: [
    UsersService,
    SmsService,
    FileUploadService,
    EncryptionService,
  ],

  exports: [UsersService, SmsService, FileUploadService],
})
export class UsersModule {}
