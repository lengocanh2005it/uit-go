import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Trip {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  destination: string;
}
