import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('getallusers')
  async getallusers() {
    return this.adminService.findallusers();
  }
  @Get('getUserActivityReport/:id')
  async getUserActivityReport(@Param('id') id: number) {
    return this.adminService.getUserActivityReport(id);
  }

  @Patch('deactivateUser/:id')
  deactivateUser(@Param('id') id: number) {
    return this.adminService.deactivateUser(id);
  }

  @Patch('activateUser/:id')
  activateUser(@Param('id') id: number) {
    return this.adminService.activateUser(id);
  }

  @Delete('deleteUser/:id')
  deleteUser(@Param('id') id: number) {
    return this.adminService.deleteUser(id);
  }

  @Get('getPendingAgents')
  getPendingAgents() {
    return this.adminService.getPendingAgents();
  }
  @Patch('verifyAgent/:id')
  verifyAgent(@Param('id') id: number) {
    return this.adminService.verifyAgent(id);
  }
  @Patch('rejectAgent/:id')
  rejectAgent(@Param('id') id: number) {
    return this.adminService.rejectAgent(id);
  }
  @Get('getAgentVerificationStatus/:id')
  getAgentVerificationStatus(@Param('id') id: number) {
    return this.adminService.getAgentVerificationStatus(id);
  }
}
