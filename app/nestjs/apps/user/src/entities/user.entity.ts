import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from "typeorm";

import { UserRole } from "@libs/common/enums";
import { UserProfile } from "./user-profile.entity";

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false
  })
  email: string

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: false
  })
  passwordHash: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER
  })
  role: UserRole;

  @CreateDateColumn({
    name: 'create_at',
    type: 'timestamp'
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp'
  })
  updatedAt: Date;

  @OneToOne(() => UserProfile, profile => profile.user)
  profile: UserProfile

  constructor(partial: Partial<User>) {
    Object.assign(this, partial)
  }
}
