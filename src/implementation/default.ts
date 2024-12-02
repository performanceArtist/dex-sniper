import { Module } from '@nestjs/common';
import { UserModule } from '../modules/user/user.module';
import { UserService } from '../modules/user/user.service';
import { TelegramService } from '../modules/telegram/telegram.service';
import { SubscriptionService } from 'src/modules/subscription/subscription.service';
import { WebService } from 'src/modules/web/web.service';
import { WebModule } from 'src/modules/web/web.module';
import { TelegramModule } from 'src/modules/telegram/telegram.module';
import { SubscriptionModule } from 'src/modules/subscription/subscription.module';
import { MediatorConfig } from 'src/modules/mediator/mediator.service';
import { MediatorModule } from 'src/modules/mediator/mediator.module';

@Module({
  providers: [],
  exports: [],
  imports: [
    MediatorModule.registerAsync({
      useFactory: (
        tg: TelegramService,
        web: WebService,
        userFactory: UserService,
        reswapper: SubscriptionService,
      ): MediatorConfig => ({
        userFactory,
        reswapper,
        clients: [tg, web],
      }),
      inject: [TelegramService, WebService, UserService, SubscriptionService],
      imports: [TelegramModule, WebModule, UserModule, SubscriptionModule],
    }),
  ],
})
export class DefaultApp {}
