#!/usr/bin/env node
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function configure() {
  console.log('\n🔧 PostgreSQL Database Configuration\n');
  console.log('Please provide your local PostgreSQL database credentials:\n');

  const host = await question('Host (default: localhost): ') || 'localhost';
  const port = await question('Port (default: 5432): ') || '5432';
  const database = await question('Database name (default: vendor_management): ') || 'vendor_management';
  const user = await question('Username (default: postgres): ') || 'postgres';
  const password = await question('Password: ');

  rl.close();

  // Read the current .env file
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  // Update or add PostgreSQL configuration
  const pgConfig = `
# PostgreSQL Configuration (Local Database)
PGHOST=${host}
PGPORT=${port}
PGDATABASE=${database}
PGUSER=${user}
PGPASSWORD=${password}
PGSSLMODE=disable
`;

  // Remove old PostgreSQL configuration if exists
  envContent = envContent.replace(/# PostgreSQL Configuration.*[\s\S]*?# PGPASSWORD=.*\n/g, '');

  // Append new configuration
  envContent = envContent.trim() + '\n' + pgConfig;

  // Write back to .env
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Configuration saved to .env file!\n');
  console.log('Next steps:');
  console.log('  1. npm run db:setup  - Create database schema');
  console.log('  2. npm run db:seed   - Populate with dummy data\n');
}

configure().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
