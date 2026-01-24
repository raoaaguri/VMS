import { query } from "./src/config/db.js";
import fs from "fs";
import path from "path";

async function runMigration() {
  try {
    console.log(
      "Starting migration: Adding product detail columns to line items...",
    );

    const migrationSql = `
      ALTER TABLE purchase_order_line_items
      ADD COLUMN IF NOT EXISTS design_code text,
      ADD COLUMN IF NOT EXISTS combination_code text,
      ADD COLUMN IF NOT EXISTS style text,
      ADD COLUMN IF NOT EXISTS sub_style text,
      ADD COLUMN IF NOT EXISTS region text,
      ADD COLUMN IF NOT EXISTS color text,
      ADD COLUMN IF NOT EXISTS sub_color text,
      ADD COLUMN IF NOT EXISTS polish text,
      ADD COLUMN IF NOT EXISTS size text,
      ADD COLUMN IF NOT EXISTS weight numeric,
      ADD COLUMN IF NOT EXISTS received_qty numeric DEFAULT 0;
    `;

    await query(migrationSql);
    console.log("✓ Migration completed successfully!");
    console.log("Added columns:");
    console.log("  - design_code");
    console.log("  - combination_code");
    console.log("  - style");
    console.log("  - sub_style");
    console.log("  - region");
    console.log("  - color");
    console.log("  - sub_color");
    console.log("  - polish");
    console.log("  - size");
    console.log("  - weight");
    console.log("  - received_qty");
    process.exit(0);
  } catch (error) {
    console.error("✗ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
