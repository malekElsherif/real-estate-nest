import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../properties/entities/property.entity';
import { RentalRequest } from '../rental-requests/entities/rental-request.entity';
import { PurchaseRequest } from '../purchase-requests/entities/purchase-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Property]),
    TypeOrmModule.forFeature([RentalRequest]),
    TypeOrmModule.forFeature([PurchaseRequest]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
