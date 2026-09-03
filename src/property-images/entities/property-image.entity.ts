import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

import { Property } from '../../properties/entities/property.entity';

@Entity('property_images')
export class PropertyImage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  url!: string;

  @ManyToOne(() => Property, (property) => property.images, {
    onDelete: 'CASCADE',
  })
  property!: Property;
}
