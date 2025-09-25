import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @Column({
    type: 'uuid',
  })
  tripId: string;

  @Column({
    type: 'uuid',
  })
  reviewerId!: string;
}
