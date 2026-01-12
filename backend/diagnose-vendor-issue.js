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

async function runDiagnostics() {
  try {
    console.log('\n========== VENDOR ISSUE DIAGNOSTICS ==========\n');

    // Check 1: Vendor users and their vendor_id
    console.log('1️⃣  CHECKING VENDOR USERS:');
    const vendorUsers = await pool.query(
      'SELECT id, email, role, vendor_id, is_active FROM users WHERE role = $1 LIMIT 10',
      ['VENDOR']
    );
    console.log(`Found ${vendorUsers.rows.length} vendor users:`);
    vendorUsers.rows.forEach(u => {
      console.log(`   ${u.email}: vendor_id = ${u.vendor_id || 'NULL'} ⚠️`);
    });

    // Check 2: Purchase orders and their vendor_id
    console.log('\n2️⃣  CHECKING PURCHASE ORDERS:');
    const pos = await pool.query(
      'SELECT id, po_number, vendor_id FROM purchase_orders LIMIT 10'
    );
    console.log(`Found ${pos.rows.length} purchase orders:`);
    pos.rows.forEach(po => {
      console.log(`   PO #${po.po_number} (${po.id}): vendor_id = ${po.vendor_id || 'NULL'} ⚠️`);
    });

    // Check 3: Vendors table
    console.log('\n3️⃣  CHECKING VENDORS:');
    const vendors = await pool.query('SELECT id, name FROM vendors');
    console.log(`Found ${vendors.rows.length} vendors:`);
    vendors.rows.forEach(v => {
      console.log(`   ID: ${v.id} | Name: ${v.name}`);
    });

    // Check 4: Mismatch analysis
    console.log('\n4️⃣  CHECKING FOR MISMATCHES:');
    const mismatches = await pool.query(`
      SELECT 
        u.email,
        u.vendor_id as user_vendor_id,
        po.id as po_id,
        po.po_number,
        po.vendor_id as po_vendor_id,
        (u.vendor_id = po.vendor_id) as MATCH
      FROM users u
      CROSS JOIN purchase_orders po
      WHERE u.role = 'VENDOR'
      LIMIT 1
    `);
    
    if (mismatches.rows.length > 0) {
      const row = mismatches.rows[0];
      console.log(`   User: ${row.email}`);
      console.log(`   User vendor_id: ${row.user_vendor_id || 'NULL'} ⚠️`);
      console.log(`   PO #${row.po_number}: ${row.po_id}`);
      console.log(`   PO vendor_id: ${row.po_vendor_id || 'NULL'} ⚠️`);
      console.log(`   DO THEY MATCH? ${row.match ? '✅ YES' : '❌ NO'}`);
    }

    // Check 5: Issues found
    console.log('\n5️⃣  ISSUES FOUND:');
    
    const nullUserVendors = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role = $1 AND vendor_id IS NULL',
      ['VENDOR']
    );
    if (nullUserVendors.rows[0].count > 0) {
      console.log(`   ❌ ${nullUserVendors.rows[0].count} vendor users have NULL vendor_id`);
    }

    const nullPoVendors = await pool.query(
      'SELECT COUNT(*) as count FROM purchase_orders WHERE vendor_id IS NULL'
    );
    if (nullPoVendors.rows[0].count > 0) {
      console.log(`   ❌ ${nullPoVendors.rows[0].count} purchase orders have NULL vendor_id`);
    }

    const mismatchCount = await pool.query(`
      SELECT COUNT(*) as count FROM users u
      WHERE u.role = 'VENDOR' AND u.vendor_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.vendor_id = u.vendor_id
      )
    `);
    if (mismatchCount.rows[0].count > 0) {
      console.log(`   ❌ ${mismatchCount.rows[0].count} vendor users have no matching purchase orders`);
    }

    console.log('\n========== DIAGNOSIS COMPLETE ==========\n');

  } catch (err) {
    console.error('Error running diagnostics:', err.message);
  } finally {
    await pool.end();
  }
}

runDiagnostics();
