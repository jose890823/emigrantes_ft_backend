import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignAdminDto {
  @ApiProperty({
    description: 'ID del admin/gestor a asignar al POA',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsNotEmpty({ message: 'El ID del admin es obligatorio' })
  @IsUUID('4', { message: 'El ID del admin debe ser un UUID válido' })
  adminId: string;
}
