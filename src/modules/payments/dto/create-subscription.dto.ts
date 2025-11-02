import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'ID del método de pago de Stripe (Payment Method ID)',
    example: 'pm_1234567890abcdef',
  })
  @IsNotEmpty({ message: 'El método de pago es obligatorio' })
  @IsString()
  paymentMethodId: string;

  @ApiProperty({
    description: 'Notas adicionales sobre la suscripción',
    example: 'Suscripción durante promoción de lanzamiento',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
