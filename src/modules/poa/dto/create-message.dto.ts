import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ThreadType } from '../entities/poa-thread.entity';

/**
 * @deprecated Use CreateThreadDto + CreateMessageInThreadDto instead
 * This DTO is kept for backward compatibility
 */
export class CreateMessageDto {
  @ApiProperty({
    description: 'Tipo de mensaje (ahora tipo de hilo)',
    enum: ThreadType,
    example: ThreadType.GENERAL,
  })
  @IsEnum(ThreadType)
  type: ThreadType;

  @ApiProperty({
    description: 'Asunto del mensaje (ahora asunto del hilo)',
    example: 'Documentos requeridos',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  subject: string;

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Por favor adjunta tu identificación oficial para continuar con el proceso.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
