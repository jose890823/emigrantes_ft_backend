import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Subscription } from './subscription.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  ZELLE = 'zelle',
  OTHER = 'other',
}

@Entity('payments')
export class Payment {
  @ApiProperty({
    description: 'ID único del pago',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiProperty({
    description: 'ID del usuario que realizó el pago',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({
    description: 'ID de la suscripción relacionada',
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  subscriptionId: string | null;

  @ManyToOne(() => Subscription, (subscription) => subscription.payments, {
    nullable: true,
  })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription | null;

  // ============================================
  // INFORMACIÓN DEL PAGO
  // ============================================

  @ApiProperty({
    description: 'Monto del pago',
    example: 29.0,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({
    description: 'Moneda del pago',
    example: 'USD',
  })
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @ApiProperty({
    description: 'Estado del pago',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @ApiProperty({
    description: 'Proveedor de pago',
    enum: PaymentProvider,
    example: PaymentProvider.STRIPE,
  })
  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.STRIPE,
  })
  provider: PaymentProvider;

  @ApiProperty({
    description: 'ID de la transacción en el proveedor (Stripe Payment Intent ID)',
    example: 'pi_1234567890abcdef',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId: string | null;

  // ============================================
  // FACTURACIÓN
  // ============================================

  @ApiProperty({
    description: 'Número de factura (auto-generado)',
    example: 'INV-2025-0001',
  })
  @Column({ type: 'varchar', length: 50, unique: true })
  invoiceNumber: string;

  @ApiProperty({
    description: 'URL del PDF de la factura',
    example: 'https://s3.amazonaws.com/emigrantes-ft/invoices/INV-2025-0001.pdf',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  invoicePdfUrl: string | null;

  @ApiProperty({
    description: 'Descripción del pago',
    example: 'Suscripción Plan Básico - Noviembre 2025',
  })
  @Column({ type: 'text' })
  description: string;

  // ============================================
  // FECHAS
  // ============================================

  @ApiProperty({
    description: 'Fecha de pago exitoso',
    example: '2025-11-01T10:00:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @ApiProperty({
    description: 'Fecha de reembolso',
    example: null,
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @ApiProperty({
    description: 'Monto reembolsado',
    example: 0,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundedAmount: number;

  @ApiProperty({
    description: 'Razón del reembolso',
    example: 'Cliente solicitó cancelación dentro del período de garantía',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  refundReason: string | null;

  // ============================================
  // METADATA
  // ============================================

  @ApiProperty({
    description: 'Metadata adicional del pago (JSON)',
    example: { stripeInvoiceId: 'in_1234567890abcdef' },
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Mensaje de error (si el pago falló)',
    example: null,
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  // ============================================
  // AUDITORÍA
  // ============================================

  @ApiProperty({
    description: 'Fecha de creación del registro',
    example: '2025-11-01T10:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-11-01T10:05:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
