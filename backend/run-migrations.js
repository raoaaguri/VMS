import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import { config } from './src/config/env.js';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  console.log('\n🔄 Running Database Migrations...\n');

  const pool = new Pool({
    user: config.postgres.user,
    password: config.postgres.password,
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false
  });

  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).sort();

  let successCount = 0;
  let errorCount = 0;

  for (const file of migrationFiles) {
    if (!file.endsWith('.sql')) continue;

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`⏳ Running: ${file}`);

    try {
      const client = await pool.connect();
      try {
        // Split by semicolon and filter empty statements
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }
        
        console.log(`✅ ${file} completed successfully\n`);
        successCount++;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`❌ ${file} failed: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   Total: ${successCount + errorCount}\n`);

  await pool.end();
  process.exit(errorCount === 0 ? 0 : 1);
}

runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
