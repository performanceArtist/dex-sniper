import { Module } from '@nestjs/common';
import { HttpController } from './web.controller';
import { WebService } from './web.service';
import { NotificationGateway } from './notification.gateway';

@Module({
  providers: [WebService, NotificationGateway],
  exports: [WebService],
  imports: [],
  controllers: [HttpController],
})
export class WebModule {}
