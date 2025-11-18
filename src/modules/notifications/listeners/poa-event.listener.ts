import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PoaApprovedEvent,
  PoaRejectedEvent,
  PoaSubmittedEvent,
  PoaAssignedEvent,
  PoaInReviewEvent,
  PoaNotarizedEvent,
  PoaActivatedEvent,
  PoaExecutedEvent,
  PoaCompletedEvent,
  DocumentUploadedEvent,
  DocumentApprovedEvent,
  DocumentRejectedEvent,
  MessageReceivedEvent,
  PoaCreatedEvent,
} from '../events/poa-events';
import { NotificationSenderService } from '../services/notification-sender.service';

@Injectable()
export class PoaEventListener {
  private readonly logger = new Logger(PoaEventListener.name);

  constructor(
    private readonly notificationSender: NotificationSenderService,
  ) {}

  // ============================================================================
  // POA LIFECYCLE EVENTS - NOTIFICA AL CLIENTE
  // ============================================================================

  @OnEvent('poa.created')
  async handlePoaCreated(event: PoaCreatedEvent) {
    this.logger.log(`POA created: #${event.poa.id}`);

    // Notificar a todos los admins
    const adminEmails = await this.getAdminEmails();

    await this.notificationSender.send({
      to: adminEmails,
      subject: `🆕 Nuevo POA Creado - Requiere Asignación (#${event.poa.id})`,
      template: 'poa-new-admin',
      data: {
        poaId: event.poa.id,
        clientName: `${event.client.firstName} ${event.client.lastName}`,
        clientEmail: event.client.email,
        applicantName: event.poa.clientFullName,
        poaType: event.poa.type,
        poaStatus: event.poa.status,
        poaDescription: '',
        createdAt: event.createdAt,
        adminPoaUrl: `${process.env.ADMIN_URL}/poa/${event.poa.id}`,
      },
    });
  }

