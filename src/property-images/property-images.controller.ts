import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { PropertyImagesService } from './property-images.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { VerifiedAgentGuard } from 'src/auth/guards/verified-agent.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Roles('AGENT')
@UseGuards(JwtAuthGuard)
@Controller('property-images')
export class PropertyImagesController {
  constructor(private readonly propertyImagesService: PropertyImagesService) {}

  @Get(':id')
  getPropertyImages(@Param('id', ParseIntPipe) id: number) {
    return this.propertyImagesService.getPropertyImages(id);
  }
  @UseGuards(VerifiedAgentGuard)
  @Post(':id')
  @UseInterceptors(
    FilesInterceptor('file', 10, {
      storage: diskStorage({
        destination: path.join(process.cwd(), 'uploads', 'properties'),

        filename: (req, file, cb) => {
          const fileName = `${Date.now()}-${file.originalname}`;

          cb(null, fileName);
        },
      }),
    }),
  )
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    console.log('ID:', id);
    console.log('FILES:', files);

    return this.propertyImagesService.addImage(id, files);
  }
  @UseGuards(VerifiedAgentGuard)
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: path.join(process.cwd(), 'uploads', 'properties'),
        filename: (req, file, cb) => {
          const fileName = `${Date.now()}-${file.originalname}`;

          cb(null, fileName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
          cb(null, true);
        } else {
          cb(null, false);
        }
      },
    }),
  )
  updateImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.propertyImagesService.updateImage(id, file);
  }
  @UseGuards(VerifiedAgentGuard)
  @Delete(':id')
  deleteImage(@Param('id', ParseIntPipe) id: number) {
    return this.propertyImagesService.deleteImage(id);
  }
}
