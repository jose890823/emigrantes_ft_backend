import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

/**
 * Controller for testing notification system
 * ONLY FOR DEVELOPMENT - Should be disabled in production
 */
@ApiTags('Notifications - Testing')
@Controller('notifications/test')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class NotificationsTestController {
  constructor(private eventEmitter: EventEmitter2) {}

  @Post('poa-lifecycle')
  @ApiOperation({
    summary: 'Test all POA lifecycle notifications',
    description:
      'Sends test emails for all POA lifecycle events using provided email addresses',
  })
  async testPoaLifecycle(@Body() body: { clientEmail: string; adminEmail: string }) {
    const { clientEmail, adminEmail } = body;

    // Crear datos de prueba
    const mockPoa = {
      id: 'TEST-POA-001',
      clientId: 'test-client-id',
      type: 'General',
      status: 'draft',
      clientFullName: 'John Doe',
      clientAddress: '123 Test Street, Miami, FL',
      createdAt: new Date(),
      updatedAt: new Date(),
      notarizedAt: new Date(),
      activatedAt: new Date(),
    };

    const mockClient = {
      id: 'test-client-id',
      email: clientEmail,
      firstName: 'John',
      lastName: 'Doe',
      role: 'client',
    };

    const mockAdmin = {
      id: 'test-admin-id',
      email: adminEmail,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    };

    const mockDocument = {
      id: 'test-doc-id',
      type: 'Identification',
      fileName: 'passport.pdf',
      uploadedAt: new Date(),
    };

    const mockInstruction = {
      id: 'test-instruction-id',
      title: 'Test Instruction',
      description: 'This is a test instruction',
      executedAt: new Date(),
    };

    const mockThread = {
      id: 'test-thread-id',
      title: 'Test Thread',
      createdAt: new Date(),
    };

    const mockMessage = {
      id: 'test-message-id',
      message: 'This is a test message',
      createdAt: new Date(),
    };

    const results: Array<{ event: string; status: string; to: string }> = [];

    try {
      // 1. POA Created (notifica a admins)
      this.eventEmitter.emit('poa.created', {
        poa: mockPoa,
        client: mockClient,
        createdAt: new Date(),
      });
      results.push({ event: 'poa.created', status: 'emitted', to: adminEmail });

      // 2. POA Submitted (notifica al cliente)
      this.eventEmitter.emit('poa.submitted', {
        poa: mockPoa,
        client: mockClient,
        submittedAt: new Date(),
      });
      results.push({ event: 'poa.submitted', status: 'emitted', to: clientEmail });

      // 3. POA Assigned (notifica al cliente)
      this.eventEmitter.emit('poa.assigned', {
        poa: mockPoa,
        client: mockClient,
        manager: mockAdmin,
        assignedAt: new Date(),
      });
      results.push({ event: 'poa.assigned', status: 'emitted', to: clientEmail });

      // 4. POA In Review (notifica al cliente)
      this.eventEmitter.emit('poa.in-review', {
        poa: mockPoa,
        client: mockClient,
        reviewedAt: new Date(),
      });
      results.push({ event: 'poa.in-review', status: 'emitted', to: clientEmail });

      // 5. POA Approved (notifica al cliente)
      this.eventEmitter.emit('poa.approved', {
        poa: mockPoa,
        client: mockClient,
        approvedBy: mockAdmin,
        approvedAt: new Date(),
      });
      results.push({ event: 'poa.approved', status: 'emitted', to: clientEmail });

      // 6. POA Rejected (notifica al cliente)
      this.eventEmitter.emit('poa.rejected', {
        poa: mockPoa,
        client: mockClient,
        rejectedBy: mockAdmin,
        rejectedAt: new Date(),
        reason: 'Información incompleta',
      });
      results.push({ event: 'poa.rejected', status: 'emitted', to: clientEmail });

      // 7. POA Notarized (notifica al cliente)
      this.eventEmitter.emit('poa.notarized', {
        poa: mockPoa,
        client: mockClient,
        notarizedBy: mockAdmin,
        notarizedAt: new Date(),
      });
      results.push({ event: 'poa.notarized', status: 'emitted', to: clientEmail });

      // 8. POA Activated (notifica al cliente)
      this.eventEmitter.emit('poa.activated', {
        poa: mockPoa,
        client: mockClient,
        activatedBy: mockAdmin,
        activatedAt: new Date(),
      });
      results.push({ event: 'poa.activated', status: 'emitted', to: clientEmail });

      // 9. POA Instruction Executed (notifica al cliente)
      this.eventEmitter.emit('poa.executed', {
        poa: mockPoa,
        client: mockClient,
        instruction: mockInstruction,
        executedBy: mockAdmin,
        executedAt: new Date(),
        executionNotes: 'Instrucción ejecutada exitosamente',
      });
      results.push({ event: 'poa.executed', status: 'emitted', to: clientEmail });

      // 10. POA Completed (notifica al cliente)
      this.eventEmitter.emit('poa.completed', {
        poa: mockPoa,
        client: mockClient,
        completedBy: mockAdmin,
        completedAt: new Date(),
      });
      results.push({ event: 'poa.completed', status: 'emitted', to: clientEmail });

      // 11. Document Uploaded (notifica a cliente y manager)
      this.eventEmitter.emit('document.uploaded', {
        poa: mockPoa,
        client: mockClient,
        document: mockDocument,
        uploadedAt: new Date(),
        uploadedBy: mockClient,
      });
      results.push({ event: 'document.uploaded', status: 'emitted', to: `${clientEmail}, ${adminEmail}` });

      // 12. Document Approved (notifica al cliente)
      this.eventEmitter.emit('document.approved', {
        poa: mockPoa,
        client: mockClient,
        document: mockDocument,
        approvedBy: mockAdmin,
        approvedAt: new Date(),
      });
      results.push({ event: 'document.approved', status: 'emitted', to: clientEmail });

      // 13. Document Rejected (notifica al cliente)
      this.eventEmitter.emit('document.rejected', {
        poa: mockPoa,
        client: mockClient,
        document: mockDocument,
        rejectedBy: mockAdmin,
        rejectedAt: new Date(),
        reason: 'Documento ilegible',
      });
      results.push({ event: 'document.rejected', status: 'emitted', to: clientEmail });

      // 14. Message Received by Client (admin envió mensaje)
      this.eventEmitter.emit('message.received', {
        poa: mockPoa,
        thread: mockThread,
        message: mockMessage,
        sender: mockAdmin,
        recipient: mockClient,
      });
      results.push({ event: 'message.received (client)', status: 'emitted', to: clientEmail });

      // 15. Message Received by Admin (cliente envió mensaje)
      this.eventEmitter.emit('message.received', {
        poa: mockPoa,
        thread: mockThread,
        message: mockMessage,
        sender: mockClient,
        recipient: mockAdmin,
      });
      results.push({ event: 'message.received (admin)', status: 'emitted', to: adminEmail });

      return {
        success: true,
        message: `15 notification events emitted. Check your emails at ${clientEmail} and ${adminEmail}`,
        results,
        note: 'Emails may take a few seconds to arrive. Check spam folder if not received.',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error emitting events',
        error: error.message,
        results,
      };
    }
  }

  @Post('single-event')
  @ApiOperation({
    summary: 'Test a single notification event',
    description: 'Send a test email for a specific event type',
  })
  async testSingleEvent(
    @Body()
    body: {
      eventType: string;
      clientEmail: string;
      adminEmail?: string;
    },
  ) {
    const { eventType, clientEmail, adminEmail } = body;

    const mockPoa = {
      id: 'TEST-POA-SINGLE',
      clientId: 'test-client-id',
      type: 'General',
      status: 'draft',
      clientFullName: 'John Doe Test',
      clientAddress: '123 Test Street, Miami, FL',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockClient = {
      id: 'test-client-id',
      email: clientEmail,
      firstName: 'John',
      lastName: 'Doe',
      role: 'client',
    };

    const mockAdmin = {
      id: 'test-admin-id',
      email: adminEmail || 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    };

    try {
      switch (eventType) {
        case 'poa.approved':
          this.eventEmitter.emit('poa.approved', {
            poa: mockPoa,
            client: mockClient,
            approvedBy: mockAdmin,
            approvedAt: new Date(),
          });
          break;

        case 'poa.rejected':
          this.eventEmitter.emit('poa.rejected', {
            poa: mockPoa,
            client: mockClient,
            rejectedBy: mockAdmin,
            rejectedAt: new Date(),
            reason: 'Test rejection reason',
          });
          break;

        case 'poa.submitted':
          this.eventEmitter.emit('poa.submitted', {
            poa: mockPoa,
            client: mockClient,
            submittedAt: new Date(),
          });
          break;

        default:
          return {
            success: false,
            message: `Unknown event type: ${eventType}`,
            availableEvents: [
              'poa.approved',
              'poa.rejected',
              'poa.submitted',
              'poa.assigned',
              'poa.created',
            ],
          };
      }

      return {
        success: true,
        message: `Event ${eventType} emitted successfully`,
        sentTo: clientEmail,
        note: 'Check your email inbox (and spam folder)',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error emitting event',
        error: error.message,
      };
    }
  }
}
