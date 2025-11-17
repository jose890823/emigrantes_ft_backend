import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MessageType } from '../entities/poa-message.entity';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Tipo de mensaje',
    enum: MessageType,
    example: MessageType.GENERAL,
  })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({
    description: 'Asunto del mensaje',
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
