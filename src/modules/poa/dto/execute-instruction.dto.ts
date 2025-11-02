import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
} from 'class-validator';
import { POAExecutionType } from '../entities/poa-execution.entity';

export class ExecuteInstructionDto {
  @ApiProperty({
    description: 'Tipo de ejecución',
    enum: POAExecutionType,
    example: POAExecutionType.BANK_TRANSACTION,
  })
  @IsEnum(POAExecutionType, { message: 'El tipo de ejecución debe ser válido' })
  executionType: POAExecutionType;

  @ApiProperty({
    description: 'Descripción detallada de la ejecución',
    example:
      'Transferencia de $5,000 desde cuenta XXXX1234 a beneficiaria María Pérez',
  })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Monto de la transacción (si aplica)',
    example: 5000.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({
    description: 'Destinatario de la ejecución',
    example: 'María Pérez (Beneficiaria)',
    required: false,
  })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiProperty({
    description: 'URLs de documentos de prueba/evidencia',
    example: [
      'https://s3.amazonaws.com/emigrantes-ft/executions/proof1.pdf',
      'https://s3.amazonaws.com/emigrantes-ft/executions/proof2.pdf',
    ],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  proofDocuments?: string[];

  @ApiProperty({
    description: 'Notas adicionales sobre la ejecución',
    example: 'Transferencia completada exitosamente. Confirmación bancaria recibida.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
