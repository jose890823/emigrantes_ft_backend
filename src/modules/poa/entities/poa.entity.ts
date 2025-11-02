import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { POADocument } from './poa-document.entity';
import { POAHistory } from './poa-history.entity';
import { POAExecution } from './poa-execution.entity';

export enum POAType {
  STANDARD = 'standard',
  DURABLE = 'durable',
  SPRINGING = 'springing',
}

export enum POAStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NOTARIZED = 'notarized',
  ACTIVATED = 'activated',
  EXECUTED = 'executed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('poas')
export class POA {
  @ApiProperty({
    description: 'ID único del POA',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiProperty({
    description: 'ID del cliente dueño del POA',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'clientId' })
  client: User;

  @ApiProperty({
    description: 'ID del admin/gestor asignado al POA',
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  assignedAdminId: string | null;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'assignedAdminId' })
  assignedAdmin: User | null;

  @OneToMany(() => POADocument, (document) => document.poa)
  documents: POADocument[];

  @OneToMany(() => POAHistory, (history) => history.poa)
  history: POAHistory[];

  @OneToMany(() => POAExecution, (execution) => execution.poa)
  executions: POAExecution[];

  // ============================================
  // INFORMACIÓN DEL POA
  // ============================================

  @ApiProperty({
    description: 'Tipo de POA',
    enum: POAType,
    example: POAType.DURABLE,
  })
  @Column({
    type: 'enum',
    enum: POAType,
    default: POAType.DURABLE,
  })
  type: POAType;

  @ApiProperty({
    description: 'Estado actual del POA',
    enum: POAStatus,
    example: POAStatus.DRAFT,
  })
  @Column({
    type: 'enum',
    enum: POAStatus,
    default: POAStatus.DRAFT,
  })
  status: POAStatus;

  // ============================================
  // DATOS DEL CLIENTE
  // ============================================

  @ApiProperty({
    description: 'Nombre completo del cliente',
    example: 'Juan Carlos Pérez González',
  })
  @Column({ type: 'varchar', length: 255 })
  clientFullName: string;

  @ApiProperty({
    description: 'Dirección completa del cliente',
    example: '123 Main St, Miami, FL 33166, USA',
  })
  @Column({ type: 'text' })
  clientAddress: string;

  @ApiProperty({
    description: 'Número de identificación del cliente (encriptado)',
    example: 'V-12345678',
  })
  @Column({ type: 'text' })
  clientIdentification: string;

  // ============================================
  // INSTRUCCIONES CONFIDENCIALES (ENCRIPTADAS)
  // ============================================

  @ApiProperty({
    description: 'Instrucciones del cliente (encriptadas con AES-256)',
    example: '{"accountNumbers": ["..."], "actions": ["..."]}',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  @ApiProperty({
    description: 'Beneficiarios del POA (encriptado)',
    example: '[{"name": "María Pérez", "relationship": "spouse"}]',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  beneficiaries: string | null;

  @ApiProperty({
    description: 'Triggers de activación del POA',
    example: ['deportation', 'incapacity', 'absence'],
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  activationTriggers: string[];

  // ============================================
  // SEGUIMIENTO DE FECHAS
  // ============================================

  @ApiProperty({
    description: 'Fecha de envío a revisión',
    example: '2025-11-01T10:00:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @ApiProperty({
    description: 'Fecha de inicio de revisión',
    example: '2025-11-02T10:00:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @ApiProperty({
    description: 'Fecha de aprobación',
    example: '2025-11-03T10:00:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @ApiProperty({
    description: 'Fecha de notarización',
    example: '2025-11-04T10:00:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  notarizedAt: Date | null;

  @ApiProperty({
    description: 'Fecha de activación del POA',
    example: '2025-11-05T10:00:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  activatedAt: Date | null;

  @ApiProperty({
    description: 'Fecha de ejecución de instrucciones',
    example: '2025-11-06T10:00:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  executedAt: Date | null;

  // ============================================
  // NOTAS Y OBSERVACIONES
  // ============================================

  @ApiProperty({
    description: 'Notas del cliente sobre el POA',
    example: 'Por favor contactar a mi hermano en caso de emergencia',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  clientNotes: string | null;

  @ApiProperty({
    description: 'Notas privadas del admin (no visible para el cliente)',
    example: 'Cliente verificado por teléfono. Documentos en orden.',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @ApiProperty({
    description: 'Razón de rechazo (si aplica)',
    example: 'Documentos de identificación no válidos',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  // ============================================
  // AUDITORÍA
  // ============================================

  @ApiProperty({
    description: 'Fecha de creación del POA',
    example: '2025-11-01T10:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-11-01T15:30:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({
    description: 'Fecha de eliminación (soft delete)',
    example: null,
    nullable: true,
  })
  @DeleteDateColumn()
  deletedAt: Date | null;
}
