import { config } from './src/config/env.js';
import pkg from 'pg';

const { Pool } = pkg;

async function testBackend() {
  console.log('\n🧪 Testing Backend Configuration...\n');

  // Test environment
  console.log('📋 Environment Configuration:');
  console.log(`   Node Env: ${config.nodeEnv}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.postgres.database}`);
  console.log(`   Host: ${config.postgres.host}:${config.postgres.port}`);
  console.log(`   User: ${config.postgres.user}\n`);

  // Test database connection
  console.log('🔗 Testing Database Connection...\n');

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

    // Test basic query
    const result = await client.query('SELECT COUNT(*) FROM users;');
    const userCount = result.rows[0].count;

    console.log('✅ Database connected successfully!');
    console.log(`   Current users in database: ${userCount}\n`);

    // Check all tables
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tableCount = tablesResult.rows[0].count;
    console.log(`✅ Tables created: ${tableCount}`);
    console.log(`   Expected: 6 (vendors, users, purchase_orders, purchase_order_line_items, po_history, po_line_item_history)\n`);

    client.release();

    console.log('✅ Backend is ready to start!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: npm run dev  (to start the server)');
    console.log('   2. Server will run on: http://localhost:3001');
    console.log('   3. Test endpoint: curl http://localhost:3001/health\n');

    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error(error);
    return false;
  } finally {
    await pool.end();
  }
}

testBackend()
  .then(success => {
    process.exit(success ? 0 : 1);
  });
