import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import { config } from './src/config/env.js';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function cleanMigrations() {
  console.log('\n🧹 Cleaning database (dropping all tables)...\n');

  const pool = new Pool({
    user: config.postgres.user,
    password: config.postgres.password,
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    try {
      // Drop all tables in reverse order of dependencies
      const dropStatements = [
        'DROP TABLE IF EXISTS po_line_item_history CASCADE;',
        'DROP TABLE IF EXISTS po_history CASCADE;',
        'DROP TABLE IF EXISTS purchase_order_line_items CASCADE;',
        'DROP TABLE IF EXISTS purchase_orders CASCADE;',
        'DROP TABLE IF EXISTS users CASCADE;',
        'DROP TABLE IF EXISTS vendors CASCADE;'
      ];

      for (const statement of dropStatements) {
        await client.query(statement);
        console.log(`✅ ${statement}`);
      }

      console.log('\n✅ Database cleaned successfully!\n');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error cleaning database:', error.message);
  } finally {
    await pool.end();
  }
}

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

  // Define migrations in order
  const migrations = [
    {
      name: 'Create vendor management schema',
      file: '20260108103405_create_vendor_management_schema.sql',
      skipRLS: true
    },
    {
      name: 'Add approval/closure/history features',
      file: '20260109053815_add_approval_closure_history_features.sql',
      skipRLS: true
    },
    {
      name: 'Add vendor status column',
      file: '20260110000000_add_vendor_status_column.sql',
      skipRLS: true
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping: ${migration.file} (file not found)\n`);
      continue;
    }

    console.log(`⏳ ${migration.name}`);
    console.log(`   File: ${migration.file}`);

    try {
      const client = await pool.connect();
      try {
        let sql = fs.readFileSync(filePath, 'utf-8');

        // Remove RLS policies if needed
        if (migration.skipRLS) {
          sql = sql
            .replace(/CREATE POLICY[^;]+;/gs, '')
            .replace(/ALTER TABLE [^ ]+ ENABLE ROW LEVEL SECURITY;/g, '');
        }

        // Split by semicolon and execute each statement
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await client.query(statement + ';');
            } catch (innerError) {
              // Log but continue - some statements might be optional
              if (!innerError.message.includes('already exists')) {
                console.warn(`   ⚠️  ${innerError.message}`);
              }
            }
          }
        }

        console.log(`✅ Completed\n`);
        successCount++;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`❌ Failed: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   Total: ${successCount + errorCount}\n`);

  await pool.end();
  return errorCount === 0;
}

async function verifyTables() {
  console.log('🔍 Verifying tables...\n');

  const pool = new Pool({
    user: config.postgres.user,
    password: config.postgres.password,
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);

      if (result.rows.length > 0) {
        console.log('✅ Tables created:');
        result.rows.forEach(row => {
          console.log(`   - ${row.table_name}`);
        });
        console.log();
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

async function main() {
  // First clean the database
  await cleanMigrations();

  // Then run migrations
  const success = await runMigrations();

  // Verify tables
  await verifyTables();

  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
