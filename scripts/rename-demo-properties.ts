import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Property } from '../src/properties/entities/property.entity';
import { User } from '../src/users/entities/user.entity';
import { PropertyImage } from '../src/property-images/entities/property-image.entity';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  const dataSource = new DataSource({
    type: 'postgres',
    ...(databaseUrl
      ? { url: databaseUrl, ssl: { rejectUnauthorized: false } }
      : {
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT ?? 5432),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
        }),
    entities: [Property, User, PropertyImage],
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    const propertyRepo = dataSource.getRepository(Property);
    const userRepo = dataSource.getRepository(User);

    const agents = await userRepo
      .createQueryBuilder('user')
      .where('user.email IN (:...emails)', {
        emails: [
          'agent@agent.com',
          'agent1@agent.com',
          'agent2@agent.com',
          'agent3@agent.com',
          'agent4@agent.com',
          'agent5@agent.com',
          'agent6@agent.com',
          'agent7@agent.com',
          'agent8@agent.com',
          'agent9@agent.com',
        ],
      })
      .getMany();

    const agentIds = agents.map((agent) => agent.id);

    if (agentIds.length !== 10) {
      throw new Error(
        `Expected 10 demo agents, found ${agentIds.length}. No changes made.`,
      );
    }

    const properties = await propertyRepo
      .createQueryBuilder('property')
      .innerJoin('property.owner', 'owner')
      .where('owner.id IN (:...agentIds)', { agentIds })
      .orderBy('property.id', 'ASC')
      .getMany();

    const prefixes = [
      'Modern', 'Bright', 'Spacious', 'Elegant', 'Renovated',
      'Luxury', 'Comfortable', 'Premium', 'Charming', 'Contemporary',
    ];

    const typeNames: Record<string, string> = {
      SALE: 'Home for Sale',
      RENT: 'Property for Rent',
    };

    const reserved = await propertyRepo
      .createQueryBuilder('property')
      .select('property.title', 'title')
      .getRawMany<{ title: string }>();

    const allTitles = new Set(reserved.map((row) => row.title));
    let updated = 0;

    for (const property of properties) {
      const areaName = property.address?.split('،')[0]?.trim();
      const city = property.city?.trim();

      if (!areaName || !city) {
        console.log(`Skipped #${property.id}: missing address/city`);
        continue;
      }

      allTitles.delete(property.title);

      const prefix = prefixes[(property.id - 1) % prefixes.length];
      const typeName = typeNames[property.type] ?? 'Property';
      const baseTitle = `${prefix} ${typeName} in ${areaName}, ${city}`;

      let newTitle = baseTitle;

      if (allTitles.has(newTitle)) {
        newTitle = `${baseTitle} - Listing ${property.id}`;
      }

      if (allTitles.has(newTitle)) {
        throw new Error(`Title conflict for property #${property.id}`);
      }

      if (property.title !== newTitle) {
        property.title = newTitle;
        await propertyRepo.save(property);
        updated++;
        console.log(`#${property.id}: ${newTitle}`);
      } else {
        console.log(`#${property.id}: already correct`);
      }

      allTitles.add(newTitle);
    }

    console.log(`Finished. Updated ${updated} of ${properties.length} properties.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Rename failed:', error.message);
  process.exitCode = 1;
});
