import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';

async function seedAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    console.log('Database connection started...');

    const userRepository = app.get<Repository<User>>(
      getRepositoryToken(User),
    );

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error(
        'ADMIN_EMAIL and ADMIN_PASSWORD must be defined in .env',
      );
    }

    const existingAdmin = await userRepository.findOne({
      where: {
        email: adminEmail,
      },
    });

    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = userRepository.create({
      name: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
    });

    await userRepository.save(admin);

    console.log('Admin created successfully');
  } catch (error) {
    console.error('Failed to create admin:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
    console.log('Application context closed');
  }
}

seedAdmin();