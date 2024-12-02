import { ConfigurableModuleBuilder } from '@nestjs/common';
import { UniswapConfig } from './uniswap.service';

export type UniswapConfigMap = Record<number, UniswapConfig>;

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN: UNISWAP_CONFIG } =
  new ConfigurableModuleBuilder<UniswapConfigMap>().build();
