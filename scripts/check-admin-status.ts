import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production.local', override: true });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const result = await client.query(
      `SELECT id, email, role, "isActive", "isVerified", "verificationStatus"
       FROM public.users
       WHERE email = $1`,
      [process.env.ADMIN_EMAIL],
    );

    console.log(result.rows);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Check failed:', error.message);
  process.exitCode = 1;
});
