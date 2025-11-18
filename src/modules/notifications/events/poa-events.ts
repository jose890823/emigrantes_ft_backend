import { POA } from '../../poa/entities/poa.entity';
import { User } from '../../auth/entities/user.entity';
import { POADocument } from '../../poa/entities/poa-document.entity';
import { POAExecution } from '../../poa/entities/poa-execution.entity';
import { POAThread } from '../../poa/entities/poa-thread.entity';
import { POAMessage } from '../../poa/entities/poa-message.entity';

/**
 * Evento: POA creado
 */
export class PoaCreatedEvent {
  poa: POA;
  client: User;
  createdAt: Date;
}

/**
 * Evento: POA enviado a revisión
 */
export class PoaSubmittedEvent {
  poa: POA;
  client: User;
  submittedAt: Date;
}

/**
 * Evento: POA asignado a un gestor
 */
export class PoaAssignedEvent {
  poa: POA;
  client: User;
  manager: User;
  assignedAt: Date;
}

/**
 * Evento: POA marcado como en revisión
 */
export class PoaInReviewEvent {
  poa: POA;
  client: User;
  reviewedAt: Date;
}

/**
 * Evento: POA aprobado
 */
export class PoaApprovedEvent {
  poa: POA;
  client: User;
  approvedBy: User;
  approvedAt: Date;
}

/**
 * Evento: POA rechazado
 */
export class PoaRejectedEvent {
  poa: POA;
  client: User;
  rejectedBy: User;
  reason: string;
  rejectedAt: Date;
}

/**
 * Evento: POA notarizado
 */
export class PoaNotarizedEvent {
  poa: POA;
  client: User;
  notarizedBy: User;
  notarizedAt: Date;
}

/**
 * Evento: POA activado
 */
export class PoaActivatedEvent {
  poa: POA;
  client: User;
  activatedBy: User;
  activatedAt: Date;
}

/**
 * Evento: Instrucción del POA ejecutada
 */
export class PoaExecutedEvent {
  poa: POA;
  client: User;
  instruction: POAExecution;
  executedBy: User;
  executedAt: Date;
  executionNotes?: string;
}

/**
 * Evento: POA completado
 */
export class PoaCompletedEvent {
  poa: POA;
  client: User;
  completedBy: User;
  completedAt: Date;
}

/**
 * Evento: Documento subido
 */
export class DocumentUploadedEvent {
  poa: POA;
  client: User;
  document: POADocument;
  uploadedAt: Date;
  uploadedBy: User;
}

/**
 * Evento: Documento aprobado
 */
export class DocumentApprovedEvent {
  poa: POA;
  client: User;
  document: POADocument;
  approvedBy: User;
  approvedAt: Date;
  approvalNotes?: string;
}

/**
 * Evento: Documento rechazado
 */
export class DocumentRejectedEvent {
  poa: POA;
  client: User;
  document: POADocument;
  rejectedBy: User;
  rejectedAt: Date;
  reason: string;
}

/**
 * Evento: Mensaje recibido (cliente o admin)
 */
export class MessageReceivedEvent {
  poa: POA;
  thread: POAThread;
  message: POAMessage;
  sender: User;
  recipient: User;
}
