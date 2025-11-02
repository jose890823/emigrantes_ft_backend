import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApprovePoaDto {
  @ApiProperty({
    description: 'Notas del admin sobre la aprobación',
    example: 'Todos los documentos están en orden. POA aprobado.',
    required: false,
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
