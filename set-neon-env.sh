#!/usr/bin/env bash
set -euo pipefail
FILE=".env.production.local"

if [[ ! -f "$FILE" ]]; then
  echo "Error: $FILE not found."
  exit 1
fi

umask 077
cp -p "$FILE" "$FILE.backup"

read -rsp "Paste NEW Neon DATABASE_URL (hidden): " DB_URL
echo

if [[ "$DB_URL" != postgres://* && "$DB_URL" != postgresql://* ]]; then
  echo "Invalid PostgreSQL URL."
  unset DB_URL
  exit 1
fi

DB_URL="$DB_URL" node <<'NODE'
const fs = require('fs');
const file = '.env.production.local';
const value = process.env.DB_URL;
const url = new URL(value);

if (!url.hostname.endsWith('.neon.tech')) {
  console.error('Expected a Neon hostname. No changes made.');
  process.exit(1);
}

let content = fs.readFileSync(file, 'utf8');
const line = `DATABASE_URL=${JSON.stringify(value)}`;

if (/^DATABASE_URL=.*$/m.test(content)) {
  content = content.replace(/^DATABASE_URL=.*$/m, line);
} else {
  content += `\n${line}\n`;
}

fs.writeFileSync(file, content, { mode: 0o600 });
fs.chmodSync(file, 0o600);
console.log('DATABASE_URL updated locally.');
NODE

unset DB_URL
