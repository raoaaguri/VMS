import fs from 'fs';
import pkg from 'pg';
import { config } from './src/config/env.js';

const { Pool } = pkg;

/**
 * Import data from Supabase SQL dump
 * Usage: node import-supabase-data.js <path-to-sql-file>
 */

async function importSupabaseData() {
  const sqlFile = process.argv[2];

  if (!sqlFile) {
    console.log('\n❌ Please provide a Supabase SQL export file');
    console.log('\nUsage: node import-supabase-data.js <path-to-sql-file>');
    console.log('Example: node import-supabase-data.js ./supabase_backup.sql\n');
    process.exit(1);
  }

  if (!fs.existsSync(sqlFile)) {
    console.log(`\n❌ File not found: ${sqlFile}\n`);
    process.exit(1);
  }

  console.log('\n📥 Importing Supabase data...\n');
  console.log(`📄 File: ${sqlFile}\n`);

  const pool = new Pool({
    user: config.postgres.user,
    password: config.postgres.password,
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

    // Filter out Supabase-specific statements
    let cleanedSql = sqlContent
      // Remove Supabase-specific statements
      .replace(/CREATE POLICY[^;]+;/gs, '')
      .replace(/ALTER TABLE [^ ]+ ENABLE ROW LEVEL SECURITY;/g, '')
      .replace(/CREATE PUBLICATION[^;]+;/gs, '')
      .replace(/ALTER PUBLICATION[^;]+;/gs, '')
      // Remove extension creation for Supabase extensions
      .replace(/CREATE EXTENSION IF NOT EXISTS "([^"]+)";/g, (match, ext) => {
        if (['plpgsql', 'uuid-ossp'].includes(ext)) {
          return match;
        }
        return '';
      });

    // Execute statements
    const statements = cleanedSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`⏳ Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
        successCount++;
        
        // Show progress every 50 statements
        if ((i + 1) % 50 === 0) {
          console.log(`   ${i + 1}/${statements.length} statements processed...`);
        }
      } catch (error) {
        // Skip common non-critical errors
        if (error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key')) {
          skipCount++;
        } else {
          console.warn(`⚠️  Error at statement ${i + 1}: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   Total: ${statements.length}\n`);

    // Verify data
    console.log('🔍 Verifying imported data...\n');

    const tables = ['vendors', 'users', 'purchase_orders', 'purchase_order_line_items', 'po_history', 'po_line_item_history'];

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.rows[0].count;
      console.log(`   ${table}: ${count} records`);
    }

    console.log(`\n✅ Data import completed!\n`);
    return true;

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

importSupabaseData()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
