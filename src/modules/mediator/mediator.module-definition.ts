import { ConfigurableModuleBuilder } from '@nestjs/common';
import { MediatorConfig } from './mediator.service';

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: MEDIATOR_CONFIG,
} = new ConfigurableModuleBuilder<MediatorConfig>().build();
