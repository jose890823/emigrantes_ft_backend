import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageInThreadDto {
  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Por favor adjunta tu identificación oficial para continuar con el proceso.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
