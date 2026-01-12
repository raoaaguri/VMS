import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
import { config } from './src/config/env.js';

const { Pool } = pkg;

async function migrateFromSupabase() {
  console.log('\n🔄 Migrating data from Supabase to Local PostgreSQL...\n');

  // Initialize Supabase client
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  // Initialize PostgreSQL client
  const pool = new Pool({
    user: config.postgres.user,
    password: config.postgres.password,
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📡 Testing PostgreSQL connection...\n');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Step 1: Create schema
    console.log('📋 Creating database schema...\n');

    await client.query('DROP TABLE IF EXISTS po_line_item_history CASCADE;');
    await client.query('DROP TABLE IF EXISTS po_history CASCADE;');
    await client.query('DROP TABLE IF EXISTS purchase_order_line_items CASCADE;');
    await client.query('DROP TABLE IF EXISTS purchase_orders CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');
    await client.query('DROP TABLE IF EXISTS vendors CASCADE;');

    // Create vendors table
    await client.query(`
      CREATE TABLE vendors (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        code text UNIQUE NOT NULL,
        contact_person text NOT NULL,
        contact_email text NOT NULL,
        contact_phone text,
        address text,
        gst_number text,
        is_active boolean DEFAULT true,
        status text DEFAULT 'PENDING',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    // Create users table
    await client.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        role text NOT NULL CHECK (role IN ('ADMIN', 'VENDOR')),
        vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    // Create purchase_orders table
    await client.query(`
      CREATE TABLE purchase_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        po_number text UNIQUE NOT NULL,
        po_date date NOT NULL,
        priority text NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
        type text NOT NULL CHECK (type IN ('NEW_ITEMS', 'REPEAT')),
        vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
        status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED')),
        erp_reference_id text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    // Create purchase_order_line_items table
    await client.query(`
      CREATE TABLE purchase_order_line_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_code text NOT NULL,
        product_name text NOT NULL,
        quantity numeric NOT NULL CHECK (quantity > 0),
        gst_percent numeric NOT NULL CHECK (gst_percent >= 0),
        price numeric NOT NULL CHECK (price >= 0),
        mrp numeric NOT NULL CHECK (mrp >= 0),
        line_priority text NOT NULL CHECK (line_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
        expected_delivery_date date,
        status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED')),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    // Create po_history table
    await client.query(`
      CREATE TABLE po_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        old_status text,
        new_status text NOT NULL,
        changed_by_user_id uuid,
        changed_by_user_name text,
        changed_by_user_role text,
        notes text,
        created_at timestamptz DEFAULT now()
      );
    `);

    // Create po_line_item_history table
    await client.query(`
      CREATE TABLE po_line_item_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        line_item_id uuid NOT NULL REFERENCES purchase_order_line_items(id) ON DELETE CASCADE,
        po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        field_name text NOT NULL,
        old_value text,
        new_value text,
        changed_by_user_id uuid,
        changed_by_user_name text,
        changed_by_user_role text,
        created_at timestamptz DEFAULT now()
      );
    `);

    // Create indexes
    await client.query('CREATE INDEX idx_users_email ON users(email);');
    await client.query('CREATE INDEX idx_users_vendor_id ON users(vendor_id);');
    await client.query('CREATE INDEX idx_vendors_code ON vendors(code);');
    await client.query('CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);');
    await client.query('CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);');
    await client.query('CREATE INDEX idx_purchase_order_line_items_po_id ON purchase_order_line_items(po_id);');
    await client.query('CREATE INDEX idx_po_history_po_id ON po_history(po_id);');
    await client.query('CREATE INDEX idx_po_line_item_history_line_item_id ON po_line_item_history(line_item_id);');

    console.log('✅ Schema created\n');

    // Step 2: Fetch data from Supabase
    console.log('📥 Fetching data from Supabase...\n');

    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at');

    if (vendorsError) throw vendorsError;
    console.log(`   Vendors: ${vendors?.length || 0} records`);

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at');

    if (usersError) throw usersError;
    console.log(`   Users: ${users?.length || 0} records`);

    const { data: pos, error: posError } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at');

    if (posError) throw posError;
    console.log(`   Purchase Orders: ${pos?.length || 0} records`);

    const { data: lineItems, error: lineItemsError } = await supabase
      .from('purchase_order_line_items')
      .select('*')
      .order('created_at');

    if (lineItemsError) throw lineItemsError;
    console.log(`   Line Items: ${lineItems?.length || 0} records`);

    const { data: poHistory, error: poHistoryError } = await supabase
      .from('po_history')
      .select('*')
      .order('created_at');

    if (poHistoryError) throw poHistoryError;
    console.log(`   PO History: ${poHistory?.length || 0} records`);

    const { data: lineItemHistory, error: lineItemHistoryError } = await supabase
      .from('po_line_item_history')
      .select('*')
      .order('created_at');

    if (lineItemHistoryError) throw lineItemHistoryError;
    console.log(`   Line Item History: ${lineItemHistory?.length || 0} records\n`);

    // Step 3: Insert data into PostgreSQL
    console.log('💾 Importing data to local PostgreSQL...\n');

    // Insert vendors
    if (vendors && vendors.length > 0) {
      for (const vendor of vendors) {
        await client.query(
          `INSERT INTO vendors (id, name, code, contact_person, contact_email, contact_phone, address, gst_number, is_active, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            vendor.id,
            vendor.name,
            vendor.code,
            vendor.contact_person,
            vendor.contact_email,
            vendor.contact_phone,
            vendor.address,
            vendor.gst_number,
            vendor.is_active,
            vendor.status || 'PENDING',
            vendor.created_at,
            vendor.updated_at
          ]
        );
      }
      console.log(`   ✅ Imported ${vendors.length} vendors`);
    }

    // Insert users
    if (users && users.length > 0) {
      for (const user of users) {
        await client.query(
          `INSERT INTO users (id, name, email, password_hash, role, vendor_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            user.id,
            user.name,
            user.email,
            user.password_hash,
            user.role,
            user.vendor_id,
            user.created_at,
            user.updated_at
          ]
        );
      }
      console.log(`   ✅ Imported ${users.length} users`);
    }

    // Insert purchase orders
    if (pos && pos.length > 0) {
      for (const po of pos) {
        await client.query(
          `INSERT INTO purchase_orders (id, po_number, po_date, priority, type, vendor_id, status, erp_reference_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            po.id,
            po.po_number,
            po.po_date,
            po.priority,
            po.type,
            po.vendor_id,
            po.status,
            po.erp_reference_id,
            po.created_at,
            po.updated_at
          ]
        );
      }
      console.log(`   ✅ Imported ${pos.length} purchase orders`);
    }

    // Insert line items
    if (lineItems && lineItems.length > 0) {
      for (const item of lineItems) {
        await client.query(
          `INSERT INTO purchase_order_line_items (id, po_id, product_code, product_name, quantity, gst_percent, price, mrp, line_priority, expected_delivery_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            item.id,
            item.po_id,
            item.product_code,
            item.product_name,
            item.quantity,
            item.gst_percent,
            item.price,
            item.mrp,
            item.line_priority,
            item.expected_delivery_date,
            item.status,
            item.created_at,
            item.updated_at
          ]
        );
      }
      console.log(`   ✅ Imported ${lineItems.length} line items`);
    }

    // Insert PO history
    if (poHistory && poHistory.length > 0) {
      for (const history of poHistory) {
        await client.query(
          `INSERT INTO po_history (id, po_id, old_status, new_status, changed_by_user_id, changed_by_user_name, changed_by_user_role, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            history.id,
            history.po_id,
            history.old_status,
            history.new_status,
            history.changed_by_user_id,
            history.changed_by_user_name,
            history.changed_by_user_role,
            history.notes,
            history.created_at
          ]
        );
      }
      console.log(`   ✅ Imported ${poHistory.length} PO history records`);
    }

    // Insert line item history
    if (lineItemHistory && lineItemHistory.length > 0) {
      for (const history of lineItemHistory) {
        await client.query(
          `INSERT INTO po_line_item_history (id, line_item_id, po_id, field_name, old_value, new_value, changed_by_user_id, changed_by_user_name, changed_by_user_role, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            history.id,
            history.line_item_id,
            history.po_id,
            history.field_name,
            history.old_value,
            history.new_value,
            history.changed_by_user_id,
            history.changed_by_user_name,
            history.changed_by_user_role,
            history.created_at
          ]
        );
      }
      console.log(`   ✅ Imported ${lineItemHistory.length} line item history records`);
    }

    console.log('\n✅ Migration completed successfully!\n');

    // Verify counts
    console.log('📊 Final record counts:\n');
    const tables = ['vendors', 'users', 'purchase_orders', 'purchase_order_line_items', 'po_history', 'po_line_item_history'];

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ${table}: ${result.rows[0].count} records`);
    }

    console.log('\n✨ All done!\n');

    client.release();
    await pool.end();
    return true;

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
    return false;
  }
}

migrateFromSupabase()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
