import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { CreatePoaDto } from './create-poa.dto';

// UpdatePoaDto allows updating all fields from CreatePoaDto (all optional)
// Can only be used when POA is in 'draft' status
export class UpdatePoaDto extends PartialType(
  OmitType(CreatePoaDto, [] as const),
) {
  @ApiProperty({
    description: 'Nota: Solo se puede actualizar un POA en estado "draft"',
    example: 'Este DTO solo funciona para POAs en borrador',
    required: false,
  })
  _note?: string;
}
