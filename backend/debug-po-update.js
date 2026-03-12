import { query } from './src/config/db.js';

async function debugPoUpdate() {
  try {
    console.log('🔍 Debugging PO Update Issue...\n');
    
    // Check if the expected_delivery_date column exists
    console.log('1. Checking purchase_orders table structure...');
    const columnCheck = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'purchase_orders' 
      AND column_name = 'expected_delivery_date'
    `);
    
    if (columnCheck.length > 0) {
      console.log('✅ expected_delivery_date column exists:', columnCheck[0]);
    } else {
      console.log('❌ expected_delivery_date column does NOT exist!');
      return;
    }
    
    // Test a simple PO update
    console.log('\n2. Testing simple PO update...');
    const testUpdate = await query(`
      UPDATE purchase_orders 
      SET expected_delivery_date = '2026-03-15' 
      WHERE id = $1
      RETURNING id, expected_delivery_date, updated_at
    `, ['12']); // Using PO ID 12 as test
    
    console.log('Update result:', testUpdate);
    
    // Test the service function directly
    console.log('\n3. Testing repository update function...');
    const { poRepository } = await import('./src/modules/pos/po.repository.js');
    
    try {
      const result = await poRepository.update('12', {
        expected_delivery_date: '2026-03-20'
      });
      console.log('✅ Repository update successful:', result);
    } catch (error) {
      console.log('❌ Repository update failed:', error.message);
      console.log('Error details:', error);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.log('Full error:', error);
  }
}

debugPoUpdate();
