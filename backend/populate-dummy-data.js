import { query } from "./src/config/db.js";

const designCodes = ["DC-001", "DC-002", "DC-003", "DC-004", "DC-005"];
const combinations = ["CC-A", "CC-B", "CC-C", "CC-D", "CC-E"];
const styles = [
  "Modern",
  "Classic",
  "Contemporary",
  "Traditional",
  "Minimalist",
];
const subStyles = ["Geometric", "Floral", "Abstract", "Solid", "Pattern"];
const regions = ["North", "South", "East", "West", "Central"];
const colors = ["Red", "Blue", "Green", "Yellow", "Black", "White", "Brown"];
const subColors = [
  "Dark Red",
  "Light Blue",
  "Lime Green",
  "Golden Yellow",
  "Jet Black",
];
const polishes = ["Matte", "Glossy", "Semi-Gloss", "Satin", "Mirror"];
const sizes = ["Small", "Medium", "Large", "XL", "XXL"];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

async function populateDummyData() {
  try {
    console.log("Starting to populate dummy data in line items...");

    // Get all line items
    const lineItemsResult = await query(`
      SELECT id FROM purchase_order_line_items
    `);

    const lineItems = lineItemsResult;
    console.log(`Found ${lineItems.length} line items to update`);

    let successCount = 0;
    let errorCount = 0;

    for (const item of lineItems) {
      try {
        // 70% chance to have data, 30% chance to be null (so they show as "-" in frontend)
        const hasData = Math.random() < 0.7;

        const updateSql = `
          UPDATE purchase_order_line_items
          SET 
            design_code = $1,
            combination_code = $2,
            style = $3,
            sub_style = $4,
            region = $5,
            color = $6,
            sub_color = $7,
            polish = $8,
            size = $9,
            weight = $10,
            received_qty = $11,
            updated_at = NOW()
          WHERE id = $12
        `;

        const params = [
          hasData ? getRandomElement(designCodes) : null,
          hasData ? getRandomElement(combinations) : null,
          hasData ? getRandomElement(styles) : null,
          hasData ? getRandomElement(subStyles) : null,
          hasData ? getRandomElement(regions) : null,
          hasData ? getRandomElement(colors) : null,
          hasData ? getRandomElement(subColors) : null,
          hasData ? getRandomElement(polishes) : null,
          hasData ? getRandomElement(sizes) : null,
          hasData ? parseFloat(getRandomNumber(0.5, 10)) : null,
          hasData ? Math.floor(Math.random() * 100) : 0,
          item.id,
        ];

        await query(updateSql, params);
        successCount++;
        console.log(`✓ Updated line item ${successCount}/${lineItems.length}`);
      } catch (err) {
        errorCount++;
        console.error(`✗ Failed to update line item: ${err.message}`);
      }
    }

    console.log(`\n✓ Dummy data population complete!`);
    console.log(`  - Successfully updated: ${successCount}`);
    console.log(`  - Failed: ${errorCount}`);
    console.log(
      `\nNote: ~30% of line items have null values to test the "-" display in frontend`,
    );
    process.exit(0);
  } catch (error) {
    console.error("✗ Dummy data population failed:", error.message);
    process.exit(1);
  }
}

populateDummyData();
