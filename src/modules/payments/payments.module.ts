import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { Subscription } from './entities/subscription.entity';
import { Payment } from './entities/payment.entity';
import { User } from '../auth/entities/user.entity';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Payment, User]),
    ConfigModule,
    PlansModule,
  ],
  controllers: [PaymentsController],
  providers: [SubscriptionsService, StripeService],
  exports: [SubscriptionsService, StripeService],
})
export class PaymentsModule {}
