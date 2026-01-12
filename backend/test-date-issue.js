import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config({ path: '.env' });

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DATABASE,
  ssl: false
});

async function checkDateIssue() {
  try {
    console.log('\n========== CHECKING DATE COLUMN ISSUE ==========\n');

    // Get the test line item
    const result = await pool.query(
      `SELECT id, expected_delivery_date FROM purchase_order_line_items 
       WHERE expected_delivery_date IS NOT NULL LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log('No line items with dates found');
      process.exit(0);
    }

    const item = result.rows[0];
    console.log('Line item from DB:', {
      id: item.id,
      expected_delivery_date: item.expected_delivery_date,
      type: typeof item.expected_delivery_date,
      constructor: item.expected_delivery_date?.constructor?.name
    });

    // Now try updating with just a date string
    const testDate = '2026-01-15';
    console.log(`\nUpdating with date string: "${testDate}"`);

    const updateResult = await pool.query(
      `UPDATE purchase_order_line_items 
       SET expected_delivery_date = $1::date 
       WHERE id = $2 
       RETURNING id, expected_delivery_date`,
      [testDate, item.id]
    );

    console.log('After update:', {
      expected_delivery_date: updateResult.rows[0].expected_delivery_date,
      type: typeof updateResult.rows[0].expected_delivery_date,
      constructor: updateResult.rows[0].expected_delivery_date?.constructor?.name
    });

    // Fetch again
    const fetchResult = await pool.query(
      `SELECT id, expected_delivery_date FROM purchase_order_line_items WHERE id = $1`,
      [item.id]
    );

    console.log('Fetched again:', {
      expected_delivery_date: fetchResult.rows[0].expected_delivery_date,
      type: typeof fetchResult.rows[0].expected_delivery_date,
      constructor: fetchResult.rows[0].expected_delivery_date?.constructor?.name
    });

    // Compare
    const dbDate = fetchResult.rows[0].expected_delivery_date;
    const dbDateStr = dbDate instanceof Date ? dbDate.toISOString().split('T')[0] : String(dbDate);
    
    console.log(`\nComparison:
    Test date sent: "${testDate}"
    DB date retrieved: "${dbDateStr}"
    Match: ${testDate === dbDateStr}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    pool.end();
    process.exit(0);
  }
}

checkDateIssue();
