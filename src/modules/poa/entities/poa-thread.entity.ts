import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { POA } from './poa.entity';
import { User } from '../../auth/entities/user.entity';
import { POAMessage } from './poa-message.entity';

export enum ThreadType {
  GENERAL = 'general',
  QUESTION = 'question',
  REQUEST_DOCUMENT = 'request_document',
  STATUS_UPDATE = 'status_update',
}

export enum ThreadStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum ThreadCreatedBy {
  ADMIN = 'admin',
  CLIENT = 'client',
}

@Entity('poa_threads')
export class POAThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  poaId: string;

  @ManyToOne(() => POA)
  @JoinColumn({ name: 'poaId' })
  poa: POA;

  @Column('uuid')
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({
    type: 'enum',
    enum: ThreadCreatedBy,
  })
  createdByType: ThreadCreatedBy;

  @Column({
    type: 'enum',
    enum: ThreadType,
  })
  type: ThreadType;

  @Column()
  subject: string;

  @Column({
    type: 'enum',
    enum: ThreadStatus,
    default: ThreadStatus.OPEN,
  })
  status: ThreadStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ default: 0 })
  messageCount: number;

  @Column({ default: 0 })
  unreadCount: number;

  @OneToMany(() => POAMessage, (message) => message.thread)
  messages: POAMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
