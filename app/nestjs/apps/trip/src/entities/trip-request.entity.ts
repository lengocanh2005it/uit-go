import { TripRequestStatusEnum } from '@libs/common/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Trip } from './trip.entity';

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

  @OneToOne(() => Trip, (trip) => trip.request, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'tripId',
  })
  trip: Trip;

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;
}
