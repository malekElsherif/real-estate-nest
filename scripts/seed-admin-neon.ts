import 'dotenv/config';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

dotenv.config({
  path: '.env',
  override: false,
});

dotenv.config({
  path: '.env.production.local',
  override: true,
});

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!databaseUrl || databaseUrl.includes('[SENSITIVE]')) {
    throw new Error('Valid DATABASE_URL is required.');
  }

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required in .env.');
  }

  const parsedUrl = new URL(databaseUrl);

  if (
    !parsedUrl.hostname.endsWith('.neon.tech') ||
    decodeURIComponent(parsedUrl.pathname.slice(1)) !== 'neondb'
  ) {
    throw new Error('Safety stop: target must be the Neon neondb database.');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const db = await client.query('SELECT current_database() AS name');
    if (db.rows[0]?.name !== 'neondb') {
      throw new Error('Connected database is not neondb.');
    }

    const existing = await client.query(
      'SELECT id, role FROM public.users WHERE email = $1 LIMIT 1',
      [adminEmail],
    );

    if (existing.rows.length) {
      if (existing.rows[0].role !== 'ADMIN') {
        throw new Error('This email exists but is not an ADMIN. No changes made.');
      }

      console.log('Admin already exists in Neon. No changes made.');
      return;
    }

    const hash = await bcrypt.hash(adminPassword, 10);

    await client.query(
      `INSERT INTO public.users
       ("name", "email", "password", "role", "isActive", "isVerified", "verificationStatus")
       VALUES ($1, $2, $3, 'ADMIN', true, true, 'APPROVED')`,
      ['Admin', adminEmail, hash],
    );

    console.log('Admin created successfully in Neon.');
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error('Admin seed failed:', error.message);
  process.exitCode = 1;
});
