import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import { config } from './src/config/env.js';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupDatabase() {
  console.log('\n📦 Setting up Local PostgreSQL Database...\n');

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
      // Drop existing tables
      console.log('🧹 Cleaning existing tables...\n');
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
      }

      console.log('✅ Tables cleaned\n');

      // Run the clean schema
      console.log('🔄 Creating schema...\n');
      const schemaPath = path.join(__dirname, 'local-postgres-schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

      // Use a better approach: execute the entire SQL as one statement
      // Split by CREATE TABLE statements to preserve integrity
      const createStatements = schemaSql.match(/CREATE TABLE[^;]+;/gs) || [];
      const createIndexStatements = schemaSql.match(/CREATE INDEX[^;]+;/gs) || [];

      let count = 0;
      
      for (const statement of createStatements) {
        try {
          await client.query(statement);
          count++;
        } catch (error) {
          console.warn(`⚠️  ${error.message}`);
        }
      }

      for (const statement of createIndexStatements) {
        try {
          await client.query(statement);
          count++;
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.warn(`⚠️  ${error.message}`);
          }
        }
      }

      console.log(`✅ ${count} SQL statements executed\n`);

      // Verify tables
      console.log('🔍 Verifying schema...\n');
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
      }
      console.log();

    } finally {
      client.release();
    }

    console.log('✅ Database setup completed successfully!\n');
    return true;

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

setupDatabase().then(success => {
  process.exit(success ? 0 : 1);
});
