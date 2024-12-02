import {
  Entity,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { TokenEntity } from './token';
import { SubscriptionEntity } from './subscription';

@Entity({ name: 'user' })
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  chatId: number;

  @Column({ unique: true })
  privateKey: string;

  @Column({ unique: true })
  address: string;

  @Column()
  chainId: number;

  @ManyToMany(() => TokenEntity)
  @JoinTable()
  tokens: TokenEntity[];

  @OneToMany(() => SubscriptionEntity, (subscription) => subscription.user)
  subscriptions: SubscriptionEntity[];
}
