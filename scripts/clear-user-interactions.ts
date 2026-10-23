/**
 * scripts/clear-user-interactions.ts
 *
 * Deletes ALL rows (and only rows) from:
 *   favorites, purchase_requests, rental_requests
 * on the Neon database `neondb`.
 *
 * Default mode is DRY RUN (no deletion). To really delete:
 *   CONFIRM_CLEAR_INTERACTIONS=DELETE_TEST_INTERACTIONS npm run clear:interactions
 */
import { DataSource, QueryRunner } from 'typeorm';
import { join } from 'path';

// ---------- Constants ----------
const EXPECTED_DB = 'neondb';
const EXPECTED_HOST_SUFFIX = '.neon.tech';
const EXPECTED_SCHEMA = 'public';

const CONFIRM_VAR = 'CONFIRM_CLEAR_INTERACTIONS';
const CONFIRM_VALUE = 'DELETE_TEST_INTERACTIONS';

const TARGET_TABLES = ['favorites', 'purchase_requests', 'rental_requests'];
const PROTECTED_TABLES = ['users', 'properties'];

// ---------- Helpers ----------
const q = (table: string) => `"${EXPECTED_SCHEMA}"."${table}"`;

// Constant list built from the constants above (no user input involved).
const TARGET_REGCLASS_ARRAY = `ARRAY[${TARGET_TABLES.map(
  (t) => `'${EXPECTED_SCHEMA}.${t}'`,
).join(',')}]::regclass[]`;

