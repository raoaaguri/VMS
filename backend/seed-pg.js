import bcrypt from 'bcryptjs';
import pkg from 'pg';
import { config } from './src/config/env.js';

const { Pool } = pkg;

async function seed() {
  console.log('\n🌱 Seeding database with initial data...\n');

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
    await client.query('BEGIN');

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const adminResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id;`,
      ['Admin User', 'admin@example.com', adminPasswordHash, 'ADMIN', true]
    );
    if (adminResult.rows.length > 0) {
      console.log('   ✅ admin@example.com / admin123\n');
    }

    // Create vendor 1
    console.log('🏢 Creating vendor 1: Acme Corporation...');
    const vendor1Result = await client.query(
      `INSERT INTO vendors (name, code, contact_person, contact_email, contact_phone, address, gst_number, is_active, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (code) DO NOTHING
       RETURNING id;`,
      ['Acme Corporation', 'ACME001', 'John Doe', 'john@acme.com', '+1-555-0001', 
       '123 Business St, New York, NY 10001', 'GST123456789', true, 'ACTIVE']
    );

    if (vendor1Result.rows.length > 0) {
      const vendor1Id = vendor1Result.rows[0].id;

      // Create vendor user
      const vendorPasswordHash = await bcrypt.hash('vendor123', 10);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, vendor_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`,
        ['John Doe', 'vendor@acme.com', vendorPasswordHash, 'VENDOR', vendor1Id, true]
      );
      console.log('   ✅ Vendor user: vendor@acme.com / vendor123\n');

      // Create PO 1
      console.log('📋 Creating purchase order PO-2024-001...');
      const po1Result = await client.query(
        `INSERT INTO purchase_orders (po_number, po_date, priority, type, vendor_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (po_number) DO NOTHING
         RETURNING id;`,
        ['PO-2024-001', '2024-01-15', 'HIGH', 'NEW_ITEMS', vendor1Id, 'CREATED']
      );

      if (po1Result.rows.length > 0) {
        const po1Id = po1Result.rows[0].id;

        // Create line items for PO1
        await client.query(
          `INSERT INTO purchase_order_line_items (po_id, product_code, product_name, quantity, gst_percent, price, mrp, line_priority, status)
           VALUES 
           ($1, $2, $3, $4, $5, $6, $7, $8, $9),
           ($1, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT DO NOTHING`,
          [po1Id, 'PROD-001', 'Widget A', 100, 18, 25.50, 35.00, 'HIGH', 'CREATED',
           'PROD-002', 'Widget B', 50, 18, 45.00, 60.00, 'MEDIUM', 'CREATED']
        );
        console.log('   ✅ PO-2024-001 with 2 line items created\n');
      }

      // Create PO 2
      console.log('📋 Creating purchase order PO-2024-002...');
      const po2Result = await client.query(
        `INSERT INTO purchase_orders (po_number, po_date, priority, type, vendor_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (po_number) DO NOTHING
         RETURNING id;`,
        ['PO-2024-002', '2024-01-20', 'MEDIUM', 'REPEAT', vendor1Id, 'CREATED']
      );

      if (po2Result.rows.length > 0) {
        const po2Id = po2Result.rows[0].id;

        // Create line item for PO2
        await client.query(
          `INSERT INTO purchase_order_line_items (po_id, product_code, product_name, quantity, gst_percent, price, mrp, line_priority, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT DO NOTHING`,
          [po2Id, 'PROD-003', 'Gadget X', 200, 12, 15.00, 20.00, 'MEDIUM', 'CREATED']
        );
        console.log('   ✅ PO-2024-002 with 1 line item created\n');
      }
    }

    // Create vendor 2
    console.log('🏢 Creating vendor 2: Global Supplies Inc...');
    const vendor2Result = await client.query(
      `INSERT INTO vendors (name, code, contact_person, contact_email, contact_phone, address, gst_number, is_active, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (code) DO NOTHING
       RETURNING id;`,
      ['Global Supplies Inc', 'GLOB001', 'Jane Smith', 'jane@globalsupplies.com', '+1-555-0002',
       '456 Commerce Ave, Los Angeles, CA 90001', 'GST987654321', true, 'ACTIVE']
    );

    if (vendor2Result.rows.length > 0) {
      console.log('   ✅ Global Supplies Inc created\n');
    }

    await client.query('COMMIT');

    console.log('\n✅ Seed completed successfully!\n');
    console.log('📝 Login Credentials:');
    console.log('   Admin:  admin@example.com / admin123');
    console.log('   Vendor: vendor@acme.com / vendor123\n');

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', error.message);
    console.error(error);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

seed()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
