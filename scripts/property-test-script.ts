import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { User } from '../src/users/entities/user.entity';
import { Property } from '../src/properties/entities/property.entity';
import * as dotenv from 'dotenv';

dotenv.config();

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
  images?: unknown;
  [key: string]: unknown;
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'your_db_name',
  entities: [path.join(__dirname, '../src/**/*.entity{.ts,.js}')],
  synchronize: false,
});

async function runSeed() {
  try {
    console.log('⏳ جاري الاتصال بقاعدة البيانات...');
    await AppDataSource.initialize();
    console.log('✅ تم الاتصال بنجاح.');

    const userRepository = AppDataSource.getRepository(User);
    const propertyRepository = AppDataSource.getRepository(Property);

    // 1. جلب المستخدمين من نوع AGENT فقط
    const agents = await userRepository.find({
      where: { role: 'AGENT' } as any,
      select: { id: true },
    });

    if (agents.length === 0) {
      console.error('❌ لا يوجد مستخدمين من نوع AGENT في قاعدة البيانات لربط العقارات بهم.');
      process.exit(1);
    }

    // 2. قراءة ملف الـ JSON
    const jsonPath = path.join(__dirname, '../scripts/data.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');

    const parsedData: unknown = JSON.parse(rawData);
    const propertiesData = parsedData as PropertyInput[];

    // 3. تجهيز العقارات وإسناد قيم افتراضية للحقول غير القابلة للـ NULL
    const properties = propertiesData.map((propertyData) => {
      const randomIndex = Math.floor(Math.random() * agents.length);
      const randomAgent = agents[randomIndex];

      const { images, ...restPropertyData } = propertyData;

      return propertyRepository.create({
        ...restPropertyData,
        title: propertyData.title || 'عقار بدون عنوان',
        description: propertyData.description || propertyData.title || 'لا يوجد وصف متاح حالياً',
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
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

void runSeed();
