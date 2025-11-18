import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { POA, POAStatus, POAType } from './entities/poa.entity';
import { POAHistory } from './entities/poa-history.entity';
import {
  POAExecution,
  POAExecutionStatus,
} from './entities/poa-execution.entity';
import { POADocument } from './entities/poa-document.entity';
import { POAMessage, MessageSenderType } from './entities/poa-message.entity';
import { POAThread, ThreadCreatedBy } from './entities/poa-thread.entity';
import { EncryptionService } from '../../shared/encryption.service';
import { CreatePoaDto } from './dto/create-poa.dto';
import { UpdatePoaDto } from './dto/update-poa.dto';
import { SubmitPoaDto } from './dto/submit-poa.dto';
import { AssignAdminDto } from './dto/assign-admin.dto';
import { ApprovePoaDto } from './dto/approve-poa.dto';
import { RejectPoaDto } from './dto/reject-poa.dto';
import { NotarizePoaDto } from './dto/notarize-poa.dto';
import { ActivatePoaDto } from './dto/activate-poa.dto';
import { ExecuteInstructionDto } from './dto/execute-instruction.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreateMessageInThreadDto } from './dto/create-message-in-thread.dto';

@Injectable()
export class PoaService {
  private readonly logger = new Logger(PoaService.name);

  constructor(
    @InjectRepository(POA)
    private poaRepository: Repository<POA>,
    @InjectRepository(POAHistory)
    private historyRepository: Repository<POAHistory>,
    @InjectRepository(POAExecution)
    private executionRepository: Repository<POAExecution>,
    @InjectRepository(POADocument)
    private documentRepository: Repository<POADocument>,
    @InjectRepository(POAMessage)
    private messageRepository: Repository<POAMessage>,
    @InjectRepository(POAThread)
    private threadRepository: Repository<POAThread>,
    private encryptionService: EncryptionService,
  ) {}

  // ============================================
  // CLIENT METHODS - POA CRUD
  // ============================================

  /**
   * Create a new POA (status: draft)
   * Client-facing method
   */
  async create(clientId: string, createPoaDto: CreatePoaDto): Promise<POA> {
    this.logger.log(`Creating new POA for client ${clientId}`);

    // Helper function to check if object/array has real data
    const hasData = (value: any): boolean => {
      if (!value) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') {
        return Object.values(value).some((v) => {
          if (Array.isArray(v)) return v.length > 0;
          return v != null && v !== '';
        });
      }
      return true;
    };

    // Encrypt sensitive data only if they contain real data
    const encryptedInstructions =
      createPoaDto.instructions && hasData(createPoaDto.instructions)
        ? this.encryptionService.encryptObject(createPoaDto.instructions)
        : null;

    const encryptedBeneficiaries =
      createPoaDto.beneficiaries && hasData(createPoaDto.beneficiaries)
        ? this.encryptionService.encryptObject(createPoaDto.beneficiaries)
        : null;

    const encryptedIdentification = this.encryptionService.encrypt(
      createPoaDto.clientIdentification,
    );

    // Create POA
    const poa = this.poaRepository.create({
      clientId,
      type: createPoaDto.type,
      status: POAStatus.DRAFT,
      clientFullName: createPoaDto.clientFullName,
      clientAddress: createPoaDto.clientAddress,
      clientIdentification: encryptedIdentification,
      instructions: encryptedInstructions,
      beneficiaries: encryptedBeneficiaries,
      activationTriggers: createPoaDto.activationTriggers || [],
      clientNotes: createPoaDto.clientNotes || null,
    });

    const savedPoa = await this.poaRepository.save(poa);

    // Create history record
    await this.createHistoryRecord(
      savedPoa.id,
      clientId,
      null,
      POAStatus.DRAFT,
      'created',
      'POA creado en estado borrador',
    );

