import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ViewedPropsService } from './viewed-props.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('viewed-props')
export class ViewedPropsController {
  constructor(private readonly viewedPropsService: ViewedPropsService) {}

  // تسجيل مشاهدة عقار
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body('propertyId') propertyId: number) {
    // دعم جميع الاحتمالات الممكنة لاسم الـ ID داخل الـ JWT (id, sub, userId)
    const rawId = req.user?.id || req.user?.sub || req.user?.userId;
    const userId = rawId ? Number(rawId) : null;

    if (!userId || isNaN(userId)) {
      throw new UnauthorizedException(
        'User not authenticated or invalid user ID',
      );
    }

    return await this.viewedPropsService.create(userId, Number(propertyId));
  }

  // جلب تفاعلات/مشاهدات مستخدم معين
  @UseGuards(JwtAuthGuard)
  @Get('user/:id')
  async findByUser(@Param('id') id: string) {
    return await this.viewedPropsService.findByUser(+id);
  }
}
