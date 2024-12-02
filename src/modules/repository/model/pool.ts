import {
  Entity,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm';
import { TokenEntity } from './token';

@Entity({ name: 'pool' })
export class PoolEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  address: string;

  @Column({ type: 'int' })
  chainId: number;

  @ManyToOne(() => TokenEntity, (token) => token.poolsBase)
  base: TokenEntity;

  @ManyToOne(() => TokenEntity, (token) => token.poolsQuote)
  quote: TokenEntity;
}
