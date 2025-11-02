import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class RequestRefundDto {
  @ApiProperty({
    description: 'Razón del reembolso',
    example: 'Cliente no está satisfecho con el servicio',
  })
  @IsNotEmpty({ message: 'La razón del reembolso es obligatoria' })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Monto a reembolsar (opcional, si no se especifica se reembolsa el total)',
    example: 29.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount?: number;
}
