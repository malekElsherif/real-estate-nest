import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Property } from '../src/properties/entities/property.entity';

interface PropertyInput {
  title: string;
  price: number;
  description?: string;
  city?: string;
  address?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  type?: string;
  [key: string]: unknown;
}

async function runSeed() {
  let appCtx;
  try {
    console.log('⏳ جاري تحميل تطبيق NestJS واستخدام اتصال قاعدة البيانات...');

    // إنشاء سياق التطبيق بدون تشغيل سيرفر HTTP
    appCtx = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });

    const userRepository: Repository<User> = appCtx.get(
      getRepositoryToken(User),
    );
    const propertyRepository: Repository<Property> = appCtx.get(
      getRepositoryToken(Property),
    );

    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح عبر AppModule.');

    // 1. جلب المستخدمين من نوع AGENT فقط
    const agents = await userRepository.find({
      where: { role: 'AGENT' } as any,
      select: { id: true },
    });

    if (agents.length === 0) {
      console.error(
        '❌ لا يوجد مستخدمين من نوع AGENT في قاعدة البيانات لربط العقارات بهم.',
      );
      process.exit(1);
    }

    // 2. قراءة ملف الـ JSON
    const jsonPath = path.join(__dirname, '../scripts/data.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const propertiesData = JSON.parse(rawData) as PropertyInput[];

    // 3. تجهيز العقارات واستبعاد الصور تماماً
    const properties = propertiesData.map((propertyData) => {
      const randomIndex = Math.floor(Math.random() * agents.length);
      const randomAgent = agents[randomIndex];

      // استبعاد الصور من البيانات إن وجدت في الـ JSON
      const { images, ...restPropertyData } = propertyData;

      return propertyRepository.create({
        ...restPropertyData,
        title: propertyData.title || 'عقار بدون عنوان',
        description:
          propertyData.description ||
          propertyData.title ||
          'لا يوجد وصف متاح حالياً',
        price: Number(propertyData.price) || 0,
        city: propertyData.city || 'القاهرة',
        address: propertyData.address || 'العنوان غير محدد',
        area: Number(propertyData.area) || 100,
        bedrooms: Number(propertyData.bedrooms) || 2,
        bathrooms: Number(propertyData.bathrooms) || 1,
        owner: randomAgent,
      });
    });

    // 4. حفظ العقارات دفعة واحدة
    console.log(`⏳ جاري رفع ${properties.length} عقار وربطها بالـ AGENTS...`);
    await propertyRepository.save(properties, { chunk: 500 });

    console.log('🎉 تم رفع جميع العقارات وتوزيعها على الـ AGENTS بنجاح!');
  } catch (error) {
    console.error('❌ حدث خطأ أثناء تنفيذ السكريبت:', error);
  } finally {
    if (appCtx) {
      await appCtx.close();
    }
    process.exit(0);
  }
}

void runSeed();
