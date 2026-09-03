import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Property } from '../../properties/entities/property.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({
    type: 'enum',
    enum: ['USER', 'AGENT', 'ADMIN'],
    default: 'USER',
  })
  role!: string;

  @OneToMany(() => Property, (property) => property.owner)
  properties!: Property[];

  @Column({ default: true })
  isActive!: boolean;
  @Column({ default: false })
  isVerified!: boolean;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  })
  verificationStatus!: string;
}
