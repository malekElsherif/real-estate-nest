import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Property } from 'src/properties/entities/property.entity';
import { PurchaseRequest } from 'src/purchase-requests/entities/purchase-request.entity';
import { RentalRequest } from 'src/rental-requests/entities/rental-request.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,

    @InjectRepository(PurchaseRequest)
    private readonly purchaseRequestRepository: Repository<PurchaseRequest>,

    @InjectRepository(RentalRequest)
    private readonly rentalRequestRepository: Repository<RentalRequest>,
  ) {}
  findallusers() {
    return this.userRepository.find();
  }

  async getUserActivityReport(userId: any) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const properties = await this.propertyRepository.find({
      where: {
        owner: {
          id: userId,
        },
      },
    });
    const purchaseRequests = await this.purchaseRequestRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
    });
    const rentalRequests = await this.rentalRequestRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
    });

    return {
      user: user,
      properties: properties.length,
      purchaseRequests: purchaseRequests.length,
      rentalRequests: rentalRequests.length,
    };
  }

  async deactivateUser(id: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Cannot deactivate admin user');
    }
    user.isActive = false;
    await this.userRepository.save(user);
    return {
      message: 'User deactivated successfully',
    };
  }

  async activateUser(id: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isActive = true;
    await this.userRepository.save(user);
    return {
      message: 'User activated successfully',
    };
  }

  async deleteUser(id: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const properties = await this.propertyRepository.find({
      where: {
        owner: {
          id: id,
        },
      },
    });

    const purchaseRequests = await this.purchaseRequestRepository.find({
      where: {
        user: {
          id: id,
        },
      },
    });

    const rentalRequests = await this.rentalRequestRepository.find({
      where: {
        user: {
          id: id,
        },
      },
    });

    // if (properties.length > 0 || purchaseRequests.length > 0 || rentalRequests.length > 0) {
    //   throw new BadRequestException(
    //     'User has properties, purchase requests, or rental requests',
    //   );
    // }
    await this.userRepository.remove(user);

    return {
      message: 'User deleted successfully',
    };
  }

  async getPendingAgents() {
    const users = await this.userRepository.find({
      where: {
        role: 'AGENT',
        isActive: true,
        isVerified: false,
        verificationStatus: 'PENDING',
      },
    });
    return users;
  }

  async verifyAgent(id: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isVerified = true;
    user.verificationStatus = 'APPROVED';
    await this.userRepository.save(user);
    return {
      message: 'Agent verified successfully',
    };
  }

  async rejectAgent(id: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isVerified = false;
    user.verificationStatus = 'REJECTED';
    await this.userRepository.save(user);
    return {
      message: 'Agent rejected successfully',
    };
  }

  async getAgentVerificationStatus(id: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.verificationStatus;
  }
}
