import { Module } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { Favorite } from './entities/favorite.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from 'src/properties/entities/property.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Favorite]),
    TypeOrmModule.forFeature([Property]),
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
