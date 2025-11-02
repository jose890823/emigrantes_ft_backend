import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class NotarizePoaDto {
  @ApiProperty({
    description: 'Notas sobre la notarización',
    example: 'POA notariado en Miami, FL el 2025-11-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  notarizationNotes?: string;
}
