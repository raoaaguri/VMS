import ExcelJS from "exceljs";
import fetch from "node-fetch";
import * as poService from "./po.service.js";

async function generatePoExcel(poId) {
  try {
    console.log("Starting Excel generation for PO:", poId);

    // ✅ FIXED: Direct DB call instead of axios HTTP call
    const po = await poService.getPoById(poId);

    if (!po || !po.line_items || po.line_items.length === 0) {
      throw new Error("No line items found for this PO");
    }

    const lineItems = po.line_items;

    console.log("Found line items:", lineItems.length);

    // Group by design_code
    const grouped = lineItems.reduce((acc, item) => {
      const key = item.design_code || "UNKNOWN";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PO DATA");

    const headers = [
      "PRODUCT NAME",
      "IMAGE",
      "DESIGN NO",
      "COLOR",
      "POLISH",
      "STYLE",
      "SIZE",
      "DMY7",
      "DMY8",
      "QTY",
    ];

    worksheet.addRow(headers);

    // Header styling
    worksheet.getRow(1).font = { bold: true };

    let rowNumber = 2;

    for (const designCode of Object.keys(grouped)) {
      const items = grouped[designCode];

      // Design section heading
      worksheet.mergeCells(`A${rowNumber}:J${rowNumber}`);
      worksheet.getCell(`A${rowNumber}`).value = `DESIGN NO: ${designCode}`;
      worksheet.getCell(`A${rowNumber}`).font = { bold: true };
      rowNumber++;

      for (const item of items) {
        const row = worksheet.getRow(rowNumber);

        row.getCell(1).value = item.product_name || "";
        // Cell 2 is IMAGE column - will be handled by image embedding
        row.getCell(3).value = item.design_code || "";
        row.getCell(4).value = item.color || "";
        row.getCell(5).value = item.polish || "";
        row.getCell(6).value = item.style || "";
        row.getCell(7).value = item.size || "";
        row.getCell(8).value = "N/A";
        row.getCell(9).value = "N/A";
        row.getCell(10).value = item.quantity || 0;

        // Add image if combination_code exists
        if (item.combination_code) {
          try {
            const imageUrl = `https://kushals-hq-prod.s3.amazonaws.com/images/${item.combination_code}.jpg`;

            // Fetch image as buffer
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Add image to workbook
            const imageId = workbook.addImage({
              buffer: buffer,
              extension: "jpeg",
            });

            // Add image to worksheet (column 2 = B column)
            worksheet.addImage(imageId, {
              tl: { col: 1, row: rowNumber - 1 }, // Column 1 = B (0-indexed), rowNumber-1 = current row
              ext: { width: 80, height: 80 },
            });

            worksheet.getRow(rowNumber).height = 60;
          } catch (err) {
            console.log("Image load failed:", item.combination_code);
          }
        }

        rowNumber++;
      }

      rowNumber += 2;
    }

    worksheet.columns.forEach((col) => {
      col.width = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    console.log("Excel buffer generated successfully");

    return buffer;
  } catch (error) {
    console.error("Error generating Excel:", error);
    throw error;
  }
}

export { generatePoExcel };
