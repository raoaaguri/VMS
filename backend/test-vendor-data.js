import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'vms'
});

async function testVendorData() {
  try {
    console.log('Testing database connection...\n');

    // Check vendors
    console.log('=== VENDORS ===');
    const vendors = await pool.query(`
      SELECT id, name, email, code, is_active, status 
      FROM vendors 
      WHERE email LIKE '%acme%' OR email = 'vendor@acme.com'
    `);
    console.log('Vendors with acme.com:', vendors.rows);
    console.log('Total vendors:', vendors.rows.length);

    // Check all vendors
    console.log('\n=== ALL VENDORS ===');
    const allVendors = await pool.query('SELECT id, name, email, code, is_active, status FROM vendors LIMIT 10');
    console.log('All vendors (first 10):', allVendors.rows);

    // If we have a vendor, check their purchase orders
    if (vendors.rows.length > 0) {
      const vendorId = vendors.rows[0].id;
      console.log(`\n=== PURCHASE ORDERS FOR VENDOR ID ${vendorId} ===`);
      const pos = await pool.query(`
        SELECT id, po_number, vendor_id, status 
        FROM purchase_orders 
        WHERE vendor_id = $1
      `, [vendorId]);
      console.log('Purchase Orders:', pos.rows);

      // Check line items for this vendor
      if (pos.rows.length > 0) {
        console.log(`\n=== LINE ITEMS FOR VENDOR ID ${vendorId} ===`);
        const lineItems = await pool.query(`
          SELECT poli.id, poli.po_id, poli.product_code, poli.product_name, poli.quantity, poli.status
          FROM purchase_order_line_items poli
          JOIN purchase_orders po ON poli.po_id = po.id
          WHERE po.vendor_id = $1
        `, [vendorId]);
        console.log('Line Items:', lineItems.rows);
      }
    }

    // Check if there are any users for vendor@acme.com
    console.log('\n=== USERS FOR VENDOR@ACME.COM ===');
    const users = await pool.query(`
      SELECT u.id, u.email, u.role, u.vendor_id, v.name as vendor_name
      FROM users u
      LEFT JOIN vendors v ON u.vendor_id = v.id
      WHERE u.email LIKE '%acme%' OR u.email = 'vendor@acme.com'
    `);
    console.log('Users:', users.rows);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testVendorData();
