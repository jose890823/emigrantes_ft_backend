import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { PlanType, PlanStatus } from '../entities/plan.entity';

export class CreatePlanDto {
  @ApiProperty({
    description: 'Tipo de plan',
    enum: PlanType,
    example: PlanType.STANDARD,
  })
  @IsNotEmpty()
  @IsEnum(PlanType)
  type: PlanType;

  @ApiProperty({
    description: 'Nombre del plan para mostrar',
    example: 'Plan Estándar',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Descripción del plan',
    example: 'Plan ideal para familias que buscan protección completa',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Estado del plan',
    enum: PlanStatus,
    example: PlanStatus.ACTIVE,
    default: PlanStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  // ============================================
  // PRECIOS
  // ============================================

  @ApiProperty({
    description: 'Precio mensual de la suscripción en USD',
    example: 24.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @ApiProperty({
    description: 'Pago inicial único en USD',
    example: 199.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  initialPayment: number;

  @ApiProperty({
    description: 'Monto de cada cuota del pago inicial fraccionado en USD',
    example: 66.33,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  installmentAmount: number;

  @ApiPropertyOptional({
    description: 'Número de cuotas del pago inicial',
    example: 3,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  installmentCount?: number;

  // ============================================
  // CARACTERÍSTICAS
  // ============================================

  @ApiProperty({
    description: 'Lista de características incluidas en el plan',
    example: [
      'Representación Financiera Completa',
      'Custodia Segura de Instrucciones',
      'Ejecución Ilimitada',
    ],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiPropertyOptional({
    description: 'Características adicionales o beneficios destacados',
    example: {
      poaExecutions: 'unlimited',
      supportLevel: '24/7',
      documentsStorage: '5GB',
    },
  })
  @IsOptional()
  benefits?: Record<string, any>;

  // ============================================
  // CONTRATO
  // ============================================

  @ApiProperty({
    description: 'Identificador del anexo de contrato (A, B, C)',
    example: 'B',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  contractAnnex: string;

  @ApiPropertyOptional({
    description: 'ID de la plantilla en DocuSign para este plan',
    example: 'template_123456789',
  })
  @IsOptional()
  @IsString()
  docusignTemplateId?: string;

  // ============================================
  // VISUALIZACIÓN
  // ============================================

  @ApiPropertyOptional({
    description: 'Si el plan debe destacarse como recomendado',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecommended?: boolean;

  @ApiPropertyOptional({
    description: 'Orden de visualización (menor número = primero)',
    example: 2,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Color del badge o destacado del plan (hex)',
    example: '#3B82F6',
  })
  @IsOptional()
  @IsString()
  badgeColor?: string;

  @ApiPropertyOptional({
    description: 'Icono o imagen del plan',
    example: 'shield-check',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  // ============================================
  // STRIPE
  // ============================================

  @ApiPropertyOptional({
    description: 'ID del producto en Stripe',
    example: 'prod_1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  stripeProductId?: string;

  @ApiPropertyOptional({
    description: 'ID del precio mensual en Stripe',
    example: 'price_1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  stripeMonthlyPriceId?: string;

  @ApiPropertyOptional({
    description: 'ID del precio inicial en Stripe',
    example: 'price_initial_1234567890',
  })
  @IsOptional()
  @IsString()
  stripeInitialPriceId?: string;

  @ApiPropertyOptional({
    description: 'ID del precio de cuotas en Stripe',
    example: 'price_installment_1234567890',
  })
  @IsOptional()
  @IsString()
  stripeInstallmentPriceId?: string;
}
