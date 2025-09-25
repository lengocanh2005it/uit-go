import { TripRequestStatusEnum } from '@libs/common/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class TripRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TripRequestStatusEnum,
    default: TripRequestStatusEnum.PENDING,
  })
  status: TripRequestStatusEnum;

  @Column({
    type: 'timestamp',
  })
  expiresTime: Date;

  @Column({
    type: 'uuid',
  })
  tripId: string;

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;
}
