import { Module } from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequest } from './entities/purchase-request.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from 'src/properties/entities/property.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseRequest]),
    TypeOrmModule.forFeature([Property]),
  ],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}
