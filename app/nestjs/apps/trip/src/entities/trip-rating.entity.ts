import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Trip } from './trip.entity';

@Entity()
export class TripRating {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'float',
  })
  rating: number;

  @Column({ type: 'text' })
  comment!: string;

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date;

  @OneToOne(() => Trip, (trip) => trip.rating, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'tripId',
  })
  trip!: Trip;

  @Column({
    type: 'uuid',
  })
  reviewerId!: string;
}
