import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  InitialPaymentType,
  InitialPaymentStatus,
  PaymentMethod,
} from './entities/subscription.entity';
import { Payment, PaymentStatus, PaymentProvider } from './entities/payment.entity';
import { StripeService } from './stripe.service';
import { PlansService } from '../plans/plans.service';
import { Plan, PlanType } from '../plans/entities/plan.entity';
import { User } from '../auth/entities/user.entity';
import { CreateCheckoutSessionDto, CreateSubscriptionDto, CancelSubscriptionDto } from './dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stripeService: StripeService,
    private readonly plansService: PlansService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a Stripe Checkout Session for subscription
   */
  async createCheckoutSession(dto: CreateCheckoutSessionDto): Promise<{
    sessionId: string;
    sessionUrl: string;
    subscription: Subscription;
  }> {
    this.logger.log(`Creating checkout session for user ${dto.userId}`);

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Get plan
    const planType = dto.planType as unknown as PlanType;
    const plan = await this.plansService.findByType(planType);

    // Check if Stripe is available
    if (!this.stripeService.isAvailable()) {
      throw new BadRequestException('Stripe no está configurado');
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await this.userRepository.update(user.id, { stripeCustomerId });
    }

    // Create subscription record (pending payment)
    const subscription = this.subscriptionRepository.create({
      userId: dto.userId,
      planId: plan.id,
      planType: dto.planType,
      status: SubscriptionStatus.PENDING_PAYMENT,
      monthlyPrice: plan.monthlyPrice,
      initialPaymentType: dto.initialPaymentType,
      initialPaymentAmount: plan.initialPayment,
      initialPaymentStatus: InitialPaymentStatus.PENDING,
      installmentAmount: plan.installmentAmount,
      totalInstallments: plan.installmentCount,
      stripeCustomerId,
      paymentMethod: PaymentMethod.STRIPE,
      currency: 'USD',
      metadata: dto.metadata,
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Build line items for Stripe Checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Add initial payment (single or first installment)
    if (dto.initialPaymentType === InitialPaymentType.SINGLE) {
      // Single payment - use initial price
      if (plan.stripeInitialPriceId) {
        lineItems.push({
          price: plan.stripeInitialPriceId,
          quantity: 1,
        });
      } else {
        // Create price on the fly if not configured
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} - Pago Inicial`,
              description: `Pago único inicial para ${plan.name}`,
            },
            unit_amount: Math.round(plan.initialPayment * 100),
          },
          quantity: 1,
        });
      }
    } else {
      // Installment payment - first installment
      if (plan.stripeInstallmentPriceId) {
        lineItems.push({
          price: plan.stripeInstallmentPriceId,
          quantity: 1,
        });
      } else {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} - Cuota 1 de ${plan.installmentCount}`,
              description: `Primera cuota del pago inicial para ${plan.name}`,
            },
            unit_amount: Math.round(plan.installmentAmount * 100),
          },
          quantity: 1,
        });
      }
    }

    // Create Checkout Session
    const stripe = this.stripeService.getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment', // First we charge initial payment, then create subscription
      line_items: lineItems,
      success_url: `${dto.successUrl}?session_id={CHECKOUT_SESSION_ID}&subscription_id=${savedSubscription.id}`,
      cancel_url: `${dto.cancelUrl}?subscription_id=${savedSubscription.id}`,
      metadata: {
        subscriptionId: savedSubscription.id,
        userId: dto.userId,
        planType: dto.planType,
        initialPaymentType: dto.initialPaymentType,
        ...dto.metadata,
      },
      payment_intent_data: {
        metadata: {
          subscriptionId: savedSubscription.id,
          userId: dto.userId,
          type: 'initial_payment',
        },
      },
      customer_update: {
        address: 'auto',
      },
      billing_address_collection: 'required',
    });

    // Update subscription with checkout session ID
    savedSubscription.stripeCheckoutSessionId = session.id;
    await this.subscriptionRepository.save(savedSubscription);

    this.logger.log(`Checkout session created: ${session.id}`);

    return {
      sessionId: session.id,
      sessionUrl: session.url!,
      subscription: savedSubscription,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle checkout.session.completed
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    this.logger.log(`Checkout completed: ${session.id}`);

    const subscriptionId = session.metadata?.subscriptionId;
    if (!subscriptionId) {
      this.logger.warn('No subscription ID in checkout session metadata');
      return;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['plan'],
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found: ${subscriptionId}`);
      return;
    }

    // Update subscription status based on payment type
    if (subscription.initialPaymentType === InitialPaymentType.SINGLE) {
      // Single payment completed - move to pending contract
      subscription.initialPaymentStatus = InitialPaymentStatus.COMPLETED;
      subscription.status = SubscriptionStatus.PENDING_CONTRACT;
    } else {
      // First installment paid
      subscription.installmentsPaid = 1;
      if (subscription.installmentsPaid >= subscription.totalInstallments) {
        subscription.initialPaymentStatus = InitialPaymentStatus.COMPLETED;
        subscription.status = SubscriptionStatus.PENDING_CONTRACT;
      } else {
        subscription.initialPaymentStatus = InitialPaymentStatus.PARTIAL;
        // Schedule next installment
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 1);
        subscription.nextInstallmentDate = nextDate;
      }
    }

    // Save payment method if available
    if (session.payment_intent) {
      const paymentIntent = await this.stripeService.retrievePaymentIntent(
        session.payment_intent as string,
      );
      if (paymentIntent.payment_method) {
        subscription.stripePaymentMethodId = paymentIntent.payment_method as string;
      }
    }

    await this.subscriptionRepository.save(subscription);

    // Create payment record
    await this.createPaymentRecord(subscription, session);

    // Emit event
    this.eventEmitter.emit('subscription.payment.completed', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
    });
  }

  /**
   * Handle payment_intent.succeeded
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);

    const subscriptionId = paymentIntent.metadata?.subscriptionId;
    if (!subscriptionId) {
      return;
    }

    // Payment handling is mostly done in checkout.session.completed
    // This is a backup/additional handler
  }

  /**
   * Handle payment_intent.payment_failed
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);

    const subscriptionId = paymentIntent.metadata?.subscriptionId;
    if (!subscriptionId) {
      return;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (subscription) {
      subscription.initialPaymentStatus = InitialPaymentStatus.FAILED;
      await this.subscriptionRepository.save(subscription);

      // Create failed payment record
      await this.createFailedPaymentRecord(subscription, paymentIntent);

      // Emit event
      this.eventEmitter.emit('subscription.payment.failed', {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        error: paymentIntent.last_payment_error?.message,
      });
    }
  }

  /**
   * Handle invoice.payment_succeeded (for recurring payments)
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);

    // Get subscription ID from invoice (may be string or object)
    const subscriptionId = (invoice as any).subscription;
    if (!subscriptionId) {
      return;
    }

    const stripeSubId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubId },
    });

    if (subscription) {
      // Update next billing date
      if (invoice.lines?.data?.[0]?.period?.end) {
        subscription.nextBillingDate = new Date(invoice.lines.data[0].period.end * 1000);
      }
      subscription.status = SubscriptionStatus.ACTIVE;
      await this.subscriptionRepository.save(subscription);
    }
  }

  /**
   * Handle invoice.payment_failed
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Invoice payment failed: ${invoice.id}`);

    // Get subscription ID from invoice (may be string or object)
    const subscriptionId = (invoice as any).subscription;
    if (!subscriptionId) {
      return;
    }

    const stripeSubId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubId },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.PAST_DUE;
      await this.subscriptionRepository.save(subscription);

      // Emit event
      this.eventEmitter.emit('subscription.payment.failed', {
        subscriptionId: subscription.id,
        userId: subscription.userId,
      });
    }
  }

  /**
   * Handle customer.subscription.updated
   */
  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription updated: ${stripeSubscription.id}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      return;
    }

    // Update status based on Stripe status
    switch (stripeSubscription.status) {
      case 'active':
        subscription.status = SubscriptionStatus.ACTIVE;
        break;
      case 'past_due':
        subscription.status = SubscriptionStatus.PAST_DUE;
        break;
      case 'canceled':
        subscription.status = SubscriptionStatus.CANCELLED;
        subscription.cancelledAt = new Date();
        break;
      case 'unpaid':
        subscription.status = SubscriptionStatus.SUSPENDED;
        break;
    }

    // Update billing date
    const periodEnd = (stripeSubscription as any).current_period_end;
    if (periodEnd) {
      subscription.nextBillingDate = new Date(periodEnd * 1000);
    }

    await this.subscriptionRepository.save(subscription);
  }

  /**
   * Handle customer.subscription.deleted
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription deleted: ${stripeSubscription.id}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      await this.subscriptionRepository.save(subscription);
    }
  }

  /**
   * Create a payment record
   */
  private async createPaymentRecord(
    subscription: Subscription,
    session: Stripe.Checkout.Session,
  ): Promise<Payment> {
    const invoiceNumber = await this.generateInvoiceNumber();

    const payment = this.paymentRepository.create({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency?.toUpperCase() || 'USD',
      status: PaymentStatus.COMPLETED,
      provider: PaymentProvider.STRIPE,
      transactionId: session.payment_intent as string,
      invoiceNumber,
      description: `Pago inicial - ${subscription.planType}`,
      paidAt: new Date(),
      metadata: {
        checkoutSessionId: session.id,
        paymentType: subscription.initialPaymentType,
      },
    });

    return this.paymentRepository.save(payment);
  }

  /**
   * Create a failed payment record
   */
  private async createFailedPaymentRecord(
    subscription: Subscription,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<Payment> {
    const invoiceNumber = await this.generateInvoiceNumber();

    const payment = this.paymentRepository.create({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      amount: (paymentIntent.amount || 0) / 100,
      currency: paymentIntent.currency?.toUpperCase() || 'USD',
      status: PaymentStatus.FAILED,
      provider: PaymentProvider.STRIPE,
      transactionId: paymentIntent.id,
      invoiceNumber,
      description: `Pago fallido - ${subscription.planType}`,
      errorMessage: paymentIntent.last_payment_error?.message,
      metadata: {
        paymentIntentId: paymentIntent.id,
        errorCode: paymentIntent.last_payment_error?.code,
      },
    });

    return this.paymentRepository.save(payment);
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.paymentRepository.count();
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Get subscription by ID
   */
  async findById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['plan', 'user', 'payments'],
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    return subscription;
  }

  /**
   * Get subscription by user ID
   */
  async findByUserId(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get active subscription by user ID
   */
  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['plan'],
    });
  }

  /**
   * Get all subscriptions (admin)
   */
  async findAll(options?: {
    status?: SubscriptionStatus;
    planType?: SubscriptionPlan;
    page?: number;
    limit?: number;
  }): Promise<{ subscriptions: Subscription[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('subscription.user', 'user')
      .orderBy('subscription.createdAt', 'DESC');

    if (options?.status) {
      queryBuilder.andWhere('subscription.status = :status', { status: options.status });
    }

    if (options?.planType) {
      queryBuilder.andWhere('subscription.planType = :planType', { planType: options.planType });
    }

    const [subscriptions, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { subscriptions, total };
  }

  /**
   * Cancel subscription
   */
  async cancel(id: string, dto: CancelSubscriptionDto): Promise<Subscription> {
    const subscription = await this.findById(id);

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('La suscripción ya está cancelada');
    }

    // Cancel in Stripe if exists
    if (subscription.stripeSubscriptionId && this.stripeService.isAvailable()) {
      await this.stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        { cancelAtPeriodEnd: dto.cancelAtPeriodEnd },
      );
    }

    subscription.cancellationReason = dto.reason;

    if (dto.cancelAtPeriodEnd) {
      // Will be cancelled at period end
      subscription.expiresAt = subscription.nextBillingDate;
    } else {
      // Cancel immediately
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
    }

    if (dto.feedback) {
      subscription.metadata = {
        ...subscription.metadata,
        cancellationFeedback: dto.feedback,
      };
    }

    await this.subscriptionRepository.save(subscription);

    // Emit event
    this.eventEmitter.emit('subscription.cancelled', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      reason: dto.reason,
    });

    return subscription;
  }

  /**
   * Activate subscription after contract signature
   */
  async activateAfterContractSigned(id: string, contractUrl: string, envelopeId?: string): Promise<Subscription> {
    const subscription = await this.findById(id);

    if (subscription.status !== SubscriptionStatus.PENDING_CONTRACT) {
      throw new BadRequestException('La suscripción no está esperando firma de contrato');
    }

    subscription.contractSigned = true;
    subscription.contractSignedAt = new Date();
    subscription.contractUrl = contractUrl;
    subscription.docusignEnvelopeId = envelopeId || null;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.startDate = new Date();

    // Calculate next billing date (1 month from now)
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    subscription.nextBillingDate = nextBilling;

    // Create monthly subscription in Stripe if not already done
    if (subscription.plan && subscription.stripeCustomerId && !subscription.stripeSubscriptionId) {
      if (this.stripeService.isAvailable() && subscription.plan.stripeMonthlyPriceId) {
        const stripeSubscription = await this.stripeService.createSubscription({
          customerId: subscription.stripeCustomerId,
          priceId: subscription.plan.stripeMonthlyPriceId,
          metadata: {
            subscriptionId: subscription.id,
            userId: subscription.userId,
          },
        });
        subscription.stripeSubscriptionId = stripeSubscription.id;
      }
    }

    await this.subscriptionRepository.save(subscription);

    // Emit event
    this.eventEmitter.emit('subscription.activated', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
    });

    return subscription;
  }

  /**
   * Get payments for a subscription
   */
  async getPayments(subscriptionId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { subscriptionId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
