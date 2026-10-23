import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Property } from '../src/properties/entities/property.entity';

const AGENT_COUNT = 10;
const PROPERTIES_PER_AGENT = 10;
const DEMO_PASSWORD = 'DemoAgent2026!';

const cities = [
  { city: 'القاهرة', areas: ['مدينة نصر', 'المعادي', 'التجمع الخامس'] },
  { city: 'الجيزة', areas: ['الشيخ زايد', 'أكتوبر', 'الدقي'] },
  { city: 'الإسكندرية', areas: ['سموحة', 'سيدي جابر', 'العجمي'] },
  { city: 'المنصورة', areas: ['حي الجامعة', 'المشاية', 'توريل'] },
  { city: 'طنطا', areas: ['شارع البحر', 'سبرباي', 'الاستاد'] },
  { city: 'الغردقة', areas: ['الممشى السياحي', 'الأحياء', 'الكوثر'] },
];

const buildingTypes = [
  { name: 'شقة', bedrooms: 3, bathrooms: 2, area: 140 },
  { name: 'بيت', bedrooms: 4, bathrooms: 2, area: 220 },
  { name: 'مكتب', bedrooms: 0, bathrooms: 1, area: 90 },
  { name: 'فيلا', bedrooms: 5, bathrooms: 4, area: 320 },
  { name: 'استوديو', bedrooms: 1, bathrooms: 1, area: 65 },
];

const purposes = [
  { type: 'SALE', label: 'للبيع' },
  { type: 'RENT', label: 'للإيجار' },
];

async function seedRealEstate(): Promise<void> {
  if (process.env.ALLOW_REAL_ESTATE_SEED !== 'true') {
    throw new Error(
      'Safety stop: set ALLOW_REAL_ESTATE_SEED=true to confirm database seeding.',
    );
  }

  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;

  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });

    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const propertyRepository = app.get<Repository<Property>>(
      getRepositoryToken(Property),
    );
    const dataSource = app.get(DataSource);

    const demoAgents = [
      { name: 'Ali Omar', email: 'agent@agent.com' },
      { name: 'Omar Ahmed', email: 'agent1@agent.com' },
      { name: 'Youssef Ali', email: 'agent2@agent.com' },
      { name: 'Ahmed Hassan', email: 'agent3@agent.com' },
      { name: 'Mahmoud Samir', email: 'agent4@agent.com' },
      { name: 'Amr Khaled', email: 'agent5@agent.com' },
      { name: 'Mostafa Adel', email: 'agent6@agent.com' },
      { name: 'Karim Tarek', email: 'agent7@agent.com' },
      { name: 'Hassan Ibrahim', email: 'agent8@agent.com' },
      { name: 'Ziad Mohamed', email: 'agent9@agent.com' },
    ];

    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    let agentsCreated = 0;
    let propertiesCreated = 0;

    await dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const properties = manager.getRepository(Property);

      for (let agentIndex = 0; agentIndex < demoAgents.length; agentIndex++) {
        const agentData = demoAgents[agentIndex];

        let agent = await users.findOne({
          where: { email: agentData.email },
        });

        if (!agent) {
          agent = users.create({
            ...agentData,
            password: hashedPassword,
            role: 'AGENT',
            isActive: true,
            isVerified: true,
            verificationStatus: 'APPROVED',
          });

          agent = await users.save(agent);
          agentsCreated++;
        } else if (agent.role !== 'AGENT') {
          throw new Error(
            `Safety stop: existing account conflicts with seed agent ${agentData.email}.`,
          );
        }

        for (
          let propertyIndex = 0;
          propertyIndex < PROPERTIES_PER_AGENT;
          propertyIndex++
        ) {
          const agentNumber = String(agentIndex + 1).padStart(2, '0');
          const propertyNumber = String(propertyIndex + 1).padStart(2, '0');

          const building = buildingTypes[propertyIndex % buildingTypes.length];
          const purpose =
            purposes[Math.floor(propertyIndex / 2) % purposes.length];
          const location = cities[(agentIndex + propertyIndex) % cities.length];
          const areaName =
            location.areas[
              (agentIndex + propertyIndex) % location.areas.length
            ];

          const titlePrefixes = [
            'Modern', 'Bright', 'Spacious', 'Elegant', 'Newly Renovated',
            'Luxury', 'Comfortable', 'Premium', 'Charming', 'Contemporary',
          ];
          const titleBuilding = {
            'شقة': 'Apartment',
            'بيت': 'House',
            'مكتب': 'Office',
            'فيلا': 'Villa',
            'استوديو': 'Studio',
          }[building.name] ?? 'Property';

          const seedTitle =
            `${titlePrefixes[propertyIndex]} ${titleBuilding} in ${areaName}`;

          const legacySeedTitle = `[DEMO-SEED:${agentNumber}:${propertyNumber}]`;

          const existingProperty = await properties.findOne({
            where: { title: legacySeedTitle },
          });

          const existingByNewTitle = await properties.findOne({
            where: { title: seedTitle },
          });

          if (
            existingByNewTitle &&
            existingByNewTitle.id !== existingProperty?.id
          ) {
            throw new Error(`Title conflict while seeding: ${seedTitle}`);
          }

          const area = building.area + ((agentIndex + propertyIndex) % 4) * 10;

          const basePrice =
            building.name === 'مكتب'
              ? 1_500_000
              : building.name === 'فيلا'
                ? 5_000_000
                : building.name === 'بيت'
                  ? 2_500_000
                  : building.name === 'استوديو'
                    ? 700_000
                    : 1_200_000;

          const price =
            purpose.type === 'RENT'
              ? 4_000 + area * 45 + agentIndex * 250
              : basePrice + area * 5_000 + agentIndex * 50_000;

          const propertyData = {
            title: seedTitle,
            description:
              `${titleBuilding} ${purpose.label} في ${areaName}، ${location.city}. ` +
              `مساحة ${area} متر مربع، بتصميم عملي وموقع مناسب للسكن أو الاستثمار.`,
            price,
            city: location.city,
            address: `${areaName}، ${location.city}`,
            area,
            bedrooms: building.bedrooms,
            bathrooms: building.bathrooms,
            type: purpose.type,
            status: existingProperty?.status ?? 'PENDING',
            isVerified: existingProperty?.isVerified ?? false,
            owner: agent,
          };

          if (existingProperty) {
            properties.merge(existingProperty, propertyData);
            await properties.save(existingProperty);
          } else {
            await properties.save(properties.create(propertyData));
            propertiesCreated++;
          }
        }
      }
    });

    console.log('Seed completed successfully.');
    console.log(`Agents created in this run: ${agentsCreated}`);
    console.log(`Properties created in this run: ${propertiesCreated}`);
    console.log(`Agents configured: ${AGENT_COUNT}`);
    console.log(`Properties per agent: ${PROPERTIES_PER_AGENT}`);
    console.log(
      `Demo login password for newly created agents: ${DEMO_PASSWORD}`,
    );
    console.log('Existing seed properties were skipped.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    if (app) {
      await app.close();
    }
  }
}

void seedRealEstate();
