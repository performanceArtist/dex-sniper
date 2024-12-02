import { Module } from '@nestjs/common';
import { MediatorService } from './mediator.service';
import { ConfigurableModuleClass } from './mediator.module-definition';

@Module({
  providers: [MediatorService],
  exports: [],
})
export class MediatorModule extends ConfigurableModuleClass {}
