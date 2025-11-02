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

/**
 * Notification channels available
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  PUSH = 'push',
  IN_APP = 'in_app',
}

/**
 * Notification status for delivery tracking
 */
export enum NotificationStatus {
  PENDING = 'pending', // Created but not yet queued
  QUEUED = 'queued', // Added to queue
  SENDING = 'sending', // Currently being sent
  SENT = 'sent', // Successfully sent to provider
  DELIVERED = 'delivered', // Confirmed delivered to recipient
  FAILED = 'failed', // Failed to send
  BOUNCED = 'bounced', // Bounced back (email)
  CANCELLED = 'cancelled', // Cancelled before sending
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification categories for organization
 */
export enum NotificationCategory {
  POA_STATUS = 'poa_status', // POA workflow notifications
  PAYMENT = 'payment', // Payment confirmations, invoices
  APPOINTMENT = 'appointment', // Appointment reminders
  SECURITY = 'security', // Security alerts, password changes
  MARKETING = 'marketing', // Marketing communications
  SYSTEM = 'system', // System announcements
  CUSTOM = 'custom', // Custom notifications
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['status'])
@Index(['channel'])
@Index(['category'])
@Index(['scheduledFor'])
export class Notification {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID único de la notificación',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del usuario destinatario',
  })
  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({
    example: 'email',
    description: 'Canal de envío de la notificación',
    enum: NotificationChannel,
  })
  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({
    example: 'poa_status',
    description: 'Categoría de la notificación',
    enum: NotificationCategory,
  })
  @Column({
    type: 'enum',
    enum: NotificationCategory,
    default: NotificationCategory.SYSTEM,
  })
  category: NotificationCategory;

  @ApiProperty({
    example: 'normal',
    description: 'Prioridad de la notificación',
    enum: NotificationPriority,
  })
  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @ApiProperty({
    example: 'pending',
    description: 'Estado de la notificación',
    enum: NotificationStatus,
  })
  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @ApiProperty({
    example: 'POA Approved',
    description: 'Asunto de la notificación (para email)',
  })
  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @ApiProperty({
    example: 'Your POA has been approved and is ready for notarization.',
    description: 'Cuerpo del mensaje',
  })
  @Column({ type: 'text' })
  body: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Destinatario (email, phone, etc)',
  })
  @Column({ type: 'varchar', length: 255 })
  recipient: string;

  @ApiProperty({
    example: 'poa_approved_template',
    description: 'ID de la plantilla utilizada (opcional)',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  templateId: string | null;

  @ApiProperty({
    example: { poaId: '123', poaType: 'Durable' },
    description: 'Variables utilizadas en la plantilla',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  templateVariables: Record<string, any> | null;

  @ApiProperty({
    example: { messageId: 'msg_123', providerId: 'twilio_456' },
    description: 'Metadata del proveedor de envío',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  providerMetadata: Record<string, any> | null;

  @ApiProperty({
    example: '2025-01-15T10:00:00.000Z',
    description: 'Fecha programada para envío (opcional)',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  scheduledFor: Date | null;

  @ApiProperty({
    example: '2025-01-15T10:05:32.000Z',
    description: 'Fecha de envío real',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @ApiProperty({
    example: '2025-01-15T10:05:45.000Z',
    description: 'Fecha de confirmación de entrega',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @ApiProperty({
    example: '2025-01-15T10:06:12.000Z',
    description: 'Fecha de lectura/apertura (si está disponible)',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @ApiProperty({
    example: 0,
    description: 'Número de intentos de envío',
  })
  @Column({ type: 'int', default: 0 })
  attempts: number;

  @ApiProperty({
    example: 3,
    description: 'Máximo de intentos permitidos',
  })
  @Column({ type: 'int', default: 3 })
  maxAttempts: number;

  @ApiProperty({
    example: 'Invalid email address',
    description: 'Mensaje de error (si falló)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @ApiProperty({
    example: { error_code: 'INVALID_EMAIL', details: '...' },
    description: 'Detalles adicionales del error',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  errorDetails: Record<string, any> | null;

  @ApiProperty({
    example: false,
    description: 'Si la notificación requiere acción del usuario',
  })
  @Column({ type: 'boolean', default: false })
  requiresAction: boolean;

  @ApiProperty({
    example: 'https://app.emigrantes-ft.com/poa/123',
    description: 'URL de acción (para notificaciones que requieren acción)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  actionUrl: string | null;

  @ApiProperty({
    example: '2025-01-15T10:00:00.000Z',
    description: 'Fecha de creación',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-15T10:05:32.000Z',
    description: 'Fecha de última actualización',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial: Partial<Notification>) {
    Object.assign(this, partial);
  }

  /**
   * Check if notification is still pending or queued
   */
  isPending(): boolean {
    return [NotificationStatus.PENDING, NotificationStatus.QUEUED].includes(
      this.status,
    );
  }

  /**
   * Check if notification was successfully delivered
   */
  isDelivered(): boolean {
    return this.status === NotificationStatus.DELIVERED;
  }

  /**
   * Check if notification failed
   */
  isFailed(): boolean {
    return [NotificationStatus.FAILED, NotificationStatus.BOUNCED].includes(
      this.status,
    );
  }

  /**
   * Check if notification can be retried
   */
  canRetry(): boolean {
    return this.isFailed() && this.attempts < this.maxAttempts;
  }

  /**
   * Check if notification is scheduled for future
   */
  isScheduled(): boolean {
    return this.scheduledFor !== null && this.scheduledFor > new Date();
  }
}
