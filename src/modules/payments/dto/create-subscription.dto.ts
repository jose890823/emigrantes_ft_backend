import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import {
  SubscriptionPlan,
  InitialPaymentType,
  PaymentMethod,
} from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Tipo de plan',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.STANDARD,
  })
  @IsNotEmpty()
  @IsEnum(SubscriptionPlan)
  planType: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'ID del plan',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiProperty({
    description: 'Tipo de pago inicial',
    enum: InitialPaymentType,
    example: InitialPaymentType.SINGLE,
  })
  @IsNotEmpty()
  @IsEnum(InitialPaymentType)
  initialPaymentType: InitialPaymentType;

  @ApiPropertyOptional({
    description: 'Método de pago',
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
    default: PaymentMethod.STRIPE,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'ID del método de pago de Stripe',
    example: 'pm_1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  stripePaymentMethodId?: string;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
    example: 'Cliente referido por programa de afiliados',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Metadata adicional',
    example: { source: 'website', campaign: 'launch' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
