# 🗺️ ROADMAP OFICIAL - Emigrantes FT Backend API
## Basado en Requisitos Oficiales (PDFs en `/requisitos`)

**Empresa**: Emigrantes FT LLC
**Dirección**: 531 Palmetto Dr, Miami Springs, FL 33166
**Teléfono**: +1 (786) 839-1882
**Email**: emigrantesftllc@gmail.com

---

## 📋 RESUMEN DEL NEGOCIO

Emigrantes FT brinda un servicio de **representación por instrucciones del cliente** mediante un **Poder Notarial Duradero (POA)**, permitiendo que los emigrantes mantengan control total sobre sus cuentas y bienes desde cualquier parte del mundo, especialmente en casos de deportación, detención o incapacidad.

**Compromiso**: Actuar SOLO cuando el cliente lo instruye, SIN custodiar fondos.

---

## ✅ Fase 1: Sistema Base - COMPLETADA

- ✅ Autenticación JWT (access + refresh tokens)
- ✅ Registro con verificación de email (OTP)
- ✅ Cambio de contraseña seguro con OTP (2 pasos)
- ✅ Email service con Resend
- ✅ Arquitectura modular
- ✅ Documentación Swagger completa

**Estado**: ✅ **100% Completado**

---

## 🚀 Fase 2: Gestión de Usuarios y Perfiles

### Prioridad: **ALTA** 🔥
**Objetivo**: Sistema completo de usuarios con roles y área privada

### Módulo: `users`

#### Endpoints a Implementar:

**Gestión de Usuarios (Admin)**
- `GET /users` - Listar todos los usuarios (paginado, filtros)
- `GET /users/:id` - Ver perfil de usuario específico
- `PUT /users/:id` - Actualizar datos de usuario
- `DELETE /users/:id` - Eliminar usuario (soft delete)
- `GET /users/:id/activity` - Ver historial de actividad

**Perfil Propio (Cliente)**
- `GET /users/me/profile` - Ver mi perfil completo
- `PUT /users/me/profile` - Actualizar mi perfil
- `POST /users/me/upload-photo` - Subir foto de perfil (AWS S3 o local)
- `DELETE /users/me/photo` - Eliminar foto de perfil

**Verificación de Teléfono (SMS)**
- `POST /users/me/verify-phone/request` - Solicitar código OTP por SMS (Twilio)
- `POST /users/me/verify-phone/confirm` - Confirmar OTP de teléfono

#### Entidades:
```typescript
User (ya existe - extender):
- profilePhoto: string (URL)
- phoneVerified: boolean (ya existe)
- address: string
- city: string
- state: string
- zipCode: string
- country: string
- dateOfBirth: Date
- identificationNumber: string (encrypted)
```

#### Servicios Externos:
- **Twilio** para SMS (verificación de teléfono)
- **AWS S3** o almacenamiento local para fotos

**Tiempo estimado**: 3-4 días

---

## 🔥 Fase 3: Sistema de POA (Power of Attorney) - CORE DEL NEGOCIO

### Prioridad: **CRÍTICA** 🔥🔥🔥
**Objetivo**: Gestión completa del ciclo de vida de un POA

### Módulo: `poa`

#### Flujo del POA:

1. **Cliente crea solicitud** → Estado: `draft`
2. **Cliente completa datos y sube documentos** → Estado: `pending`
3. **Admin revisa** → Estado: `in_review`
4. **Admin aprueba/rechaza** → Estado: `approved` o `rejected`
5. **POA notariado** → Estado: `notarized`
6. **POA activado por evento (deportación, etc.)** → Estado: `activated`
7. **Instrucciones ejecutadas** → Estado: `executed`
8. **Servicio completado** → Estado: `completed`

#### Entidades:

