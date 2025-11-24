import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutSessionDto, CancelSubscriptionDto } from './dto';
import { Subscription, SubscriptionStatus, SubscriptionPlan } from './entities/subscription.entity';
import { Payment } from './entities/payment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../auth/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Controller('payments')
@ApiTags('Payments & Subscriptions')
export class PaymentsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // CHECKOUT ENDPOINTS
  // ============================================

  @Post('checkout/session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Stripe Checkout Session',
    description: 'Creates a new Stripe checkout session for subscription payment',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
    schema: {
      example: {
        message: 'Sesión de checkout creada exitosamente',
        data: {
          sessionId: 'cs_test_xxx',
          sessionUrl: 'https://checkout.stripe.com/xxx',
          subscription: {},
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid data or Stripe not configured',
  })
  async createCheckoutSession(
    @CurrentUser() user: User,
    @Body() dto: Omit<CreateCheckoutSessionDto, 'userId'>,
  ) {
    const result = await this.subscriptionsService.createCheckoutSession({
      ...dto,
      userId: user.id,
    });

    return {
      message: 'Sesión de checkout creada exitosamente',
      data: result,
    };
  }

  @Post('checkout/session/guest')
  @Public()
  @ApiOperation({
    summary: 'Create Stripe Checkout Session (Guest)',
    description: 'Creates a checkout session for a specific user (admin use)',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
  })
  async createGuestCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    const result = await this.subscriptionsService.createCheckoutSession(dto);

    return {
      message: 'Sesión de checkout creada exitosamente',
      data: result,
    };
  }

  // ============================================
  // WEBHOOK ENDPOINTS
  // ============================================

  @Post('webhook/stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe Webhook Handler',
    description: 'Handles incoming webhook events from Stripe',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      await this.subscriptionsService.handleWebhook(event);

      return { received: true };
    } catch (error) {
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }

  // ============================================
  // SUBSCRIPTION ENDPOINTS (USER)
  // ============================================

  @Get('subscription/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user subscription',
    description: 'Returns the current subscription for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User subscription',
    type: Subscription,
  })
  async getMySubscription(@CurrentUser() user: User) {
    const subscription = await this.subscriptionsService.findByUserId(user.id);

    return {
      message: 'Suscripción obtenida exitosamente',
      data: subscription,
    };
  }

  @Get('subscription/me/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user active subscription',
    description: 'Returns the active subscription for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Active subscription or null',
    type: Subscription,
  })
  async getMyActiveSubscription(@CurrentUser() user: User) {
    const subscription = await this.subscriptionsService.findActiveByUserId(user.id);

    return {
      message: subscription
        ? 'Suscripción activa encontrada'
        : 'No tienes una suscripción activa',
      data: subscription,
    };
  }

  @Post('subscription/me/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel current user subscription',
    description: 'Cancels the active subscription for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled',
    type: Subscription,
  })
  @ApiBadRequestResponse({
    description: 'No active subscription or already cancelled',
  })
  async cancelMySubscription(
    @CurrentUser() user: User,
    @Body() dto: CancelSubscriptionDto,
  ) {
    const subscription = await this.subscriptionsService.findByUserId(user.id);
    if (!subscription) {
      throw new BadRequestException('No tienes una suscripción');
    }

    const cancelled = await this.subscriptionsService.cancel(subscription.id, dto);

    return {
      message: 'Suscripción cancelada exitosamente',
      data: cancelled,
    };
  }

  @Get('payments/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user payments',
    description: 'Returns all payments for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User payments',
    type: [Payment],
  })
  async getMyPayments(@CurrentUser() user: User) {
    const payments = await this.subscriptionsService.getUserPayments(user.id);

    return {
      message: 'Pagos obtenidos exitosamente',
      data: payments,
    };
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all subscriptions (admin)',
    description: 'Returns all subscriptions with pagination and filters',
  })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
  @ApiQuery({ name: 'planType', required: false, enum: SubscriptionPlan })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of subscriptions',
  })
  async getAllSubscriptions(
    @Query('status') status?: SubscriptionStatus,
    @Query('planType') planType?: SubscriptionPlan,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.subscriptionsService.findAll({
      status,
      planType,
      page,
      limit,
    });

    return {
      message: 'Suscripciones obtenidas exitosamente',
      data: result.subscriptions,
      meta: {
        total: result.total,
        page: page || 1,
        limit: limit || 20,
      },
    };
  }

  @Get('subscriptions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription by ID (admin)',
    description: 'Returns a specific subscription with all details',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription details',
    type: Subscription,
  })
  @ApiNotFoundResponse({
    description: 'Subscription not found',
  })
  async getSubscription(@Param('id', ParseUUIDPipe) id: string) {
    const subscription = await this.subscriptionsService.findById(id);

    return {
      message: 'Suscripción obtenida exitosamente',
      data: subscription,
    };
  }

  @Post('subscriptions/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel subscription (admin)',
    description: 'Admin cancellation of a subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled',
    type: Subscription,
  })
  async cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    const subscription = await this.subscriptionsService.cancel(id, dto);

    return {
      message: 'Suscripción cancelada exitosamente',
      data: subscription,
    };
  }

  @Put('subscriptions/:id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate subscription after contract (admin)',
    description: 'Activates a subscription after the contract has been signed',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription activated',
    type: Subscription,
  })
  async activateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { contractUrl: string; envelopeId?: string },
  ) {
    const subscription = await this.subscriptionsService.activateAfterContractSigned(
      id,
      body.contractUrl,
      body.envelopeId,
    );

    return {
      message: 'Suscripción activada exitosamente',
      data: subscription,
    };
  }

  @Get('subscriptions/:id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription payments (admin)',
    description: 'Returns all payments for a specific subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription payments',
    type: [Payment],
  })
  async getSubscriptionPayments(@Param('id', ParseUUIDPipe) id: string) {
    const payments = await this.subscriptionsService.getPayments(id);

    return {
      message: 'Pagos obtenidos exitosamente',
      data: payments,
    };
  }

  // ============================================
  // UTILITY ENDPOINTS
  // ============================================

  @Get('stripe/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check Stripe configuration status',
    description: 'Returns whether Stripe is properly configured',
  })
  @ApiResponse({
    status: 200,
    description: 'Stripe status',
  })
  async getStripeStatus() {
    return {
      message: 'Estado de Stripe',
      data: {
        configured: this.stripeService.isAvailable(),
      },
    };
  }
}
