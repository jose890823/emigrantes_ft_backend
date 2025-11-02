import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  SendEmailDto,
  SendOtpEmailDto,
  SendWelcomeEmailDto,
  SendPasswordResetEmailDto,
  EmailResult,
} from './interfaces/email.interface';
import { getOtpEmailTemplate } from './templates/otp.template';
import { getWelcomeEmailTemplate } from './templates/welcome.template';
import { getPasswordResetTemplate } from './templates/password-reset.template';

/**
 * EmailService - Servicio de envío de correos usando Resend
 *
 * Este módulo es COMPLETAMENTE OPCIONAL.
 * Si se elimina, el sistema seguirá funcionando sin envío de emails.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private isConfigured = false;
  private readonly defaultFrom: string;

  constructor(private configService: ConfigService) {
    this.defaultFrom =
      this.configService.get<string>('EMAIL_FROM') ||
      'noreply@emigrantesft.com';
    this.initialize();
  }

  /**
   * Inicializa Resend solo si está configurado
   */
  private initialize(): void {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey || apiKey === '' || apiKey === 'your_resend_api_key_here') {
      this.logger.warn(
        '⚠️  Resend no configurado - EmailService en modo deshabilitado',
      );
      this.logger.warn(
        '   Configura RESEND_API_KEY en .env para habilitar envío de emails',
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      this.logger.log('✅ EmailService configurado correctamente con Resend');
    } catch (error) {
      this.logger.error('❌ Error inicializando Resend:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Verifica si el servicio de email está disponible
   */
  isAvailable(): boolean {
    return this.isConfigured && this.resend !== null;
  }

  /**
   * Envía un email genérico
   */
  async sendEmail(dto: SendEmailDto): Promise<EmailResult> {
    if (!this.isAvailable()) {
      this.logger.debug('EmailService no disponible - email no enviado');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      if (!this.resend) {
        throw new Error('Resend client not initialized');
      }

      const emailData: any = {
        from: dto.from || this.defaultFrom,
        to: dto.to,
        subject: dto.subject,
      };

      // Solo agregar campos opcionales si están definidos
      if (dto.html) emailData.html = dto.html;
      if (dto.text) emailData.text = dto.text;
      if (dto.replyTo) emailData.replyTo = dto.replyTo;

      const { data, error } = await this.resend.emails.send(emailData);

      if (error) {
        this.logger.error('Error enviando email:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      this.logger.log(`📧 Email enviado exitosamente a ${dto.to}`);
      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      this.logger.error('Error inesperado enviando email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envía código OTP de verificación
   */
  async sendOtpEmail(dto: SendOtpEmailDto): Promise<EmailResult> {
    if (!this.isAvailable()) {
      this.logger.log(
        `📧 [SIMULADO] OTP para ${dto.to}: ${dto.otpCode} (Email no enviado - servicio deshabilitado)`,
      );
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const html = getOtpEmailTemplate({
      firstName: dto.firstName,
      otpCode: dto.otpCode,
      expirationMinutes: dto.expirationMinutes || 10,
    });

    return this.sendEmail({
      to: dto.to,
      subject: '🔐 Código de verificación - Emigrantes FT',
      html,
    });
  }

  /**
   * Envía email de bienvenida
   */
  async sendWelcomeEmail(dto: SendWelcomeEmailDto): Promise<EmailResult> {
    if (!this.isAvailable()) {
      this.logger.log(
        `📧 [SIMULADO] Email de bienvenida para ${dto.to} no enviado`,
      );
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const html = getWelcomeEmailTemplate({
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    return this.sendEmail({
      to: dto.to,
      subject: '👋 ¡Bienvenido a Emigrantes FT!',
      html,
    });
  }

  /**
   * Envía email de reseteo de contraseña
   */
  async sendPasswordResetEmail(
    dto: SendPasswordResetEmailDto,
  ): Promise<EmailResult> {
    if (!this.isAvailable()) {
      this.logger.log(
        `📧 [SIMULADO] Reset password para ${dto.to} no enviado`,
      );
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const html = getPasswordResetTemplate({
      firstName: dto.firstName,
      resetUrl: dto.resetUrl,
    });

    return this.sendEmail({
      to: dto.to,
      subject: '🔑 Restablecer contraseña - Emigrantes FT',
      html,
    });
  }

  /**
   * Método para testing - verifica conectividad con Resend
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable()) {
      return {
        success: false,
        message: 'Resend no está configurado',
      };
    }

    try {
      // Intenta enviar un email de prueba a una dirección de test de Resend
      const result = await this.sendEmail({
        to: 'delivered@resend.dev', // Email especial de Resend para testing
        subject: 'Test de conexión',
        text: 'Este es un email de prueba desde Emigrantes FT',
      });

      return {
        success: result.success,
        message: result.success
          ? 'Conexión exitosa con Resend'
          : result.error || 'Error desconocido',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
