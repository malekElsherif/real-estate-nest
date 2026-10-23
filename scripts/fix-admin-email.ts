import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production.local', override: true });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const targetEmail = 'admin@gmail.com';

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing');
  }

  const parsed = new URL(databaseUrl);

  if (
    !parsed.hostname.endsWith('.neon.tech') ||
    decodeURIComponent(parsed.pathname.slice(1)) !== 'neondb'
  ) {
    throw new Error('Safety stop: expected Neon neondb');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    const target = await client.query(
      `SELECT id, role FROM public.users WHERE email = $1`,
      [targetEmail],
    );

    if (target.rows.length > 0) {
      throw new Error(
        'admin@gmail.com already exists. No changes made.',
      );
    }

    const admins = await client.query(
      `SELECT id FROM public.users WHERE role = 'ADMIN' FOR UPDATE`,
    );

    if (admins.rows.length !== 1) {
      throw new Error(
        `Expected exactly one ADMIN, found ${admins.rows.length}. No changes made.`,
      );
    }

    await client.query(
      `UPDATE public.users SET email = $1 WHERE id = $2`,
      [targetEmail, admins.rows[0].id],
    );

    await client.query('COMMIT');
    console.log('Admin email updated successfully in Neon.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Admin email update failed:', error.message);
  process.exitCode = 1;
});
