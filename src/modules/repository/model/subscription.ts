import {
  Entity,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm';
import { UserEntity } from './user';
import { SubscriptionSide } from 'src/shared/types';

@Entity({ name: 'subscription' })
export class SubscriptionEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  to: string;

  @Column({
    default: 0,
  })
  limit: number;

  @Column({
    type: 'enum',
    enum: ['buy', 'sell', 'any'],
    default: 'any',
  })
  side: SubscriptionSide;

  @ManyToOne(() => UserEntity, (user) => user.subscriptions)
  user: UserEntity;
}
