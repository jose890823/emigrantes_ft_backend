import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { POADocumentType } from '../entities/poa-document.entity';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Tipo de documento',
    enum: POADocumentType,
    example: POADocumentType.IDENTIFICATION,
  })
  @IsEnum(POADocumentType, { message: 'Tipo de documento inválido' })
  type: POADocumentType;

  @ApiProperty({
    description: 'Descripción opcional del documento',
    example: 'Cédula de identidad vigente',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Archivo en base64',
    example: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
  })
  @IsNotEmpty({ message: 'El archivo es obligatorio' })
  @IsString()
  fileBase64: string;

  @ApiProperty({
    description: 'Nombre del archivo',
    example: 'cedula.pdf',
  })
  @IsNotEmpty({ message: 'El nombre del archivo es obligatorio' })
  @IsString()
  fileName: string;
}
