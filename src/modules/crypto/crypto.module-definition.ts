import { ConfigurableModuleBuilder } from '@nestjs/common';
import { CryptoConfig } from './crypto.service';

export type CryptoConfigMap = Record<number, CryptoConfig>;

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN: CRYPTO_CONFIG } =
  new ConfigurableModuleBuilder<CryptoConfigMap>().build();
