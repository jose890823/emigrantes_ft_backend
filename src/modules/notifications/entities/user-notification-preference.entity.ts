import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import {
  NotificationChannel,
  NotificationCategory,
} from './notification.entity';

/**
 * User notification preferences for managing how and when they receive notifications
 */
@Entity('user_notification_preferences')
@Index(['userId'], { unique: true })
export class UserNotificationPreference {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID único de la preferencia',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del usuario',
  })
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({
    example: true,
    description: 'Habilitar todas las notificaciones (master switch)',
  })
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  // ============================================
  // CHANNEL PREFERENCES
  // ============================================

  @ApiProperty({
    example: true,
    description: 'Habilitar notificaciones por email',
  })
  @Column({ type: 'boolean', default: true })
  emailEnabled: boolean;

  @ApiProperty({
    example: true,
    description: 'Habilitar notificaciones por SMS',
  })
  @Column({ type: 'boolean', default: true })
  smsEnabled: boolean;

  @ApiProperty({
    example: false,
    description: 'Habilitar notificaciones por WhatsApp',
  })
  @Column({ type: 'boolean', default: false })
  whatsappEnabled: boolean;

  @ApiProperty({
    example: true,
    description: 'Habilitar notificaciones push',
  })
  @Column({ type: 'boolean', default: true })
  pushEnabled: boolean;

  @ApiProperty({
    example: true,
    description: 'Habilitar notificaciones in-app',
  })
  @Column({ type: 'boolean', default: true })
  inAppEnabled: boolean;

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
    description: 'Preferencias de canal por categoría de notificación',
  })
  @Column({ type: 'jsonb', default: {} })
  categoryPreferences: Record<
    NotificationCategory,
    Partial<Record<NotificationChannel, boolean>>
  >;

  // ============================================
  // QUIET HOURS (Do Not Disturb)
  // ============================================

  @ApiProperty({
    example: false,
    description: 'Habilitar horario de silencio (Do Not Disturb)',
  })
  @Column({ type: 'boolean', default: false })
  quietHoursEnabled: boolean;

  @ApiProperty({
    example: '22:00',
    description: 'Hora de inicio del horario de silencio (formato HH:mm)',
  })
  @Column({ type: 'varchar', length: 5, default: '22:00' })
  quietHoursStart: string;

  @ApiProperty({
    example: '08:00',
    description: 'Hora de fin del horario de silencio (formato HH:mm)',
  })
  @Column({ type: 'varchar', length: 5, default: '08:00' })
  quietHoursEnd: string;

  @ApiProperty({
    example: 'America/New_York',
    description: 'Zona horaria del usuario (IANA timezone)',
  })
  @Column({ type: 'varchar', length: 100, default: 'UTC' })
  timezone: string;

  // ============================================
  // DIGEST PREFERENCES
  // ============================================

  @ApiProperty({
    example: false,
    description:
      'Agrupar notificaciones no urgentes en resúmenes diarios/semanales',
  })
  @Column({ type: 'boolean', default: false })
  digestEnabled: boolean;

  @ApiProperty({
    example: 'daily',
    description: 'Frecuencia del resumen (daily, weekly)',
  })
  @Column({ type: 'varchar', length: 20, default: 'daily' })
  digestFrequency: string;

  @ApiProperty({
    example: '09:00',
    description: 'Hora preferida para recibir resumen (formato HH:mm)',
  })
  @Column({ type: 'varchar', length: 5, default: '09:00' })
  digestTime: string;

  // ============================================
  // LANGUAGE PREFERENCES
  // ============================================

  @ApiProperty({
    example: 'en',
    description: 'Idioma preferido para notificaciones (ISO 639-1)',
  })
  @Column({ type: 'varchar', length: 5, default: 'en' })
  preferredLocale: string;

  // ============================================
  // CONTACT INFORMATION
  // ============================================

  @ApiProperty({
    example: 'user@example.com',
    description:
      'Email alternativo para notificaciones (si diferente del principal)',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  alternateEmail: string | null;

  @ApiProperty({
    example: '+1234567890',
    description:
      'Teléfono alternativo para SMS/WhatsApp (si diferente del principal)',
    required: false,
  })
  @Column({ type: 'varchar', length: 20, nullable: true })
  alternatePhone: string | null;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Fecha de creación',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-15T10:00:00.000Z',
    description: 'Fecha de última actualización',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial: Partial<UserNotificationPreference>) {
    Object.assign(this, partial);
  }

  /**
   * Check if a specific channel is enabled
   */
  isChannelEnabled(channel: NotificationChannel): boolean {
    if (!this.enabled) return false;

    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.emailEnabled;
      case NotificationChannel.SMS:
        return this.smsEnabled;
      case NotificationChannel.WHATSAPP:
        return this.whatsappEnabled;
      case NotificationChannel.PUSH:
        return this.pushEnabled;
      case NotificationChannel.IN_APP:
        return this.inAppEnabled;
      default:
        return false;
    }
  }

  /**
   * Check if notifications are allowed for a specific category and channel
   */
  isAllowed(
    category: NotificationCategory,
    channel: NotificationChannel,
  ): boolean {
    // First check if notifications and channel are globally enabled
    if (!this.enabled || !this.isChannelEnabled(channel)) {
      return false;
    }

    // Then check category-specific preferences
    const categoryPref = this.categoryPreferences[category];
    if (!categoryPref) {
      // If no specific preference, use channel default
      return this.isChannelEnabled(channel);
    }

    return categoryPref[channel] ?? this.isChannelEnabled(channel);
  }

  /**
   * Check if currently in quiet hours
   */
  isInQuietHours(): boolean {
    if (!this.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    // Handle quiet hours that span midnight
    if (this.quietHoursStart > this.quietHoursEnd) {
      return (
        currentTime >= this.quietHoursStart || currentTime < this.quietHoursEnd
      );
    }

    return (
      currentTime >= this.quietHoursStart && currentTime < this.quietHoursEnd
    );
  }

  /**
   * Get preferred channels for a category (ordered by preference)
   */
  getPreferredChannels(category: NotificationCategory): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    Object.values(NotificationChannel).forEach((channel) => {
      if (this.isAllowed(category, channel)) {
        channels.push(channel);
      }
    });

    return channels;
  }

  /**
   * Set category preference for a specific channel
   */
  setCategoryPreference(
    category: NotificationCategory,
    channel: NotificationChannel,
    enabled: boolean,
  ): void {
    if (!this.categoryPreferences[category]) {
      this.categoryPreferences[category] = {};
    }
    this.categoryPreferences[category][channel] = enabled;
  }
}
