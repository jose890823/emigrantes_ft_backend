import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class RejectPoaDto {
  @ApiProperty({
    description: 'Razón del rechazo del POA',
    example: 'Documentos de identificación no válidos o expirados',
  })
  @IsNotEmpty({ message: 'La razón del rechazo es obligatoria' })
  @IsString()
  rejectionReason: string;

  @ApiProperty({
    description: 'Notas adicionales del admin',
    example: 'Cliente debe subir documentos actualizados',
    required: false,
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
