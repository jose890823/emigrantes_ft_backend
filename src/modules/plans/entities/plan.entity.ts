import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum PlanType {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export enum PlanStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

@Entity('plans')
export class Plan {
  @ApiProperty({
    description: 'ID único del plan',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // INFORMACIÓN BÁSICA DEL PLAN
  // ============================================

  @ApiProperty({
    description: 'Tipo de plan',
    enum: PlanType,
    example: PlanType.STANDARD,
  })
  @Column({
    type: 'enum',
    enum: PlanType,
    unique: true,
  })
  type: PlanType;

  @ApiProperty({
    description: 'Nombre del plan para mostrar',
    example: 'Plan Estándar',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    description: 'Descripción del plan',
    example: 'Plan ideal para familias que buscan protección completa',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    description: 'Estado del plan',
    enum: PlanStatus,
    example: PlanStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.ACTIVE,
  })
  status: PlanStatus;

  // ============================================
  // PRECIOS - SUSCRIPCIÓN MENSUAL
  // ============================================

  @ApiProperty({
    description: 'Precio mensual de la suscripción en USD',
    example: 24.0,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  @ApiProperty({
    description: 'ID del precio mensual en Stripe',
    example: 'price_1234567890abcdef',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeMonthlyPriceId: string | null;

  // ============================================
  // PRECIOS - PAGO INICIAL (ÚNICO)
  // ============================================

  @ApiProperty({
    description: 'Pago inicial único en USD',
    example: 199.0,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  initialPayment: number;

  @ApiProperty({
    description: 'ID del precio inicial en Stripe',
    example: 'price_initial_1234567890',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeInitialPriceId: string | null;

  // ============================================
  // PRECIOS - PAGO INICIAL FRACCIONADO (3 CUOTAS)
  // ============================================

  @ApiProperty({
    description: 'Monto de cada cuota del pago inicial fraccionado en USD',
    example: 66.33,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  installmentAmount: number;

  @ApiProperty({
    description: 'Número de cuotas del pago inicial',
    example: 3,
  })
  @Column({ type: 'int', default: 3 })
  installmentCount: number;

  @ApiProperty({
    description: 'ID del precio de cuotas en Stripe',
    example: 'price_installment_1234567890',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeInstallmentPriceId: string | null;

  // ============================================
  // CARACTERÍSTICAS DEL PLAN
  // ============================================

  @ApiProperty({
    description: 'Lista de características incluidas en el plan',
    example: [
      'Representación Financiera Completa',
      'Custodia Segura de Instrucciones',
      'Ejecución Ilimitada',
      'Reportes Mensuales',
    ],
  })
  @Column({ type: 'jsonb', default: [] })
  features: string[];

  @ApiProperty({
    description: 'Características adicionales o beneficios destacados',
    example: {
      poaExecutions: 'unlimited',
      supportLevel: '24/7',
      documentsStorage: '5GB',
      familyMembers: 5,
    },
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  benefits: Record<string, any> | null;

  // ============================================
  // CONFIGURACIÓN DEL ANEXO DE CONTRATO
  // ============================================

  @ApiProperty({
    description: 'Identificador del anexo de contrato (A, B, C)',
    example: 'B',
  })
  @Column({ type: 'varchar', length: 10 })
  contractAnnex: string;

  @ApiProperty({
    description: 'ID de la plantilla en DocuSign para este plan',
    example: 'template_123456789',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  docusignTemplateId: string | null;

  // ============================================
  // CONFIGURACIÓN VISUAL
  // ============================================

  @ApiProperty({
    description: 'Si el plan debe destacarse como recomendado',
    example: true,
  })
  @Column({ type: 'boolean', default: false })
  isRecommended: boolean;

  @ApiProperty({
    description: 'Orden de visualización (menor número = primero)',
    example: 2,
  })
  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @ApiProperty({
    description: 'Color del badge o destacado del plan (hex)',
    example: '#3B82F6',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 20, nullable: true })
  badgeColor: string | null;

  @ApiProperty({
    description: 'Icono o imagen del plan',
    example: 'shield-check',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  // ============================================
  // MONEDA
  // ============================================

  @ApiProperty({
    description: 'Moneda de los precios',
    example: 'USD',
  })
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // ============================================
  // STRIPE PRODUCT
  // ============================================

  @ApiProperty({
    description: 'ID del producto en Stripe',
    example: 'prod_1234567890abcdef',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeProductId: string | null;

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
