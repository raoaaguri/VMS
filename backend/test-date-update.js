import dotenv from 'dotenv';
import { getDbClient } from './src/config/db.js';

dotenv.config({ path: '.env' });

async function testDateUpdate() {
  try {
    console.log('\n========== TESTING DATE UPDATE ==========\n');

    const db = getDbClient();

    // First, let's get a line item to check its current state
    console.log('1. Fetching a line item...');
    const { data: lineItem, error: fetchError } = await db
      .from('purchase_order_line_items')
      .select()
      .limit(1)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching line item:', fetchError);
      process.exit(1);
    }

    console.log('Current line item:', {
      id: lineItem.id,
      po_id: lineItem.po_id,
      expected_delivery_date: lineItem.expected_delivery_date,
      updated_at: lineItem.updated_at
    });

    // Now try to update the date
    const newDate = new Date().toISOString().split('T')[0]; // Today's date
    console.log('\n2. Attempting to update date to:', newDate);

    const updateData = {
      expected_delivery_date: newDate,
      updated_at: new Date().toISOString()
    };

    const { data: updatedItem, error: updateError } = await db
      .from('purchase_order_line_items')
      .update(updateData)
      .eq('id', lineItem.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating line item:', updateError);
      process.exit(1);
    }

    console.log('Update response:', {
      id: updatedItem.id,
      expected_delivery_date: updatedItem.expected_delivery_date,
      updated_at: updatedItem.updated_at
    });

    // Now fetch again to verify persistence
    console.log('\n3. Fetching line item again to verify persistence...');
    const { data: verifyItem, error: verifyError } = await db
      .from('purchase_order_line_items')
      .select()
      .eq('id', lineItem.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying line item:', verifyError);
      process.exit(1);
    }

    console.log('Verified line item:', {
      id: verifyItem.id,
      expected_delivery_date: verifyItem.expected_delivery_date,
      updated_at: verifyItem.updated_at
    });

    if (verifyItem.expected_delivery_date === newDate) {
      console.log('\n✅ DATABASE UPDATE WORKING CORRECTLY');
    } else {
      console.log('\n❌ DATABASE UPDATE NOT PERSISTING');
      console.log('Expected:', newDate);
      console.log('Got:', verifyItem.expected_delivery_date);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testDateUpdate();
