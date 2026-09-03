import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { In, Repository } from 'typeorm';
import { PurchaseRequest } from './entities/purchase-request.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Property } from 'src/properties/entities/property.entity';

@Injectable()
export class PurchaseRequestsService {
  constructor(
    @InjectRepository(PurchaseRequest)
    private readonly purchaseRequestRepository: Repository<PurchaseRequest>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}
  async createpurchaseRequest(user: any, propertyId: number) {
    const property = await this.propertyRepository.findOne({
      where: {
        id: propertyId,
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.type === 'RENT') {
      throw new BadRequestException('Property is for rent');
    }
    const existingRequest = await this.purchaseRequestRepository.findOne({
      where: {
        user: user.userId,
        property: { id: propertyId },
        status: 'PENDING',
      },
    });
    if (existingRequest) {
      throw new BadRequestException(
        'You have already made a purchase request for this property',
      );
    }

    if (property.status !== 'AVAILABLE') {
      throw new BadRequestException('Property is not available');
    }

    const purchaseRequest = this.purchaseRequestRepository.create({
      user: user.userId,
      property: { id: propertyId },
    });

    return this.purchaseRequestRepository.save(purchaseRequest);
  }

  async getmypurchaseRequests(user: any) {
    return this.purchaseRequestRepository.find({
      where: {
        user: user.userId,
      },
      relations: {
        property: true,
      },
    });
  }

  async canclepurchaseRequests(id: number, user: any) {
    const purchaseRequest = await this.purchaseRequestRepository.findOne({
      where: {
        id: id,
        user: user.userId,
        status: 'PENDING',
      },
    });
    if (!purchaseRequest) {
      throw new NotFoundException('Purchase request not found');
    }
    purchaseRequest.status = 'CANCELLED';

    await this.purchaseRequestRepository.save(purchaseRequest);

    return {
      message: 'Purchase request canceled successfully',
    };
  }

  async getParchesRequestById(id: number) {
    const property = await this.purchaseRequestRepository.findOne({
      where: {
        id: id,
      },
      relations: {
        property: true,
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  async getPurchaseRequestsForMyProperties(user: any) {
    return this.purchaseRequestRepository.find({
      where: {
        property: {
          owner: user.userId,
        },
      },
      relations: {
        property: true,
        user: true,
      },
    });
  }

  async approvePurchaseRequest(id: number, user: any) {
    const purchaseRequest = await this.purchaseRequestRepository.findOne({
      where: {
        id: id,
        property: {
          owner: user.userId,
        },
      },
      relations: {
        property: true,
        user: true,
      },
    });
    if (!purchaseRequest) {
      throw new NotFoundException('Purchase request not found');
    }

    if (purchaseRequest.status !== 'PENDING') {
      throw new BadRequestException('Purchase request is not pending');
    }

    await this.purchaseRequestRepository
      .createQueryBuilder()
      .update(PurchaseRequest)
      .set({ status: 'REJECTED' })
      .where('id != :id', { id: id })
      .andWhere('propertyId = :propertyId', {
        propertyId: purchaseRequest.property.id,
      })
      .andWhere('status = :status', { status: 'PENDING' })
      .execute();

    purchaseRequest.status = 'APPROVED';
    purchaseRequest.property.status = 'SOLD';
    await this.propertyRepository.save(purchaseRequest.property);
    await this.purchaseRequestRepository.save(purchaseRequest);
    return {
      message: 'Purchase request approved successfully',
    };
  }
  async rejectPurchaseRequest(id: number, user: any) {
    const purchaseRequest = await this.purchaseRequestRepository.findOne({
      where: {
        id: id,
        property: {
          owner: user.userId,
        },
      },
      relations: {
        property: true,
      },
    });
    if (!purchaseRequest) {
      throw new NotFoundException('Purchase request not found');
    }

    if (purchaseRequest.status !== 'PENDING') {
      throw new BadRequestException('Purchase request is not pending');
    }
    purchaseRequest.status = 'REJECTED';
    await this.purchaseRequestRepository.save(purchaseRequest);
    return {
      message: 'Purchase request rejected successfully',
    };
  }
  async getPendingPurchaseRequests(user) {
    return this.purchaseRequestRepository.find({
      where: {
        status: 'PENDING',
        property: {
          owner: user.userId,
        },
      },
      relations: {
        property: true,
        user: true,
      },
    });
  }

  async getApprovedPurchaseRequests(user: any) {
    return this.purchaseRequestRepository.find({
      where: {
        status: 'APPROVED',
        property: {
          owner: user.userId,
        },
      },
      relations: {
        property: true,
        user: true,
      },
    });
  }

  async getRejectedPurchaseRequests(user: any) {
    return this.purchaseRequestRepository.find({
      where: {
        status: 'REJECTED',
        property: {
          owner: user.userId,
        },
      },
      relations: {
        property: true,
      },
    });
  }
}