**POA**
```typescript
{
  id: UUID
  clientId: UUID (User)
  assignedAdminId: UUID (User - admin/gestor)

  // Información del POA
  type: 'standard' | 'durable' | 'springing'
  status: 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' |
          'notarized' | 'activated' | 'executed' | 'completed' | 'cancelled'

  // Datos del cliente
  clientFullName: string
  clientAddress: string
  clientIdentification: string (encrypted)

  // Instrucciones confidenciales (encriptadas)
  instructions: JSON (encrypted)
  beneficiaries: JSON[] (encrypted)
  activationTriggers: string[] // deportación, incapacidad, ausencia

  // Seguimiento
  submittedAt: Date
  reviewedAt: Date
  approvedAt: Date
  notarizedAt: Date
  activatedAt: Date
  executedAt: Date

  // Notas y observaciones
  clientNotes: string
  adminNotes: string (private)
  rejectionReason: string

  // Auditoría
  createdAt: Date
  updatedAt: Date
  deletedAt: Date
}
```

**POADocument** (Documentos requeridos)
```typescript
{
  id: UUID
  poaId: UUID
  type: 'identification' | 'proof_of_address' | 'bank_statement' |
        'notarization' | 'activation_proof' | 'other'
  fileName: string
  fileUrl: string (AWS S3 o local)
  fileSize: number
  mimeType: string
  status: 'pending' | 'approved' | 'rejected'
  uploadedAt: Date
  reviewedAt: Date
}
```

**POAHistory** (Historial de cambios)
```typescript
{
  id: UUID
  poaId: UUID
  changedBy: UUID (User)
  previousStatus: string
  newStatus: string
  action: string // "submitted", "reviewed", "approved", "activated", etc.
  notes: string
  createdAt: Date
}
```

**POAExecution** (Ejecución de instrucciones)
```typescript
{
  id: UUID
  poaId: UUID
  executedBy: UUID (admin)
  executionType: 'bank_transaction' | 'document_delivery' |
                 'property_management' | 'other'
  description: string
  amount: number (si aplica)
  recipient: string
  proofDocuments: string[] (URLs)
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  executedAt: Date
  completedAt: Date
}
```

#### Endpoints:

**Gestión de POA (Cliente)**
- `POST /poa` - Crear nueva solicitud de POA
- `GET /poa` - Listar mis POAs
- `GET /poa/:id` - Ver POA específico
- `PUT /poa/:id` - Actualizar POA (solo en estado draft)
- `POST /poa/:id/submit` - Enviar POA a revisión (draft → pending)
- `POST /poa/:id/cancel` - Cancelar POA
- `GET /poa/:id/history` - Ver historial de cambios
- `GET /poa/:id/download` - Descargar PDF del POA

**Documentos (Cliente)**
- `POST /poa/:id/documents` - Subir documento
- `GET /poa/:id/documents` - Listar documentos del POA
- `DELETE /poa/:id/documents/:docId` - Eliminar documento

**Gestión de POA (Admin)**
- `GET /poa/all` - Listar todos los POAs (filtros por estado)
- `POST /poa/:id/assign` - Asignar POA a gestor
- `POST /poa/:id/review` - Marcar como en revisión
- `POST /poa/:id/approve` - Aprobar POA
- `POST /poa/:id/reject` - Rechazar POA (con motivo)
- `POST /poa/:id/notarize` - Marcar como notariado
- `POST /poa/:id/activate` - Activar POA (evento ocurrió)
- `POST /poa/:id/execute` - Registrar ejecución de instrucción
- `PUT /poa/:id/documents/:docId/status` - Aprobar/rechazar documento

**Reportes y Auditoría**
- `GET /poa/:id/report` - Generar reporte de actividad
- `GET /poa/:id/executions` - Ver todas las ejecuciones
- `GET /poa/:id/audit-trail` - Ver rastro completo de auditoría

#### Servicios Requeridos:
- **Encriptación** para instrucciones y datos sensibles
- **Generación de PDF** para el POA aprobado
- **Notificaciones** por Email/SMS/WhatsApp en cada cambio de estado
- **Almacenamiento seguro** (AWS S3 con encriptación)

**Tiempo estimado**: 7-10 días (es el módulo más complejo)

---

## 💳 Fase 4: Sistema de Pagos y Suscripciones

### Prioridad: **ALTA** 🔥
**Objetivo**: Procesar pagos del Plan Básico ($29/mes)

### Módulo: `payments`

#### Plan Actual:
- **Plan Básico**: $29 USD mensuales
- Incluye: POA estándar, custodia de instrucciones, 1 revisión anual, soporte básico

#### Entidades:

