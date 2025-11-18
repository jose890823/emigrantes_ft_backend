import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PoaService } from './poa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePoaDto } from './dto/create-poa.dto';
import { UpdatePoaDto } from './dto/update-poa.dto';
import { SubmitPoaDto } from './dto/submit-poa.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreateMessageInThreadDto } from './dto/create-message-in-thread.dto';
import { POA } from './entities/poa.entity';
import { POAHistory } from './entities/poa-history.entity';
import { POAMessage, MessageSenderType } from './entities/poa-message.entity';
import { POAThread, ThreadCreatedBy } from './entities/poa-thread.entity';

@ApiTags('POA - Cliente')
@Controller('poa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PoaController {
  constructor(private readonly poaService: PoaService) {}

  // ============================================
  // CLIENT ENDPOINTS
  // ============================================

  @Post()
  @ApiOperation({
    summary: 'Crear nuevo POA',
    description:
      'Crea un nuevo Power of Attorney en estado "draft". El cliente puede editarlo antes de enviarlo a revisión.',
  })
  @ApiResponse({
    status: 201,
    description: 'POA creado exitosamente',
    type: POA,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createPoaDto: CreatePoaDto,
  ) {
    return this.poaService.create(userId, createPoaDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar mis POAs',
    description: 'Obtiene todos los POAs del cliente autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de POAs del cliente',
    type: [POA],
  })
  async findMy(@CurrentUser('id') userId: string) {
    return this.poaService.findByClient(userId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas del dashboard',
    description: 'Obtiene las estadísticas del cliente para el dashboard (POAs activos, documentos, pagos, notificaciones).',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del dashboard',
    schema: {
      example: {
        activePoas: 3,
        totalDocuments: 12,
        totalPayments: 0,
        unreadNotifications: 0,
      },
    },
  })
  async getStats(@CurrentUser('id') userId: string) {
    return this.poaService.getClientStats(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver POA específico',
    description:
      'Obtiene los detalles de un POA específico (solo si es el dueño).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'POA encontrado',
    type: POA,
  })
  @ApiResponse({
    status: 404,
    description: 'POA no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para ver este POA',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.poaService.findOne(id, userId, false);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar POA',
    description:
      'Actualiza un POA en estado "draft". Solo el dueño puede editarlo y solo si está en borrador.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'POA actualizado exitosamente',
    type: POA,
  })
  @ApiResponse({
    status: 400,
    description: 'Solo se pueden actualizar POAs en estado borrador',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para actualizar este POA',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() updatePoaDto: UpdatePoaDto,
  ) {
    return this.poaService.update(id, userId, updatePoaDto);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Enviar POA a revisión',
    description:
      'Envía el POA a revisión administrativa (draft → pending). Una vez enviado, no se puede editar.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'POA enviado a revisión exitosamente',
    type: POA,
  })
  @ApiResponse({
    status: 400,
    description: 'POA no está en estado borrador o faltan campos requeridos',
  })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() submitDto: SubmitPoaDto,
  ) {
    return this.poaService.submit(id, userId, submitDto);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar POA',
    description:
      'Cancela un POA. No se pueden cancelar POAs completados o ejecutados.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'POA cancelado exitosamente',
    type: POA,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede cancelar un POA completado o ejecutado',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.poaService.cancel(id, userId);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Ver historial del POA',
    description:
      'Obtiene el historial completo de cambios de estado y acciones del POA.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial del POA',
    type: [POAHistory],
  })
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    // First verify user has permission to view this POA
    await this.poaService.findOne(id, userId, false);
    return this.poaService.getHistory(id);
  }

  @Get(':id/executions')
  @ApiOperation({
    summary: 'Ver ejecuciones del POA',
    description:
      'Obtiene todas las instrucciones ejecutadas relacionadas a este POA.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Ejecuciones del POA',
  })
  async getExecutions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    // First verify user has permission to view this POA
    await this.poaService.findOne(id, userId, false);
    return this.poaService.getExecutions(id);
  }

  // ============================================
  // DOCUMENT ENDPOINTS
  // ============================================

  @Get(':id/documents')
  @ApiOperation({
    summary: 'Listar documentos del POA',
    description: 'Obtiene todos los documentos adjuntos a un POA (solo si es el dueño).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos',
  })
  async getDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    // First verify user has permission to view this POA
    await this.poaService.findOne(id, userId, false);
    return this.poaService.getDocuments(id);
  }

  @Post(':id/documents')
  @ApiOperation({
    summary: 'Subir documento al POA',
    description: 'Sube un nuevo documento adjunto al POA (solo si es el dueño).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Documento subido exitosamente',
  })
  async uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() uploadDto: any,
  ) {
    // First verify user has permission to modify this POA
    await this.poaService.findOne(id, userId, false);
    return this.poaService.uploadDocument(id, uploadDto);
  }

  @Get(':id/documents/:documentId/download')
  @ApiOperation({
    summary: 'Descargar documento del POA',
    description: 'Descarga un documento adjunto del POA (solo si es el dueño).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'documentId',
    description: 'ID del documento',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo del documento',
  })
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') userId: string,
  ) {
    // First verify user has permission to view this POA
    await this.poaService.findOne(id, userId, false);
    return this.poaService.getDocumentDownloadUrl(id, documentId);
  }

  @Delete(':id/documents/:documentId')
  @ApiOperation({
    summary: 'Eliminar documento del POA',
    description: 'Elimina un documento adjunto del POA (solo si es el dueño y el POA está en borrador).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'documentId',
    description: 'ID del documento',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento eliminado exitosamente',
  })
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') userId: string,
  ) {
    // First verify user has permission to modify this POA
    const poa = await this.poaService.findOne(id, userId, false);

    // Only allow deleting documents if POA is in draft status
    if (poa.status !== 'draft') {
      throw new Error('Solo se pueden eliminar documentos de POAs en borrador');
    }

    await this.poaService.deleteDocument(id, documentId);
    return { message: 'Documento eliminado exitosamente' };
  }

  // ============================================
  // MESSAGE ENDPOINTS
  // ============================================

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Enviar mensaje al admin',
    description:
      'Permite al cliente enviar un mensaje o consulta al admin sobre su POA.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Mensaje enviado exitosamente',
    type: POAMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'POA no encontrado',
  })
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') clientId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    // First verify user owns this POA
    await this.poaService.findOne(id, clientId, false);
    return this.poaService.createMessage(
      id,
      clientId,
      MessageSenderType.CLIENT,
      createMessageDto,
    );
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'Ver mensajes del POA',
    description:
      'Obtiene todos los mensajes (admin y cliente) de un POA específico.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de mensajes',
    type: [POAMessage],
  })
  async getPoaMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') clientId: string,
  ) {
    // First verify user owns this POA
    await this.poaService.findOne(id, clientId, false);
    return this.poaService.getMessages(id);
  }

  @Patch('messages/:messageId/read')
  @ApiOperation({
    summary: 'Marcar mensaje como leído',
    description: 'Marca un mensaje específico como leído por el cliente.',
  })
  @ApiParam({
    name: 'messageId',
    description: 'ID del mensaje',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje marcado como leído',
    type: POAMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Mensaje no encontrado',
  })
  async markClientMessageAsRead(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser('id') clientId: string,
  ) {
    return this.poaService.markMessageAsRead(messageId, clientId);
  }

  @Delete('messages/:messageId')
  @ApiOperation({
    summary: 'Eliminar mensaje no leído',
    description:
      'Elimina un mensaje que aún no ha sido leído. Solo el remitente puede eliminar sus propios mensajes.',
  })
  @ApiParam({
    name: 'messageId',
    description: 'ID del mensaje',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje eliminado exitosamente',
    schema: {
      example: { message: 'Mensaje eliminado exitosamente' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'El mensaje ya fue leído o no eres el remitente',
  })
  @ApiResponse({
    status: 404,
    description: 'Mensaje no encontrado',
  })
  async deleteClientMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser('id') clientId: string,
  ) {
    await this.poaService.deleteMessage(
      messageId,
      clientId,
      MessageSenderType.CLIENT,
    );
    return { message: 'Mensaje eliminado exitosamente' };
  }

  @Get('messages/unread-count')
  @ApiOperation({
    summary: 'Obtener cantidad de mensajes no leídos',
    description:
      'Obtiene el conteo de mensajes no leídos enviados por admins al cliente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conteo de mensajes no leídos',
    schema: {
      example: { unreadCount: 3 },
    },
  })
  async getClientUnreadCount(@CurrentUser('id') clientId: string) {
    const count = await this.poaService.getUnreadMessageCount(clientId, false);
    return { unreadCount: count };
  }

  // ============================================
  // THREAD ENDPOINTS
  // ============================================

  @Post(':id/threads')
  @ApiOperation({
    summary: 'Crear hilo de conversación',
    description:
      'Crea un nuevo hilo de conversación para el POA (General, Pregunta, Solicitud de Documento, etc.)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Hilo creado exitosamente',
    type: POAThread,
  })
  @ApiResponse({
    status: 404,
    description: 'POA no encontrado',
  })
  async createThread(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') clientId: string,
    @Body() createThreadDto: CreateThreadDto,
  ) {
    return this.poaService.createThread(
      id,
      clientId,
      ThreadCreatedBy.CLIENT,
      createThreadDto,
    );
  }

  @Get(':id/threads')
  @ApiOperation({
    summary: 'Listar hilos del POA',
    description: 'Obtiene todos los hilos de conversación de un POA.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de hilos',
    type: [POAThread],
  })
  async getThreads(@Param('id', ParseUUIDPipe) id: string) {
    return this.poaService.getThreads(id);
  }

  @Get('threads/:threadId')
  @ApiOperation({
    summary: 'Obtener hilo con mensajes',
    description: 'Obtiene un hilo específico con todos sus mensajes.',
  })
  @ApiParam({
    name: 'threadId',
    description: 'ID del hilo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Hilo con mensajes',
    type: POAThread,
  })
  @ApiResponse({
    status: 404,
    description: 'Hilo no encontrado',
  })
  async getThread(@Param('threadId', ParseUUIDPipe) threadId: string) {
    return this.poaService.getThreadById(threadId);
  }

  @Post('threads/:threadId/messages')
  @ApiOperation({
    summary: 'Enviar mensaje en hilo',
    description: 'Agrega un nuevo mensaje a un hilo existente.',
  })
  @ApiParam({
    name: 'threadId',
    description: 'ID del hilo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Mensaje creado exitosamente',
    type: POAMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'Hilo no encontrado',
  })
  async createMessageInThread(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser('id') clientId: string,
    @Body() createMessageDto: CreateMessageInThreadDto,
  ) {
    return this.poaService.createMessageInThread(
      threadId,
      clientId,
      MessageSenderType.CLIENT,
      createMessageDto,
    );
  }

  @Patch('threads/:threadId/read')
  @ApiOperation({
    summary: 'Marcar hilo como leído',
    description: 'Marca todos los mensajes no leídos del hilo como leídos.',
  })
  @ApiParam({
    name: 'threadId',
    description: 'ID del hilo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensajes marcados como leídos',
    schema: {
      example: { message: 'Mensajes marcados como leídos' },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Hilo no encontrado',
  })
  async markThreadAsRead(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser('id') clientId: string,
  ) {
    await this.poaService.markThreadAsRead(
      threadId,
      clientId,
      MessageSenderType.CLIENT,
    );
    return { message: 'Mensajes marcados como leídos' };
  }

  @Patch('threads/:threadId/close')
  @ApiOperation({
    summary: 'Cerrar hilo',
    description: 'Cierra un hilo de conversación.',
  })
  @ApiParam({
    name: 'threadId',
    description: 'ID del hilo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Hilo cerrado exitosamente',
    type: POAThread,
  })
  @ApiResponse({
    status: 404,
    description: 'Hilo no encontrado',
  })
  async closeThread(@Param('threadId', ParseUUIDPipe) threadId: string) {
    return this.poaService.closeThread(threadId);
  }

  @Patch('threads/:threadId/reopen')
  @ApiOperation({
    summary: 'Reabrir hilo',
    description: 'Reabre un hilo de conversación cerrado.',
  })
  @ApiParam({
    name: 'threadId',
    description: 'ID del hilo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Hilo reabierto exitosamente',
    type: POAThread,
  })
  @ApiResponse({
    status: 404,
    description: 'Hilo no encontrado',
  })
  async reopenThread(@Param('threadId', ParseUUIDPipe) threadId: string) {
    return this.poaService.reopenThread(threadId);
  }
}
