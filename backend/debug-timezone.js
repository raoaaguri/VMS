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

async function debugDateIssue() {
  try {
    console.log('\n========== DEBUGGING DATE TIMEZONE ISSUE ==========\n');

    // Check what's in the database currently
    const checkResult = await pool.query(
      `SELECT id, expected_delivery_date FROM purchase_order_line_items 
       WHERE expected_delivery_date IS NOT NULL LIMIT 1`
    );

    const itemId = checkResult.rows[0].id;
    const currentDate = checkResult.rows[0].expected_delivery_date;
    
    console.log('Current date in DB:', {
      value: currentDate,
      type: typeof currentDate,
      ISO: currentDate?.toISOString?.() || 'N/A'
    });

    // Now let's test with raw SQL what the database thinks
    console.log('\n1. Testing raw SQL date handling...');
    
    const testDate = '2026-01-20';
    console.log(`   Sending date string: "${testDate}"`);
    
    const rawUpdate = await pool.query(
      `UPDATE purchase_order_line_items 
       SET expected_delivery_date = $1::date 
       WHERE id = $2 
       RETURNING expected_delivery_date`,
      [testDate, itemId]
    );

    const returnedDate = rawUpdate.rows[0].expected_delivery_date;
    console.log(`   Database returned: ${returnedDate}`);
    console.log(`   ISO string: ${returnedDate?.toISOString?.() || 'N/A'}`);

    // Verify the storage
    const verifyRaw = await pool.query(
      `SELECT expected_delivery_date FROM purchase_order_line_items WHERE id = $1`,
      [itemId]
    );

    const storedDate = verifyRaw.rows[0].expected_delivery_date;
    console.log(`   Verified in DB: ${storedDate}`);

    // Check if timezone conversion is the issue
    console.log('\n2. Analyzing timezone offset...');
    const sentYear = parseInt(testDate.split('-')[0]);
    const sentMonth = parseInt(testDate.split('-')[1]);
    const sentDay = parseInt(testDate.split('-')[2]);
    
    const returnedYear = returnedDate.getUTCFullYear();
    const returnedMonth = returnedDate.getUTCMonth() + 1;
    const returnedDay = returnedDate.getUTCDate();
    
    console.log(`   Sent:     ${sentYear}-${String(sentMonth).padStart(2,'0')}-${String(sentDay).padStart(2,'0')}`);
    console.log(`   Returned: ${returnedYear}-${String(returnedMonth).padStart(2,'0')}-${String(returnedDay).padStart(2,'0')}`);
    console.log(`   Match: ${sentYear === returnedYear && sentMonth === returnedMonth && sentDay === returnedDay}`);

    // Test with a specific timezone-aware approach
    console.log('\n3. Testing with DATE + timezone handling...');
    const localDate = new Date('2026-01-25T00:00:00');
    const isoDateString = localDate.toISOString().split('T')[0];
    console.log(`   Created Date object: ${localDate}`);
    console.log(`   ISO date string: ${isoDateString}`);

    const tzUpdate = await pool.query(
      `UPDATE purchase_order_line_items 
       SET expected_delivery_date = $1::date 
       WHERE id = $2 
       RETURNING expected_delivery_date`,
      [isoDateString, itemId]
    );

    console.log(`   Database returned: ${tzUpdate.rows[0].expected_delivery_date}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    pool.end();
    process.exit(0);
  }
}

debugDateIssue();
