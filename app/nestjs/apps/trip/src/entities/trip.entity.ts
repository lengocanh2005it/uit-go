import { TripStatusEnum } from '@libs/common/enums';
import { DecimalColumnTransformer } from '@libs/common/transformers';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TripRating } from './trip-rating.entity';
import { TripRequest } from './trip-request.entity';

@Entity()
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  originAddress: string;

  @Column()
  destinationAddress: string;

  @Column({
    type: 'float',
  })
  originLat: number;

  @Column({
    type: 'float',
  })
  destinationLat: number;

  @Column({
    type: 'float',
  })
  originLng: number;

  @Column({
    type: 'float',
  })
  destinationLng: number;

  @Column({
    type: 'enum',
    enum: TripStatusEnum,
    default: TripStatusEnum.SEARCHING,
  })
  status!: TripStatusEnum;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: DecimalColumnTransformer,
  })
  fareEstimate: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: DecimalColumnTransformer,
  })
  fareFinal: number;

  @Column({
    type: 'uuid',
  })
  driverId: string;

  @Column({
    type: 'uuid',
  })
  passengerId: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  note?: string;

  @OneToOne(() => TripRequest, (tripRequest) => tripRequest.trip, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  request!: TripRequest;

  @OneToOne(() => TripRating, (tripRating) => tripRating.trip, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  rating!: TripRating;

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;
}
