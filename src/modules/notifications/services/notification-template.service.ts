import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto/template.dto';
import {
  NotificationChannel,
  NotificationCategory,
} from '../entities/notification.entity';

/**
 * Service for managing notification templates
 */
@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
  ) {}

  /**
   * Create a new template
   */
  async create(createDto: CreateTemplateDto): Promise<NotificationTemplate> {
    // Check if template code already exists
    const existing = await this.templateRepository.findOne({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Template with code '${createDto.code}' already exists`,
      );
    }

    const template = this.templateRepository.create({
      code: createDto.code,
      name: createDto.name,
      description: createDto.description,
      channel: createDto.channel,
      category: createDto.category,
      subject: createDto.subject,
      body: createDto.body,
      bodyHtml: createDto.bodyHtml,
      variables: createDto.variables,
      channelConfig: createDto.channelConfig,
      isActive: createDto.isActive ?? true,
      locale: createDto.locale ?? 'en',
      isSystem: false, // User-created templates are never system templates
      usageCount: 0,
    });

    const saved = await this.templateRepository.save(template);
    this.logger.log(`✅ Template '${saved.code}' created successfully`);
    return saved;
  }

  /**
   * Find all templates with optional filters
   */
  async findAll(filters?: {
    channel?: NotificationChannel;
    category?: NotificationCategory;
    isActive?: boolean;
    locale?: string;
  }): Promise<NotificationTemplate[]> {
    const query = this.templateRepository.createQueryBuilder('template');

    if (filters?.channel) {
      query.andWhere('template.channel = :channel', {
        channel: filters.channel,
      });
    }

    if (filters?.category) {
      query.andWhere('template.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('template.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.locale) {
      query.andWhere('template.locale = :locale', { locale: filters.locale });
    }

    query.orderBy('template.name', 'ASC');

    return query.getMany();
  }

  /**
   * Find template by ID
   */
  async findById(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });

    if (!template) {
      throw new NotFoundException(`Template with ID '${id}' not found`);
    }

    return template;
  }

  /**
   * Find template by code
   */
  async findByCode(code: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { code },
    });

    if (!template) {
      throw new NotFoundException(`Template with code '${code}' not found`);
    }

    return template;
  }

  /**
   * Update template
   */
  async update(
    id: string,
    updateDto: UpdateTemplateDto,
  ): Promise<NotificationTemplate> {
    const template = await this.findById(id);

    // Prevent updating system templates
    if (template.isSystem) {
      throw new BadRequestException(
        'System templates cannot be modified. Clone it to create a custom version.',
      );
    }

    // Update fields
    if (updateDto.name) template.name = updateDto.name;
    if (updateDto.description !== undefined)
      template.description = updateDto.description;
    if (updateDto.subject) template.subject = updateDto.subject;
    if (updateDto.body) template.body = updateDto.body;
    if (updateDto.bodyHtml !== undefined)
      template.bodyHtml = updateDto.bodyHtml;
    if (updateDto.variables) template.variables = updateDto.variables;
    if (updateDto.channelConfig !== undefined)
      template.channelConfig = updateDto.channelConfig;
    if (updateDto.isActive !== undefined) template.isActive = updateDto.isActive;
    if (updateDto.locale) template.locale = updateDto.locale;

    const saved = await this.templateRepository.save(template);
    this.logger.log(`✅ Template '${saved.code}' updated successfully`);
    return saved;
  }

  /**
   * Delete template
   */
  async delete(id: string): Promise<void> {
    const template = await this.findById(id);

    // Prevent deleting system templates
    if (template.isSystem) {
      throw new BadRequestException('System templates cannot be deleted');
    }

    await this.templateRepository.remove(template);
    this.logger.log(`❌ Template '${template.code}' deleted successfully`);
  }

  /**
   * Clone template (useful for customizing system templates)
   */
  async clone(id: string, newCode: string): Promise<NotificationTemplate> {
    const original = await this.findById(id);

    // Check if new code already exists
    const existing = await this.templateRepository.findOne({
      where: { code: newCode },
    });

    if (existing) {
      throw new ConflictException(
        `Template with code '${newCode}' already exists`,
      );
    }

    const cloned = this.templateRepository.create({
      code: newCode,
      name: `${original.name} (Copy)`,
      description: original.description,
      channel: original.channel,
      category: original.category,
      subject: original.subject,
      body: original.body,
      bodyHtml: original.bodyHtml,
      variables: original.variables,
      channelConfig: original.channelConfig,
      isActive: original.isActive,
      locale: original.locale,
      isSystem: false, // Clones are never system templates
      usageCount: 0,
    });

    const saved = await this.templateRepository.save(cloned);
    this.logger.log(
      `✅ Template '${original.code}' cloned to '${saved.code}'`,
    );
    return saved;
  }

  /**
   * Render template with variables
   */
  async render(
    templateCode: string,
    variables: Record<string, any>,
  ): Promise<{
    subject: string;
    body: string;
    bodyHtml: string | null;
  }> {
    const template = await this.findByCode(templateCode);

    if (!template.isActive) {
      throw new BadRequestException(
        `Template '${templateCode}' is not active`,
      );
    }

    // Validate variables
    const validation = template.validateVariables(variables);
    if (!validation.valid) {
      throw new BadRequestException(
        `Missing required variables: ${validation.missing.join(', ')}`,
      );
    }

    // Render template
    const rendered = template.render(variables);

    // Increment usage counter
    template.incrementUsage();
    await this.templateRepository.save(template);

    return rendered;
  }

  /**
   * Get template statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byChannel: Record<NotificationChannel, number>;
    byCategory: Record<NotificationCategory, number>;
    mostUsed: NotificationTemplate[];
  }> {
    const all = await this.templateRepository.find();

    const stats = {
      total: all.length,
      active: all.filter((t) => t.isActive).length,
      inactive: all.filter((t) => !t.isActive).length,
      byChannel: {} as Record<NotificationChannel, number>,
      byCategory: {} as Record<NotificationCategory, number>,
      mostUsed: await this.templateRepository.find({
        where: { isActive: true },
        order: { usageCount: 'DESC' },
        take: 10,
      }),
    };

    // Count by channel
    Object.values(NotificationChannel).forEach((channel) => {
      stats.byChannel[channel] = all.filter((t) => t.channel === channel).length;
    });

    // Count by category
    Object.values(NotificationCategory).forEach((category) => {
      stats.byCategory[category] = all.filter(
        (t) => t.category === category,
      ).length;
    });

    return stats;
  }

  /**
   * Seed default system templates
   */
  async seedDefaultTemplates(): Promise<void> {
    this.logger.log('🌱 Seeding default notification templates...');

    const defaultTemplates: Partial<NotificationTemplate>[] = [
      // POA Approved
      {
        code: 'poa_approved',
        name: 'POA Approved',
        description: 'Sent when a POA is approved by admin',
        channel: NotificationChannel.EMAIL,
        category: NotificationCategory.POA_STATUS,
        subject: 'Your {{poaType}} POA has been approved!',
        body: `Hello {{userName}},

Great news! Your {{poaType}} Power of Attorney has been approved on {{approvalDate}}.

Next steps:
1. Review your POA details: {{poaUrl}}
2. Schedule your notarization appointment
3. Complete the notarization process

If you have any questions, please contact our support team.

Best regards,
Emigrantes FT Team`,
        variables: [
          {
            name: 'userName',
            description: "User's full name",
            required: true,
            example: 'John Doe',
          },
          {
            name: 'poaType',
            description: 'Type of POA',
            required: true,
            example: 'Durable',
          },
          {
            name: 'approvalDate',
            description: 'Date of approval',
            required: true,
            example: '2025-01-15',
          },
          {
            name: 'poaUrl',
            description: 'URL to view POA',
            required: false,
            defaultValue: 'https://app.emigrantes-ft.com/poa',
          },
        ],
        isSystem: true,
        isActive: true,
        locale: 'en',
      },

      // Payment Received
      {
        code: 'payment_received',
        name: 'Payment Received',
        description: 'Sent when a payment is successfully processed',
        channel: NotificationChannel.EMAIL,
        category: NotificationCategory.PAYMENT,
        subject: 'Payment Received - Invoice #{{invoiceNumber}}',
        body: `Hello {{userName}},

We have received your payment of {{amount}} {{currency}}.

Invoice Number: {{invoiceNumber}}
Payment Date: {{paymentDate}}
Payment Method: {{paymentMethod}}

View your invoice: {{invoiceUrl}}

Thank you for your payment!

Best regards,
Emigrantes FT Team`,
        variables: [
          {
            name: 'userName',
            description: "User's full name",
            required: true,
          },
          {
            name: 'amount',
            description: 'Payment amount',
            required: true,
            example: '29.00',
          },
          {
            name: 'currency',
            description: 'Currency code',
            required: true,
            example: 'USD',
          },
          {
            name: 'invoiceNumber',
            description: 'Invoice number',
            required: true,
          },
          {
            name: 'paymentDate',
            description: 'Payment date',
            required: true,
          },
          {
            name: 'paymentMethod',
            description: 'Payment method used',
            required: false,
            defaultValue: 'Credit Card',
          },
          { name: 'invoiceUrl', description: 'URL to invoice', required: false },
        ],
        isSystem: true,
        isActive: true,
        locale: 'en',
      },
    ];

    for (const templateData of defaultTemplates) {
      const existing = await this.templateRepository.findOne({
        where: { code: templateData.code! },
      });

      if (!existing) {
        const template = this.templateRepository.create(templateData);
        await this.templateRepository.save(template);
        this.logger.log(`✅ Seeded template: ${templateData.code}`);
      }
    }

    this.logger.log('✅ Default templates seeded successfully');
  }
}
