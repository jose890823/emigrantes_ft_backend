import { ApiProperty } from '@nestjs/swagger';

export class StandardResponseDto<T = any> {
  @ApiProperty({
    example: true,
    description: 'Indica si la operación fue exitosa',
  })
  success: boolean;

  @ApiProperty({ description: 'Datos de la respuesta', required: false })
  data?: T;

  @ApiProperty({
    example: 'Operación realizada exitosamente',
    description: 'Mensaje descriptivo',
  })
  message: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Timestamp de la respuesta',
  })
  timestamp: string;

  @ApiProperty({ example: '/api/users', description: 'Ruta de la petición' })
  path: string;
}

export class ErrorDetailsDto {
  @ApiProperty({ example: 'VALIDATION_ERROR', description: 'Código del error' })
  code: string;

  @ApiProperty({
    example: 'Los datos proporcionados no son válidos',
    description: 'Mensaje del error',
  })
  message: string;

  @ApiProperty({
    description: 'Detalles adicionales del error',
    required: false,
  })
  details?: any;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false, description: 'Indica que la operación falló' })
  success: boolean;

  @ApiProperty({ type: ErrorDetailsDto, description: 'Detalles del error' })
  error: ErrorDetailsDto;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Timestamp de la respuesta',
  })
  timestamp: string;

  @ApiProperty({ example: '/api/users', description: 'Ruta de la petición' })
  path: string;
}
