import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: '.env' });
const localPassword = process.env.ADMIN_PASSWORD;

dotenv.config({ path: '.env.production.local', override: true });
const databaseUrl = process.env.DATABASE_URL;

async function main() {
  if (!databaseUrl || !localPassword) {
    throw new Error('Required environment variables are missing');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const result = await client.query(
      `SELECT id, role, password FROM public.users WHERE email = $1`,
      ['admin@gmail.com'],
    );

    if (!result.rows.length) {
      console.log('Target email found: false');
      return;
    }

    const user = result.rows[0];
    console.log('Target email found: true');
    console.log('Role is ADMIN:', user.role === 'ADMIN');
    console.log(
      'Local .env password matches:',
      await bcrypt.compare(localPassword, user.password),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Check failed:', error.message);
  process.exitCode = 1;
});
