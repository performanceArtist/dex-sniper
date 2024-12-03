import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { UserModule } from '../user/user.module';

@Module({
  providers: [TelegramService],
  exports: [TelegramService],
  imports: [UserModule],
})
export class TelegramModule {}
