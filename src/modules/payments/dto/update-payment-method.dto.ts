import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePaymentMethodDto {
  @ApiProperty({
    description: 'ID del nuevo método de pago de Stripe',
    example: 'pm_1234567890abcdef',
  })
  @IsNotEmpty({ message: 'El método de pago es obligatorio' })
  @IsString()
  paymentMethodId: string;
}
