import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production.local', override: true });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;

  if (!email || !password || !databaseUrl) {
    throw new Error('Required environment variables are missing');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const result = await client.query(
      'SELECT email, role, password FROM public.users WHERE email = $1 LIMIT 1',
      [email],
    );

    if (!result.rows.length) {
      console.log('Email found: false');
      return;
    }

    const user = result.rows[0];

    console.log('Email found:', user.email === email);
    console.log('Role is ADMIN:', user.role === 'ADMIN');
    console.log(
      'Password matches:',
      await bcrypt.compare(password, user.password),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Check failed:', error.message);
  process.exitCode = 1;
});
