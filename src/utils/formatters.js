/**
 * Utility functions for consistent data formatting across the application
 */

/**
 * Formats date to dd-mmm-yyyy format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return "-";

  let dateObj;

  // Handle different date formats
  if (typeof date === "string") {
    // If it's a date string from PostgreSQL (YYYY-MM-DD), handle it properly
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Split the date to avoid timezone issues
      const [year, month, day] = date.split("-").map(Number);
      dateObj = new Date(year, month - 1, day); // month is 0-indexed in JS
    } else {
      // For other date strings, use the regular constructor
      dateObj = new Date(date);
    }
  } else {
    // For Date objects or other types
    dateObj = new Date(date);
  }

  if (isNaN(dateObj.getTime())) return "-";

  const day = dateObj.getDate().toString().padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Formats price to 2 decimal places
 * @param {number} price - Price value
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
  if (price === null || price === undefined || price === "") return "-";

  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return "-";

  return numPrice.toFixed(2);
}

/**
 * Formats currency with price
 * @param {number} price - Price value
 * @param {string} currency - Currency symbol (default: '₹')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(price, currency = "₹") {
  if (price === null || price === undefined || price === "") return "-";

  const formattedPrice = formatPrice(price);
  return `${currency}${formattedPrice}`;
}

/**
 * Checks if a value is price-related (contains price, amount, cost, value keywords)
 * @param {string} columnName - Column name or header
 * @returns {boolean} True if column is price-related
 */
export function isPriceColumn(columnName) {
  if (!columnName) return false;

  const priceKeywords = [
    "price",
    "amount",
    "cost",
    "value",
    "total",
    "subtotal",
    "tax",
    "discount",
    "rate",
    "unit_price",
    "unit_price_with_tax",
    "line_total",
    "grand_total",
    "net_amount",
    "gross_amount",
    "mrp",
  ];

  const lowerColumnName = columnName.toLowerCase();
  return priceKeywords.some((keyword) => lowerColumnName.includes(keyword));
}

/**
 * Gets CSS classes for table cells based on column type
 * @param {string} columnName - Column name or header
 * @returns {string} CSS class string
 */
export function getColumnAlignment(columnName) {
  if (!columnName) return "text-left";

  const lowerColumnName = columnName.toLowerCase();

  // Price-related columns should be right-aligned
  const priceKeywords = [
    "price",
    "amount",
    "cost",
    "value",
    "total",
    "subtotal",
    "tax",
    "discount",
    "rate",
    "unit_price",
    "unit_price_with_tax",
    "line_total",
    "grand_total",
    "net_amount",
    "gross_amount",
    "mrp",
  ];

  if (priceKeywords.some((keyword) => lowerColumnName.includes(keyword))) {
    return "text-right";
  }

  // Action columns should be center-aligned
  const actionKeywords = [
    "action",
    "actions",
    "edit",
    "delete",
    "view",
    "manage",
  ];

  if (actionKeywords.some((keyword) => lowerColumnName.includes(keyword))) {
    return "text-center";
  }

  // Default to left alignment for everything else
  return "text-left";
}
