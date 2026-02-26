import { query } from "./src/config/db.js";

async function runMigration() {
  try {
    console.log("Starting migration: Adding category column to line items...");

    const migrationSql = `
      ALTER TABLE purchase_order_line_items
      ADD COLUMN IF NOT EXISTS category text;
    `;

    await query(migrationSql);
    console.log("✓ Migration completed successfully!");
    console.log("Added column:");
    console.log("  - category");
    process.exit(0);
  } catch (error) {
    console.error("✗ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
