import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({ path: '.env', override: true });

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../src/app.module');
const { User } = require('../src/users/entities/user.entity');

type Intent = 'SALE' | 'RENT';

interface TestProfile {
  email: string;
  name: string;
  intent: Intent;
  city: string;
  budget: number;
}

interface PropertyRow {
  id: number;
  type: Intent;
  city: string;
  price: string | number;
}

const profiles: TestProfile[] = [
  { name: 'Ahmed Mohamed', email: 'ahmed.mohamed@example.com', intent: 'SALE', city: 'Alexandria', budget: 2200000 },
  { name: 'Omar Hassan', email: 'omar.hassan@example.com', intent: 'SALE', city: 'Giza', budget: 1500000 },
  { name: 'Youssef Ali', email: 'youssef.ali@example.com', intent: 'SALE', city: 'Hurghada', budget: 3900000 },
  { name: 'Mahmoud Ibrahim', email: 'mahmoud.ibrahim@example.com', intent: 'SALE', city: 'Cairo', budget: 2300000 },
  { name: 'Mostafa Khaled', email: 'mostafa.khaled@example.com', intent: 'SALE', city: 'Mansoura', budget: 1400000 },
  { name: 'Amr Adel', email: 'amr.adel@example.com', intent: 'SALE', city: 'Tanta', budget: 4000000 },
  { name: 'Karim Ashraf', email: 'karim.ashraf@example.com', intent: 'SALE', city: 'Alexandria', budget: 6800000 },
  { name: 'Mina Samir', email: 'mina.samir@example.com', intent: 'SALE', city: 'Giza', budget: 2200000 },
  { name: 'Mahmoud Tarek', email: 'mahmoud.tarek@example.com', intent: 'SALE', city: 'Hurghada', budget: 1500000 },
  { name: 'Mohamed Fathy', email: 'mohamed.fathy@example.com', intent: 'SALE', city: 'Cairo', budget: 1300000 },

  { name: 'Aya Mohamed', email: 'aya.mohamed@example.com', intent: 'RENT', city: 'Mansoura', budget: 10000 },
  { name: 'Nour Ahmed', email: 'nour.ahmed@example.com', intent: 'RENT', city: 'Tanta', budget: 16000 },
  { name: 'Mariam Hassan', email: 'mariam.hassan@example.com', intent: 'RENT', city: 'Alexandria', budget: 15000 },
  { name: 'Salma Ali', email: 'salma.ali@example.com', intent: 'RENT', city: 'Giza', budget: 10000 },
  { name: 'Nada Mahmoud', email: 'nada.mahmoud@example.com', intent: 'RENT', city: 'Hurghada', budget: 17000 },
  { name: 'Farah Mostafa', email: 'farah.mostafa@example.com', intent: 'RENT', city: 'Cairo', budget: 15000 },
  { name: 'Hana Adel', email: 'hana.adel@example.com', intent: 'RENT', city: 'Mansoura', budget: 18000 },
  { name: 'Omar Mostafa', email: 'omar.mostafa@example.com', intent: 'RENT', city: 'Tanta', budget: 10000 },
  { name: 'Ziad Mohamed', email: 'ziad.mohamed@example.com', intent: 'RENT', city: 'Alexandria', budget: 9000 },
  { name: 'Seif Ahmed', email: 'seif.ahmed@example.com', intent: 'RENT', city: 'Giza', budget: 18000 },
];

const cityAliases: Record<string, string> = {
  'القاهرة': 'cairo',
  'cairo': 'cairo',
  'الجيزة': 'giza',
  'giza': 'giza',
  'الإسكندرية': 'alexandria',
  'الاسكندرية': 'alexandria',
  'alexandria': 'alexandria',
  'الغردقة': 'hurghada',
  'hurghada': 'hurghada',
  'المنصورة': 'mansoura',
  'mansoura': 'mansoura',
  'طنطا': 'tanta',
  'tanta': 'tanta',
};

const nearbyCities: Record<string, string[]> = {
  cairo: ['cairo', 'giza'],
  giza: ['giza', 'cairo'],
  mansoura: ['mansoura', 'tanta'],
  tanta: ['tanta', 'mansoura'],
  alexandria: ['alexandria'],
  hurghada: ['hurghada'],
};

function normalizeCity(city: string): string {
  const normalized = String(city ?? '').trim().toLowerCase();
  return cityAliases[normalized] ?? normalized;
}

function getArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  if (!arg) return fallback;

  const value = Number(arg.slice(prefix.length));
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid argument: ${arg}`);
  }
  return value;
}

function requestStatus(userIndex: number, requestIndex: number): string {
  const statuses = ['PENDING', 'PENDING', 'APPROVED', 'REJECTED'];
  return statuses[(userIndex + requestIndex) % statuses.length];
}

async function main(): Promise<void> {
  const userCount = getArg('users', profiles.length);
  const favoriteCount = getArg('favorites', 5);
  const purchaseCount = getArg('purchase', 2);
  const rentalCount = getArg('rental', 3);

  if (userCount < 1 || userCount > profiles.length) {
    throw new Error(`--users must be between 1 and ${profiles.length}`);
  }
  if (favoriteCount < 1) {
    throw new Error('--favorites must be at least 1');
  }
  if (purchaseCount > favoriteCount || rentalCount > favoriteCount) {
    throw new Error('Purchase/rental requests cannot exceed favorites.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL was not loaded from .env');
  }

  const databaseUrl = new URL(process.env.DATABASE_URL);
  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));

  if (!databaseUrl.hostname.includes('neon.tech') || databaseName !== 'neondb') {
    throw new Error('Safety stop: expected Neon database neondb. No data changed.');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const db: DataSource = app.get(DataSource);

    const connection = await db.query(
      'SELECT current_database() AS database, current_user AS db_user',
    );

    if (connection[0].database !== 'neondb') {
      throw new Error('Unexpected database. No data changed.');
    }

    console.log('Connected database:', connection[0].database);

    const selectedProfiles = profiles.slice(0, userCount);
    const emails = selectedProfiles.map((profile) => profile.email);

    const existingUsers = await db.getRepository(User).find({
      select: { id: true, email: true },
      where: emails.map((email) => ({ email })),
    });

    const userIdByEmail = new Map<string, number>(
      existingUsers.map((user: { id: number; email: string }) => [
        user.email,
        user.id,
      ]),
    );

    const missingEmails = emails.filter((email) => !userIdByEmail.has(email));
    if (missingEmails.length) {
      throw new Error(
        `Test users not found; no data changed:\n${missingEmails.join('\n')}`,
      );
    }

    const properties: PropertyRow[] = await db.query(`
      SELECT id, type, city, price
      FROM properties
      WHERE status = 'AVAILABLE'
    `);

    const plans = selectedProfiles.map((profile, userIndex) => {
      const neededRequests =
        profile.intent === 'SALE' ? purchaseCount : rentalCount;

      // Exact city only: never mix Alexandria, Tanta, Hurghada, etc.
      const sameCityAndType = properties.filter(
        (property) =>
          property.type === profile.intent &&
          normalizeCity(property.city) === normalizeCity(profile.city) &&
          Number.isFinite(Number(property.price)) &&
          Number(property.price) > 0,
      );

      // Expand the price range only when the preferred range lacks enough properties.
      const candidates = [0.5, 0.75, 1.0]
        .map((margin) =>
          sameCityAndType.filter((property) => {
            const price = Number(property.price);
            return price >= profile.budget * (1 - margin) &&
              price <= profile.budget * (1 + margin);
          }),
        )
        .find((matches) => matches.length >= Math.max(favoriteCount, neededRequests))
        ?? sameCityAndType
          .slice()
          .sort(
            (a, b) =>
              Math.abs(Number(a.price) - profile.budget) -
              Math.abs(Number(b.price) - profile.budget),
          );

      candidates.sort(
        (a, b) =>
          Math.abs(Number(a.price) - profile.budget) -
          Math.abs(Number(b.price) - profile.budget),
      );

      if (candidates.length < Math.max(favoriteCount, neededRequests)) {
        throw new Error(
          `Not enough AVAILABLE ${profile.intent} properties in ${profile.city} within the budget range for ${profile.email}. ` +
          `Need ${Math.max(favoriteCount, neededRequests)}, found ${candidates.length}. No interactions were deleted or added.`,
        );
      }

      return {
        profile,
        userIndex,
        userId: userIdByEmail.get(profile.email)!,
        favorites: candidates.slice(0, favoriteCount),
        requestCount: neededRequests,
      };
    });

    // Show the proposed distribution before changing anything.
    console.log('\nPlanned user interests:');
    for (const plan of plans) {
      console.log(
        `${plan.profile.email}: ${plan.profile.intent}, ` +
        `preferred city=${plan.profile.city}, budget=${plan.profile.budget}, ` +
        `selected cities=${[...new Set(plan.favorites.map((p) => p.city))].join(', ')}, ` +
        `prices=${plan.favorites.map((p) => Number(p.price)).join(', ')}`,
      );
    }

    if (process.argv.includes('--dry-run')) {
      console.log('\nDry run: no changes were made.');
      return;
    }

    await db.transaction(async (manager) => {
      // Clear old interactions only after all users and properties were validated.
      // Delete interactions of the test users only; real users are untouched.
      const testUserIds = plans.map((plan) => plan.userId);
      await manager.query(
        'DELETE FROM purchase_requests WHERE "userId" = ANY($1)',
        [testUserIds],
      );
      await manager.query(
        'DELETE FROM rental_requests WHERE "userId" = ANY($1)',
        [testUserIds],
      );
      await manager.query(
        'DELETE FROM favorites WHERE "userId" = ANY($1)',
        [testUserIds],
      );

      for (const plan of plans) {
        for (const property of plan.favorites) {
          await manager.query(
            'INSERT INTO favorites ("userId", "propertyId") VALUES ($1, $2)',
            [plan.userId, property.id],
          );
        }

        const requestProperties = plan.favorites.slice(0, plan.requestCount);

        for (let i = 0; i < requestProperties.length; i++) {
          const property = requestProperties[i];
          const status = requestStatus(plan.userIndex, i);

          if (plan.profile.intent === 'SALE') {
            await manager.query(
              'INSERT INTO purchase_requests ("userId", "propertyId", status) VALUES ($1, $2, $3)',
              [plan.userId, property.id, status],
            );
          } else {
            await manager.query(
              'INSERT INTO rental_requests ("userId", "propertyId", status) VALUES ($1, $2, $3)',
              [plan.userId, property.id, status],
            );
          }
        }
      }
    });

    const summary = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM favorites) AS favorites,
        (SELECT COUNT(*)::int FROM purchase_requests) AS purchase_requests,
        (SELECT COUNT(*)::int FROM rental_requests) AS rental_requests
    `);

    console.log('\nSeed completed successfully.');
    console.log('Users processed:', plans.length);
    console.log('Favorites created:', plans.length * favoriteCount);
    console.log(
      'Purchase requests created:',
      plans.filter((p) => p.profile.intent === 'SALE').length * purchaseCount,
    );
    console.log(
      'Rental requests created:',
      plans.filter((p) => p.profile.intent === 'RENT').length * rentalCount,
    );
    console.log('Database-wide totals:', summary[0]);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('\nSeed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
