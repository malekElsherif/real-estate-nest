import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { Repository } from 'typeorm';
import { Property } from 'src/properties/entities/property.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,

    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async addtoFavorites(request: any, propertyId: number) {
    const property = await this.propertyRepository.findOne({
      where: {
        id: propertyId,
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    const favorite = this.favoriteRepository.create({
      user: request.userId,
      property: property,
    });

    if (request) {
      const myFavorite = await this.getmyFavorites(request);

      if (myFavorite.find((favorite) => favorite.property.id === propertyId)) {
        throw new NotFoundException('You already favorited this property');
      }
    }

    return this.favoriteRepository.save(favorite);
  }

  async getmyFavorites(request: any) {
    return this.favoriteRepository.find({
      where: {
        user: request.userId,
      },

      relations: {
        property: true,
      },
    });
  }

  async removeFromFavorites(request: any, propertyId: number) {
    const property = await this.propertyRepository.findOne({
      where: {
        id: propertyId,
      },
    });
    const favorite = await this.favoriteRepository.findOne({
      where: {
        user: request.user.userId,
      },
    });
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    this.favoriteRepository.remove(favorite);
    return {
      message: 'Favorite removed successfully',
    };
  }

  async isFavorite(request: any, propertyId: number) {
    const property = await this.propertyRepository.findOne({
      where: {
        id: propertyId,
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const isFavorite = await this.getmyFavorites(request.user);

    if (isFavorite.find((favorite) => favorite.property.id === propertyId)) {
      return true;
    }
    return false;
  }
}
