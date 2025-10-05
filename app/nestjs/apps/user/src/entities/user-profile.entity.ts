import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        name: 'user_id',
        type: 'uuid',
        unique: true
    })
    userId: string;

    @Column({
        name: 'full_name',
        type: 'varchar',
        length: 255,
        nullable: true
    })
    fullName: string;

    @Column({
        name: 'phone_number',
        type: 'varchar',
        length: 20,
        nullable: true,
        unique: true
    })
    phoneNumber: string;

    @Column({
        type: 'text',
        nullable: true
    })
    address: string;

    @Column({
        name: 'birth_day',
        type: 'date',
        nullable: true
    })
    birthDay: Date;

    @Column({
        name: 'avatar_url',
        type: 'varchar',
        length: 500,
        nullable: true
    })
    avatarUrl: string

    @OneToOne(() => User, user => user.profile)
    @JoinColumn({ name: 'user_id' })
    user: User
}