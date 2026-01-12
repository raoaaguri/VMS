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

async function assignPosToVendors() {
  try {
    console.log('\n========== ASSIGNING POs TO VENDORS ==========\n');

    // Mapping of email to vendor name
    const vendorMapping = {
      'kbc@example.com': 'KBC',
      'emma@qualityparts.com': 'Quality Parts Ltd',
      'timba@example.com': 'TIMBA',
      'david@primematerials.com': 'Prime Materials Co'
    };

    for (const [email, vendorName] of Object.entries(vendorMapping)) {
      console.log(`\nProcessing ${email} (${vendorName})...`);

      // Get the vendor record
      const vendor = await pool.query(
        'SELECT id FROM vendors WHERE name = $1',
        [vendorName]
      );

      if (vendor.rows.length === 0) {
        console.log(`   ⚠️  Vendor "${vendorName}" not found`);
        continue;
      }

      const vendorId = vendor.rows[0].id;

      // Get the user's vendor_id from users table
      const user = await pool.query(
        'SELECT vendor_id FROM users WHERE email = $1',
        [email]
      );

      if (user.rows.length === 0) {
        console.log(`   ⚠️  User ${email} not found`);
        continue;
      }

      const userVendorId = user.rows[0].vendor_id;

      // Get any POs assigned to this vendor
      const existingPos = await pool.query(
        'SELECT id FROM purchase_orders WHERE vendor_id = $1 LIMIT 1',
        [userVendorId]
      );

      if (existingPos.rows.length > 0) {
        console.log(`   ✅ Already has POs (vendor_id: ${userVendorId})`);
        continue;
      }

      // Find an unassigned PO or one with no matching user
      // First, try to find a PO for the actual vendor name
      const poByVendorName = await pool.query(`
        SELECT DISTINCT po.id, po.po_number
        FROM purchase_orders po
        WHERE po.vendor_id NOT IN (
          SELECT DISTINCT vendor_id FROM users WHERE role = 'VENDOR' AND vendor_id IS NOT NULL
        )
        LIMIT 1
      `);

      if (poByVendorName.rows.length > 0) {
        const poId = poByVendorName.rows[0].id;
        const poNumber = poByVendorName.rows[0].po_number;
        
        await pool.query(
          'UPDATE purchase_orders SET vendor_id = $1 WHERE id = $2',
          [userVendorId, poId]
        );
        console.log(`   ✅ Assigned PO ${poNumber} (vendor_id: ${userVendorId})`);
      } else {
        console.log(`   ⚠️  No unassigned POs available`);
      }
    }

    // Final verification
    console.log('\n========== FINAL VERIFICATION ==========\n');
    const vendorStatus = await pool.query(`
      SELECT u.email, u.vendor_id, v.name,
        (SELECT COUNT(*) FROM purchase_orders WHERE vendor_id = u.vendor_id) as po_count
      FROM users u
      LEFT JOIN vendors v ON u.vendor_id = v.id
      WHERE u.role = 'VENDOR'
      ORDER BY u.email
    `);

    vendorStatus.rows.forEach(row => {
      const status = row.po_count > 0 ? '✅' : '⚠️';
      console.log(`${status} ${row.email.padEnd(30)} → ${row.name?.padEnd(25)} (${row.po_count} POs)`);
    });

    console.log('\n========== ASSIGNMENT COMPLETE ==========\n');

  } catch (err) {
    console.error('Error assigning POs:', err.message);
  } finally {
    await pool.end();
  }
}

assignPosToVendors();
