import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';

import { PurchaseRequestsService } from './purchase-requests.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { VerifiedAgentGuard } from 'src/auth/guards/verified-agent.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(
    private readonly purchaseRequestsService: PurchaseRequestsService,
  ) {}

  // Create purchase request
  @Roles('USER')
  @Post(':id')
  async create(
    @Req() req: Request & { user: any },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.purchaseRequestsService.createpurchaseRequest(req.user, id);
  }

  // Get my purchase requests
  @Roles('USER')
  @Get('mypurchaseRequests')
  async getmypurchaseRequests(@Req() req: Request & { user: any }) {
    return this.purchaseRequestsService.getmypurchaseRequests(req.user);
  }

  // Cancel my purchase request
  @Roles('USER')
  @Delete('mypurchaseRequests/:id')
  async canclepurchaseRequests(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: any },
  ) {
    return this.purchaseRequestsService.canclepurchaseRequests(id, req.user);
  }

  // Get purchase request by ID
  @Roles('USER')
  @Get('getParchesRequest/:id')
  async getParchesRequestById(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseRequestsService.getParchesRequestById(id);
  }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Get('myProperties')
  async getPurchaseRequestsForMyProperties(
    @Req() req: Request & { user: any },
  ) {
    return this.purchaseRequestsService.getPurchaseRequestsForMyProperties(
      req.user,
    );
  }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Post('approve/:id')
  async approvePurchaseRequest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: any },
  ) {
    return this.purchaseRequestsService.approvePurchaseRequest(id, req.user);
  }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Post('reject/:id')
  async rejectPurchaseRequest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: any },
  ) {
    return this.purchaseRequestsService.rejectPurchaseRequest(id, req.user);
  }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Get('pending')
  async getPendingPurchaseRequests(@Req() req: Request & { user: any }) {
    return this.purchaseRequestsService.getPendingPurchaseRequests(req.user);
  }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Get('approved')
  async getApprovedPurchaseRequests(@Req() req: Request & { user: any }) {
    return this.purchaseRequestsService.getApprovedPurchaseRequests(req.user);
  }
  @UseGuards(VerifiedAgentGuard)
  @Roles('AGENT')
  @Get('rejected')
  async getRejectedPurchaseRequests(@Req() req: Request & { user: any }) {
    return this.purchaseRequestsService.getRejectedPurchaseRequests(req.user);
  }
}