**Subscription** (Suscripción)
```typescript
{
  id: UUID
  userId: UUID
  plan: 'basic' (futuro: 'premium', 'enterprise')
  status: 'active' | 'cancelled' | 'suspended' | 'expired'
  price: 29.00
  currency: 'USD'

  // Pagos
  paymentMethod: 'stripe' | 'paypal' | 'zelle' | 'other'
  stripeSubscriptionId: string
  stripeCustomerId: string

  // Ciclo
  startDate: Date
  nextBillingDate: Date
  cancelledAt: Date

  createdAt: Date
  updatedAt: Date
}
```

**Payment** (Transacciones)
```typescript
{
  id: UUID
  userId: UUID
  subscriptionId: UUID

  amount: number
  currency: 'USD'
  status: 'pending' | 'completed' | 'failed' | 'refunded'

  provider: 'stripe' | 'paypal' | 'zelle'
  transactionId: string

  // Factura
  invoiceNumber: string (auto-generado)
  invoicePdfUrl: string

  paidAt: Date
  refundedAt: Date
  createdAt: Date
}
```

#### Endpoints:

**Suscripciones (Cliente)**
- `POST /subscriptions/create` - Crear suscripción (pagar plan)
- `GET /subscriptions/me` - Ver mi suscripción actual
- `POST /subscriptions/cancel` - Cancelar suscripción
- `POST /subscriptions/reactivate` - Reactivar suscripción cancelada

**Pagos (Cliente)**
- `GET /payments` - Ver historial de pagos
- `GET /payments/:id` - Ver pago específico
- `GET /payments/:id/invoice` - Descargar factura PDF
- `POST /payments/:id/request-refund` - Solicitar reembolso

**Webhooks**
- `POST /payments/stripe/webhook` - Webhook de Stripe
- `POST /payments/paypal/webhook` - Webhook de PayPal

**Admin**
- `GET /subscriptions/all` - Ver todas las suscripciones
- `POST /payments/:id/refund` - Procesar reembolso

#### Servicios Requeridos:
- **Stripe** para pagos con tarjeta
- **PayPal** (opcional)
- **Generación de PDF** para facturas

**Tiempo estimado**: 4-5 días

---

## 📅 Fase 5: Sistema de Citas (Calendario)

### Prioridad: **MEDIA**
**Objetivo**: Agendar llamadas y reuniones con clientes

### Módulo: `appointments`

#### Integración sugerida:
- **Calendly** (más rápido de integrar)
- O calendario propio con disponibilidad de gestores

#### Entidades:

**Appointment**
```typescript
{
  id: UUID
  clientId: UUID
  adminId: UUID (gestor asignado)
  poaId: UUID (opcional - relacionado a un POA)

  type: 'initial_consultation' | 'poa_review' | 'activation_meeting' | 'general'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

  scheduledAt: DateTime
  duration: number (minutos)
  timeZone: string

  meetingType: 'phone' | 'video' | 'in_person'
  meetingUrl: string (Zoom/Meet link)
  meetingNotes: string

  reminderSent: boolean
  cancelledBy: UUID
  cancelReason: string

  createdAt: Date
  updatedAt: Date
}
```

**AdminAvailability** (Disponibilidad de gestores)
```typescript
{
  id: UUID
  adminId: UUID
  dayOfWeek: 0-6 (0=domingo)
  startTime: Time
  endTime: Time
  isActive: boolean
}
```

#### Endpoints:

**Citas (Cliente)**
- `GET /appointments/availability` - Ver disponibilidad de gestores
- `POST /appointments` - Agendar cita
- `GET /appointments` - Mis citas
- `PUT /appointments/:id/reschedule` - Reagendar cita
- `DELETE /appointments/:id` - Cancelar cita

**Citas (Admin)**
- `GET /appointments/all` - Ver todas las citas
- `PUT /appointments/:id/confirm` - Confirmar cita
- `PUT /appointments/:id/complete` - Marcar como completada
- `PUT /availability` - Configurar disponibilidad

**Recordatorios automáticos**:
- Email 24h antes
- SMS 1h antes (opcional)

**Tiempo estimado**: 3-4 días

---

