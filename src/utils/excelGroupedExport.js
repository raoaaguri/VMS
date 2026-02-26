import axios from "axios";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../config/api";

/**
 * Generate grouped Excel file with images
 * Calls backend API to get grouped data and then generates Excel on frontend
 * @param {String} userRole - 'admin' or 'vendor'
 * @param {String} poId - PO ID to export
 * @param {String} poNumber - PO number for file name
 * @returns {Promise<void>}
 */
export async function generateGroupedExcel(userRole, poId, poNumber) {
  try {
    // Get token from localStorage
    const token = localStorage.getItem("token");

    // Determine the endpoint based on user role
    const endpoint =
      userRole === "admin"
        ? `/api/v1/admin/pos/${poId}/export-with-images`
        : `/api/v1/vendor/pos/${poId}/export-with-images`;

    // Fetch grouped data from backend
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("API Response:", response.data);

    const { sortedItems } = response.data;

    console.log("Sorted Items:", sortedItems);

    if (!sortedItems || sortedItems.length === 0) {
      throw new Error("No line items to export");
    }

    // Create grouped structure
    const grouped = {};
    sortedItems.forEach((item) => {
      if (!grouped[item.design_code]) {
        grouped[item.design_code] = [];
      }
      grouped[item.design_code].push(item);
    });

    const groups = Object.values(grouped);
    console.log("Grouped data:", groups);

    const HEADERS = [
      "D.NO",
      "PRODUCT NAME",
      "COLOR",
      "POLISH",
      "STYLE",
      "SIZE",
      "QTY",
    ];
    const GROUP_WIDTH = HEADERS.length;
    const COLUMN_GAP = 2;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const workbookData = [];

    console.log("Starting to build workbook data...");

    let currentRow = 0;

    // Process groups in pairs
    for (let i = 0; i < groups.length; i += 2) {
      const leftGroup = groups[i];
      const rightGroup = groups[i + 1];

      // Add headers row
      const headerRow = [];

      // Left group headers
      for (let j = 0; j < GROUP_WIDTH; j++) {
        headerRow.push(HEADERS[j]);
      }

      // Gap columns
      for (let j = 0; j < COLUMN_GAP; j++) {
        headerRow.push("");
      }

      // Right group headers
      if (rightGroup) {
        for (let j = 0; j < GROUP_WIDTH; j++) {
          headerRow.push(HEADERS[j]);
        }
      }

      workbookData.push(headerRow);
      currentRow++;

      // Calculate max rows for this pair
      const maxRows = Math.max(
        leftGroup.length,
        rightGroup ? rightGroup.length : 0,
      );

      // Add data rows
      for (let r = 0; r < maxRows; r++) {
        const dataRow = [];

        // LEFT GROUP
        if (leftGroup[r]) {
          const item = leftGroup[r];
          dataRow.push(r === 0 ? item.design_code : ""); // D.NO only in first row
          dataRow.push(r === 0 ? item.product_name : ""); // PRODUCT NAME only in first row
          dataRow.push(item.color || "");
          dataRow.push(item.polish || "");
          dataRow.push(item.style || "");
          dataRow.push(item.size || "");
          dataRow.push(item.quantity || "");
        } else {
          for (let j = 0; j < GROUP_WIDTH; j++) {
            dataRow.push("");
          }
        }

        // Gap columns
        for (let j = 0; j < COLUMN_GAP; j++) {
          dataRow.push("");
        }

        // RIGHT GROUP
        if (rightGroup && rightGroup[r]) {
          const item = rightGroup[r];
          dataRow.push(r === 0 ? item.design_code : ""); // D.NO only in first row
          dataRow.push(r === 0 ? item.product_name : ""); // PRODUCT NAME only in first row
          dataRow.push(item.color || "");
          dataRow.push(item.polish || "");
          dataRow.push(item.style || "");
          dataRow.push(item.size || "");
          dataRow.push(item.quantity || "");
        }

        workbookData.push(dataRow);
        currentRow++;
      }

      // Add gap rows (2 empty rows) except after last pair
      if (i + 2 < groups.length) {
        workbookData.push([]);
        workbookData.push([]);
      }
    }

    // Create worksheet from data
    console.log("Final workbook data:", workbookData);

    const worksheet = XLSX.utils.aoa_to_sheet(workbookData);

    // Set column widths
    const colWidths = Array(GROUP_WIDTH + COLUMN_GAP + GROUP_WIDTH).fill(15);
    worksheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "PO Data");

    console.log(
      "About to write file with name:",
      `PO_${poNumber}_with_images.xlsx`,
    );

    // Generate and download file
    XLSX.writeFile(workbook, `PO_${poNumber}_with_images.xlsx`);
  } catch (error) {
    console.error("Error exporting Excel:", error);
    throw new Error("Failed to export PO data with images: " + error.message);
  }
}
