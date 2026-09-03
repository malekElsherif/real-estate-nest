import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { PropertiesController } from './properties.controller';

import { PropertiesService } from './properties.service';

import { Property } from './entities/property.entity';

import { User } from '../users/entities/user.entity';
import { PropertyImage } from '../property-images/entities/property-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Property, User, PropertyImage])],

  controllers: [PropertiesController],

  providers: [PropertiesService],

  exports: [PropertiesService],
})
export class PropertiesModule {}
