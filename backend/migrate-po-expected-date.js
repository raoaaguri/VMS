import { query } from "./src/config/db.js";

async function addPoExpectedDeliveryDateColumn() {
  try {
    console.log(
      "🔧 Adding expected_delivery_date column to purchase_orders table...",
    );

    // Check if column already exists
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'purchase_orders' 
      AND column_name = 'expected_delivery_date'
    `);

    if (columnCheck.length > 0) {
      console.log("✅ Column already exists");
      return;
    }

    // Add the column
    await query(`
      ALTER TABLE purchase_orders 
      ADD COLUMN expected_delivery_date date
    `);

    console.log("✅ Column added successfully!");

    // Create index
    await query(`
      CREATE INDEX idx_purchase_orders_expected_delivery_date 
      ON purchase_orders(expected_delivery_date)
    `);

    console.log("✅ Index created successfully!");
    console.log("🎉 Migration completed!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

addPoExpectedDeliveryDateColumn();
