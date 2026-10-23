import 'dotenv/config';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

dotenv.config({ path: '.env.production.local', override: true });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    await client.query('BEGIN');

    const agents = await client.query(
      `SELECT id, email
       FROM public.users
       WHERE role = 'AGENT'
       ORDER BY id ASC
       FOR UPDATE`
    );

    if (agents.rows.length === 0) {
      throw new Error('No AGENT accounts found.');
    }

    const emails = agents.rows.map((_: unknown, index: number) =>
      index === 0 ? 'agent@agent.com' : `agent${index}@agent.com`
    );
    const names = [
      'Ali Omar',
      'Omar Ahmed',
      'Youssef Ali',
      'Ahmed Hassan',
      'Mahmoud Samir',
      'Amr Khaled',
      'Mostafa Adel',
      'Karim Tarek',
      'Hassan Ibrahim',
      'Ziad Mohamed',
    ];

    while (names.length < agents.rows.length) {
      names.push(`Agent ${names.length + 1}`);
    }

    const conflicts = await client.query(
      `SELECT id, email
       FROM public.users
       WHERE email = ANY($1::text[])
         AND role <> 'AGENT'`,
      [emails]
    );

    if (conflicts.rows.length > 0) {
      throw new Error(
        `Email conflict with non-agent accounts: ${JSON.stringify(conflicts.rows)}`
      );
    }

    const passwordHash = await bcrypt.hash('123456', 10);

    // Use temporary unique emails to avoid conflicts while renaming agents.
    for (const agent of agents.rows) {
      await client.query(
        `UPDATE public.users
         SET email = $1
         WHERE id = $2`,
        [`agent-temp-${agent.id}-${Date.now()}@invalid.local`, agent.id]
      );
    }

    for (let i = 0; i < agents.rows.length; i++) {
      await client.query(
        `UPDATE public.users
         SET name = $1, email = $2, password = $3
         WHERE id = $4 AND role = 'AGENT'`,
        [names[i], emails[i], passwordHash, agents.rows[i].id]
      );
    }

    await client.query('COMMIT');

    console.log(`Updated ${agents.rows.length} AGENT accounts.`);
    console.table(
      agents.rows.map((agent: { id: number }, index: number) => ({
        id: agent.id,
        email: emails[index],
        password: '123456',
      }))
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(
      'Update failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