    this.logger.log(`POA ${savedPoa.id} created successfully`);
    return savedPoa;
  }

  /**
   * Find all POAs for a specific client
   */
  async findByClient(clientId: string): Promise<POA[]> {
    return this.poaRepository.find({
      where: { clientId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find one POA by ID (with permission check)
   */
  async findOne(id: string, userId: string, isAdmin = false): Promise<POA> {
    const poa = await this.poaRepository.findOne({
      where: { id },
      relations: ['client', 'assignedAdmin'],
    });

    if (!poa) {
      throw new NotFoundException(`POA con ID ${id} no encontrado`);
    }

    // Permission check: only owner or assigned admin can view
    if (!isAdmin && poa.clientId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este POA');
    }

    // Decrypt sensitive data before returning (if user has permission)
    return this.decryptPoaData(poa);
  }

  /**
   * Update a POA (only in draft status)
   */
  async update(
    id: string,
    clientId: string,
    updatePoaDto: UpdatePoaDto,
  ): Promise<POA> {
    const poa = await this.findOne(id, clientId);

    // Can only update if in draft status
    if (poa.status !== POAStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden actualizar POAs en estado borrador',
      );
    }

    // Update fields
    if (updatePoaDto.type) poa.type = updatePoaDto.type;
    if (updatePoaDto.clientFullName)
      poa.clientFullName = updatePoaDto.clientFullName;
    if (updatePoaDto.clientAddress)
      poa.clientAddress = updatePoaDto.clientAddress;

    if (updatePoaDto.clientIdentification) {
      poa.clientIdentification = this.encryptionService.encrypt(
        updatePoaDto.clientIdentification,
      );
    }

    // Helper function to check if object/array has real data
    const hasData = (value: any): boolean => {
      if (!value) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') {
        return Object.values(value).some((v) => {
          if (Array.isArray(v)) return v.length > 0;
          return v != null && v !== '';
        });
      }
      return true;
    };

    if (updatePoaDto.instructions !== undefined) {
      poa.instructions =
        updatePoaDto.instructions && hasData(updatePoaDto.instructions)
          ? this.encryptionService.encryptObject(updatePoaDto.instructions)
          : null;
    }

    if (updatePoaDto.beneficiaries !== undefined) {
      poa.beneficiaries =
        updatePoaDto.beneficiaries && hasData(updatePoaDto.beneficiaries)
          ? this.encryptionService.encryptObject(updatePoaDto.beneficiaries)
          : null;
    }

    if (updatePoaDto.activationTriggers) {
      poa.activationTriggers = updatePoaDto.activationTriggers;
    }

    if (updatePoaDto.clientNotes !== undefined) {
      poa.clientNotes = updatePoaDto.clientNotes;
    }

    const updated = await this.poaRepository.save(poa);

    // Create history record
    await this.createHistoryRecord(
      poa.id,
      clientId,
      POAStatus.DRAFT,
      POAStatus.DRAFT,
      'updated',
      'POA actualizado por el cliente',
    );

    this.logger.log(`POA ${id} updated successfully`);
    return this.decryptPoaData(updated);
  }

  /**
   * Submit POA for review (draft → pending)
   */
  async submit(
    id: string,
    clientId: string,
    submitDto: SubmitPoaDto,
  ): Promise<POA> {
    const poa = await this.findOne(id, clientId);

    // Can only submit if in draft status
    if (poa.status !== POAStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden enviar POAs en estado borrador',
      );
    }

    // Validate required fields
    this.validatePoaForSubmission(poa);

    // Update status
    poa.status = POAStatus.PENDING;
    poa.submittedAt = new Date();

    if (submitDto.finalNotes) {
      poa.clientNotes = submitDto.finalNotes;
    }

    const updated = await this.poaRepository.save(poa);

    // Create history record
    await this.createHistoryRecord(
      poa.id,
      clientId,
      POAStatus.DRAFT,
      POAStatus.PENDING,
      'submitted',
      'POA enviado a revisión por el cliente',
    );

    this.logger.log(`POA ${id} submitted for review`);
    return this.decryptPoaData(updated);
  }

  /**
   * Cancel a POA
   */
  async cancel(id: string, clientId: string): Promise<POA> {
    const poa = await this.findOne(id, clientId);

    // Can only cancel if not completed or executed
    if ([POAStatus.COMPLETED, POAStatus.EXECUTED].includes(poa.status)) {
      throw new BadRequestException(
        'No se puede cancelar un POA completado o ejecutado',
      );
    }

    const previousStatus = poa.status;
    poa.status = POAStatus.CANCELLED;

    const updated = await this.poaRepository.save(poa);

    // Create history record
    await this.createHistoryRecord(
      poa.id,
      clientId,
      previousStatus,
      POAStatus.CANCELLED,
      'cancelled',
      'POA cancelado por el cliente',
    );

    this.logger.log(`POA ${id} cancelled`);
    return this.decryptPoaData(updated);
  }

  // ============================================
  // ADMIN METHODS - POA MANAGEMENT
  // ============================================

  /**
   * Find all POAs (admin only)
   */
  async findAll(status?: POAStatus): Promise<POA[]> {
    const where = status ? { status } : {};
    return this.poaRepository.find({
      where,
      relations: ['client', 'assignedAdmin'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Assign admin to POA
   */
  async assignAdmin(
    id: string,
    adminId: string,
    assignDto: AssignAdminDto,
  ): Promise<POA> {
    const poa = await this.poaRepository.findOne({ where: { id } });

    if (!poa) {
      throw new NotFoundException(`POA con ID ${id} no encontrado`);
    }

    poa.assignedAdminId = assignDto.adminId;

    const updated = await this.poaRepository.save(poa);

    // Create history record
    await this.createHistoryRecord(
      poa.id,
      adminId,
      poa.status,
      poa.status,
      'assigned',
      `Admin ${assignDto.adminId} asignado al POA`,
    );

    this.logger.log(`Admin ${assignDto.adminId} assigned to POA ${id}`);
    return updated;
  }

  /**
   * Mark POA as in review (pending → in_review)
   */
  async markInReview(id: string, adminId: string): Promise<POA> {
    const poa = await this.poaRepository.findOne({ where: { id } });

    if (!poa) {
      throw new NotFoundException(`POA con ID ${id} no encontrado`);
    }

    if (poa.status !== POAStatus.PENDING) {
      throw new BadRequestException(
        'Solo se pueden revisar POAs en estado pendiente',
      );
    }

    poa.status = POAStatus.IN_REVIEW;
    poa.reviewedAt = new Date();

    const updated = await this.poaRepository.save(poa);

    // Create history record
    await this.createHistoryRecord(
      poa.id,
      adminId,
      POAStatus.PENDING,
      POAStatus.IN_REVIEW,
      'reviewed',
      'POA en proceso de revisión',
    );

    this.logger.log(`POA ${id} marked as in review`);
    return updated;
  }

  /**
   * Approve POA (in_review → approved)
   */
  async approve(
    id: string,
    adminId: string,
    approveDto: ApprovePoaDto,
  ): Promise<POA> {
    const poa = await this.poaRepository.findOne({ where: { id } });

    if (!poa) {
      throw new NotFoundException(`POA con ID ${id} no encontrado`);
    }

    if (
      poa.status !== POAStatus.IN_REVIEW &&
      poa.status !== POAStatus.PENDING
    ) {
      throw new BadRequestException(
        'Solo se pueden aprobar POAs en estado pendiente o en revisión',
      );
    }

    const previousStatus = poa.status;
    poa.status = POAStatus.APPROVED;
    poa.approvedAt = new Date();

    if (approveDto.adminNotes) {
      poa.adminNotes = approveDto.adminNotes;
    }

    const updated = await this.poaRepository.save(poa);

    // Create history record
    await this.createHistoryRecord(
      poa.id,
      adminId,
      previousStatus,
      POAStatus.APPROVED,
      'approved',
      'POA aprobado por el administrador',
    );

    this.logger.log(`POA ${id} approved`);
    return updated;
  }

  /**
   * Reject POA (in_review → rejected)
   */
  async reject(
    id: string,
    adminId: string,
    rejectDto: RejectPoaDto,
  ): Promise<POA> {
    const poa = await this.poaRepository.findOne({ where: { id } });

    if (!poa) {
      throw new NotFoundException(`POA con ID ${id} no encontrado`);
    }

    if (
      poa.status !== POAStatus.IN_REVIEW &&
      poa.status !== POAStatus.PENDING
    ) {
      throw new BadRequestException(
        'Solo se pueden rechazar POAs en estado pendiente o en revisión',
      );
    }

    const previousStatus = poa.status;
    poa.status = POAStatus.REJECTED;
    poa.rejectionReason = rejectDto.rejectionReason;

    if (rejectDto.adminNotes) {
      poa.adminNotes = rejectDto.adminNotes;
    }

    const updated = await this.poaRepository.save(poa);

    // Create history record
    await this.createHistoryRecord(
      poa.id,
      adminId,
      previousStatus,
      POAStatus.REJECTED,
      'rejected',
      `POA rechazado: ${rejectDto.rejectionReason}`,
    );

    this.logger.log(`POA ${id} rejected`);
    return updated;
  }

  /**
   * Notarize POA (approved → notarized)
   */
  async notarize(
    id: string,
    adminId: string,
    notarizeDto: NotarizePoaDto,
  ): Promise<POA> {
    const poa = await this.poaRepository.findOne({ where: { id } });

    if (!poa) {
      throw new NotFoundException(`POA con ID ${id} no encontrado`);
    }

    if (poa.status !== POAStatus.APPROVED) {
      throw new BadRequestException(
        'Solo se pueden notarizar POAs aprobados',
      );
    }

    poa.status = POAStatus.NOTARIZED;
    poa.notarizedAt = new Date();

    if (notarizeDto.notarizationNotes) {
      poa.adminNotes = notarizeDto.notarizationNotes;
    }

    const updated = await this.poaRepository.save(poa);

    // Create history record
    await this.createHistoryRecord(
      poa.id,
      adminId,
      POAStatus.APPROVED,
      POAStatus.NOTARIZED,
      'notarized',
      'POA notarizado',
    );

    this.logger.log(`POA ${id} notarized`);
    return updated;
  }

  /**
   * Activate POA (notarized → activated)
   */
  async activate(
    id: string,
    adminId: string,
    activateDto: ActivatePoaDto,
  ): Promise<POA> {
    const poa = await this.poaRepository.findOne({ where: { id } });

    if (!poa) {
      throw new NotFoundException(`POA con ID ${id} no encontrado`);
    }

    if (poa.status !== POAStatus.NOTARIZED) {
      throw new BadRequestException(
        'Solo se pueden activar POAs notarizados',
      );
    }

    poa.status = POAStatus.ACTIVATED;
    poa.activatedAt = new Date();

    const updated = await this.poaRepository.save(poa);

    // Create history record
    await this.createHistoryRecord(
      poa.id,
      adminId,
      POAStatus.NOTARIZED,
      POAStatus.ACTIVATED,
      'activated',
      `POA activado - Razón: ${activateDto.activationReason}. ${activateDto.activationDetails || ''}`,
    );

    this.logger.log(`POA ${id} activated`);
    return updated;
  }

  /**
   * Execute instruction on POA
   */
  async executeInstruction(
    poaId: string,
    adminId: string,
    executeDto: ExecuteInstructionDto,
  ): Promise<POAExecution> {
    const poa = await this.poaRepository.findOne({ where: { id: poaId } });

    if (!poa) {
      throw new NotFoundException(`POA con ID ${poaId} no encontrado`);
    }

    if (poa.status !== POAStatus.ACTIVATED) {
      throw new BadRequestException(
        'Solo se pueden ejecutar instrucciones en POAs activados',
      );
    }

    // Create execution record
    const execution = this.executionRepository.create({
      poaId,
      executedBy: adminId,
      executionType: executeDto.executionType,
      description: executeDto.description,
      amount: executeDto.amount || null,
      recipient: executeDto.recipient || null,
      proofDocuments: executeDto.proofDocuments || [],
      notes: executeDto.notes || null,
      status: POAExecutionStatus.PENDING,
    });

    const savedExecution = await this.executionRepository.save(execution);

    // Update POA status to executed if not already
    if (poa.status === POAStatus.ACTIVATED) {
      poa.status = POAStatus.EXECUTED;
      poa.executedAt = new Date();
      await this.poaRepository.save(poa);

      // Create history record
      await this.createHistoryRecord(
        poa.id,
        adminId,
        POAStatus.ACTIVATED,
        POAStatus.EXECUTED,
        'executed',
        'Primera instrucción ejecutada',
      );
    }

    this.logger.log(
      `Instruction executed on POA ${poaId}: ${executeDto.executionType}`,
    );
    return savedExecution;
  }

  /**
   * Get execution history for a POA
   */
  async getExecutions(poaId: string): Promise<POAExecution[]> {
    return this.executionRepository.find({
      where: { poaId },
      relations: ['executedByUser'],
      order: { executedAt: 'DESC' },
    });
  }

  /**
   * Get history for a POA
   */
  async getHistory(poaId: string): Promise<POAHistory[]> {
    return this.historyRepository.find({
      where: { poaId },
      relations: ['changedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Create a history record
   */
  private async createHistoryRecord(
    poaId: string,
    changedBy: string,
    previousStatus: POAStatus | null,
    newStatus: POAStatus,
    action: string,
    notes: string,
  ): Promise<POAHistory> {
    const history = this.historyRepository.create({
      poaId,
      changedBy,
      previousStatus,
      newStatus,
      action,
      notes,
    });

    return this.historyRepository.save(history);
  }

  /**
   * Decrypt POA sensitive data
   */
  private decryptPoaData(poa: POA): POA {
    try {
      // Decrypt client identification
      if (poa.clientIdentification) {
        try {
          poa.clientIdentification = this.encryptionService.decrypt(
            poa.clientIdentification,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to decrypt clientIdentification for POA ${poa.id}, keeping original value`,
          );
        }
      }

      // Decrypt instructions
      if (poa.instructions) {
        try {
          const decrypted = this.encryptionService.decryptObject(
            poa.instructions,
          );
          // Return as object, not as JSON string
          (poa as any).instructions = decrypted;
        } catch (error) {
          this.logger.warn(
            `Failed to decrypt instructions for POA ${poa.id}, setting to null`,
          );
          (poa as any).instructions = null;
        }
      }

      // Decrypt beneficiaries
      if (poa.beneficiaries) {
        try {
          const decrypted = this.encryptionService.decryptObject(
            poa.beneficiaries,
          );
          // Return as object, not as JSON string
          (poa as any).beneficiaries = decrypted;
        } catch (error) {
          this.logger.warn(
            `Failed to decrypt beneficiaries for POA ${poa.id}, setting to null`,
          );
          (poa as any).beneficiaries = null;
        }
      }

      return poa;
    } catch (error) {
      this.logger.error('Error decrypting POA data', error.stack);
      // If there's a general error, log it but don't fail completely
      this.logger.warn(`POA ${poa.id} may have corrupted data`);
      return poa;
    }
  }

  // ============================================
  // DOCUMENT METHODS
  // ============================================

  /**
   * Get all documents for a POA
   */
  async getDocuments(poaId: string): Promise<POADocument[]> {
    const poa = await this.poaRepository.findOne({ where: { id: poaId } });
    if (!poa) {
      throw new NotFoundException(`POA con ID ${poaId} no encontrado`);
    }

    return await this.documentRepository.find({
      where: { poaId },
      order: { uploadedAt: 'DESC' },
    });
  }

  /**
   * Upload a document for a POA
   */
  async uploadDocument(
    poaId: string,
    uploadDto: UploadDocumentDto,
  ): Promise<POADocument> {
    const poa = await this.poaRepository.findOne({ where: { id: poaId } });
    if (!poa) {
      throw new NotFoundException(`POA con ID ${poaId} no encontrado`);
    }

    try {
      // Parse base64 data
      const matches = uploadDto.fileBase64.match(
        /^data:(.+);base64,(.+)$/,
      );
      if (!matches || matches.length !== 3) {
        throw new BadRequestException(
          'Formato de archivo base64 inválido',
        );
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Create upload directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'uploads', 'poa-documents', poaId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(uploadDto.fileName);
      const baseName = path.basename(uploadDto.fileName, ext);
      const fileName = `${timestamp}-${baseName}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      // Save file
      fs.writeFileSync(filePath, buffer);

      // Create database record
      const document = this.documentRepository.create({
        poaId,
        type: uploadDto.type,
        fileName: uploadDto.fileName,
        fileUrl: `/uploads/poa-documents/${poaId}/${fileName}`,
        fileSize: buffer.length,
        mimeType,
        reviewNotes: uploadDto.description || null,
      });

      const saved = await this.documentRepository.save(document);
      this.logger.log(`Document uploaded for POA ${poaId}: ${fileName}`);

      return saved;
    } catch (error) {
      this.logger.error('Error uploading document', error.stack);
      throw new BadRequestException('Error al subir el documento');
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(poaId: string, documentId: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, poaId },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    try {
      // Delete physical file
      const filePath = path.join(process.cwd(), document.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete database record
      await this.documentRepository.remove(document);
      this.logger.log(`Document deleted: ${documentId}`);
    } catch (error) {
      this.logger.error('Error deleting document', error.stack);
      throw new BadRequestException('Error al eliminar el documento');
    }
  }

  /**
   * Get document file path for download
   */
  async getDocumentPath(poaId: string, documentId: string): Promise<string> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, poaId },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const filePath = path.join(process.cwd(), document.fileUrl.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo físico no encontrado');
    }

    return filePath;
  }

  /**
   * Get document download URL
   */
  async getDocumentDownloadUrl(
    poaId: string,
    documentId: string,
  ): Promise<{ url: string; fileName: string; mimeType: string }> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, poaId },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const filePath = path.join(process.cwd(), document.fileUrl.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo físico no encontrado');
    }

    return {
      url: document.fileUrl,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }

  /**
   * Validate POA has required fields before submission
   */
  private validatePoaForSubmission(poa: POA): void {
    if (!poa.clientFullName) {
      throw new BadRequestException(
        'El nombre completo del cliente es obligatorio',
      );
    }

    if (!poa.clientAddress) {
      throw new BadRequestException('La dirección es obligatoria');
    }

    if (!poa.clientIdentification) {
      throw new BadRequestException('La identificación es obligatoria');
    }

    // Instructions and beneficiaries are optional - they can be added later
    // The client may want to submit the POA first and add details during the review process

    if (!poa.activationTriggers || poa.activationTriggers.length === 0) {
      throw new BadRequestException(
        'Debe seleccionar al menos un evento de activación',
      );
    }
  }

  /**
   * Get POA statistics
   */
  async getStats() {
    this.logger.log('Fetching POA statistics');

    try {
      // Get total count
      const total = await this.poaRepository.count();

      // Count by status
      const byStatus = {};
      for (const status of Object.values(POAStatus)) {
        byStatus[status] = await this.poaRepository.count({
          where: { status },
        });
      }

      // Count by type
      const byType = {};
      for (const type of Object.values(POAType)) {
        byType[type] = await this.poaRepository.count({
          where: { type },
        });
      }

      // Specific status counts
      const pendingReview =
        (byStatus[POAStatus.PENDING] || 0) +
        (byStatus[POAStatus.IN_REVIEW] || 0);
      const approved = byStatus[POAStatus.APPROVED] || 0;
      const active =
        (byStatus[POAStatus.ACTIVATED] || 0) +
        (byStatus[POAStatus.EXECUTED] || 0);
      const rejected = byStatus[POAStatus.REJECTED] || 0;
      const completed = byStatus[POAStatus.COMPLETED] || 0;

      // Get recent activity from history
      const recentActivity = await this.historyRepository.find({
        order: { createdAt: 'DESC' },
        take: 10,
        relations: ['changedByUser'],
      });

      // Calculate average processing time (from creation to approval)
      const approvedPoas = await this.poaRepository.find({
        where: { status: POAStatus.APPROVED },
        select: ['createdAt', 'approvedAt'],
      });

      let averageProcessingTime: number | null = null;
      if (approvedPoas.length > 0) {
        const totalDays = approvedPoas.reduce((sum, poa) => {
          if (poa.approvedAt) {
            const days = Math.floor(
              (new Date(poa.approvedAt).getTime() -
                new Date(poa.createdAt).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return sum + days;
          }
          return sum;
        }, 0);
        averageProcessingTime = Math.round(totalDays / approvedPoas.length);
      }

      return {
        total,
        byStatus,
        byType,
        pendingReview,
        approved,
        active,
        rejected,
        completed,
        averageProcessingTime,
        recentActivity,
      };
    } catch (error) {
      this.logger.error('Error fetching POA statistics', error.stack);
      throw new InternalServerErrorException(
        'Error al obtener estadísticas de POA',
      );
    }
  }

  /**
   * Get client dashboard statistics
   * Returns stats specific to a client for their dashboard
   */
  async getClientStats(clientId: string) {
    this.logger.log(`Fetching dashboard statistics for client ${clientId}`);

    try {
      // Count active POAs (not cancelled or draft)
      const activePoas = await this.poaRepository.count({
        where: {
          clientId,
          status: Not(In([POAStatus.CANCELLED, POAStatus.DRAFT])),
        },
      });

      // Get all client's POAs to count their documents
      const clientPoas = await this.poaRepository.find({
        where: { clientId },
        select: ['id'],
      });

      // Count total documents across all client's POAs
      let totalDocuments = 0;
      if (clientPoas.length > 0) {
        const poaIds = clientPoas.map((poa) => poa.id);
        totalDocuments = await this.documentRepository.count({
          where: {
            poaId: In(poaIds),
          },
        });
      }

      // TODO: Add payments and notifications count when those modules are implemented
      const totalPayments = 0;
      const unreadNotifications = 0;

      return {
        activePoas,
        totalDocuments,
        totalPayments,
        unreadNotifications,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching client stats for ${clientId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al obtener estadísticas del dashboard',
      );
    }
  }

  // ============================================
  // THREAD METHODS
  // ============================================

  /**
   * Create a new thread for a POA
   */
  async createThread(
    poaId: string,
    createdById: string,
    createdByType: ThreadCreatedBy,
    createThreadDto: CreateThreadDto,
  ): Promise<POAThread> {
    // Verify POA exists
    const poa = await this.poaRepository.findOne({ where: { id: poaId } });
    if (!poa) {
      throw new NotFoundException(`POA con ID ${poaId} no encontrado`);
    }

    // Create thread
    const thread = this.threadRepository.create({
      poaId,
      createdById,
      createdByType,
      type: createThreadDto.type,
      subject: createThreadDto.subject,
    });

    const savedThread = await this.threadRepository.save(thread);
    this.logger.log(
      `Thread created for POA ${poaId} by ${createdByType} ${createdById}`,
    );

    return savedThread;
  }

  /**
   * Get all threads for a POA
   */
  async getThreads(poaId: string): Promise<POAThread[]> {
    // Verify POA exists
    const poa = await this.poaRepository.findOne({ where: { id: poaId } });
    if (!poa) {
      throw new NotFoundException(`POA con ID ${poaId} no encontrado`);
    }

    const threads = await this.threadRepository.find({
      where: { poaId },
      relations: ['createdBy'],
      order: {
        lastMessageAt: { direction: 'DESC', nulls: 'LAST' },
        createdAt: 'DESC'
      },
    });

    this.logger.log(`[getThreads] POA ${poaId} - Found ${threads.length} threads`);
    threads.forEach((thread, index) => {
      this.logger.log(`[getThreads] Thread ${index + 1}: ID=${thread.id}, Subject="${thread.subject}", CreatedBy=${thread.createdByType}, Status=${thread.status}`);
    });

    return threads;
  }

  /**
   * Get a single thread by ID with messages
   */
  async getThreadById(threadId: string): Promise<POAThread> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
      relations: ['createdBy', 'messages', 'messages.sender'],
    });

    if (!thread) {
      throw new NotFoundException(`Hilo con ID ${threadId} no encontrado`);
    }

    // Sort messages by creation date
    if (thread.messages) {
      thread.messages.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
    }

    return thread;
  }

  /**
   * Create a message within a thread
   */
  async createMessageInThread(
    threadId: string,
    senderId: string,
    senderType: MessageSenderType,
    createMessageDto: CreateMessageInThreadDto,
  ): Promise<POAMessage> {
    // Verify thread exists
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });
    if (!thread) {
      throw new NotFoundException(`Hilo con ID ${threadId} no encontrado`);
    }

    // Create message
    const message = this.messageRepository.create({
      threadId,
      poaId: thread.poaId, // Denormalized for fast queries
      senderId,
      senderType,
      message: createMessageDto.message,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update thread metadata
    thread.messageCount = thread.messageCount + 1;
    thread.lastMessageAt = new Date();

    // Increment unread count if message is from the other party
    if (
      (thread.createdByType === ThreadCreatedBy.ADMIN &&
        senderType === MessageSenderType.CLIENT) ||
      (thread.createdByType === ThreadCreatedBy.CLIENT &&
        senderType === MessageSenderType.ADMIN)
    ) {
      thread.unreadCount = thread.unreadCount + 1;
    }

    await this.threadRepository.save(thread);

    this.logger.log(
      `Message created in thread ${threadId} by ${senderType} ${senderId}`,
    );

    return savedMessage;
  }

  /**
   * Get messages for a thread
   */
  async getThreadMessages(threadId: string): Promise<POAMessage[]> {
    // Verify thread exists
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });
    if (!thread) {
      throw new NotFoundException(`Hilo con ID ${threadId} no encontrado`);
    }

    return this.messageRepository.find({
      where: { threadId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Mark thread messages as read
   */
  async markThreadAsRead(
    threadId: string,
    userId: string,
    userType: MessageSenderType,
  ): Promise<void> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException(`Hilo con ID ${threadId} no encontrado`);
    }

    // Mark all unread messages from the other party as read
    const oppositeSenderType =
      userType === MessageSenderType.ADMIN
        ? MessageSenderType.CLIENT
        : MessageSenderType.ADMIN;

    const unreadMessages = await this.messageRepository.find({
      where: {
        threadId,
        senderType: oppositeSenderType,
        isRead: false,
      },
    });

    if (unreadMessages.length > 0) {
      const now = new Date();
      for (const message of unreadMessages) {
        message.isRead = true;
        message.readAt = now;
      }
      await this.messageRepository.save(unreadMessages);

      // Reset unread count
      thread.unreadCount = Math.max(0, thread.unreadCount - unreadMessages.length);
      await this.threadRepository.save(thread);

      this.logger.log(
        `Marked ${unreadMessages.length} messages as read in thread ${threadId}`,
      );
    }
  }

  /**
   * Close a thread
   */
  async closeThread(threadId: string): Promise<POAThread> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException(`Hilo con ID ${threadId} no encontrado`);
    }

    thread.status = 'closed' as any; // ThreadStatus.CLOSED
    await this.threadRepository.save(thread);

    this.logger.log(`Thread ${threadId} closed`);
    return thread;
  }

  /**
   * Reopen a thread
   */
  async reopenThread(threadId: string): Promise<POAThread> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException(`Hilo con ID ${threadId} no encontrado`);
    }

    thread.status = 'open' as any; // ThreadStatus.OPEN
    await this.threadRepository.save(thread);

    this.logger.log(`Thread ${threadId} reopened`);
    return thread;
  }

  // ============================================
  // MESSAGE METHODS (LEGACY - to be migrated)
  // ============================================

  /**
   * Create a new message for a POA
   * @deprecated Use createThread + createMessageInThread instead
   * This method creates a thread automatically for backward compatibility
   */
  async createMessage(
    poaId: string,
    senderId: string,
    senderType: MessageSenderType,
    createMessageDto: CreateMessageDto,
  ): Promise<POAMessage> {
    // Verify POA exists
    const poa = await this.poaRepository.findOne({ where: { id: poaId } });
    if (!poa) {
      throw new NotFoundException(`POA con ID ${poaId} no encontrado`);
    }

    // Create a thread first (for backward compatibility)
    const threadCreatedBy =
      senderType === MessageSenderType.ADMIN
        ? ThreadCreatedBy.ADMIN
        : ThreadCreatedBy.CLIENT;

    const thread = await this.createThread(poaId, senderId, threadCreatedBy, {
      type: createMessageDto.type,
      subject: createMessageDto.subject,
    });

    // Create message in the thread
    const message = await this.createMessageInThread(
      thread.id,
      senderId,
      senderType,
      {
        message: createMessageDto.message,
      },
    );

    this.logger.log(
      `Legacy message created (thread ${thread.id}) for POA ${poaId} by ${senderType} ${senderId}`,
    );

    return message;
  }

  /**
   * Get all messages for a POA
   * @deprecated Use getThreads instead to get organized conversations
   */
  async getMessages(poaId: string): Promise<POAMessage[]> {
    // Verify POA exists
    const poa = await this.poaRepository.findOne({ where: { id: poaId } });
    if (!poa) {
      throw new NotFoundException(`POA con ID ${poaId} no encontrado`);
    }

    // Get all messages from all threads of this POA
    return this.messageRepository.find({
      where: { poaId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(
    messageId: string,
    userId: string,
  ): Promise<POAMessage> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['poa'],
    });

    if (!message) {
      throw new NotFoundException(`Mensaje con ID ${messageId} no encontrado`);
    }

    // Only mark as read if not already read
    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await this.messageRepository.save(message);
      this.logger.log(`Message ${messageId} marked as read by user ${userId}`);
    }

    return message;
  }

  /**
   * Delete a message (only if not read)
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    senderType: MessageSenderType,
  ): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Mensaje con ID ${messageId} no encontrado`);
    }

    // Verify the user is the sender
    if (message.senderId !== userId || message.senderType !== senderType) {
      throw new BadRequestException(
        'Solo puedes eliminar tus propios mensajes',
      );
    }

    // Only allow deletion if message has not been read
    if (message.isRead) {
      throw new BadRequestException(
        'No puedes eliminar un mensaje que ya ha sido leído',
      );
    }

    await this.messageRepository.remove(message);
    this.logger.log(
      `Message ${messageId} deleted by ${senderType} user ${userId}`,
    );
  }

  /**
   * Get unread message count for a user (client or admin)
   */
  async getUnreadMessageCount(
    userId: string,
    isAdmin: boolean,
  ): Promise<number> {
    if (isAdmin) {
      // For admins: count unread messages sent by clients across all POAs
      const count = await this.messageRepository.count({
        where: {
          senderType: MessageSenderType.CLIENT,
          isRead: false,
        },
      });
      return count;
    } else {
      // For clients: count unread messages sent by admins in their POAs
      const clientPoas = await this.poaRepository.find({
        where: { clientId: userId },
        select: ['id'],
      });

      if (clientPoas.length === 0) {
        return 0;
      }

      const poaIds = clientPoas.map((poa) => poa.id);
      const count = await this.messageRepository.count({
        where: {
          poaId: In(poaIds),
          senderType: MessageSenderType.ADMIN,
          isRead: false,
        },
      });
      return count;
    }
  }

  /**
   * Get unread messages for a specific POA
   */
  async getUnreadMessagesForPoa(poaId: string): Promise<POAMessage[]> {
    return this.messageRepository.find({
      where: { poaId, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }
}
