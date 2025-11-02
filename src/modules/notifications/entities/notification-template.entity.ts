import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationCategory,
} from './notification.entity';

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string; // Variable name (e.g., 'userName')
  description: string; // Description for documentation
  required: boolean; // Whether variable is required
  defaultValue?: string; // Default value if not provided
  example?: string; // Example value
}

@Entity('notification_templates')
@Index(['code'], { unique: true })
@Index(['channel'])
@Index(['category'])
@Index(['isActive'])
export class NotificationTemplate {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID único de la plantilla',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'poa_approved',
    description: 'Código único de la plantilla',
  })
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @ApiProperty({
    example: 'POA Approved Notification',
    description: 'Nombre descriptivo de la plantilla',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    example: 'Template sent when a POA is approved by admin',
    description: 'Descripción de cuándo se usa esta plantilla',
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: 'email',
    description: 'Canal para el que está diseñada la plantilla',
    enum: NotificationChannel,
  })
  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({
    example: 'poa_status',
    description: 'Categoría de la plantilla',
    enum: NotificationCategory,
  })
  @Column({
    type: 'enum',
    enum: NotificationCategory,
    default: NotificationCategory.SYSTEM,
  })
  category: NotificationCategory;

  @ApiProperty({
    example: 'Your POA {{poaType}} has been approved!',
    description: 'Asunto de la notificación (para email/push)',
  })
  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @ApiProperty({
    example:
      'Hello {{userName}},\n\nGreat news! Your {{poaType}} POA has been approved on {{approvalDate}}.\n\nNext steps:\n1. Review your POA details: {{poaUrl}}\n2. Schedule notarization appointment\n\nThank you,\nEmigrantes FT Team',
    description:
      'Cuerpo de la plantilla con variables en formato {{variableName}}',
  })
  @Column({ type: 'text' })
  body: string;

  @ApiProperty({
    example: '<div><h1>Hello {{userName}}</h1><p>Your POA has been approved!</p></div>',
    description: 'Versión HTML del cuerpo (opcional, para emails)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  bodyHtml: string | null;

  @ApiProperty({
    example: [
      {
        name: 'userName',
        description: "User's full name",
        required: true,
        example: 'John Doe',
      },
      {
        name: 'poaType',
        description: 'Type of POA',
        required: true,
        example: 'Durable',
      },
      {
        name: 'approvalDate',
        description: 'Date of approval',
        required: true,
        example: '2025-01-15',
      },
      {
        name: 'poaUrl',
        description: 'URL to view POA details',
        required: false,
        defaultValue: 'https://app.emigrantes-ft.com/poa',
        example: 'https://app.emigrantes-ft.com/poa/123',
      },
    ],
    description: 'Variables disponibles en esta plantilla',
  })
  @Column({ type: 'jsonb', default: [] })
  variables: TemplateVariable[];

  @ApiProperty({
    example: { fromName: 'Emigrantes FT', replyTo: 'support@emigrantes-ft.com' },
    description: 'Configuración adicional del canal',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  channelConfig: Record<string, any> | null;

  @ApiProperty({
    example: true,
    description: 'Si la plantilla está activa y se puede usar',
  })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({
    example: false,
    description: 'Si es una plantilla del sistema (no se puede eliminar)',
  })
  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @ApiProperty({
    example: 'en',
    description: 'Idioma de la plantilla (ISO 639-1)',
  })
  @Column({ type: 'varchar', length: 5, default: 'en' })
  locale: string;

  @ApiProperty({
    example: 150,
    description: 'Número de veces que se ha usado esta plantilla',
  })
  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @ApiProperty({
    example: '2025-01-15T10:00:00.000Z',
    description: 'Última vez que se usó la plantilla',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Fecha de creación',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-15T10:00:00.000Z',
    description: 'Fecha de última actualización',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial: Partial<NotificationTemplate>) {
    Object.assign(this, partial);
  }

  /**
   * Get all variable names used in the template
   */
  getVariableNames(): string[] {
    return this.variables.map((v) => v.name);
  }

  /**
   * Get required variable names
   */
  getRequiredVariables(): string[] {
    return this.variables.filter((v) => v.required).map((v) => v.name);
  }

  /**
   * Validate that all required variables are provided
   */
  validateVariables(providedVariables: Record<string, any>): {
    valid: boolean;
    missing: string[];
  } {
    const required = this.getRequiredVariables();
    const provided = Object.keys(providedVariables);
    const missing = required.filter((v) => !provided.includes(v));

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Render template with variables
   */
  render(variables: Record<string, any>): {
    subject: string;
    body: string;
    bodyHtml: string | null;
  } {
    // Apply default values for missing optional variables
    const varsWithDefaults = { ...variables };
    this.variables.forEach((v) => {
      if (!v.required && v.defaultValue && !varsWithDefaults[v.name]) {
        varsWithDefaults[v.name] = v.defaultValue;
      }
    });

    // Replace variables in subject and body
    const subject = this.replaceVariables(this.subject, varsWithDefaults);
    const body = this.replaceVariables(this.body, varsWithDefaults);
    const bodyHtml = this.bodyHtml
      ? this.replaceVariables(this.bodyHtml, varsWithDefaults)
      : null;

    return { subject, body, bodyHtml };
  }

  /**
   * Replace variables in text using {{variableName}} syntax
   */
  private replaceVariables(
    text: string,
    variables: Record<string, any>,
  ): string {
    let result = text;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(variables[key]));
    });
    return result;
  }

  /**
   * Increment usage counter
   */
  incrementUsage(): void {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
  }
}
