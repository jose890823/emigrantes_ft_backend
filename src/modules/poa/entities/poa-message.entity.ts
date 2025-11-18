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
import { POAThread } from './poa-thread.entity';
import { User } from '../../auth/entities/user.entity';

export enum MessageSenderType {
  ADMIN = 'admin',
  CLIENT = 'client',
}

@Entity('poa_messages')
export class POAMessage {
  @ApiProperty({
    description: 'ID único del mensaje',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiProperty({
    description: 'ID del hilo (thread) al que pertenece',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  threadId: string | null;

  @ManyToOne(() => POAThread, (thread) => thread.messages, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'threadId' })
  thread: POAThread | null;

  @ApiProperty({
    description: 'ID del POA relacionado (denormalizado para queries rápidas)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @Column({ type: 'uuid' })
  poaId: string;

  @ManyToOne(() => POA, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poaId' })
  poa: POA;

  @ApiProperty({
    description: 'ID del usuario que envía el mensaje',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @Column({ type: 'uuid' })
  senderId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  // ============================================
  // INFORMACIÓN DEL MENSAJE
  // ============================================

  @ApiProperty({
    description: 'Tipo de remitente',
    enum: MessageSenderType,
    example: MessageSenderType.ADMIN,
  })
  @Column({
    type: 'enum',
    enum: MessageSenderType,
  })
  senderType: MessageSenderType;

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Necesitamos que adjuntes tu identificación oficial para poder continuar con el proceso de aprobación.',
  })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({
    description: 'Indica si el mensaje ha sido leído',
    example: false,
  })
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @ApiProperty({
    description: 'Fecha en que el mensaje fue leído',
    example: '2025-11-17T10:30:00Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  // ============================================
  // AUDITORÍA
  // ============================================

  @ApiProperty({
    description: 'Fecha de creación del mensaje',
    example: '2025-11-17T10:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-11-17T10:30:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
