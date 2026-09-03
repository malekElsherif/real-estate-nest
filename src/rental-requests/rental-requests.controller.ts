import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RentalRequestsService } from './rental-requests.service';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { VerifiedAgentGuard } from 'src/auth/guards/verified-agent.guard';
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rental-requests')
export class RentalRequestsController {
  constructor(private readonly rentalRequestsService: RentalRequestsService) {}
  @Roles('USER')
  @Post('create/property/:id')
  createRentalRequest(
    @Req() req: Request & { user: any },
    @Param('id') id: number,
  ) {
    return this.rentalRequestsService.createRentalRequest(req.user, id);
  }

  @Get('myrequests')
  getMyRentalRequests(@Req() req: Request & { user: any }) {
    return this.rentalRequestsService.getMyRentalRequests(req.user);
  }
  @Patch('myrequests/cancel/:id')
  cancelRentalRequest(
    @Param('id') id: number,
    @Req() req: Request & { user: any },
  ) {
    return this.rentalRequestsService.cancelRentalRequest(id, req.user);
  }
  @Get('myrequests/:id')
  getRentalRequestById(
    @Param('id') id: number,
    @Req() req: Request & { user: any },
  ) {
    return this.rentalRequestsService.getRentalRequestById(id, req.user);
  }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Get('myproperties')
  getRentalRequestsForMyProperties(@Req() req: Request & { user: any }) {
    return this.rentalRequestsService.getRentalRequestsForMyProperties(
      req.user,
    );
  }

  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Patch('approve/:id')
  approveRentalRequest(
    @Param('id') id: number,
    @Req() req: Request & { user: any },
  ) {
    return this.rentalRequestsService.approveRentalRequest(id, req.user);
  }

  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Patch('reject/:id')
  rejectRentalRequest(
    @Param('id') id: number,
    @Req() req: Request & { user: any },
  ) {
    return this.rentalRequestsService.rejectRentalRequest(id, req.user);
  }

  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Get('getapprovedrequests')
  getApprovedRentalRequests(@Req() req: Request & { user: any }) {
    return this.rentalRequestsService.getApprovedRentalRequests(req.user);
  }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Get('getrejectrequests')
  getrejectRentalRequest(@Req() req: Request & { user: any }) {
    return this.rentalRequestsService.getRejectedRentalRequests(req.user);
  }
}
