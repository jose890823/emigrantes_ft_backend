import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiProperty({
    description: 'Razón de la cancelación',
    example: 'Ya no necesito el servicio',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description:
      'Si es true, cancela al final del período de facturación actual. Si es false, cancela inmediatamente.',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;
}