## 📁 Fase 6: Gestión de Documentos en Área Privada

### Prioridad: **MEDIA**
**Objetivo**: Área privada para que clientes vean documentos, estado de POA, facturas

### Módulo: `client-portal` (área privada)

#### Funcionalidades:

**Dashboard del Cliente** (`/client-portal/dashboard`)
- Resumen del estado de mi POA
- Últimos documentos subidos
- Próximas citas
- Estado de suscripción
- Últimos pagos

**Documentos** (`/client-portal/documents`)
- Ver documentos relacionados a mi POA
- Descargar POA aprobado (PDF)
- Subir nuevos documentos

**Facturas** (`/client-portal/invoices`)
- Historial de pagos
- Descargar facturas

**Estado del Servicio** (`/client-portal/poa-status`)
- Timeline visual del estado del POA
- Próximos pasos
- Notificaciones

#### Endpoints:

- `GET /client-portal/dashboard` - Dashboard completo
- `GET /client-portal/documents` - Mis documentos
- `GET /client-portal/poa-status` - Estado de mi POA
- `GET /client-portal/invoices` - Mis facturas
- `GET /client-portal/notifications` - Mis notificaciones

**Tiempo estimado**: 2-3 días

---

## 📱 Fase 7: Sistema de Notificaciones Multi-Canal

### Prioridad: **ALTA** 🔥
**Objetivo**: Notificar cambios de estado por Email, SMS y WhatsApp

### Módulo: `notifications`

#### Canales:
- ✅ **Email** (ya lo tenemos con Resend)
- **SMS** (Twilio)
- **WhatsApp** (Twilio o WhatsApp Business API)

#### Eventos que Generan Notificaciones:

**POA**
- POA creado
- POA en revisión
- POA aprobado
- POA rechazado
- POA activado
- Instrucción ejecutada

**Pagos**
- Pago exitoso
- Pago fallido
- Suscripción próxima a vencer
- Factura generada

**Citas**
- Cita agendada
- Recordatorio 24h antes
- Recordatorio 1h antes
- Cita cancelada

#### Entidades:

**Notification**
```typescript
{
  id: UUID
  userId: UUID
  type: 'poa_status' | 'payment' | 'appointment' | 'general'
  channel: 'email' | 'sms' | 'whatsapp' | 'push'

  subject: string
  message: string
  templateId: string

  status: 'pending' | 'sent' | 'failed' | 'read'
  sentAt: Date
  readAt: Date

  metadata: JSON
  createdAt: Date
}
```

**NotificationPreferences** (Preferencias del usuario)
```typescript
{
  userId: UUID
  emailEnabled: boolean
  smsEnabled: boolean
  whatsappEnabled: boolean

  poaUpdatesEnabled: boolean
  paymentAlertsEnabled: boolean
  appointmentRemindersEnabled: boolean
}
```

#### Endpoints:

- `GET /notifications` - Ver mis notificaciones
- `PUT /notifications/:id/read` - Marcar como leída
- `GET /notifications/preferences` - Ver preferencias
- `PUT /notifications/preferences` - Actualizar preferencias

#### Templates de Email/SMS/WhatsApp:
Crear templates para cada tipo de notificación.

**Tiempo estimado**: 4-5 días

---

## 📊 Fase 8: Reportes y Auditoría Documental

### Prioridad: **MEDIA**
**Objetivo**: Reportes de actividad y auditoría completa

### Módulo: `reports`

#### Reportes Disponibles:

**Para Clientes:**
- Reporte de actividad de mi POA
- Historial de ejecuciones
- Resumen de pagos

**Para Admins:**
- Dashboard de métricas generales
- POAs por estado
- Ingresos mensuales
- Actividad por gestor
- Reportes de auditoría

#### Endpoints:

- `GET /reports/poa/:id/activity` - Reporte de actividad de POA
- `GET /reports/poa/:id/audit-trail` - Rastro de auditoría completo
- `GET /reports/admin/dashboard` - Dashboard de admin
- `GET /reports/admin/revenue` - Reporte de ingresos
- `GET /reports/admin/poa-stats` - Estadísticas de POAs

**Tiempo estimado**: 2-3 días

---

## 🔒 Fase 9: Seguridad y Encriptación

