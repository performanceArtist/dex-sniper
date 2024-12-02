import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoryService } from './repository.service';
import {
  PoolEntity,
  SubscriptionEntity,
  TokenEntity,
  UserEntity,
} from './model';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';

const entities = [UserEntity, TokenEntity, SubscriptionEntity, PoolEntity];

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: ({ appConfig }: ConfigService) => ({
        type: 'postgres',
        host: appConfig.DB_HOST,
        port: appConfig.DB_PORT,
        username: appConfig.DB_USERNAME,
        password: appConfig.DB_PASSWORD,
        database: appConfig.DB_NAME,
        entities,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RepositoryService],
  exports: [RepositoryService],
})
export class RepositoryModule {}
