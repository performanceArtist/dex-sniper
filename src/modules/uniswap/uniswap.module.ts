import { Global, Module } from '@nestjs/common';
import {
  UniswapFactoryService,
} from './uniswap.service';
import { ConfigurableModuleClass } from './uniswap.module-definition';

@Global()
@Module({
  providers: [UniswapFactoryService],
  exports: [UniswapFactoryService],
  imports: [],
})
export class UniswapModule extends ConfigurableModuleClass {}
