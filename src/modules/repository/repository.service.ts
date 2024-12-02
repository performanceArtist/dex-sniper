import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PoolEntity, SubscriptionEntity, TokenEntity, UserEntity } from './model';

@Injectable()
export class RepositoryService {
  constructor(private dataSource: DataSource) {}

  public get user() {
    return this.dataSource.getRepository(UserEntity);
  }

  public get pool() {
    return this.dataSource.getRepository(PoolEntity);
  }

  public get token() {
    return this.dataSource.getRepository(TokenEntity);
  }

  public get subscription() {
    return this.dataSource.getRepository(SubscriptionEntity);
  }
}
