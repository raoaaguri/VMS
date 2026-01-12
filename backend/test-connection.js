import { config } from './src/config/env.js';
import pkg from 'pg';
import { logger } from './src/utils/logger.js';

const { Pool } = pkg;

async function testConnection() {
  console.log('\n🔍 Testing PostgreSQL Connection...\n');
  console.log('Connection Details:');
  console.log(`  Host: ${config.postgres.host}`);
  console.log(`  Port: ${config.postgres.port}`);
  console.log(`  Database: ${config.postgres.database}`);
  console.log(`  User: ${config.postgres.user}`);
  console.log(`  SSL: ${config.postgres.ssl}\n`);

  const pool = new Pool({
    user: config.postgres.user,
    password: config.postgres.password,
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!\n');

    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query executed successfully!');
    console.log(`   Current database time: ${result.rows[0].now}\n`);

    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (tablesResult.rows.length > 0) {
      console.log('✅ Existing tables found:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('ℹ️  No tables found. Ready for migrations.\n');
    }

    client.release();
    await pool.end();
    console.log('\n✅ Connection test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(`   Error: ${error.message}\n`);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Make sure PostgreSQL is running on localhost:5432\n');
    }
    await pool.end();
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
