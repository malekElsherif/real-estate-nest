import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';

import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FilterPropertyDto } from './dto/filter-property.dto';
import { PaginationDto } from './dto/pagination.dto';
import type { Request } from 'express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { VerifiedAgentGuard } from 'src/auth/guards/verified-agent.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Post()
  async CraeteProperty(
    @Body() createPropertyDto: CreatePropertyDto,
    @Req() req: Request & { user: any },
  ) {
    return await this.propertiesService.createProperty(
      createPropertyDto,
      req.user,
    );
  }
  @Get()
  getAllProperties(
    @Query()
    page: PaginationDto,
  ) {
    return this.propertiesService.findAllProperties(page);
  }
  @Get('filter')
  filterandsearchProperties(
    @Query() filter: FilterPropertyDto,
    @Query() page: PaginationDto,
  ) {
    return this.propertiesService.filterandsearchProperties(filter, page);
  }

  @Roles('ADMIN')
  @Get('allpendingproperties')
  getAllpendingproperties() {
    return this.propertiesService.getAllpendingproperties();
  }
  @Get(':id')
  getPropertyById(@Param('id') id: number) {
    return this.propertiesService.findPropertyById(id);
  }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Patch(':id')
  updateProperty(
    @Param('id') id: number,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertiesService.updateProperty(id, updatePropertyDto);
  }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Delete(':id')
  deleteProperty(@Param('id') id: number) {
    return this.propertiesService.deleteProperty(id);
  }

  @Get('user/:userId')
  findPropertiesByUserId(
    @Param('userId') userId: number,
    @Query() page: PaginationDto,
  ) {
    return this.propertiesService.findPropertiesByUserId(userId, page);
  }

  @Get('similar/:propid')
  findsymilarproperty(@Param('propid') propid: number) {
    return this.propertiesService.findsymilarproperty(propid);
  }
  @Roles('ADMIN')
  @Patch(':id/makePropertyAvailableUnavailable')
  makeavailableProperty(@Param('id') id: number) {
    return this.propertiesService.makePropertyAvailableUnavailable(id);
  }
}
