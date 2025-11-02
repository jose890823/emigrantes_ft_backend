import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
  IsDateString,
  IsArray,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
} from '../entities/notification.entity';

/**
 * DTO for sending a single notification
 */
export class SendNotificationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del usuario destinatario',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    example: 'email',
    description: 'Canal de envío',
    enum: NotificationChannel,
  })
  @IsNotEmpty()
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({
    example: 'poa_status',
    description: 'Categoría de la notificación',
    enum: NotificationCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiProperty({
    example: 'normal',
    description: 'Prioridad de la notificación',
    enum: NotificationPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({
    example: 'Your POA has been approved',
    description: 'Asunto de la notificación',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  subject: string;

  @ApiProperty({
    example: 'Congratulations! Your POA has been approved and is ready for notarization.',
    description: 'Cuerpo del mensaje',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  body: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Destinatario (email, teléfono, etc). Opcional si se usa userId',
    required: false,
  })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiProperty({
    example: 'poa_approved',
    description: 'Código de plantilla a usar (opcional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiProperty({
    example: { userName: 'John Doe', poaType: 'Durable', poaId: '123' },
    description: 'Variables para la plantilla',
    required: false,
  })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;

  @ApiProperty({
    example: true,
    description: 'Si la notificación requiere acción del usuario',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresAction?: boolean;

  @ApiProperty({
    example: 'https://app.emigrantes-ft.com/poa/123',
    description: 'URL de acción (si requiere acción)',
    required: false,
  })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiProperty({
    example: '2025-01-15T10:00:00.000Z',
    description: 'Fecha programada para envío (opcional)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiProperty({
    example: { customField: 'customValue' },
    description: 'Metadata adicional',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for sending batch notifications
 */
export class SendBatchNotificationDto {
  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000', '987e6543-e89b-12d3-a456-426614174111'],
    description: 'IDs de los usuarios destinatarios',
  })
  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({
    example: 'email',
    description: 'Canal de envío',
    enum: NotificationChannel,
  })
  @IsNotEmpty()
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({
    example: 'system',
    description: 'Categoría de la notificación',
    enum: NotificationCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiProperty({
    example: 'normal',
    description: 'Prioridad de la notificación',
    enum: NotificationPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({
    example: 'System Maintenance Announcement',
    description: 'Asunto de la notificación',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  subject: string;

  @ApiProperty({
    example: 'We will be performing scheduled maintenance on January 15th from 2 AM to 4 AM EST.',
    description: 'Cuerpo del mensaje',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  body: string;

  @ApiProperty({
    example: 'system_maintenance',
    description: 'Código de plantilla a usar (opcional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiProperty({
    example: { maintenanceDate: '2025-01-15', startTime: '2 AM', endTime: '4 AM' },
    description: 'Variables para la plantilla',
    required: false,
  })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;
}
