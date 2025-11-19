import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
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
 * EmailService - Servicio de envío de correos usando Gmail SMTP
 *
 * Este módulo es COMPLETAMENTE OPCIONAL.
 * Si se elimina, el sistema seguirá funcionando sin envío de emails.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private isConfigured = false;
  private readonly defaultFrom: string;

  constructor(private configService: ConfigService) {
    this.defaultFrom =
      this.configService.get<string>('EMAIL_FROM') ||
      'noreply@emigrantesft.com';
    this.initialize();
  }

  /**
   * Inicializa Gmail SMTP solo si está configurado
   */
  private initialize(): void {
    const user = this.configService.get<string>('GMAIL_USER');
    const pass = this.configService.get<string>('GMAIL_APP_PASSWORD');

    if (!user || !pass || user === '' || pass === '') {
      this.logger.warn(
        '⚠️  Gmail SMTP no configurado - EmailService en modo deshabilitado',
      );
      this.logger.warn(
        '   Configura GMAIL_USER y GMAIL_APP_PASSWORD en .env para habilitar envío de emails',
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
      this.isConfigured = true;
      this.logger.log('✅ EmailService configurado correctamente con Gmail SMTP');
      this.logger.log(`📧 Usando cuenta: ${user}`);
    } catch (error) {
      this.logger.error('❌ Error inicializando Gmail SMTP:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Verifica si el servicio de email está disponible
   */
  isAvailable(): boolean {
    return this.isConfigured && this.transporter !== null;
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
      if (!this.transporter) {
        throw new Error('Gmail SMTP transporter not initialized');
      }

      const mailOptions: any = {
        from: dto.from || this.defaultFrom,
        to: dto.to,
        subject: dto.subject,
      };

      // Solo agregar campos opcionales si están definidos
      if (dto.html) mailOptions.html = dto.html;
      if (dto.text) mailOptions.text = dto.text;
      if (dto.replyTo) mailOptions.replyTo = dto.replyTo;

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`📧 Email enviado exitosamente a ${dto.to}`);
      return {
        success: true,
        messageId: info.messageId,
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
   * Método para testing - verifica conectividad con Gmail SMTP
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable()) {
      return {
        success: false,
        message: 'Gmail SMTP no está configurado',
      };
    }

    try {
      if (!this.transporter) {
        throw new Error('Gmail SMTP transporter not initialized');
      }

      // Verificar la conexión SMTP
      await this.transporter.verify();

      return {
        success: true,
        message: 'Conexión exitosa con Gmail SMTP',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
