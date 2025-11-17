import {
  Controller,
  Get,
  Post,
  Put,
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
import { POA } from './entities/poa.entity';
import { POAHistory } from './entities/poa-history.entity';

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
}
