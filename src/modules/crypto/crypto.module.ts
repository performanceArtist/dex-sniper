import { Global, Module } from '@nestjs/common';
import { CryptoFactoryService } from './crypto.service';
import { ConfigurableModuleClass } from './crypto.module-definition';

@Global()
@Module({
  providers: [CryptoFactoryService],
  exports: [CryptoFactoryService],
})
export class CryptoModule extends ConfigurableModuleClass {}
