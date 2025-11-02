import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationChannel,
  NotificationCategory,
  NotificationStatus,
  NotificationPriority,
} from '../entities/notification.entity';

/**
 * DTO for filtering and paginating notifications
 */
export class NotificationFilterDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filtrar por ID de usuario',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    example: 'email',
    description: 'Filtrar por canal',
    enum: NotificationChannel,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiProperty({
    example: 'poa_status',
    description: 'Filtrar por categoría',
    enum: NotificationCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiProperty({
    example: 'sent',
    description: 'Filtrar por estado',
    enum: NotificationStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiProperty({
    example: 'high',
    description: 'Filtrar por prioridad',
    enum: NotificationPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Filtrar desde fecha (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    example: '2025-01-31T23:59:59.999Z',
    description: 'Filtrar hasta fecha (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    example: true,
    description: 'Solo notificaciones que requieren acción',
    required: false,
  })
  @IsOptional()
  requiresAction?: boolean;

  @ApiProperty({
    example: 1,
    description: 'Número de página',
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 20,
    description: 'Registros por página',
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    example: 'createdAt',
    description: 'Campo de ordenamiento',
    required: false,
    default: 'createdAt',
  })
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    example: 'DESC',
    description: 'Dirección de ordenamiento',
    required: false,
    default: 'DESC',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * DTO for notification statistics query
 */
export class NotificationStatsFilterDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filtrar por ID de usuario',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Desde fecha (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    example: '2025-01-31T23:59:59.999Z',
    description: 'Hasta fecha (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    example: 'poa_status',
    description: 'Filtrar por categoría',
    enum: NotificationCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiProperty({
    example: 'email',
    description: 'Filtrar por canal',
    enum: NotificationChannel,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;
}
