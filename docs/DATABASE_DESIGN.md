# Diseño de Base de Datos - Emigrantes FT

**Base de datos:** PostgreSQL
**Nombre:** `emigrantes_ft`
**ORM:** TypeORM
**Charset:** UTF-8

---

## 📋 Índice de Entidades

1. [Users](#1-users) - Sistema de usuarios y autenticación
2. [Clients](#2-clients) - Clientes del servicio
3. [POA (Power of Attorney)](#3-poa-power-of-attorney) - Poderes notariales
4. [Instructions](#4-instructions) - Instrucciones financieras
5. [Beneficiaries](#5-beneficiaries) - Beneficiarios de instrucciones
6. [Activations](#6-activations) - Eventos de activación
7. [Executions](#7-executions) - Ejecución de instrucciones
8. [Reports](#8-reports) - Reportes y auditoría
9. [Payments](#9-payments) - Pagos y suscripciones
10. [Appointments](#10-appointments) - Citas y llamadas
11. [Documents](#11-documents) - Documentos y archivos
12. [Notifications](#12-notifications) - Notificaciones

---

## 1. Users

Sistema de autenticación y gestión de usuarios del sistema (admin, staff, clients).

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string; // Único, usado para login

  @Column({ type: 'varchar', length: 255 })
  password: string; // Hash bcrypt

  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @Column({ type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string; // Formato internacional

  @Column({
    type: 'enum',
    enum: ['super_admin', 'admin', 'staff', 'client']
  })
  role: string;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  refreshToken: string; // JWT refresh token

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiresAt: Date;

  @Column({ type: 'varchar', length: 6, nullable: true })
  otpCode: string; // Código OTP para 2FA

  @Column({ type: 'timestamp', nullable: true })
  otpExpiresAt: Date;

  @Column({ type: 'int', default: 0 })
  otpAttempts: number; // Contador de intentos

  @Column({ type: 'varchar', length: 255, nullable: true })
  resetPasswordToken: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date; // Soft delete

  // Relaciones
  @OneToOne(() => Client, client => client.user)
  client: Client;
}
```

**Índices:**
- UNIQUE: `email`
- INDEX: `role`, `isActive`

---

## 2. Clients

Información detallada de los clientes del servicio.

```typescript
@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  clientCode: string; // Código único del cliente (ej: EMG-2025-001)

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  countryOfResidence: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  idType: string; // 'passport', 'ssn', 'license', etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  idNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emergencyContactName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  emergencyContactPhone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  emergencyContactRelationship: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'pending_verification'
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date; // Fecha de verificación KYC

  @Column({ type: 'varchar', length: 255, nullable: true })
  verifiedBy: string; // ID del admin que verificó

  @Column({ type: 'text', nullable: true })
  notes: string; // Notas internas del staff

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relaciones
  @OneToOne(() => User, user => user.client)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => POA, poa => poa.client)
  poas: POA[];

  @OneToMany(() => Instruction, instruction => instruction.client)
  instructions: Instruction[];

  @OneToMany(() => Payment, payment => payment.client)
  payments: Payment[];

  @OneToMany(() => Appointment, appointment => appointment.client)
  appointments: Appointment[];
}
```

**Índices:**
- UNIQUE: `clientCode`, `userId`
- INDEX: `status`, `verifiedAt`

---

## 3. POA (Power of Attorney)

Poderes notariales duraderos registrados.

```typescript
@Entity('poas')
export class POA {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  poaNumber: string; // Número único del POA (ej: POA-FL-2025-001)

  @Column({ type: 'varchar', length: 255 })
  principalName: string; // Nombre del otorgante (principal)

  @Column({ type: 'varchar', length: 255 })
  agentName: string; // Nombre del apoderado (Emigrantes FT)

  @Column({ type: 'date' })
  executionDate: Date; // Fecha de firma

  @Column({ type: 'date', nullable: true })
  effectiveDate: Date; // Fecha de entrada en vigor

  @Column({ type: 'date', nullable: true })
  expirationDate: Date; // Fecha de vencimiento (null = indefinido)

  @Column({ type: 'varchar', length: 100 })
  stateOfExecution: string; // Estado donde se ejecutó (ej: Florida)

  @Column({ type: 'varchar', length: 255, nullable: true })
  notaryName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  notaryNumber: string;

  @Column({ type: 'text', array: true, default: [] })
  powers: string[]; // Array de poderes otorgados
  // Ejemplo: ['financial_transactions', 'banking', 'real_estate', etc.]

  @Column({
    type: 'enum',
    enum: ['draft', 'pending_signature', 'active', 'revoked', 'expired'],
    default: 'draft'
  })
  status: string;

  @Column({ type: 'boolean', default: false })
  isDurable: boolean; // POA duradero o no

  @Column({ type: 'boolean', default: false })
  bankValidated: boolean; // Validado por banco

  @Column({ type: 'timestamp', nullable: true })
  bankValidatedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName: string; // Banco que validó

  @Column({ type: 'date', nullable: true })
  revokedAt: Date;

  @Column({ type: 'text', nullable: true })
  revocationReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relaciones
  @ManyToOne(() => Client, client => client.poas)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @OneToMany(() => Document, document => document.poa)
  documents: Document[];
}
```

**Índices:**
- UNIQUE: `poaNumber`
- INDEX: `clientId`, `status`, `executionDate`

---

## 4. Instructions

Instrucciones financieras selladas de los clientes.

```typescript
@Entity('instructions')
export class Instruction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'uuid', nullable: true })
  poaId: string; // POA asociado

  @Column({ type: 'varchar', length: 50, unique: true })
  instructionCode: string; // Código único (ej: INST-2025-001)

  @Column({ type: 'varchar', length: 255 })
  title: string; // Título descriptivo

  @Column({ type: 'text' })
  description: string; // Descripción detallada

  @Column({ type: 'text' })
  encryptedInstructions: string; // Instrucciones cifradas

  @Column({ type: 'text', array: true, default: [] })
  triggerConditions: string[]; // Condiciones de activación
  // Ejemplo: ['deportation', 'detention', 'incapacity', 'absence']

  @Column({ type: 'varchar', length: 255, nullable: true })
  triggerDocumentation: string; // Documentación requerida para activar

  @Column({
    type: 'enum',
    enum: ['sealed', 'activated', 'executing', 'completed', 'cancelled'],
    default: 'sealed'
  })
  status: string;

  @Column({ type: 'int', default: 0 })
  priority: number; // Prioridad de ejecución

  @Column({ type: 'timestamp', nullable: true })
  activatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'date', nullable: true })
  expirationDate: Date; // Fecha de expiración (opcional)

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relaciones
  @ManyToOne(() => Client, client => client.instructions)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @ManyToOne(() => POA)
  @JoinColumn({ name: 'poaId' })
  poa: POA;

  @OneToMany(() => Beneficiary, beneficiary => beneficiary.instruction)
  beneficiaries: Beneficiary[];

  @OneToMany(() => Activation, activation => activation.instruction)
  activations: Activation[];

  @OneToMany(() => Execution, execution => execution.instruction)
  executions: Execution[];
}
```

**Índices:**
- UNIQUE: `instructionCode`
- INDEX: `clientId`, `status`, `activatedAt`

---

## 5. Beneficiaries

Beneficiarios de las instrucciones.

```typescript
@Entity('beneficiaries')
export class Beneficiary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  instructionId: string;

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 100 })
  relationship: string; // Relación con el cliente

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  idType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  idNumber: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentage: number; // Porcentaje de distribución (si aplica)

  @Column({ type: 'text', nullable: true })
  specificInstructions: string; // Instrucciones específicas para este beneficiario

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Instruction, instruction => instruction.beneficiaries)
  @JoinColumn({ name: 'instructionId' })
  instruction: Instruction;
}
```

**Índices:**
- INDEX: `instructionId`, `isActive`

---

## 6. Activations

Eventos de activación de instrucciones.

```typescript
@Entity('activations')
export class Activation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  instructionId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  activationCode: string; // Código único (ej: ACT-2025-001)

  @Column({ type: 'varchar', length: 100 })
  triggerType: string; // Tipo de evento
  // 'deportation', 'detention', 'incapacity', 'absence', 'manual'

  @Column({ type: 'text' })
  description: string; // Descripción del evento

  @Column({ type: 'timestamp' })
  eventDate: Date; // Fecha del evento

  @Column({ type: 'timestamp' })
  reportedAt: Date; // Fecha de reporte

  @Column({ type: 'uuid', nullable: true })
  reportedBy: string; // Usuario que reportó

  @Column({
    type: 'enum',
    enum: ['pending_verification', 'verified', 'rejected', 'approved'],
    default: 'pending_verification'
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy: string; // Admin que verificó

  @Column({ type: 'text', nullable: true })
  verificationNotes: string;

  @Column({ type: 'boolean', default: false })
  documentationComplete: boolean;

  @Column({ type: 'boolean', default: false })
  clientNotified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  clientNotifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Instruction, instruction => instruction.activations)
  @JoinColumn({ name: 'instructionId' })
  instruction: Instruction;

  @OneToMany(() => Document, document => document.activation)
  documents: Document[]; // Documentación del evento

  @OneToMany(() => Execution, execution => execution.activation)
  executions: Execution[];
}
```

**Índices:**
- UNIQUE: `activationCode`
- INDEX: `instructionId`, `status`, `eventDate`

---

## 7. Executions

Ejecución paso a paso de las instrucciones.

```typescript
@Entity('executions')
export class Execution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  instructionId: string;

  @Column({ type: 'uuid' })
  activationId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  executionCode: string; // Código único (ej: EXEC-2025-001)

  @Column({ type: 'int' })
  stepNumber: number; // Número de paso

  @Column({ type: 'varchar', length: 255 })
  stepTitle: string;

  @Column({ type: 'text' })
  stepDescription: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  executedBy: string; // Staff que ejecutó

  @Column({ type: 'text', nullable: true })
  executionNotes: string;

  @Column({ type: 'jsonb', nullable: true })
  executionData: any; // Datos adicionales de la ejecución

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ type: 'boolean', default: false })
  approved: boolean;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Instruction, instruction => instruction.executions)
  @JoinColumn({ name: 'instructionId' })
  instruction: Instruction;

  @ManyToOne(() => Activation, activation => activation.executions)
  @JoinColumn({ name: 'activationId' })
  activation: Activation;

  @OneToMany(() => Document, document => document.execution)
  documents: Document[]; // Evidencia de ejecución
}
```

**Índices:**
- UNIQUE: `executionCode`
- INDEX: `instructionId`, `activationId`, `status`, `stepNumber`

---

## 8. Reports

Reportes y auditoría documental.

```typescript
@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  reportCode: string; // Código único (ej: REP-2025-001)

  @Column({ type: 'varchar', length: 100 })
  reportType: string; // 'monthly', 'quarterly', 'annual', 'execution', 'audit'

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ type: 'jsonb' })
  data: any; // Datos del reporte en formato JSON

  @Column({
    type: 'enum',
    enum: ['draft', 'generated', 'sent', 'viewed'],
    default: 'draft'
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  generatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  generatedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  viewedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdfPath: string; // Ruta del PDF generado

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;
}
```

**Índices:**
- UNIQUE: `reportCode`
- INDEX: `clientId`, `reportType`, `status`, `periodEnd`

---

## 9. Payments

Pagos y suscripciones.

```typescript
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  paymentCode: string; // Código único (ej: PAY-2025-001)

  @Column({ type: 'varchar', length: 100 })
  paymentMethod: string; // 'stripe', 'paypal', 'zelle', 'bank_transfer'

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string; // ID de Stripe, PayPal, etc.

  @Column({ type: 'varchar', length: 100 })
  planType: string; // 'basic', 'premium', etc.

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string; // USD, EUR, etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'date' })
  billingPeriodStart: Date;

  @Column({ type: 'date' })
  billingPeriodEnd: Date;

  @Column({ type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ type: 'date', nullable: true })
  nextBillingDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  invoiceUrl: string;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Metadatos adicionales del pago

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Client, client => client.payments)
  @JoinColumn({ name: 'clientId' })
  client: Client;
}
```

**Índices:**
- UNIQUE: `paymentCode`, `externalId`
- INDEX: `clientId`, `status`, `paidAt`, `nextBillingDate`

---

## 10. Appointments

Citas y llamadas agendadas.

```typescript
@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'uuid', nullable: true })
  assignedTo: string; // Staff asignado

  @Column({ type: 'varchar', length: 50, unique: true })
  appointmentCode: string; // Código único (ej: APT-2025-001)

  @Column({ type: 'varchar', length: 100 })
  type: string; // 'consultation', 'poa_signing', 'follow_up', 'video_call', etc.

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'int', default: 30 })
  durationMinutes: number;

  @Column({ type: 'varchar', length: 50 })
  meetingType: string; // 'in_person', 'phone', 'video', 'email'

  @Column({ type: 'varchar', length: 500, nullable: true })
  meetingUrl: string; // URL para videollamada

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string; // Para citas presenciales

  @Column({
    type: 'enum',
    enum: ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'scheduled'
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'boolean', default: false })
  reminderSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Client, client => client.appointments)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedTo' })
  assignedUser: User;
}
```

**Índices:**
- UNIQUE: `appointmentCode`
- INDEX: `clientId`, `assignedTo`, `status`, `scheduledAt`

---

## 11. Documents

Gestión de documentos y archivos.

```typescript
@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  documentCode: string; // Código único (ej: DOC-2025-001)

  @Column({ type: 'varchar', length: 100 })
  documentType: string;
  // 'poa', 'id', 'proof_of_address', 'instruction', 'execution_evidence',
  // 'activation_proof', 'report', 'invoice', etc.

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 500 })
  filePath: string; // Ruta en el storage

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number; // En bytes

  @Column({ type: 'varchar', length: 64, nullable: true })
  fileHash: string; // SHA-256 para verificación de integridad

  @Column({ type: 'uuid', nullable: true })
  uploadedBy: string;

  @Column({ type: 'uuid', nullable: true })
  clientId: string; // Cliente dueño del documento

  @Column({ type: 'uuid', nullable: true })
  poaId: string; // Si está asociado a un POA

  @Column({ type: 'uuid', nullable: true })
  activationId: string; // Si está asociado a una activación

  @Column({ type: 'uuid', nullable: true })
  executionId: string; // Si está asociado a una ejecución

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean; // Verificado por staff

  @Column({ type: 'uuid', nullable: true })
  verifiedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'boolean', default: false })
  isConfidential: boolean; // Documento confidencial

  @Column({ type: 'date', nullable: true })
  expirationDate: Date; // Para documentos con vencimiento

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relaciones
  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @ManyToOne(() => POA, poa => poa.documents)
  @JoinColumn({ name: 'poaId' })
  poa: POA;

  @ManyToOne(() => Activation, activation => activation.documents)
  @JoinColumn({ name: 'activationId' })
  activation: Activation;

  @ManyToOne(() => Execution, execution => execution.documents)
  @JoinColumn({ name: 'executionId' })
  execution: Execution;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedBy' })
  uploader: User;
}
```

**Índices:**
- UNIQUE: `documentCode`
- INDEX: `clientId`, `poaId`, `activationId`, `executionId`, `documentType`, `isVerified`

---

## 12. Notifications

Notificaciones enviadas.

```typescript
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string; // Usuario destinatario

  @Column({ type: 'uuid', nullable: true })
  clientId: string; // Cliente destinatario

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'email', 'sms', 'whatsapp', 'push'

  @Column({ type: 'varchar', length: 100 })
  category: string;
  // 'account', 'payment', 'appointment', 'activation', 'execution', 'report', etc.

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 255 })
  recipient: string; // Email, phone, etc.

  @Column({
    type: 'enum',
    enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
    default: 'pending'
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string; // ID del proveedor externo

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Metadatos adicionales

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;
}
```

**Índices:**
- INDEX: `userId`, `clientId`, `status`, `type`, `category`, `sentAt`

---

## 📊 Diagrama de Relaciones

```
User (1) --- (1) Client
              |
              |--- (N) POA
              |--- (N) Instruction
              |       |
              |       |--- (N) Beneficiary
              |       |--- (N) Activation
              |       |       |
              |       |       |--- (N) Document
              |       |       |--- (N) Execution
              |       |               |
              |       |               |--- (N) Document
              |       |
              |       |--- (N) Execution
              |
              |--- (N) Payment
              |--- (N) Appointment
              |--- (N) Report
              |--- (N) Document

POA (1) --- (N) Document
```

---

## 🔐 Seguridad y Encriptación

### Campos que requieren encriptación:
1. **Instructions.encryptedInstructions** - AES-256
2. **User.password** - bcrypt (10 rounds mínimo)
3. **User.refreshToken** - JWT firmado
4. **Client.idNumber** - AES-256 (opcional)

### Soft Delete:
Todas las entidades principales tienen `deletedAt` para soft delete.

---

## 📝 Notas Importantes

1. **UUID v4** para todos los IDs primarios
2. **Timestamps** en UTC
3. **Soft delete** habilitado en entidades principales
4. **Índices** en campos de búsqueda frecuente
5. **JSONB** para datos flexibles (PostgreSQL)
6. **Enums** para estados limitados
7. **Relaciones** con cascade según necesidad

---

## 🚀 Siguientes Pasos

1. Crear migraciones TypeORM
2. Implementar seeds para desarrollo
3. Configurar variables de entorno
4. Implementar módulos siguiendo este esquema
