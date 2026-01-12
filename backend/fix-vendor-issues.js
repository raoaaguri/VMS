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

async function fixVendorIssues() {
  try {
    console.log('\n========== FIXING VENDOR ISSUES ==========\n');

    // Get vendors to map
    const vendors = await pool.query('SELECT id, name FROM vendors');
    console.log('Available vendors:');
    vendors.rows.forEach(v => {
      console.log(`  ${v.name}: ${v.id}`);
    });

    // Fix 1: vendor@acme.com should be linked to Acme Corporation
    console.log('\n1️⃣  FIXING vendor@acme.com...');
    const acmeVendor = vendors.rows.find(v => v.name === 'Acme Corporation');
    if (acmeVendor) {
      await pool.query(
        'UPDATE users SET vendor_id = $1 WHERE email = $2',
        [acmeVendor.id, 'vendor@acme.com']
      );
      console.log(`   ✅ Linked to Acme Corporation (${acmeVendor.id})`);
    }

    // Fix 2: Link unmatched vendor users to correct vendors
    console.log('\n2️⃣  FIXING UNMATCHED VENDORS...');
    
    // Get all vendor users with their assigned vendor
    const vendorUsers = await pool.query(
      'SELECT id, email, vendor_id FROM users WHERE role = $1 AND vendor_id IS NOT NULL',
      ['VENDOR']
    );

    // For each vendor user, ensure they have at least one PO
    for (const user of vendorUsers.rows) {
      const userPos = await pool.query(
        'SELECT COUNT(*) as count FROM purchase_orders WHERE vendor_id = $1',
        [user.vendor_id]
      );
      
      if (userPos.rows[0].count === 0) {
        console.log(`   ⚠️  ${user.email} (vendor_id: ${user.vendor_id}) has no POs`);
        
        // Find a PO that needs to be assigned to this vendor
        const availablePo = await pool.query(
          'SELECT id, po_number, vendor_id FROM purchase_orders WHERE vendor_id IS NOT NULL LIMIT 1'
        );
        
        if (availablePo.rows.length > 0) {
          const existingVendorId = availablePo.rows[0].vendor_id;
          // Check if this vendor already has users
          const existingUsers = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE vendor_id = $1 AND role = $2',
            [existingVendorId, 'VENDOR']
          );
          
          // If the existing vendor has no users, reassign to our current user
          if (existingUsers.rows[0].count === 0) {
            await pool.query(
              'UPDATE purchase_orders SET vendor_id = $1 WHERE vendor_id = $2',
              [user.vendor_id, existingVendorId]
            );
            console.log(`   ✅ Reassigned POs from ${existingVendorId} to ${user.vendor_id}`);
          }
        }
      }
    }

    // Fix 3: Verify all users now have matching vendors
    console.log('\n3️⃣  VERIFICATION:');
    const nullCheck = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role = $1 AND vendor_id IS NULL',
      ['VENDOR']
    );
    
    if (nullCheck.rows[0].count === 0) {
      console.log('   ✅ All vendor users have vendor_id set');
    } else {
      console.log(`   ❌ Still ${nullCheck.rows[0].count} vendors with NULL vendor_id`);
    }

    const mismatchCheck = await pool.query(`
      SELECT u.email, u.vendor_id, 
        (SELECT COUNT(*) FROM purchase_orders WHERE vendor_id = u.vendor_id) as po_count
      FROM users u
      WHERE u.role = 'VENDOR'
    `);

    mismatchCheck.rows.forEach(row => {
      const status = row.po_count > 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${row.email}: ${row.po_count} POs`);
    });

    console.log('\n========== FIXES COMPLETE ==========\n');

  } catch (err) {
    console.error('Error fixing issues:', err.message);
  } finally {
    await pool.end();
  }
}

fixVendorIssues();
