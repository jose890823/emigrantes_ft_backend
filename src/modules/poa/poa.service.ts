import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { POA, POAStatus } from './entities/poa.entity';
import { POAHistory } from './entities/poa-history.entity';
import {
  POAExecution,
  POAExecutionStatus,
} from './entities/poa-execution.entity';
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

    // Encrypt sensitive data
    const encryptedInstructions = createPoaDto.instructions
      ? this.encryptionService.encryptObject(createPoaDto.instructions)
      : null;

    const encryptedBeneficiaries = createPoaDto.beneficiaries
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

    if (updatePoaDto.instructions) {
      poa.instructions = this.encryptionService.encryptObject(
        updatePoaDto.instructions,
      );
    }

    if (updatePoaDto.beneficiaries) {
      poa.beneficiaries = this.encryptionService.encryptObject(
        updatePoaDto.beneficiaries,
      );
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

    if (poa.status !== POAStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Solo se pueden aprobar POAs en estado de revisión',
      );
    }

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
      POAStatus.IN_REVIEW,
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

    if (poa.status !== POAStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Solo se pueden rechazar POAs en estado de revisión',
      );
    }

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
      POAStatus.IN_REVIEW,
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
      if (poa.clientIdentification) {
        poa.clientIdentification = this.encryptionService.decrypt(
          poa.clientIdentification,
        );
      }

      if (poa.instructions) {
        const decrypted = this.encryptionService.decryptObject(
          poa.instructions,
        );
        poa.instructions = JSON.stringify(decrypted);
      }

      if (poa.beneficiaries) {
        const decrypted = this.encryptionService.decryptObject(
          poa.beneficiaries,
        );
        poa.beneficiaries = JSON.stringify(decrypted);
      }

      return poa;
    } catch (error) {
      this.logger.error('Error decrypting POA data', error.stack);
      throw new BadRequestException('Error al descifrar datos del POA');
    }
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

    if (!poa.instructions) {
      throw new BadRequestException('Las instrucciones son obligatorias');
    }

    if (!poa.beneficiaries) {
      throw new BadRequestException('Los beneficiarios son obligatorios');
    }

    if (!poa.activationTriggers || poa.activationTriggers.length === 0) {
      throw new BadRequestException(
        'Los triggers de activación son obligatorios',
      );
    }
  }
}
