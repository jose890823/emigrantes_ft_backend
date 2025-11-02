import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey || apiKey === '' || apiKey.startsWith('sk_test_YOUR')) {
      this.logger.warn(
        '⚠️  Stripe no configurado - PaymentsService en modo deshabilitado',
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2024-11-20.acacia',
        typescript: true,
      });
      this.isConfigured = true;
      this.logger.log('🔐 Stripe SDK inicializado correctamente');
    } catch (error) {
      this.logger.error('Error inicializando Stripe SDK', error.stack);
      this.isConfigured = false;
    }
  }

  /**
   * Check if Stripe is available
   */
  isAvailable(): boolean {
    return this.isConfigured && this.stripe !== null;
  }

  /**
   * Get Stripe instance
   */
  getStripe(): Stripe {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está configurado');
    }
    return this.stripe!;
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(params: {
    email: string;
    name: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    this.logger.log(`Creating Stripe customer for ${params.email}`);

    return this.stripe!.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata || {},
    });
  }

  /**
   * Create a subscription
   */
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    this.logger.log(`Creating subscription for customer ${params.customerId}`);

    return this.stripe!.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: params.metadata || {},
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    options?: {
      cancelAtPeriodEnd?: boolean;
    },
  ): Promise<Stripe.Subscription> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    this.logger.log(`Canceling subscription ${subscriptionId}`);

    if (options?.cancelAtPeriodEnd) {
      return this.stripe!.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return this.stripe!.subscriptions.cancel(subscriptionId);
  }

  /**
   * Reactivate a subscription
   */
  async reactivateSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    this.logger.log(`Reactivating subscription ${subscriptionId}`);

    return this.stripe!.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * Retrieve a subscription
   */
  async retrieveSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    return this.stripe!.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Create a Payment Intent
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    this.logger.log(`Creating payment intent for ${params.amount} ${params.currency}`);

    return this.stripe!.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      metadata: params.metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  /**
   * Retrieve a Payment Intent
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    return this.stripe!.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Create a refund
   */
  async createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  }): Promise<Stripe.Refund> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    this.logger.log(`Creating refund for payment intent ${params.paymentIntentId}`);

    return this.stripe!.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amount ? Math.round(params.amount * 100) : undefined,
      reason: params.reason,
    });
  }

  /**
   * Retrieve an invoice
   */
  async retrieveInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    return this.stripe!.invoices.retrieve(invoiceId);
  }

  /**
   * Construct webhook event
   */
  constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
    secret: string,
  ): Stripe.Event {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    return this.stripe!.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Get a customer by ID
   */
  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    return this.stripe!.customers.retrieve(customerId) as Promise<Stripe.Customer>;
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Customer> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    return this.stripe!.customers.update(customerId, params);
  }

  /**
   * Create a setup intent for saving payment method
   */
  async createSetupIntent(params: {
    customerId: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.SetupIntent> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    return this.stripe!.setupIntents.create({
      customer: params.customerId,
      payment_method_types: ['card'],
      metadata: params.metadata || {},
    });
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    return this.stripe!.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  /**
   * Set default payment method for customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Customer> {
    if (!this.isAvailable()) {
      throw new Error('Stripe no está disponible');
    }

    return this.stripe!.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }
}
