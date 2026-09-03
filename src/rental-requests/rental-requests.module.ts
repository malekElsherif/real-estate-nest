import { Module } from '@nestjs/common';
import { RentalRequestsService } from './rental-requests.service';
import { RentalRequestsController } from './rental-requests.controller';
import { RentalRequest } from './entities/rental-request.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from 'src/properties/entities/property.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RentalRequest]),
    TypeOrmModule.forFeature([Property]),
  ],
  controllers: [RentalRequestsController],
  providers: [RentalRequestsService],
})
export class RentalRequestsModule {}
