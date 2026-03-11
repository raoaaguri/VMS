import pkg from 'pg';
import { config } from '../backend/src/config/env.js';

const { Pool } = pkg;

async function checkPasswords() {
  const pool = new Pool({
    user: config.postgres.user,
    password: config.postgres.password,
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    const result = await pool.query("SELECT name, email, role, password_hash FROM users WHERE role = 'VENDOR' LIMIT 10");
    console.log('--- Vendor User Passwords (Hashed) ---');
    console.table(result.rows.map(row => ({
      Name: row.name,
      Email: row.email,
      'Password Hash (Bcrypt)': row.password_hash.substring(0, 20) + '...'
    })));
    console.log('\nNOTE: As you can see, the passwords are not stored in plain text.');
    console.log('They are stored as Bcrypt hashes, which are one-way and cannot be reversed.');
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await pool.end();
  }
}

checkPasswords();