function loadEnv(): void {
  try {
    // Node >= 20.12. Does not override variables already set in the shell.
    (process as any).loadEnvFile(join(process.cwd(), '.env'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
}

function maskHost(host: string): string {
  const [first, ...rest] = host.split('.');
  return `${first.slice(0, 6)}***.${rest.join('.')}`;
}

function inspectUrl(raw: string): { host: string; database: string } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    // Do not echo the value: it contains credentials.
    throw new Error('DATABASE_URL is not a valid URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(u.protocol)) {
    throw new Error('DATABASE_URL is not a PostgreSQL URL.');
  }
  const database = decodeURIComponent(u.pathname.replace(/^\//, ''));
  if (!u.hostname.endsWith(EXPECTED_HOST_SUFFIX)) {
    throw new Error(`Host is not a Neon host (expected *${EXPECTED_HOST_SUFFIX}).`);
  }
  if (database !== EXPECTED_DB) {
    throw new Error(`Database in DATABASE_URL is "${database}", expected "${EXPECTED_DB}".`);
  }
  return { host: u.hostname, database };
}

async function countTables(
  qr: QueryRunner,
  tables: string[],
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const t of tables) {
    const rows = await qr.query(`SELECT count(*)::int AS n FROM ${q(t)}`);
    result[t] = rows[0].n;
  }
  return result;
}

function printCounts(title: string, counts: Record<string, number>): void {
  console.log(`\n${title}:`);
  for (const [t, n] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(20)} ${n}`);
  }
}

// ---------- Pre-flight checks (read-only) ----------
async function preflightChecks(qr: QueryRunner, urlDatabase: string): Promise<void> {
  // 1) The server itself must confirm which database/schema we are on.
  const [info] = await qr.query(
    'SELECT current_database() AS db, current_schema() AS schema',
  );
  if (info.db !== EXPECTED_DB || info.db !== urlDatabase) {
    throw new Error(`Connected database is "${info.db}", expected "${EXPECTED_DB}".`);
  }
  if (info.schema !== EXPECTED_SCHEMA) {
    throw new Error(`Current schema is "${info.schema}", expected "${EXPECTED_SCHEMA}".`);
  }

  // 2) All three target tables (and the protected ones) must exist as real tables.
  const existing: { table_name: string }[] = await qr.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'
       AND table_name = ANY($2)`,
    [EXPECTED_SCHEMA, [...TARGET_TABLES, ...PROTECTED_TABLES]],
  );
  const found = new Set(existing.map((r) => r.table_name));
  for (const t of [...TARGET_TABLES, ...PROTECTED_TABLES]) {
    if (!found.has(t)) throw new Error(`Table "${t}" was not found in schema ${EXPECTED_SCHEMA}.`);
  }

  // 3) Each target table must have the primary key column `id` (from the entities).
  const idCols: { table_name: string }[] = await qr.query(
    `SELECT table_name FROM information_schema.columns
     WHERE table_schema = $1 AND column_name = 'id' AND table_name = ANY($2)`,
    [EXPECTED_SCHEMA, TARGET_TABLES],
  );
  if (new Set(idCols.map((r) => r.table_name)).size !== TARGET_TABLES.length) {
    throw new Error('Schema mismatch: an expected "id" column is missing in a target table.');
  }

  // 4) No other table may reference the targets (a delete could fail or cascade).
  const referencing: { referencing_table: string; on_delete: string }[] = await qr.query(
    `SELECT conrelid::regclass::text AS referencing_table, confdeltype AS on_delete
     FROM pg_constraint
     WHERE contype = 'f' AND confrelid = ANY(${TARGET_REGCLASS_ARRAY})`,
  );
  if (referencing.length > 0) {
    throw new Error(
      `Other tables reference the target tables: ${referencing
        .map((r) => r.referencing_table)
        .join(', ')}. Aborting.`,
    );
  }

  // 5) No user triggers on the targets (they could change other tables).
  const triggers: { tgname: string }[] = await qr.query(
    `SELECT tgname FROM pg_trigger
     WHERE tgrelid = ANY(${TARGET_REGCLASS_ARRAY}) AND NOT tgisinternal`,
  );
  if (triggers.length > 0) {
    throw new Error(`Triggers exist on target tables: ${triggers.map((t) => t.tgname).join(', ')}.`);
  }

  console.log('Pre-flight checks passed.');
}

// ---------- Main ----------
async function main(): Promise<void> {
  loadEnv();

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL is not set (.env).');

  const target = inspectUrl(rawUrl);
  console.log(`Target database: ${target.database}`);
  console.log(`Target host:     ${maskHost(target.host)}`);

  const execute = process.env[CONFIRM_VAR] === CONFIRM_VALUE;
  console.log(`Mode:            ${execute ? 'EXECUTE (will delete)' : 'DRY RUN (no changes)'}`);

  // Same connection style as app.module.ts (url + ssl).
  const dataSource = new DataSource({
    type: 'postgres',
    url: rawUrl,
    ssl: { rejectUnauthorized: false },
    synchronize: false,
  });

  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();

  try {
    await qr.connect();
    await preflightChecks(qr, target.database);

    const before = await countTables(qr, TARGET_TABLES);
    printCounts('Current row counts', before);

    if (!execute) {
      console.log(
        `\nDry run only. To delete, run with ${CONFIRM_VAR}=${CONFIRM_VALUE}`,
      );
      return;
    }

    const total = Object.values(before).reduce((a, b) => a + b, 0);
    if (total === 0) {
      console.log('\nNothing to delete: all three tables are already empty.');
      return;
    }

    await qr.startTransaction();
    try {
      await qr.query(`SET LOCAL lock_timeout = '10s'`);
      await qr.query(`SET LOCAL statement_timeout = '60s'`);

      const protectedBefore = await countTables(qr, PROTECTED_TABLES);

      const deleted: Record<string, number> = {};
      for (const t of TARGET_TABLES) {
        // useStructuredResult = true -> result.affected holds the deleted row count
        const res = await qr.query(`DELETE FROM ${q(t)}`, [], true);
        deleted[t] = res.affected ?? before[t];
      }

      const after = await countTables(qr, TARGET_TABLES);
      for (const t of TARGET_TABLES) {
        if (after[t] !== 0) throw new Error(`Table "${t}" is not empty after delete.`);
      }

      const protectedAfter = await countTables(qr, PROTECTED_TABLES);
      for (const t of PROTECTED_TABLES) {
        if (protectedAfter[t] !== protectedBefore[t]) {
          throw new Error(`Protected table "${t}" changed unexpectedly. Rolling back.`);
        }
      }

      await qr.commitTransaction();
      printCounts('Deleted rows', deleted);
      printCounts('Protected tables (unchanged)', protectedAfter);
      console.log('\nDone. Transaction committed.');
    } catch (err) {
      if (qr.isTransactionActive) {
        await qr.rollbackTransaction();
        console.error('Transaction rolled back. No data was deleted.');
      }
      throw err;
    }
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(`FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
