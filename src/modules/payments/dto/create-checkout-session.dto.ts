import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { SubscriptionPlan, InitialPaymentType } from '../entities/subscription.entity';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'ID del usuario que inicia el checkout',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Tipo de plan seleccionado',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.STANDARD,
  })
  @IsNotEmpty()
  @IsEnum(SubscriptionPlan)
  planType: SubscriptionPlan;

  @ApiProperty({
    description: 'Tipo de pago inicial (único o fraccionado)',
    enum: InitialPaymentType,
    example: InitialPaymentType.SINGLE,
  })
  @IsNotEmpty()
  @IsEnum(InitialPaymentType)
  initialPaymentType: InitialPaymentType;

  @ApiProperty({
    description: 'URL a la que redirigir después de un pago exitoso',
    example: 'https://emigrantesft.com/checkout/success',
  })
  @IsNotEmpty()
  @IsString()
  successUrl: string;

  @ApiProperty({
    description: 'URL a la que redirigir si el usuario cancela',
    example: 'https://emigrantesft.com/checkout/cancel',
  })
  @IsNotEmpty()
  @IsString()
  cancelUrl: string;

  @ApiPropertyOptional({
    description: 'Metadata adicional para el checkout',
    example: { referralCode: 'ABC123' },
  })
  @IsOptional()
  metadata?: Record<string, string>;
}
