import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../../email/email.service';
import { TemplateRendererService } from './template-renderer.service';

export interface SendNotificationDto {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  cc?: string[];
  bcc?: string[];
}

@Injectable()
export class NotificationSenderService {
  private readonly logger = new Logger(NotificationSenderService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  /**
   * Envía una notificación por email usando un template
   */
  async send(dto: SendNotificationDto): Promise<void> {
    try {
      this.logger.log(`Enviando notificación a ${dto.to} - Template: ${dto.template}`);

      // Renderizar template con los datos
      const htmlContent = await this.templateRenderer.renderTemplate(
        dto.template,
        dto.data,
      );

      // Preparar destinatarios
      const recipients = Array.isArray(dto.to) ? dto.to : [dto.to];

      // Enviar email a cada destinatario
      for (const recipient of recipients) {
        await this.emailService.sendEmail({
          to: recipient,
          subject: dto.subject,
          html: htmlContent,
        });

        this.logger.log(`Notificación enviada exitosamente a ${recipient}`);
      }
    } catch (error) {
      this.logger.error(
        `Error enviando notificación: ${error.message}`,
        error.stack,
      );
      // No lanzamos error para que no bloquee el flujo principal
      // Las notificaciones son importantes pero no críticas
    }
  }

  /**
   * Envía múltiples notificaciones en paralelo
   */
  async sendBatch(notifications: SendNotificationDto[]): Promise<void> {
    this.logger.log(`Enviando ${notifications.length} notificaciones en batch`);

    const promises = notifications.map((notification) =>
      this.send(notification),
    );

    await Promise.allSettled(promises);
  }
}
