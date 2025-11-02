import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Payment } from './payment.entity';

export enum SubscriptionPlan {
  BASIC = 'basic',
  // Future plans can be added here
  // PREMIUM = 'premium',
  // ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  ZELLE = 'zelle',
  OTHER = 'other',
}

@Entity('subscriptions')
export class Subscription {
  @ApiProperty({
    description: 'ID único de la suscripción',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiProperty({
    description: 'ID del usuario dueño de la suscripción',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Payment, (payment) => payment.subscription)
  payments: Payment[];

  // ============================================
  // INFORMACIÓN DE LA SUSCRIPCIÓN
  // ============================================

  @ApiProperty({
    description: 'Plan de suscripción',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.BASIC,
  })
  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.BASIC,
  })
  plan: SubscriptionPlan;

  @ApiProperty({
    description: 'Estado de la suscripción',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Precio mensual en USD',
    example: 29.0,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 29.0 })
  price: number;

  @ApiProperty({
    description: 'Moneda',
    example: 'USD',
  })
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // ============================================
  // INTEGRACIÓN CON STRIPE
  // ============================================

  @ApiProperty({
    description: 'Método de pago',
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
  })
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.STRIPE,
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'ID de la suscripción en Stripe',
    example: 'sub_1234567890abcdef',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeSubscriptionId: string | null;

  @ApiProperty({
    description: 'ID del customer en Stripe',
    example: 'cus_1234567890abcdef',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId: string | null;

  @ApiProperty({
    description: 'ID del método de pago en Stripe',
    example: 'pm_1234567890abcdef',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentMethodId: string | null;

  // ============================================
  // CICLO DE FACTURACIÓN
  // ============================================

  @ApiProperty({
    description: 'Fecha de inicio de la suscripción',
    example: '2025-11-01T00:00:00Z',
  })
  @Column({ type: 'timestamp' })
  startDate: Date;

  @ApiProperty({
    description: 'Fecha del próximo cobro',
    example: '2025-12-01T00:00:00Z',
  })
  @Column({ type: 'timestamp' })
  nextBillingDate: Date;

  @ApiProperty({
    description: 'Fecha de cancelación de la suscripción',
    example: null,
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({
    description: 'Razón de cancelación',
    example: 'Cliente solicitó cancelación',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @ApiProperty({
    description: 'Fecha de expiración (para suscripciones canceladas)',
    example: null,
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // ============================================
  // INFORMACIÓN ADICIONAL
  // ============================================

  @ApiProperty({
    description: 'Notas o comentarios sobre la suscripción',
    example: 'Suscripción creada durante promoción de lanzamiento',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ============================================
  // AUDITORÍA
  // ============================================

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-11-01T10:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-11-01T15:30:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
