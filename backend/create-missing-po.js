import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSLMODE === "require",
});

async function updateQuantities(quantityUpdates) {
  const client = await pool.connect();
  const results = [];
  const errors = [];

  try {
    await client.query("BEGIN");

    for (const update of quantityUpdates) {
      try {
        // Step 1: Find PO by po_number
        const poResult = await client.query(
          "SELECT id FROM purchase_orders WHERE po_number = $1",
          [update.poNumber],
        );

        if (poResult.rows.length === 0) {
          errors.push({
            poNumber: update.poNumber,
            combinationCode: update.combinationCode,
            error: "PO not found",
          });
          continue;
        }

        const poId = poResult.rows[0].id;

        // Step 2: Find line item by PO ID + combination_code
        const lineItemResult = await client.query(
          "SELECT id FROM purchase_order_line_items WHERE po_id = $1 AND combination_code = $2",
          [poId, update.combinationCode],
        );

        if (lineItemResult.rows.length === 0) {
          errors.push({
            poNumber: update.poNumber,
            combinationCode: update.combinationCode,
            error: "Line item not found",
          });
          continue;
        }

        const lineItemId = lineItemResult.rows[0].id;

        // Step 3: Update quantity and received_qty
        await client.query(
          "UPDATE purchase_order_line_items SET quantity = $1, received_qty = $2, updated_at = NOW() WHERE id = $3",
          [update.totalQty, update.receivedQty, lineItemId],
        );

        results.push({
          poNumber: update.poNumber,
          combinationCode: update.combinationCode,
          success: true,
          lineItemId: lineItemId,
          updatedData: {
            totalQty: update.totalQty,
            receivedQty: update.receivedQty,
          },
        });
      } catch (error) {
        errors.push({
          poNumber: update.poNumber,
          combinationCode: update.combinationCode,
          error: error.message,
        });
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    success: errors.length === 0,
    totalProcessed: quantityUpdates.length,
    successCount: results.length,
    errorCount: errors.length,
    results,
    errors,
  };
}

// Example usage
async function testUpdate() {
  const testData = [
    {
      poNumber: "WHBLR-PO-46",
      combinationCode: "600138",
      totalQty: 5,
      receivedQty: 3,
    },
  ];

  try {
    const result = await updateQuantities(testData);
    console.log("✅ Update Result:", result);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUpdate();
}

export { updateQuantities };
