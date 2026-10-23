import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViewedProp } from './entities/viewed-prop.entity';

@Injectable()
export class ViewedPropsService {
  constructor(
    @InjectRepository(ViewedProp)
    private readonly viewedPropRepository: Repository<ViewedProp>,
  ) {}

  // تسجيل عقار تم مشاهدته بواسطة المستخدم
  async create(userId: number, propertyId: number) {
    const viewedProp = this.viewedPropRepository.create({
      userId: Number(userId),
      propertyId: Number(propertyId),
    });
    return await this.viewedPropRepository.save(viewedProp);
  }

  // جلب العقارات التي شاهدها مستخدم معين
  async findByUser(userId: number) {
    return await this.viewedPropRepository.find({
      where: { userId: Number(userId) },
      relations: {
        property: {
          images: true,
        },
      },
      order: { viewedAt: 'DESC' },
    });
  }
}
