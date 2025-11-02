import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { POA } from './poa.entity';
import { User } from '../../auth/entities/user.entity';

export enum POAExecutionType {
  BANK_TRANSACTION = 'bank_transaction',
  DOCUMENT_DELIVERY = 'document_delivery',
  PROPERTY_MANAGEMENT = 'property_management',
  OTHER = 'other',
}

export enum POAExecutionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('poa_executions')
export class POAExecution {
  @ApiProperty({
    description: 'ID único de la ejecución',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiProperty({
    description: 'ID del POA relacionado',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @Column({ type: 'uuid' })
  poaId: string;

  @ManyToOne(() => POA, (poa) => poa.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poaId' })
  poa: POA;

  @ApiProperty({
    description: 'ID del admin que ejecutó la instrucción',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @Column({ type: 'uuid' })
  executedBy: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'executedBy' })
  executedByUser: User;

  // ============================================
  // INFORMACIÓN DE LA EJECUCIÓN
  // ============================================

  @ApiProperty({
    description: 'Tipo de ejecución',
    enum: POAExecutionType,
    example: POAExecutionType.BANK_TRANSACTION,
  })
  @Column({
    type: 'enum',
    enum: POAExecutionType,
  })
  executionType: POAExecutionType;

  @ApiProperty({
    description: 'Descripción detallada de la ejecución',
    example: 'Transferencia de $5,000 desde cuenta XXXX1234 a beneficiario María Pérez',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    description: 'Monto de la transacción (si aplica)',
    example: 5000.00,
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amount: number | null;

  @ApiProperty({
    description: 'Destinatario de la ejecución',
    example: 'María Pérez (Beneficiaria)',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  recipient: string | null;

  @ApiProperty({
    description: 'URLs de documentos de prueba/evidencia',
    example: [
      'https://s3.amazonaws.com/emigrantes-ft/executions/proof1.pdf',
      'https://s3.amazonaws.com/emigrantes-ft/executions/proof2.pdf',
    ],
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  proofDocuments: string[];

  @ApiProperty({
    description: 'Estado de la ejecución',
    enum: POAExecutionStatus,
    example: POAExecutionStatus.COMPLETED,
  })
  @Column({
    type: 'enum',
    enum: POAExecutionStatus,
    default: POAExecutionStatus.PENDING,
  })
  status: POAExecutionStatus;

  // ============================================
  // SEGUIMIENTO
  // ============================================

  @ApiProperty({
    description: 'Fecha de inicio de la ejecución',
    example: '2025-11-05T10:00:00Z',
  })
  @CreateDateColumn()
  executedAt: Date;

  @ApiProperty({
    description: 'Fecha de finalización de la ejecución',
    example: '2025-11-05T15:30:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @ApiProperty({
    description: 'Notas adicionales sobre la ejecución',
    example: 'Transferencia completada exitosamente. Confirmación bancaria recibida.',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-11-05T15:30:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
