import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ThreadType } from '../entities/poa-thread.entity';

export class CreateThreadDto {
  @ApiProperty({
    description: 'Tipo de hilo de conversación',
    enum: ThreadType,
    example: ThreadType.GENERAL,
  })
  @IsEnum(ThreadType)
  type: ThreadType;

  @ApiProperty({
    description: 'Asunto del hilo',
    example: 'Documentos requeridos para el POA',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  subject: string;
}
