import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('/property/:id')
  create(@Req() req: Request & { user: any }, @Param('id') id: number) {
    return this.favoritesService.addtoFavorites(req.user, id);
  }

  @Get('/myfavorites')
  findmyFavorites(@Req() req: Request & { user: any }) {
    return this.favoritesService.getmyFavorites(req.user);
  }

  @Delete('/property/:id')
  remove(@Req() req: Request & { user: any }, @Param('id') id: number) {
    return this.favoritesService.removeFromFavorites(req, id);
  }

  @Get('/property/isFavorite/:id')
  isFavorite(@Req() req: Request & { user: any }, @Param('id') id: number) {
    return this.favoritesService.isFavorite(req, id);
  }
}
