import { ApiProperty } from '@nestjs/swagger';
import { ThreadType, ThreadStatus, ThreadCreatedBy } from '../entities/poa-thread.entity';

export class ThreadMessagePreviewDto {
  @ApiProperty({
    description: 'ID del mensaje',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Contenido del mensaje (preview)',
    example: 'Por favor adjunta tu identificación oficial...',
  })
  message: string;

  @ApiProperty({
    description: 'Tipo de remitente',
    example: 'admin',
  })
  senderType: string;

  @ApiProperty({
    description: 'Nombre del remitente',
    example: 'Juan Pérez',
  })
  senderName: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-11-17T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Indica si el mensaje ha sido leído',
    example: false,
  })
  isRead: boolean;
}

export class ThreadResponseDto {
  @ApiProperty({
    description: 'ID del hilo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  poaId: string;

  @ApiProperty({
    description: 'Tipo de hilo',
    enum: ThreadType,
    example: ThreadType.GENERAL,
  })
  type: ThreadType;

  @ApiProperty({
    description: 'Asunto del hilo',
    example: 'Documentos requeridos',
  })
  subject: string;

  @ApiProperty({
    description: 'Estado del hilo',
    enum: ThreadStatus,
    example: ThreadStatus.OPEN,
  })
  status: ThreadStatus;

  @ApiProperty({
    description: 'Tipo de creador del hilo',
    enum: ThreadCreatedBy,
    example: ThreadCreatedBy.ADMIN,
  })
  createdByType: ThreadCreatedBy;

  @ApiProperty({
    description: 'Nombre del creador',
    example: 'Juan Pérez',
  })
  createdByName: string;

  @ApiProperty({
    description: 'Fecha del último mensaje',
    example: '2025-11-17T10:30:00Z',
    nullable: true,
  })
  lastMessageAt: Date | null;

  @ApiProperty({
    description: 'Cantidad total de mensajes',
    example: 5,
  })
  messageCount: number;

  @ApiProperty({
    description: 'Cantidad de mensajes no leídos',
    example: 2,
  })
  unreadCount: number;

  @ApiProperty({
    description: 'Preview del último mensaje',
    type: ThreadMessagePreviewDto,
    nullable: true,
  })
  lastMessage?: ThreadMessagePreviewDto;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-11-17T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de actualización',
    example: '2025-11-17T10:30:00Z',
  })
  updatedAt: Date;
}
