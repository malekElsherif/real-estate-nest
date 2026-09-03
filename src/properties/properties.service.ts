import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Property } from './entities/property.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { FilterPropertyDto } from './dto/filter-property.dto';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAllProperties(page: PaginationDto) {
    const { page: pageNo, limit } = page;
    const skip = (pageNo - 1) * limit;

    const query = this.propertyRepository.createQueryBuilder('property');
    const [data, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy('property.id', 'ASC')
      .getManyAndCount();
    return {
      data,
      total,
      page: pageNo,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPropertyById(id: number) {
    const property = await this.propertyRepository.findOne({
      where: {
        id: id,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  async filterandsearchProperties(
    filter: FilterPropertyDto,
    page: PaginationDto,
  ) {
    const { city, minPrice, maxPrice } = filter;
    const { page: pageNo, limit } = page;
    const query = this.propertyRepository.createQueryBuilder('property');
    if (city) {
      query.andWhere('property.city = :city', { city });
    }
    if (minPrice) {
      query.andWhere('property.price >= :minPrice', { minPrice });
    }
    if (maxPrice) {
      query.andWhere('property.price <= :maxPrice', { maxPrice });
    }
    const skip = (pageNo - 1) * limit;

    const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      total,
      page: pageNo,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async createProperty(property: CreatePropertyDto, user: any) {
    const currentUser = user;
    const newProperty = this.propertyRepository.create({
      ...property,
      owner: currentUser.userId,
    });

    return this.propertyRepository.save(newProperty);
  }

  async updateProperty(id: number, property: UpdatePropertyDto) {
    const updatedProperty = await this.propertyRepository.preload({
      id: id,
      ...property,
    });

    if (!updatedProperty) {
      throw new NotFoundException('Property not found');
    }
    return this.propertyRepository.save(updatedProperty);
  }

  async deleteProperty(id: number) {
    const property = await this.propertyRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    this.propertyRepository.remove(property);
    return {
      message: 'Property deleted successfully',
    };
  }

  async findPropertiesByUserId(userId: number, page: PaginationDto) {
    const { page: pageNo, limit } = page;

    const skip = (pageNo - 1) * limit;

    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query = this.propertyRepository
      .createQueryBuilder('property')
      .where('property.ownerId = :userId', { userId });

    const [data, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy('property.id', 'ASC')
      .getManyAndCount();

    return {
      data,
      total,
      page: pageNo,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async findsymilarproperty(propid: number) {
    const property = await this.propertyRepository.findOne({
      where: {
        id: propid,
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    const minPrice = Number(property.price) * 0.8;
    const maxPrice = Number(property.price) * 1.2;

    const properties = this.propertyRepository.createQueryBuilder('property');
    properties.andWhere('property.city = :city', { city: property.city });
    properties.andWhere('property.price >= :minPrice', { minPrice });
    properties.andWhere('property.price <= :maxPrice', { maxPrice });
    properties.andWhere('property.id != :id', { id: propid });
    return properties.getMany();
  }
  async makePropertyAvailableUnavailable(id: number) {
    const property = await this.propertyRepository.findOne({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.status !== 'AVAILABLE' && property.status !== 'PENDING') {
      throw new BadRequestException(
        'Only PENDING or AVAILABLE properties can change availability',
      );
    }

    property.status = property.status === 'AVAILABLE' ? 'PENDING' : 'AVAILABLE';

    await this.propertyRepository.save(property);

    return {
      message: 'Property status updated successfully',
      status: property.status,
    };
  }

  async getAllpendingproperties() {
    const properties = await this.propertyRepository.find({
      where: {
        status: 'PENDING',
      },
    });

    return properties;
  }
}
