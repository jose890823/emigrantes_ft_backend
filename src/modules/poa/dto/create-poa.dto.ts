import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import { POAType } from '../entities/poa.entity';

export class CreatePoaDto {
  @ApiProperty({
    description: 'Tipo de POA',
    enum: POAType,
    example: POAType.DURABLE,
  })
  @IsEnum(POAType, { message: 'El tipo de POA debe ser válido' })
  type: POAType;

  @ApiProperty({
    description: 'Nombre completo del cliente',
    example: 'Juan Carlos Pérez González',
  })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  @IsString()
  @MaxLength(255)
  clientFullName: string;

  @ApiProperty({
    description: 'Dirección completa del cliente',
    example: '123 Main St, Miami, FL 33166, USA',
  })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @IsString()
  clientAddress: string;

  @ApiProperty({
    description: 'Número de identificación del cliente',
    example: 'V-12345678',
  })
  @IsNotEmpty({ message: 'El número de identificación es obligatorio' })
  @IsString()
  @MaxLength(50)
  clientIdentification: string;

  @ApiProperty({
    description: 'Instrucciones confidenciales del POA (serán encriptadas)',
    example: {
      accounts: ['Bank of America - XXXX1234', 'Chase - XXXX5678'],
      actions: [
        'Transferir fondos a beneficiarios en caso de deportación',
        'Pagar facturas pendientes',
      ],
    },
    required: false,
  })
  @IsOptional()
  instructions?: Record<string, any>;

  @ApiProperty({
    description: 'Lista de beneficiarios (será encriptada)',
    example: [
      { name: 'María Pérez', relationship: 'spouse', percentage: 50 },
      { name: 'Juan Pérez Jr.', relationship: 'son', percentage: 50 },
    ],
    type: [Object],
    required: false,
  })
  @IsOptional()
  @IsArray()
  beneficiaries?: Record<string, any>[];

  @ApiProperty({
    description: 'Triggers de activación del POA',
    example: ['deportation', 'incapacity', 'absence'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activationTriggers?: string[];

  @ApiProperty({
    description: 'Notas adicionales del cliente',
    example: 'Por favor contactar a mi hermano en caso de emergencia',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientNotes?: string;
}
