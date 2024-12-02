import { Module } from '@nestjs/common';
import { ConfigModule } from './modules/config/config.module';
import { DefaultApp } from './implementation/default';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RepositoryModule } from './modules/repository/repository.module';
import { UniswapModule } from './modules/uniswap/uniswap.module';
import { CryptoModule } from './modules/crypto/crypto.module';
import { ConfigService } from './modules/config/config.service';
import { ChainId } from './shared/types';

@Module({
  imports: [
    ConfigModule,
    RepositoryModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../', 'public'),
    }),
    CryptoModule.registerAsync({
      useFactory: ({ appConfig }: ConfigService) => ({
        [ChainId.BNB]: {
          chainId: ChainId.BNB,
          rpc: appConfig.BNB_RPC,
        },
        [ChainId.SEPOLIA]: {
          chainId: ChainId.SEPOLIA,
          rpc: appConfig.SEPOLIA_RPC,
        },
        [ChainId.POLYGON]: {
          chainId: ChainId.POLYGON,
          rpc: appConfig.POLYGON_RPC,
          type: 'websocket',
        },
      }),
      inject: [ConfigService],
    }),
    UniswapModule.register({
      [ChainId.BNB]: {
        POOL_FACTORY_CONTRACT_ADDRESS:
          '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7',
        QUOTER_CONTRACT_ADDRESS: '0x78D78E420Da98ad378D7799bE8f4AF69033EB077',
        SWAP_ROUTER_ADDRESS: '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2',
      },
      [ChainId.SEPOLIA]: {
        POOL_FACTORY_CONTRACT_ADDRESS:
          '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
        QUOTER_CONTRACT_ADDRESS: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
        SWAP_ROUTER_ADDRESS: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
      },
      [ChainId.POLYGON]: {
        POOL_FACTORY_CONTRACT_ADDRESS:
          '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        QUOTER_CONTRACT_ADDRESS: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        SWAP_ROUTER_ADDRESS: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      },
    }),
    DefaultApp,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
