import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, PlanType, PlanStatus } from './entities/plan.entity';
import { CreatePlanDto, UpdatePlanDto } from './dto';

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  /**
   * Seed default plans on module initialization
   */
  async onModuleInit() {
    await this.seedDefaultPlans();
  }

  /**
   * Seed the default plans according to the requirements document
   */
  async seedDefaultPlans(): Promise<void> {
    const existingPlans = await this.planRepository.count();

    if (existingPlans > 0) {
      this.logger.log('Plans already exist, skipping seed');
      return;
    }

    this.logger.log('Seeding default plans...');

    const defaultPlans: Partial<Plan>[] = [
      {
        type: PlanType.BASIC,
        name: 'Plan Básico',
        description:
          'Protección esencial para emigrantes que buscan asegurar sus activos y familia.',
        status: PlanStatus.ACTIVE,
        monthlyPrice: 14,
        initialPayment: 129,
        installmentAmount: 43,
        installmentCount: 3,
        features: [
          'Representación Financiera Básica',
          'Custodia Segura de Instrucciones',
          'Ejecución Limitada (hasta 3 por año)',
          'Reportes Trimestrales',
          'Soporte por Email',
          'Dashboard Personal',
        ],
        benefits: {
          poaExecutions: 3,
          supportLevel: 'email',
          documentsStorage: '1GB',
          familyMembers: 2,
          reportFrequency: 'quarterly',
        },
        contractAnnex: 'A',
        isRecommended: false,
        displayOrder: 1,
        badgeColor: '#6B7280',
        icon: 'shield',
        currency: 'USD',
      },
      {
        type: PlanType.STANDARD,
        name: 'Plan Estándar',
        description:
          'Plan ideal para familias que buscan protección completa y tranquilidad.',
        status: PlanStatus.ACTIVE,
        monthlyPrice: 24,
        initialPayment: 199,
        installmentAmount: 66.33,
        installmentCount: 3,
        features: [
          'Representación Financiera Completa',
          'Custodia Segura de Instrucciones',
          'Ejecución Ilimitada',
          'Reportes Mensuales Detallados',
          'Actualizaciones Ilimitadas',
          'Asistencia Legal Incluida',
          'Soporte Prioritario (24/7)',
          'Dashboard Personal Avanzado',
        ],
        benefits: {
          poaExecutions: 'unlimited',
          supportLevel: '24/7',
          documentsStorage: '5GB',
          familyMembers: 5,
          reportFrequency: 'monthly',
          legalAssistance: true,
        },
        contractAnnex: 'B',
        isRecommended: true,
        displayOrder: 2,
        badgeColor: '#3B82F6',
        icon: 'shield-check',
        currency: 'USD',
      },
      {
        type: PlanType.PREMIUM,
        name: 'Plan Premium',
        description:
          'Máxima protección y servicios exclusivos para una tranquilidad absoluta.',
        status: PlanStatus.ACTIVE,
        monthlyPrice: 39,
        initialPayment: 299,
        installmentAmount: 99.67,
        installmentCount: 3,
        features: [
          'Representación Financiera Premium',
          'Custodia Segura de Instrucciones',
          'Ejecución Ilimitada con Prioridad',
          'Reportes Semanales Detallados',
          'Actualizaciones Ilimitadas',
          'Asistencia Legal Premium 24/7',
          'Soporte VIP Dedicado',
          'Dashboard Personal Premium',
          'Programa de Adelanto de Fondos',
          'Fondo de Emergencia FT',
          'Notarización Remota Incluida',
        ],
        benefits: {
          poaExecutions: 'unlimited',
          supportLevel: 'vip',
          documentsStorage: 'unlimited',
          familyMembers: 'unlimited',
          reportFrequency: 'weekly',
          legalAssistance: true,
          emergencyFund: true,
          advanceFunds: true,
          freeNotarization: 1,
        },
        contractAnnex: 'C',
        isRecommended: false,
        displayOrder: 3,
        badgeColor: '#8B5CF6',
        icon: 'crown',
        currency: 'USD',
      },
    ];

    for (const planData of defaultPlans) {
      const plan = this.planRepository.create(planData);
      await this.planRepository.save(plan);
      this.logger.log(`Created plan: ${planData.name}`);
    }

    this.logger.log('Default plans seeded successfully');
  }

  /**
   * Create a new plan
   */
  async create(createPlanDto: CreatePlanDto): Promise<Plan> {
    // Check if plan type already exists
    const existing = await this.planRepository.findOne({
      where: { type: createPlanDto.type },
    });

    if (existing) {
      throw new ConflictException(
        `Plan with type ${createPlanDto.type} already exists`,
      );
    }

    const plan = this.planRepository.create(createPlanDto);
    return this.planRepository.save(plan);
  }

  /**
   * Get all plans
   */
  async findAll(includeInactive = false): Promise<Plan[]> {
    const whereCondition = includeInactive
      ? {}
      : { status: PlanStatus.ACTIVE };

    return this.planRepository.find({
      where: whereCondition,
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Get plan by ID
   */
  async findById(id: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return plan;
  }

  /**
   * Get plan by type
   */
  async findByType(type: PlanType): Promise<Plan> {
    const plan = await this.planRepository.findOne({
      where: { type },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with type ${type} not found`);
    }

    return plan;
  }

  /**
   * Update a plan
   */
  async update(id: string, updatePlanDto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findById(id);

    // If changing type, check for conflicts
    if (updatePlanDto.type && updatePlanDto.type !== plan.type) {
      const existing = await this.planRepository.findOne({
        where: { type: updatePlanDto.type },
      });

      if (existing) {
        throw new ConflictException(
          `Plan with type ${updatePlanDto.type} already exists`,
        );
      }
    }

    Object.assign(plan, updatePlanDto);
    return this.planRepository.save(plan);
  }

  /**
   * Delete a plan (soft delete by changing status)
   */
  async remove(id: string): Promise<Plan> {
    const plan = await this.findById(id);
    plan.status = PlanStatus.INACTIVE;
    return this.planRepository.save(plan);
  }

  /**
   * Hard delete a plan
   */
  async hardRemove(id: string): Promise<void> {
    const plan = await this.findById(id);
    await this.planRepository.remove(plan);
  }

  /**
   * Get active plans for public display
   */
  async getPublicPlans(): Promise<Plan[]> {
    return this.planRepository.find({
      where: { status: PlanStatus.ACTIVE },
      order: { displayOrder: 'ASC' },
      select: [
        'id',
        'type',
        'name',
        'description',
        'monthlyPrice',
        'initialPayment',
        'installmentAmount',
        'installmentCount',
        'features',
        'benefits',
        'isRecommended',
        'displayOrder',
        'badgeColor',
        'icon',
        'currency',
      ],
    });
  }

  /**
   * Update Stripe IDs for a plan
   */
  async updateStripeIds(
    id: string,
    stripeIds: {
      stripeProductId?: string;
      stripeMonthlyPriceId?: string;
      stripeInitialPriceId?: string;
      stripeInstallmentPriceId?: string;
    },
  ): Promise<Plan> {
    const plan = await this.findById(id);
    Object.assign(plan, stripeIds);
    return this.planRepository.save(plan);
  }
}
