import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsObject,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  NotificationChannel,
  NotificationCategory,
} from '../entities/notification.entity';

/**
 * DTO for updating user notification preferences
 */
export class UpdatePreferencesDto {
  @ApiProperty({
    example: true,
    description: 'Habilitar todas las notificaciones (master switch)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  // ============================================
  // CHANNEL PREFERENCES
  // ============================================

  @ApiProperty({
    example: true,
    description: 'Habilitar notificaciones por email',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiProperty({
    example: true,
    description: 'Habilitar notificaciones por SMS',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiProperty({
    example: false,
    description: 'Habilitar notificaciones por WhatsApp',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @ApiProperty({
    example: true,
    description: 'Habilitar notificaciones push',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiProperty({
    example: true,
    description: 'Habilitar notificaciones in-app',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  // ============================================
  // CATEGORY PREFERENCES
  // ============================================

  @ApiProperty({
    example: {
      poa_status: { email: true, sms: true, whatsapp: false, push: true },
      payment: { email: true, sms: false, whatsapp: false, push: true },
      appointment: { email: true, sms: true, whatsapp: true, push: true },
      security: { email: true, sms: true, whatsapp: false, push: true },
      marketing: { email: false, sms: false, whatsapp: false, push: false },
      system: { email: true, sms: false, whatsapp: false, push: true },
    },
    description: 'Preferencias de canal por categoría',
    required: false,
  })
  @IsOptional()
  @IsObject()
  categoryPreferences?: Record<
    NotificationCategory,
    Partial<Record<NotificationChannel, boolean>>
  >;

  // ============================================
  // QUIET HOURS
  // ============================================

  @ApiProperty({
    example: false,
    description: 'Habilitar horario de silencio (Do Not Disturb)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiProperty({
    example: '22:00',
    description: 'Hora de inicio del horario de silencio (HH:mm)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Quiet hours start must be in HH:mm format',
  })
  quietHoursStart?: string;

  @ApiProperty({
    example: '08:00',
    description: 'Hora de fin del horario de silencio (HH:mm)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Quiet hours end must be in HH:mm format',
  })
  quietHoursEnd?: string;

  @ApiProperty({
    example: 'America/New_York',
    description: 'Zona horaria del usuario (IANA timezone)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  // ============================================
  // DIGEST PREFERENCES
  // ============================================

  @ApiProperty({
    example: false,
    description: 'Agrupar notificaciones en resúmenes',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  digestEnabled?: boolean;

  @ApiProperty({
    example: 'daily',
    description: 'Frecuencia del resumen (daily, weekly)',
    required: false,
  })
  @IsOptional()
  @IsString()
  digestFrequency?: string;

  @ApiProperty({
    example: '09:00',
    description: 'Hora preferida para recibir resumen (HH:mm)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Digest time must be in HH:mm format',
  })
  digestTime?: string;

  // ============================================
  // LANGUAGE
  // ============================================

  @ApiProperty({
    example: 'en',
    description: 'Idioma preferido para notificaciones (ISO 639-1)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  preferredLocale?: string;

  // ============================================
  // ALTERNATE CONTACTS
  // ============================================

  @ApiProperty({
    example: 'alternate@example.com',
    description: 'Email alternativo para notificaciones',
    required: false,
  })
  @IsOptional()
  @IsString()
  alternateEmail?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Teléfono alternativo para SMS/WhatsApp',
    required: false,
  })
  @IsOptional()
  @IsString()
  alternatePhone?: string;
}

/**
 * DTO for updating a specific category preference
 */
export class UpdateCategoryPreferenceDto {
  @ApiProperty({
    example: 'poa_status',
    description: 'Categoría de notificación',
    enum: NotificationCategory,
  })
  @IsOptional()
  category: NotificationCategory;

  @ApiProperty({
    example: 'email',
    description: 'Canal de notificación',
    enum: NotificationChannel,
  })
  @IsOptional()
  channel: NotificationChannel;

  @ApiProperty({
    example: true,
    description: 'Habilitar o deshabilitar',
  })
  @IsBoolean()
  enabled: boolean;
}
