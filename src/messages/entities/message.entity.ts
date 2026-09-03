import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  content!: string;

  @Column()
  senderId!: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  sender!: User;

  @Column()
  receiverId!: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  receiver!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
