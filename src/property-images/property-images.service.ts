import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v2 as cloudinary } from 'cloudinary';

import { PropertyImage } from './entities/property-image.entity';
import { Property } from '../properties/entities/property.entity';

@Injectable()
export class PropertyImagesService {
  constructor(
    @InjectRepository(PropertyImage)
    private readonly propertyImageRepository: Repository<PropertyImage>,

    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  private async uploadImage(file: Express.Multer.File): Promise<{
    secure_url: string;
    public_id: string;
  }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No valid image uploaded');
    }

    try {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'real-estate/properties',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }

            if (!result) {
              reject(new Error('Cloudinary returned no upload result'));
              return;
            }

            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          },
        );

        stream.end(file.buffer);
      });
    } catch (error) {
      console.error('Cloudinary upload failed:', error);

      throw new InternalServerErrorException(
        'Failed to upload image to cloud storage',
      );
    }
  }

  private getCloudinaryPublicId(url: string): string | null {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname !== 'res.cloudinary.com') {
        return null;
      }

      const uploadIndex = parsedUrl.pathname.indexOf('/upload/');

      if (uploadIndex === -1) {
        return null;
      }

      let publicId = parsedUrl.pathname.slice(uploadIndex + 8);

      // Remove the version prefix, e.g. v123456789/
      publicId = publicId.replace(/^v\d+\//, '');

      // Remove the file extension.
      publicId = publicId.replace(/\.[^/.]+$/, '');

      return decodeURIComponent(publicId) || null;
    } catch {
      return null;
    }
  }

  private async deleteCloudinaryImage(url: string): Promise<void> {
    const publicId = this.getCloudinaryPublicId(url);

    // Legacy local URLs are not Cloudinary assets.
    if (!publicId) {
      return;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });

      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(`Cloudinary delete result: ${result.result}`);
      }
    } catch (error) {
      console.error('Cloudinary delete failed:', error);

      throw new InternalServerErrorException(
        'Failed to delete image from cloud storage',
      );
    }
  }

  async addImage(propertyId: number, files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('No files uploaded');
    }

    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Upload sequentially so partial failures are easier to handle.
    const uploadedImages: {
      secure_url: string;
      public_id: string;
    }[] = [];

    try {
      for (const file of files) {
        uploadedImages.push(await this.uploadImage(file));
      }

      const images = uploadedImages.map((uploaded) =>
        this.propertyImageRepository.create({
          url: uploaded.secure_url,
          property,
        }),
      );

      return await this.propertyImageRepository.save(images);
    } catch (error) {
      // Roll back uploaded assets if the batch or database save fails.
      await Promise.allSettled(
        uploadedImages.map((uploaded) =>
          cloudinary.uploader.destroy(uploaded.public_id, {
            resource_type: 'image',
          }),
        ),
      );

      throw error;
    }
  }

  async getPropertyImages(propertyId: number) {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return this.propertyImageRepository.find({
      where: {
        property: { id: propertyId },
      },
    });
  }

  async deleteImage(id: number) {
    const image = await this.propertyImageRepository.findOne({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    await this.deleteCloudinaryImage(image.url);
    await this.propertyImageRepository.remove(image);

    return {
      message: 'Image deleted successfully',
    };
  }

  async updateImage(id: number, file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No valid image uploaded');
    }

    const image = await this.propertyImageRepository.findOne({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const oldUrl = image.url;
    const uploaded = await this.uploadImage(file);

    image.url = uploaded.secure_url;

    try {
      const savedImage = await this.propertyImageRepository.save(image);

      // Delete the old asset only after the database update succeeds.
      try {
        await this.deleteCloudinaryImage(oldUrl);
      } catch (error) {
        console.error('Old image cleanup failed:', error);
      }

      return savedImage;
    } catch (error) {
      // The database update failed; remove the newly uploaded asset.
      await cloudinary.uploader
        .destroy(uploaded.public_id, {
          resource_type: 'image',
        })
        .catch((cleanupError) => {
          console.error('New image cleanup failed:', cleanupError);
        });

      throw error;
    }
  }
}
