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

export enum POADocumentType {
  IDENTIFICATION = 'identification',
  PROOF_OF_ADDRESS = 'proof_of_address',
  BANK_STATEMENT = 'bank_statement',
  NOTARIZATION = 'notarization',
  ACTIVATION_PROOF = 'activation_proof',
  OTHER = 'other',
}

export enum POADocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('poa_documents')
export class POADocument {
  @ApiProperty({
    description: 'ID único del documento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIÓN CON POA
  // ============================================

  @ApiProperty({
    description: 'ID del POA al que pertenece el documento',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @Column({ type: 'uuid' })
  poaId: string;

  @ManyToOne(() => POA, (poa) => poa.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poaId' })
  poa: POA;

  // ============================================
  // INFORMACIÓN DEL DOCUMENTO
  // ============================================

  @ApiProperty({
    description: 'Tipo de documento',
    enum: POADocumentType,
    example: POADocumentType.IDENTIFICATION,
  })
  @Column({
    type: 'enum',
    enum: POADocumentType,
  })
  type: POADocumentType;

  @ApiProperty({
    description: 'Nombre original del archivo',
    example: 'cedula_juan_perez.pdf',
  })
  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @ApiProperty({
    description: 'URL del archivo almacenado (S3 o local)',
    example: 'https://s3.amazonaws.com/emigrantes-ft/documents/abc123.pdf',
  })
  @Column({ type: 'text' })
  fileUrl: string;

  @ApiProperty({
    description: 'Tamaño del archivo en bytes',
    example: 2048576,
  })
  @Column({ type: 'bigint' })
  fileSize: number;

  @ApiProperty({
    description: 'Tipo MIME del archivo',
    example: 'application/pdf',
  })
  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @ApiProperty({
    description: 'Estado de revisión del documento',
    enum: POADocumentStatus,
    example: POADocumentStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: POADocumentStatus,
    default: POADocumentStatus.PENDING,
  })
  status: POADocumentStatus;

  // ============================================
  // SEGUIMIENTO
  // ============================================

  @ApiProperty({
    description: 'Fecha de subida del documento',
    example: '2025-11-01T10:00:00Z',
  })
  @CreateDateColumn()
  uploadedAt: Date;

  @ApiProperty({
    description: 'Fecha de revisión del documento',
    example: '2025-11-02T10:00:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @ApiProperty({
    description: 'Notas del revisor sobre el documento',
    example: 'Documento válido hasta 2026',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  reviewNotes: string | null;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-11-02T10:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
