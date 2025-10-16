import { OutboxStatus } from '@libs/common/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  eventType!: string;

  @Column({
    type: 'json',
  })
  payload!: any;

  @Index()
  @Column({
    type: 'enum',
    enum: OutboxStatus,
    default: OutboxStatus.PENDING,
  })
  status!: OutboxStatus;

  @Column({
    type: 'int',
    default: 0,
  })
  retryCount!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'uuid' })
  aggregateId!: string;

  @Column()
  aggregateType!: string;
}
