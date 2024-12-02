import {
  Entity,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { PoolEntity } from './pool';

@Entity({ name: 'token' })
export class TokenEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  symbol: string;

  @Column({ unique: true })
  address: string;

  @Column({ type: 'int' })
  decimals: number;

  @Column({ type: 'int' })
  chainId: number;
  
  @OneToMany(() => PoolEntity, (pool) => pool.base)
  poolsBase: PoolEntity[];

  @OneToMany(() => PoolEntity, (pool) => pool.quote)
  poolsQuote: PoolEntity[];
}
