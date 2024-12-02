import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Module({
  providers: [SubscriptionService],
  exports: [SubscriptionService],
  imports: [],
})
export class SubscriptionModule {}
