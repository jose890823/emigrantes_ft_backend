import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { POA } from './poa.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('poa_history')
export class POAHistory {
  @ApiProperty({
    description: 'ID único del registro de historial',
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

  @ManyToOne(() => POA, (poa) => poa.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poaId' })
  poa: POA;

  @ApiProperty({
    description: 'ID del usuario que realizó el cambio',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @Column({ type: 'uuid' })
  changedBy: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'changedBy' })
  changedByUser: User;

  // ============================================
  // INFORMACIÓN DEL CAMBIO
  // ============================================

  @ApiProperty({
    description: 'Estado anterior del POA',
    example: 'draft',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  previousStatus: string | null;

  @ApiProperty({
    description: 'Nuevo estado del POA',
    example: 'pending',
  })
  @Column({ type: 'varchar', length: 50 })
  newStatus: string;

  @ApiProperty({
    description: 'Acción realizada',
    example: 'submitted',
  })
  @Column({ type: 'varchar', length: 100 })
  action: string;

  @ApiProperty({
    description: 'Notas adicionales sobre el cambio',
    example: 'POA enviado a revisión. Todos los documentos completos.',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    description: 'Metadata adicional del cambio (JSON)',
    example: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0...' },
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // ============================================
  // AUDITORÍA
  // ============================================

  @ApiProperty({
    description: 'Fecha del cambio',
    example: '2025-11-01T10:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;
}