### Prioridad: **ALTA** 🔥
**Objetivo**: Proteger datos sensibles

#### Implementaciones:

**Encriptación de Datos Sensibles**
- Instrucciones del POA (AES-256)
- Beneficiarios (AES-256)
- Número de identificación (AES-256)
- Documentos sensibles en S3

**Auditoría y Logs**
- Registrar TODA acción en POAs
- Logs de acceso a documentos
- Logs de cambios de estado

**Seguridad Adicional**
- Rate limiting por endpoint
- 2FA para admins (opcional)
- Backup automático de BD
- HTTPS obligatorio

**Compliance**
- GDPR (si aplica)
- Retención de datos
- Derecho al olvido

**Tiempo estimado**: 3-4 días

---

## 🧪 Fase 10: Testing

### Prioridad: **CONTINUA**
**Objetivo**: Asegurar calidad del código

#### Testing:
- Tests unitarios (servicios)
- Tests de integración (endpoints)
- Tests E2E (flujos completos)
- Cobertura mínima: 80%

**Tiempo estimado**: Continuo

---

## 📦 RESUMEN DE PRIORIDADES

### **IMPLEMENTACIÓN INMEDIATA** (Próximas 3-4 semanas):

1. **Usuarios** (3-4 días) - Perfiles completos
2. **POA** (7-10 días) 🔥🔥🔥 - **CORE DEL NEGOCIO**
3. **Pagos** (4-5 días) 🔥 - Monetización
4. **Notificaciones** (4-5 días) 🔥 - Comunicación crítica

**Total**: ~20-25 días

### **IMPLEMENTACIÓN CORTO PLAZO** (Mes 2):

5. **Citas** (3-4 días) - Gestión de reuniones
6. **Área Privada** (2-3 días) - Portal del cliente
7. **Reportes** (2-3 días) - Auditoría y transparencia

**Total**: ~7-10 días

### **IMPLEMENTACIÓN CONTINUA**:

8. **Seguridad** (3-4 días) - Protección de datos
9. **Testing** - Continuo

---

## 🎯 ORDEN RECOMENDADO DE IMPLEMENTACIÓN

Mi recomendación basada en los requisitos:

### **Semana 1-2**:
1. ✅ **Módulo de Usuarios** → Completar perfiles y verificación

### **Semana 2-4**:
2. ✅ **Módulo de POA** 🔥🔥🔥 → **ES EL CORAZÓN DEL NEGOCIO**
   - Crear/gestionar POAs
   - Estados y flujo completo
   - Documentos
   - Historial y auditoría

### **Semana 5**:
3. ✅ **Módulo de Pagos** 🔥 → Suscripción de $29/mes

### **Semana 6**:
4. ✅ **Módulo de Notificaciones** 🔥 → Email/SMS/WhatsApp

### **Semana 7-8**:
5. ✅ Citas + Área Privada + Reportes

### **Continuo**:
6. ✅ Seguridad y Testing

---

## 📝 NOTAS IMPORTANTES

### **Del documento de requisitos**:

1. **"Protegemos tu sacrificio"** - Slogan principal
2. **Sin custodiar fondos** - Emigrantes FT NO recibe ni mezcla fondos
3. **Solo actúa bajo instrucciones verificadas** del cliente
4. **Instrucciones selladas** hasta evento de activación
5. **Trazabilidad total** - Todo documentado
6. **Plan Básico**: $29/mes
7. **Botones**: "Pagar" y "Activar Plan"
8. **Estilo**: Moderno, azul oscuro (#0A1F44), dorado (#D4AF37), blanco

### **Integraciones Necesarias**:
- ✅ Resend (Email) - Ya implementado
- Twilio (SMS y WhatsApp)
- Stripe (Pagos)
- PayPal (Opcional)
- AWS S3 (Almacenamiento de documentos)
- Calendly (Citas) o calendario propio

---

**Última actualización**: 2025-11-02
**Versión**: v1.0.0 (Basado en requisitos oficiales)
**Fuente**: `/requisitos/Descripcion_Servicios_Emigrantes_FT.pdf` + `/requisitos/Informe_para_Desarrollador_Web_Emigrantes_FT.pdf`
