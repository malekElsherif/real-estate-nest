import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RentalRequest } from './entities/rental-request.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Property } from 'src/properties/entities/property.entity';

@Injectable()
export class RentalRequestsService {
  constructor(
    @InjectRepository(RentalRequest)
    private readonly rentalRequestRepository: Repository<RentalRequest>,

    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async createRentalRequest(user: any, propertyId: number) {
    const property = await this.propertyRepository.findOne({
      where: {
        id: propertyId,
      },
    });
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    if (property.type !== 'RENT') {
      throw new BadRequestException('Property is for sale');
    }

    if (property.status !== 'AVAILABLE') {
      throw new BadRequestException('Property is not available');
    }

    const existingRequest = await this.rentalRequestRepository.findOne({
      where: {
        user: { id: user.userId }, // تصحيح الهيكل ليتوافق مع علاقات TypeORM
        property: { id: propertyId },
        status: 'PENDING',
      },
    });
    if (existingRequest) {
      throw new BadRequestException(
        'You have already made a rental request for this property',
      );
    }

    const rentalRequest = this.rentalRequestRepository.create({
      user: { id: user.userId }, // تصحيح هنا أيضاً لربط الـ ID بشكل صحيح
      property: {
        id: propertyId,
      },
    });

    await this.rentalRequestRepository.save(rentalRequest);
    return {
      message: 'Rental request created successfully',
    };
  }

  async getMyRentalRequests(user: any) {
    return this.rentalRequestRepository.find({
      where: {
        user: {
          id: user.userId,
        },
      },
      relations: {
        property: true,
      },
    });
  }

  async getRentalRequestById(id: number, user: any) {
    const rentalRequest = await this.rentalRequestRepository.findOne({
      where: {
        id: id,
        user: {
          id: user.userId,
        },
      },
      relations: {
        property: true,
      },
    });
    if (!rentalRequest) {
      throw new NotFoundException('Rental request not found');
    }
    return rentalRequest;
  }

  async cancelRentalRequest(id: number, user: any) {
    const rentalRequest = await this.rentalRequestRepository.findOne({
      where: {
        id: id,
        user: {
          id: user.userId,
        },
      },
    });
    if (!rentalRequest) {
      throw new NotFoundException('Rental request not found');
    }
    if (rentalRequest.status !== 'PENDING') {
      throw new BadRequestException('Rental request is not pending');
    }
    rentalRequest.status = 'CANCELLED';
    await this.rentalRequestRepository.save(rentalRequest);
    return {
      message: 'Rental request canceled successfully',
    };
  }

  async getRentalRequestsForMyProperties(user: any) {
    const res = await this.rentalRequestRepository.find({
      where: {
        property: {
          owner: {
            id: user.userId, // تأكد من مطابقة هيكل العلاقة هنا إذا كان owner عبارة عن علاقة كائن
          },
        },
      },
      relations: {
        property: {
          owner: true,
        },
        user: true,
      },
    });
    if (!res) {
      throw new NotFoundException('No rental requests found');
    }
    return res;
  }

  async getApprovedRentalRequests(user: any) {
    return this.rentalRequestRepository.find({
      where: {
        status: 'APPROVED',
        property: {
          owner: {
            id: user.userId,
          },
        },
      },
      relations: {
        property: {
          owner: true,
        },
        user: true,
      },
    });
  }

  async getRejectedRentalRequests(user: any) {
    return this.rentalRequestRepository.find({
      where: {
        status: 'REJECTED',
        property: {
          owner: {
            id: user.userId,
          },
        },
      },
      relations: {
        property: {
          owner: true,
        },
        user: true,
      },
    });
  }
  async approveRentalRequest(id: number, user: any) {
    const req = await this.rentalRequestRepository.findOne({
      where: {
        id,
        status: 'PENDING',
        property: {
          owner: {
            id: user.userId,
          },
        },
      },
      relations: {
        property: {
          owner: true,
        },
        user: true,
      },
    });

    if (!req) {
      throw new NotFoundException(
        'Rental request not found or you are not authorized to approve it.',
      );
    }

    if (req.property.status === 'RENTED') {
      throw new BadRequestException('This property is already rented.');
    }

    req.status = 'APPROVED';
    req.property.status = 'RENTED';

    await this.rentalRequestRepository.save(req);
    await this.propertyRepository.save(req.property);

    return 'Rent request approved successfully';
  }
  async rejectRentalRequest(id: number, user: any) {
    const req = await this.rentalRequestRepository.findOne({
      where: {
        id: id,
        status: 'PENDING',
        property: {
          owner: {
            id: user.userId,
          },
        },
      },
      relations: {
        property: {
          owner: true,
        },
        user: true,
      },
    });

    if (!req) {
      throw new NotFoundException(
        'Rental request not found or you are not authorized to reject it.',
      );
    }

    req.status = 'REJECTED';
    return await this.rentalRequestRepository.save(req);
  }
}
