import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PoaService } from './poa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { AssignAdminDto } from './dto/assign-admin.dto';
import { ApprovePoaDto } from './dto/approve-poa.dto';
import { RejectPoaDto } from './dto/reject-poa.dto';
import { NotarizePoaDto } from './dto/notarize-poa.dto';
import { ActivatePoaDto } from './dto/activate-poa.dto';
import { ExecuteInstructionDto } from './dto/execute-instruction.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreateMessageInThreadDto } from './dto/create-message-in-thread.dto';
import { POA, POAStatus } from './entities/poa.entity';
import { POAExecution } from './entities/poa-execution.entity';
import { POAMessage, MessageSenderType } from './entities/poa-message.entity';
import { POAThread, ThreadCreatedBy } from './entities/poa-thread.entity';

@ApiTags('POA - Admin')
@Controller('poa/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class PoaAdminController {
  constructor(private readonly poaService: PoaService) {}

  // ============================================
  // ADMIN ENDPOINTS - POA MANAGEMENT
  // ============================================

  @Get('all')
  @ApiOperation({
    summary: 'Listar todos los POAs (Admin)',
    description:
      'Obtiene todos los POAs del sistema. Se puede filtrar por estado.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: POAStatus,
    description: 'Filtrar por estado del POA',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los POAs',
    type: [POA],
  })
  async findAll(@Query('status') status?: POAStatus) {
    return this.poaService.findAll(status);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas generales de POAs',
    description: 'Obtiene estadísticas y métricas generales del sistema de POA',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas generales',
  })
  async getStats() {
    return this.poaService.getStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver POA específico (Admin)',
    description:
      'Obtiene los detalles completos de cualquier POA (acceso administrativo).',
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
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.poaService.findOne(id, adminId, true);
  }

  @Post(':id/assign')
  @ApiOperation({
    summary: 'Asignar admin/gestor a POA',
    description: 'Asigna un administrador o gestor específico a un POA.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin asignado exitosamente',
    type: POA,
  })
  @ApiResponse({
    status: 404,
    description: 'POA no encontrado',
  })
  async assignAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() assignDto: AssignAdminDto,
  ) {
    return this.poaService.assignAdmin(id, adminId, assignDto);
  }

  @Post(':id/review')
  @ApiOperation({
    summary: 'Marcar POA como en revisión',
    description:
      'Cambia el estado del POA de "pending" a "in_review". Indica que un admin comenzó la revisión.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'POA marcado como en revisión',
    type: POA,
  })
  @ApiResponse({
    status: 400,
    description: 'POA no está en estado pendiente',
  })
  async markInReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.poaService.markInReview(id, adminId);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Aprobar POA',
    description:
      'Aprueba un POA que está pendiente o en revisión (pending/in_review → approved). El cliente será notificado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'POA aprobado exitosamente',
    type: POA,
  })
  @ApiResponse({
    status: 400,
    description: 'POA no está en estado pendiente o en revisión',
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() approveDto: ApprovePoaDto,
  ) {
    return this.poaService.approve(id, adminId, approveDto);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Rechazar POA',
    description:
      'Rechaza un POA que está pendiente o en revisión (pending/in_review → rejected). Debe incluir razón del rechazo.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'POA rechazado',
    type: POA,
  })
  @ApiResponse({
    status: 400,
    description: 'POA no está en estado de revisión',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() rejectDto: RejectPoaDto,
  ) {
    return this.poaService.reject(id, adminId, rejectDto);
  }

  @Post(':id/notarize')
  @ApiOperation({
    summary: 'Marcar POA como notariado',
    description:
      'Marca un POA aprobado como notariado (approved → notarized). Indica que se completó el proceso de notarización legal.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'POA notariado exitosamente',
    type: POA,
  })
  @ApiResponse({
    status: 400,
    description: 'POA no está aprobado',
  })
  async notarize(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() notarizeDto: NotarizePoaDto,
  ) {
    return this.poaService.notarize(id, adminId, notarizeDto);
  }

  @Post(':id/activate')
  @ApiOperation({
    summary: 'Activar POA',
    description:
      'Activa un POA notariado (notarized → activated). Se activa cuando ocurre un evento trigger (deportación, incapacidad, etc.).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'POA activado exitosamente',
    type: POA,
  })
  @ApiResponse({
    status: 400,
    description: 'POA no está notariado',
  })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() activateDto: ActivatePoaDto,
  ) {
    return this.poaService.activate(id, adminId, activateDto);
  }

  @Post(':id/execute')
  @ApiOperation({
    summary: 'Ejecutar instrucción del POA',
    description:
      'Registra la ejecución de una instrucción del POA activado. Cambia estado a "executed" en la primera ejecución.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Instrucción ejecutada exitosamente',
    type: POAExecution,
  })
  @ApiResponse({
    status: 400,
    description: 'POA no está activado',
  })
  async executeInstruction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() executeDto: ExecuteInstructionDto,
  ) {
    return this.poaService.executeInstruction(id, adminId, executeDto);
  }

  @Get(':id/executions')
  @ApiOperation({
    summary: 'Ver todas las ejecuciones del POA (Admin)',
    description: 'Obtiene el historial completo de ejecuciones de un POA.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ejecuciones',
    type: [POAExecution],
  })
  async getExecutions(@Param('id', ParseUUIDPipe) id: string) {
    return this.poaService.getExecutions(id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Ver historial completo del POA (Admin)',
    description:
      'Obtiene el rastro de auditoría completo del POA con todos los cambios de estado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial del POA',
  })
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.poaService.getHistory(id);
  }

  @Get(':id/audit-trail')
  @ApiOperation({
    summary: 'Generar reporte de auditoría completo',
    description:
      'Genera un reporte completo de auditoría del POA incluyendo historial, ejecuciones y documentos.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de auditoría completo',
  })
  async getAuditTrail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const [poa, history, executions] = await Promise.all([
      this.poaService.findOne(id, adminId, true),
      this.poaService.getHistory(id),
      this.poaService.getExecutions(id),
    ]);

    return {
      poa,
      history,
      executions,
      generatedAt: new Date().toISOString(),
      generatedBy: adminId,
    };
  }

  // ============================================
  // DOCUMENT ENDPOINTS
  // ============================================

  @Get(':id/documents')
  @ApiOperation({
    summary: 'Listar documentos del POA (Admin)',
    description: 'Obtiene todos los documentos adjuntos a un POA.',
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
  async getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.poaService.getDocuments(id);
  }

  @Post(':id/documents')
  @ApiOperation({
    summary: 'Subir documento al POA (Admin)',
    description: 'Sube un nuevo documento adjunto al POA.',
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
    @Body() uploadDto: any,
  ) {
    return this.poaService.uploadDocument(id, uploadDto);
  }

  @Delete(':id/documents/:documentId')
  @ApiOperation({
    summary: 'Eliminar documento del POA (Admin)',
    description: 'Elimina un documento adjunto del POA.',
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
  ) {
    await this.poaService.deleteDocument(id, documentId);
    return { message: 'Documento eliminado exitosamente' };
  }

  // ============================================
  // MESSAGE ENDPOINTS
  // ============================================

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Crear mensaje para el cliente',
    description:
      'Permite al admin enviar un mensaje al cliente sobre el POA (solicitud de documentos, actualización de estado, etc.)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Mensaje creado exitosamente',
    type: POAMessage,
  })
  @ApiResponse({
    status: 404,
    description: 'POA no encontrado',
  })
  async createMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.poaService.createMessage(
      id,
      adminId,
      MessageSenderType.ADMIN,
      createMessageDto,
    );
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'Listar mensajes del POA',
    description: 'Obtiene todos los mensajes (admin y cliente) de un POA.',
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
  async getMessages(@Param('id', ParseUUIDPipe) id: string) {
    return this.poaService.getMessages(id);
  }

  @Patch('messages/:messageId/read')
  @ApiOperation({
    summary: 'Marcar mensaje como leído',
    description: 'Marca un mensaje específico como leído por el admin.',
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
  async markMessageAsRead(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.poaService.markMessageAsRead(messageId, adminId);
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
  async deleteMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser('id') adminId: string,
  ) {
    await this.poaService.deleteMessage(
      messageId,
      adminId,
      MessageSenderType.ADMIN,
    );
    return { message: 'Mensaje eliminado exitosamente' };
  }

  @Get('messages/unread-count')
  @ApiOperation({
    summary: 'Obtener cantidad de mensajes no leídos',
    description:
      'Obtiene el conteo de mensajes no leídos enviados por clientes (para admin).',
  })
  @ApiResponse({
    status: 200,
    description: 'Conteo de mensajes no leídos',
    schema: {
      example: { unreadCount: 5 },
    },
  })
  async getUnreadCount(@CurrentUser('id') adminId: string) {
    const count = await this.poaService.getUnreadMessageCount(adminId, true);
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
    @CurrentUser('id') adminId: string,
    @Body() createThreadDto: CreateThreadDto,
  ) {
    return this.poaService.createThread(
      id,
      adminId,
      ThreadCreatedBy.ADMIN,
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
    @CurrentUser('id') adminId: string,
    @Body() createMessageDto: CreateMessageInThreadDto,
  ) {
    return this.poaService.createMessageInThread(
      threadId,
      adminId,
      MessageSenderType.ADMIN,
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
    @CurrentUser('id') adminId: string,
  ) {
    await this.poaService.markThreadAsRead(
      threadId,
      adminId,
      MessageSenderType.ADMIN,
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