  @OnEvent('poa.submitted')
  async handlePoaSubmitted(event: PoaSubmittedEvent) {
    this.logger.log(`POA submitted: #${event.poa.id}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `✅ POA Enviado para Revisión (#${event.poa.id})`,
      template: 'poa-submitted',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        poaType: event.poa.type,
        submittedAt: event.submittedAt,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  @OnEvent('poa.assigned')
  async handlePoaAssigned(event: PoaAssignedEvent) {
    this.logger.log(`POA assigned: #${event.poa.id} to ${event.manager.email}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `👤 Gestor Asignado a tu POA (#${event.poa.id})`,
      template: 'poa-assigned',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        poaType: event.poa.type,
        managerName: `${event.manager.firstName} ${event.manager.lastName}`,
        managerEmail: event.manager.email,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  @OnEvent('poa.in-review')
  async handlePoaInReview(event: PoaInReviewEvent) {
    this.logger.log(`POA in review: #${event.poa.id}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `🔍 Tu POA está en Revisión (#${event.poa.id})`,
      template: 'poa-in-review',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        poaType: event.poa.type,
        reviewedAt: event.reviewedAt,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  @OnEvent('poa.approved')
  async handlePoaApproved(event: PoaApprovedEvent) {
    this.logger.log(`POA approved: #${event.poa.id}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `🎉 ¡Tu POA ha sido Aprobado! (#${event.poa.id})`,
      template: 'poa-approved',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        poaType: event.poa.type,
        approvedAt: event.approvedAt,
        approvedBy: event.approvedBy
          ? `${event.approvedBy.firstName} ${event.approvedBy.lastName}`
          : null,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  @OnEvent('poa.rejected')
  async handlePoaRejected(event: PoaRejectedEvent) {
    this.logger.log(`POA rejected: #${event.poa.id}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `⚠️ Tu POA Requiere Correcciones (#${event.poa.id})`,
      template: 'poa-rejected',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        reason: event.reason,
        rejectedAt: event.rejectedAt,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  @OnEvent('poa.notarized')
  async handlePoaNotarized(event: PoaNotarizedEvent) {
    this.logger.log(`POA notarized: #${event.poa.id}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `📜 Tu POA ha sido Notarizado (#${event.poa.id})`,
      template: 'poa-notarized',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        poaType: event.poa.type,
        notarizedAt: event.poa.notarizedAt,
        notarizedBy: event.notarizedBy
          ? `${event.notarizedBy.firstName} ${event.notarizedBy.lastName}`
          : null,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  @OnEvent('poa.activated')
  async handlePoaActivated(event: PoaActivatedEvent) {
    this.logger.log(`POA activated: #${event.poa.id}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `🚀 Tu POA ha sido Activado (#${event.poa.id})`,
      template: 'poa-activated',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        poaType: event.poa.type,
        activatedAt: event.poa.activatedAt,
        activatedBy: event.activatedBy
          ? `${event.activatedBy.firstName} ${event.activatedBy.lastName}`
          : null,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  @OnEvent('poa.executed')
  async handlePoaExecuted(event: PoaExecutedEvent) {
    this.logger.log(`POA instruction executed: #${event.poa.id}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `✅ Instrucción Ejecutada de tu POA (#${event.poa.id})`,
      template: 'poa-executed',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        poaType: event.poa.type,
        instructionDescription: event.instruction.description,
        executedAt: event.executedAt,
        executedBy: event.executedBy
          ? `${event.executedBy.firstName} ${event.executedBy.lastName}`
          : null,
        executionNotes: event.executionNotes,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  @OnEvent('poa.completed')
  async handlePoaCompleted(event: PoaCompletedEvent) {
    this.logger.log(`POA completed: #${event.poa.id}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `🎊 Tu POA ha sido Completado (#${event.poa.id})`,
      template: 'poa-completed',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        poaType: event.poa.type,
        createdAt: event.poa.createdAt,
        completedAt: event.poa.createdAt,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  // ============================================================================
  // DOCUMENT EVENTS
  // ============================================================================

  @OnEvent('document.uploaded')
  async handleDocumentUploaded(event: DocumentUploadedEvent) {
    this.logger.log(`Document uploaded: ${event.document.fileName} to POA #${event.poa.id}`);

    // Notificar al cliente
    await this.notificationSender.send({
      to: event.client.email,
      subject: `📎 Documento Subido a tu POA (#${event.poa.id})`,
      template: 'document-uploaded',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        documentName: event.document.fileName,
        documentType: event.document.type,
        documentSize: this.formatFileSize(event.document.fileSize),
        uploadedAt: event.uploadedAt,
        uploadedBy: `${event.uploadedBy.firstName} ${event.uploadedBy.lastName}`,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });

    // Notificar al manager si está asignado
    if (event.poa.assignedAdmin) {
      await this.notificationSender.send({
        to: event.poa.assignedAdmin.email,
        subject: `📎 Nuevo Documento en POA #${event.poa.id} - Requiere Revisión`,
        template: 'document-uploaded-admin',
        data: {
          managerName: event.poa.assignedAdmin.firstName,
          poaId: event.poa.id,
          clientName: `${event.client.firstName} ${event.client.lastName}`,
          applicantName: event.poa.clientFullName,
          documentName: event.document.fileName,
          documentType: event.document.type,
          documentSize: this.formatFileSize(event.document.fileSize),
          uploadedAt: event.uploadedAt,
          adminDocumentUrl: `${process.env.ADMIN_URL}/poa/${event.poa.id}`,
        },
      });
    }
  }

  @OnEvent('document.approved')
  async handleDocumentApproved(event: DocumentApprovedEvent) {
    this.logger.log(`Document approved: ${event.document.fileName}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `✅ Documento Aprobado (#${event.poa.id})`,
      template: 'document-approved',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        documentName: event.document.fileName,
        documentType: event.document.type,
        approvedAt: event.approvedAt,
        approvedBy: event.approvedBy
          ? `${event.approvedBy.firstName} ${event.approvedBy.lastName}`
          : null,
        approvalNotes: event.approvalNotes,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  @OnEvent('document.rejected')
  async handleDocumentRejected(event: DocumentRejectedEvent) {
    this.logger.log(`Document rejected: ${event.document.fileName}`);

    await this.notificationSender.send({
      to: event.client.email,
      subject: `⚠️ Documento Requiere Corrección (#${event.poa.id})`,
      template: 'document-rejected',
      data: {
        clientName: event.client.firstName,
        poaId: event.poa.id,
        applicantName: event.poa.clientFullName,
        documentName: event.document.fileName,
        documentType: event.document.type,
        reason: event.reason,
        rejectedAt: event.rejectedAt,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}`,
      },
    });
  }

  // ============================================================================
  // MESSAGE EVENTS
  // ============================================================================

  @OnEvent('message.received.client')
  async handleMessageReceivedByClient(event: MessageReceivedEvent) {
    this.logger.log(`Message received by client from admin in thread #${event.thread.id}`);

    await this.notificationSender.send({
      to: event.recipient.email,
      subject: `💬 Nuevo Mensaje del Equipo Emigrantes FT`,
      template: 'message-received-client',
      data: {
        clientName: event.recipient.firstName,
        poaId: event.poa.id,
        threadSubject: event.thread.subject,
        senderName: `${event.sender.firstName} ${event.sender.lastName}`,
        messageContent: event.message.message,
        sentAt: event.message.createdAt,
        threadUrl: `${process.env.CLIENT_URL}/dashboard/poa/${event.poa.id}#thread-${event.thread.id}`,
      },
    });
  }

  @OnEvent('message.received.admin')
  async handleMessageReceivedByAdmin(event: MessageReceivedEvent) {
    this.logger.log(`Message received by admin from client in thread #${event.thread.id}`);

    await this.notificationSender.send({
      to: event.recipient.email,
      subject: `💬 Nuevo Mensaje de Cliente - POA #${event.poa.id}`,
      template: 'message-received-admin',
      data: {
        adminName: event.recipient.firstName,
        poaId: event.poa.id,
        clientName: `${event.sender.firstName} ${event.sender.lastName}`,
        threadSubject: event.thread.subject,
        threadStatus: event.thread.status,
        messageContent: event.message.message,
        sentAt: event.message.createdAt,
        threadUrl: `${process.env.ADMIN_URL}/poa/${event.poa.id}`,
      },
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  private async getAdminEmails(): Promise<string[]> {
    // TODO: Implementar query para obtener emails de admins
    // Por ahora retornamos el email del env si existe
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    return adminEmail ? [adminEmail] : [];
  }
}
