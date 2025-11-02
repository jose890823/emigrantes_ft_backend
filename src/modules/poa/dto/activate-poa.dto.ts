import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ActivatePoaDto {
  @ApiProperty({
    description: 'Razón de la activación (evento que ocurrió)',
    example: 'deportation',
    enum: ['deportation', 'incapacity', 'absence', 'other'],
  })
  @IsNotEmpty({ message: 'La razón de activación es obligatoria' })
  @IsString()
  activationReason: string;

  @ApiProperty({
    description: 'Detalles adicionales sobre la activación',
    example:
      'Cliente deportado el 2025-11-05. Notificación recibida de autoridades.',
    required: false,
  })
  @IsOptional()
  @IsString()
  activationDetails?: string;
}
