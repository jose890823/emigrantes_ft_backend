import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationChannel,
  NotificationCategory,
} from '../entities/notification.entity';
import { TemplateVariable } from '../entities/notification-template.entity';

/**
 * DTO for template variable definition
 */
export class TemplateVariableDto implements TemplateVariable {
  @ApiProperty({
    example: 'userName',
    description: 'Nombre de la variable',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message: 'Variable name must be a valid identifier',
  })
  name: string;

  @ApiProperty({
    example: "User's full name",
    description: 'Descripción de la variable',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    example: true,
    description: 'Si la variable es requerida',
  })
  @IsNotEmpty()
  @IsBoolean()
  required: boolean;

  @ApiProperty({
    example: 'N/A',
    description: 'Valor por defecto si no se proporciona',
    required: false,
  })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Ejemplo de valor',
    required: false,
  })
  @IsOptional()
  @IsString()
  example?: string;
}

/**
 * DTO for creating a notification template
 */
export class CreateTemplateDto {
  @ApiProperty({
    example: 'poa_approved_v2',
    description: 'Código único de la plantilla (slug format)',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Template code must be lowercase alphanumeric with underscores',
  })
  code: string;

  @ApiProperty({
    example: 'POA Approved Notification',
    description: 'Nombre descriptivo de la plantilla',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'Sent when a POA is approved by an administrator',
    description: 'Descripción de cuándo se usa esta plantilla',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'email',
    description: 'Canal para el que está diseñada la plantilla',
    enum: NotificationChannel,
  })
  @IsNotEmpty()
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({
    example: 'poa_status',
    description: 'Categoría de la plantilla',
    enum: NotificationCategory,
  })
  @IsNotEmpty()
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    example: 'Your {{poaType}} POA has been approved!',
    description: 'Asunto de la notificación',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  subject: string;

  @ApiProperty({
    example:
      'Hello {{userName}},\n\nGreat news! Your {{poaType}} POA has been approved.\n\nView details: {{poaUrl}}',
    description: 'Cuerpo de la plantilla con variables {{variableName}}',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  body: string;

  @ApiProperty({
    example: '<div><h1>Hello {{userName}}</h1><p>Your POA has been approved!</p></div>',
    description: 'Versión HTML del cuerpo (para emails)',
    required: false,
  })
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiProperty({
    type: [TemplateVariableDto],
    description: 'Variables disponibles en esta plantilla',
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables: TemplateVariableDto[];

  @ApiProperty({
    example: { fromName: 'Emigrantes FT', replyTo: 'support@emigrantes-ft.com' },
    description: 'Configuración adicional del canal',
    required: false,
  })
  @IsOptional()
  channelConfig?: Record<string, any>;

  @ApiProperty({
    example: true,
    description: 'Si la plantilla está activa',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 'en',
    description: 'Idioma de la plantilla (ISO 639-1)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  locale?: string;
}

/**
 * DTO for updating a notification template
 */
export class UpdateTemplateDto {
  @ApiProperty({
    example: 'POA Approved Notification (Updated)',
    description: 'Nombre descriptivo de la plantilla',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    example: 'Sent when a POA is approved by an administrator',
    description: 'Descripción de cuándo se usa esta plantilla',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Your {{poaType}} POA has been approved!',
    description: 'Asunto de la notificación',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  subject?: string;

  @ApiProperty({
    example:
      'Hello {{userName}},\n\nGreat news! Your {{poaType}} POA has been approved.\n\nView details: {{poaUrl}}',
    description: 'Cuerpo de la plantilla con variables {{variableName}}',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @ApiProperty({
    example: '<div><h1>Hello {{userName}}</h1><p>Your POA has been approved!</p></div>',
    description: 'Versión HTML del cuerpo (para emails)',
    required: false,
  })
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiProperty({
    type: [TemplateVariableDto],
    description: 'Variables disponibles en esta plantilla',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables?: TemplateVariableDto[];

  @ApiProperty({
    example: { fromName: 'Emigrantes FT', replyTo: 'support@emigrantes-ft.com' },
    description: 'Configuración adicional del canal',
    required: false,
  })
  @IsOptional()
  channelConfig?: Record<string, any>;

  @ApiProperty({
    example: true,
    description: 'Si la plantilla está activa',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 'en',
    description: 'Idioma de la plantilla (ISO 639-1)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  locale?: string;
}
