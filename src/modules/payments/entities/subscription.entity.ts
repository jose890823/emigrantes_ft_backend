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
import { Plan } from '../../plans/entities/plan.entity';

export enum SubscriptionPlan {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export enum SubscriptionStatus {
  PENDING_PAYMENT = 'pending_payment', // Esperando pago inicial
  PENDING_CONTRACT = 'pending_contract', // Pago completado, esperando firma de contrato
  ACTIVE = 'active', // Activa y funcionando
  CANCELLED = 'cancelled', // Cancelada por el usuario
  SUSPENDED = 'suspended', // Suspendida por falta de pago
  EXPIRED = 'expired', // Expirada
  PAST_DUE = 'past_due', // Pago atrasado
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  ZELLE = 'zelle',
  OTHER = 'other',
}

export enum InitialPaymentType {
  SINGLE = 'single', // Pago único
  INSTALLMENTS = 'installments', // Pago fraccionado en 3 cuotas
}

export enum InitialPaymentStatus {
  PENDING = 'pending', // No iniciado
  PARTIAL = 'partial', // Algunas cuotas pagadas
  COMPLETED = 'completed', // Completamente pagado
  FAILED = 'failed', // Falló el pago
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

  @ApiProperty({
    description: 'ID del plan asociado',
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  planId: string | null;

  @ManyToOne(() => Plan, { eager: true, nullable: true })
  @JoinColumn({ name: 'planId' })
  plan: Plan | null;

  @OneToMany(() => Payment, (payment) => payment.subscription)
  payments: Payment[];

  // ============================================
  // INFORMACIÓN DE LA SUSCRIPCIÓN
  // ============================================

  @ApiProperty({
    description: 'Tipo de plan de suscripción',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.STANDARD,
  })
  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.BASIC,
  })
  planType: SubscriptionPlan;

  @ApiProperty({
    description: 'Estado de la suscripción',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING_PAYMENT,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Precio mensual en USD',
    example: 24.0,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 24.0 })
  monthlyPrice: number;

  @ApiProperty({
    description: 'Moneda',
    example: 'USD',
  })
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // ============================================
  // PAGO INICIAL
  // ============================================

  @ApiProperty({
    description: 'Tipo de pago inicial seleccionado',
    enum: InitialPaymentType,
    example: InitialPaymentType.SINGLE,
  })
  @Column({
    type: 'enum',
    enum: InitialPaymentType,
    default: InitialPaymentType.SINGLE,
  })
  initialPaymentType: InitialPaymentType;

  @ApiProperty({
    description: 'Monto total del pago inicial',
    example: 199.0,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  initialPaymentAmount: number;

  @ApiProperty({
    description: 'Estado del pago inicial',
    enum: InitialPaymentStatus,
    example: InitialPaymentStatus.COMPLETED,
  })
  @Column({
    type: 'enum',
    enum: InitialPaymentStatus,
    default: InitialPaymentStatus.PENDING,
  })
  initialPaymentStatus: InitialPaymentStatus;

  @ApiProperty({
    description: 'Número de cuotas pagadas (si es fraccionado)',
    example: 2,
  })
  @Column({ type: 'int', default: 0 })
  installmentsPaid: number;

  @ApiProperty({
    description: 'Total de cuotas (si es fraccionado)',
    example: 3,
  })
  @Column({ type: 'int', default: 3 })
  totalInstallments: number;

  @ApiProperty({
    description: 'Monto de cada cuota (si es fraccionado)',
    example: 66.33,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  installmentAmount: number;

  @ApiProperty({
    description: 'Fecha del próximo pago de cuota',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  nextInstallmentDate: Date | null;

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
    description: 'ID de la suscripción mensual en Stripe',
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

  @ApiProperty({
    description: 'ID de la sesión de checkout en Stripe',
    example: 'cs_1234567890abcdef',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCheckoutSessionId: string | null;

  // ============================================
  // CICLO DE FACTURACIÓN
  // ============================================

  @ApiProperty({
    description: 'Fecha de inicio de la suscripción',
    example: '2025-11-01T00:00:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @ApiProperty({
    description: 'Fecha del próximo cobro mensual',
    example: '2025-12-01T00:00:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  nextBillingDate: Date | null;

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
  // CONTRATO Y DOCUMENTOS
  // ============================================

  @ApiProperty({
    description: 'Estado de firma del contrato',
    example: false,
  })
  @Column({ type: 'boolean', default: false })
  contractSigned: boolean;

  @ApiProperty({
    description: 'Fecha de firma del contrato',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  contractSignedAt: Date | null;

  @ApiProperty({
    description: 'ID del envelope en DocuSign',
    example: 'envelope_123456789',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  docusignEnvelopeId: string | null;

  @ApiProperty({
    description: 'URL del contrato firmado',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  contractUrl: string | null;

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

  @ApiProperty({
    description: 'Metadata adicional',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

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
