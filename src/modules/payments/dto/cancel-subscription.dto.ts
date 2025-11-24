import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiProperty({
    description: 'Razón de la cancelación',
    example: 'Ya no necesito el servicio',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Cancelar al final del período actual (true) o inmediatamente (false)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional({
    description: 'Comentarios adicionales del usuario',
    example: 'Volveré cuando mejore mi situación económica',
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}
