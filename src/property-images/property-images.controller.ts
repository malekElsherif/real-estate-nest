import {
  BadRequestException,
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
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { PropertyImagesService } from './property-images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifiedAgentGuard } from '../auth/guards/verified-agent.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const imageUploadOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per image
  },
  fileFilter: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedTypes = ['image/jpeg', 'image/png'];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new BadRequestException('Only JPEG and PNG images are allowed'),
        false,
      );
    }

    cb(null, true);
  },
};

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
  @UseInterceptors(FilesInterceptor('file', 10, imageUploadOptions))
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.propertyImagesService.addImage(id, files);
  }

  @UseGuards(VerifiedAgentGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
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
