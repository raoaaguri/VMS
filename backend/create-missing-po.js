import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSLMODE === 'require'
});

async function createMissingPo() {
  try {
    // Get david's vendor_id
    const user = await pool.query(
      'SELECT vendor_id FROM users WHERE email = $1',
      ['david@primematerials.com']
    );
    const vendorId = user.rows[0].vendor_id;

    // Create a new PO for david's vendor
    const result = await pool.query(
      'INSERT INTO purchase_orders (po_number, vendor_id, status, po_date, priority, type, created_at) VALUES ($1, $2, $3, NOW(), $4, $5, NOW()) RETURNING id, po_number',
      ['PO-2026-999', vendorId, 'CREATED', 'MEDIUM', 'NEW_ITEMS']
    );

    console.log('✅ Created PO:', result.rows[0].po_number, 'for vendor_id:', vendorId);
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

createMissingPo();
