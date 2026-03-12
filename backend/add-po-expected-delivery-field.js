import { query } from './src/config/db.js';

async function addPoExpectedDeliveryDate() {
  try {
    console.log('🔧 Adding expected_delivery_date field to purchase_orders table...');
    
    // Add the column
    await query(`
      ALTER TABLE purchase_orders 
      ADD COLUMN IF NOT EXISTS expected_delivery_date date
    `);
    
    console.log('✅ Column added successfully!');
    
    // Create index
    await query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_delivery_date 
      ON purchase_orders(expected_delivery_date)
    `);
    
    console.log('✅ Index created successfully!');
    console.log('🎉 Database schema updated!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addPoExpectedDeliveryDate();
