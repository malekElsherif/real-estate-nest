import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Property } from '../../properties/entities/property.entity';

@Entity('viewed_props')
export class ViewedProp {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.viewedProperties, {
    onDelete: 'CASCADE',
  })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Property, (property) => property.views, {
    onDelete: 'CASCADE',
  })
  property: Property;

  @Column()
  propertyId: number;

  @CreateDateColumn()
  viewedAt: Date;
}
