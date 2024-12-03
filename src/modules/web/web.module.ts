import { Module } from '@nestjs/common';
import { HttpController } from './web.controller';
import { NotificationGateway } from './notification.gateway';
import { UserModule } from '../user/user.module';

@Module({
  providers: [NotificationGateway],
  exports: [],
  imports: [UserModule],
  controllers: [HttpController],
})
export class WebModule {}
