import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { PropertyImage } from 'src/property-images/entities/property-image.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column('decimal')
  price!: number;

  @Column()
  city!: string;

  @Column()
  address!: string;

  @Column()
  area!: number;

  @Column()
  bedrooms!: number;

  @Column()
  bathrooms!: number;

  @Column({
    type: 'enum',
    enum: ['SALE', 'RENT'],
  })
  type!: string;

  @Column({
    type: 'enum',
    enum: ['AVAILABLE', 'SOLD', 'RENTED', 'PENDING'],
    default: 'PENDING',
  })
  status!: string;

  @Column({ default: false })
  isVerified!: boolean;

  @ManyToOne(() => User, (user) => user.properties, {
    onDelete: 'CASCADE',
  })
  owner!: User;

  @OneToMany(() => PropertyImage, (propertyImage) => propertyImage.property, {
    cascade: true,
  })
  images!: PropertyImage[];
}
