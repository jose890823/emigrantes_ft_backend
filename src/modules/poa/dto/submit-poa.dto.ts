import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitPoaDto {
  @ApiProperty({
    description:
      'Notas finales del cliente antes de enviar a revisión (opcional)',
    example: 'He revisado toda la información y es correcta',
    required: false,
  })
  @IsOptional()
  @IsString()
  finalNotes?: string;
}
