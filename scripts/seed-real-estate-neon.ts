import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: '.env.production.local', override: true });

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

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function assertColumns(
  client: Client,
  table: string,
  requiredColumns: string[],
): Promise<void> {
  const result = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );

  const existing = new Set(
    result.rows.map((row: { column_name: string }) => row.column_name),
  );
  const missing = requiredColumns.filter((column) => !existing.has(column));

  if (result.rows.length === 0 || missing.length > 0) {
    throw new Error(
      `Schema check failed for public.${table}. Missing: ${
        missing.join(', ') || 'table not found'
      }`,
    );
  }
}

async function main(): Promise<void> {
  if (process.env.ALLOW_REAL_ESTATE_SEED !== 'true') {
    throw new Error(
      'Safety stop: explicitly set ALLOW_REAL_ESTATE_SEED=true to proceed.',
    );
  }

  const connectionString = requiredEnv('DATABASE_URL');
  const url = new URL(connectionString);
  const host = url.hostname.toLowerCase();
  const databaseName = decodeURIComponent(url.pathname.slice(1));

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    !host.includes('neon.tech')
  ) {
    throw new Error(`Safety stop: expected Neon host, got "${host}".`);
  }

  // Require the operator to explicitly confirm the exact database name.
  const expectedDatabase = requiredEnv('EXPECTED_SEED_DATABASE');
  if (databaseName !== expectedDatabase) {
    throw new Error(
      `Safety stop: expected database "${expectedDatabase}", got "${databaseName}".`,
    );
  }

  console.log('Target host:', host);
  console.log('Target database:', databaseName);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  let connected = false;
  let transactionStarted = false;

  try {
    await client.connect();
    connected = true;

    const info = await client.query(
      'SELECT current_database() AS db, current_user AS db_user',
    );

    if (info.rows[0].db !== expectedDatabase) {
      throw new Error('Safety stop: connected database name mismatch.');
    }

    console.log('Connected database confirmed:', info.rows[0].db);

    await assertColumns(client, 'users', [
      'id', 'name', 'email', 'password', 'role',
      'isActive', 'isVerified', 'verificationStatus',
    ]);

    await assertColumns(client, 'properties', [
      'id', 'title', 'description', 'price', 'city', 'address',
      'area', 'bedrooms', 'bathrooms', 'type', 'status',
      'isVerified', 'ownerId',
    ]);

    await client.query('BEGIN');
    transactionStarted = true;

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    let agentsCreated = 0;
    let propertiesCreated = 0;

    for (let ai = 0; ai < AGENT_COUNT; ai++) {
      const agentNo = String(ai + 1).padStart(2, '0');
      const email = `demo-agent-${agentNo}@realestate.local`;
      const name = `Demo Real Estate Agent ${agentNo}`;

      const found = await client.query(
        `SELECT id, role, email FROM public.users WHERE email = $1 LIMIT 1`,
        [email],
      );

      let agentId: number;

      if (found.rows.length) {
        const agent = found.rows[0];

        if (
          agent.role !== 'AGENT' ||
          !agent.email.endsWith('@realestate.local')
        ) {
          throw new Error(`Safety stop: conflicting account ${email}.`);
        }

        agentId = Number(agent.id);
      } else {
        const inserted = await client.query(
          `INSERT INTO public.users
            ("name", "email", "password", "role",
             "isActive", "isVerified", "verificationStatus")
           VALUES ($1, $2, $3, 'AGENT', true, true, 'APPROVED')
           RETURNING id`,
          [name, email, passwordHash],
        );

        agentId = Number(inserted.rows[0].id);
        agentsCreated++;
      }

      for (let pi = 0; pi < PROPERTIES_PER_AGENT; pi++) {
        const propertyNo = String(pi + 1).padStart(2, '0');
        const title = `[DEMO-SEED:${agentNo}:${propertyNo}]`;

        const alreadyExists = await client.query(
          'SELECT id FROM public.properties WHERE title = $1 LIMIT 1',
          [title],
        );

        if (alreadyExists.rows.length) continue;

        const building = buildingTypes[pi % buildingTypes.length];
        const purpose = purposes[Math.floor(pi / 2) % purposes.length];
        const location = cities[(ai + pi) % cities.length];
        const areaName = location.areas[(ai + pi) % location.areas.length];
        const area = building.area + ((ai + pi) % 4) * 10;

        const basePrice =
          building.name === 'مكتب' ? 1500000 :
          building.name === 'فيلا' ? 5000000 :
          building.name === 'بيت' ? 2500000 :
          building.name === 'استوديو' ? 700000 : 1200000;

        const price = purpose.type === 'RENT'
          ? 4000 + area * 45 + ai * 250
          : basePrice + area * 5000 + ai * 50000;

        const description =
          `${building.name} ${purpose.label} في ${areaName}، ${location.city}. ` +
          `مساحة ${area} متر مربع، بتصميم عملي وموقع مناسب للسكن أو الاستثمار. ` +
          'بيانات تجريبية أنشأها Seed Script.';

        await client.query(
          `INSERT INTO public.properties
            ("title", "description", "price", "city", "address",
             "area", "bedrooms", "bathrooms", "type", "status",
             "isVerified", "ownerId")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', false, $10)`,
          [
            title, description, price, location.city,
            `${areaName}، ${location.city}`, area,
            building.bedrooms, building.bathrooms,
            purpose.type, agentId,
          ],
        );

        propertiesCreated++;
      }
    }

    await client.query('COMMIT');
    transactionStarted = false;

    console.log('Seed completed successfully.');
    console.log('Agents created:', agentsCreated);
    console.log('Properties created:', propertiesCreated);
    console.log('Agents configured:', AGENT_COUNT);
    console.log('Properties per agent:', PROPERTIES_PER_AGENT);
    console.log('Existing seed properties were skipped.');
    console.log(
      'Demo password for newly created agents:',
      DEMO_PASSWORD,
    );
  } catch (error) {
    if (connected && transactionStarted) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    if (connected) await client.end().catch(() => undefined);
  }
}

void main();
