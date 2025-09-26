import { TripStatusEnum } from '@libs/common/enums';
import { DecimalColumnTransformer } from '@libs/common/transformers';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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
    enum: [TripStatusEnum],
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

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;
}
