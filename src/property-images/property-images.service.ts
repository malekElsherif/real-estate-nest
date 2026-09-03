import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PropertyImage } from './entities/property-image.entity';
import { Property } from '../properties/entities/property.entity';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PropertyImagesService {
  constructor(
    @InjectRepository(PropertyImage)
    private readonly propertyImageRepository: Repository<PropertyImage>,

    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  // Add image to property
  async addImage(propertyId: number, files: Express.Multer.File[]) {
    console.log('SERVICE FILES:', files);

    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const property = await this.propertyRepository.findOne({
      where: {
        id: propertyId,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const images = files.map((file) => {
      return this.propertyImageRepository.create({
        url: `/uploads/properties/${file.filename}`,
        property,
      });
    });

    return this.propertyImageRepository.save(images);
  }

  // Get all images for property
  async getPropertyImages(propertyId: number) {
    const property = await this.propertyRepository.findOne({
      where: {
        id: propertyId,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return this.propertyImageRepository.find({
      where: {
        property: {
          id: propertyId,
        },
      },
    });
  }

  // Delete image
  async deleteImage(id: number) {
    const image = await this.propertyImageRepository.findOne({
      where: {
        id,
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Get actual file path
    const filePath = path.join(
      process.cwd(),
      image.url.replace('/uploads/', 'uploads/'),
    );

    // Delete file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record from database
    await this.propertyImageRepository.remove(image);

    return {
      message: 'Image deleted successfully',
    };
  }

  async updateImage(id: number, file: Express.Multer.File) {
    const image = await this.propertyImageRepository.findOne({
      where: {
        id,
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Get actual file path
    const filePath = path.join(
      process.cwd(),
      image.url.replace('/uploads/', 'uploads/'),
    );

    // Delete file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update record
    image.url = `/uploads/properties/${file.filename}`;
    return this.propertyImageRepository.save(image);
  }
}
