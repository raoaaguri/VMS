import * as poRepository from "./po.repository.js";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../../utils/httpErrors.js";
import { query, transaction } from "../../config/db.js";

export async function getAllPos(filters = {}, limit = null, offset = null) {
  return await poRepository.findAll(filters, limit, offset);
}

export async function getPoById(id) {
  const po = await poRepository.findById(id);
  if (!po) throw new NotFoundError("Purchase order not found");

  const lineItems = await poRepository.findLineItems(id);

  return {
    ...po,
    line_items: lineItems,
  };
}

export async function createPo(poData, lineItemsData) {
  const existingPo = await poRepository.findByPoNumber(poData.po_number);

  if (existingPo) {
    throw new BadRequestError("PO number already exists");
  }

  const po = await poRepository.create({
    ...poData,
    status: "Issued",
  });

  const lineItems = lineItemsData.map((item) => ({
    ...item,
    po_id: po.id,
    status: "CREATED",
  }));

  await poRepository.createLineItems(lineItems);

  return await getPoById(po.id);
}

export async function updatePoPriority(id, priority, user) {
  const po = await poRepository.findById(id);

  if (!po) throw new NotFoundError("Purchase order not found");

  if (po.status === "Fully Delivered") {
    throw new BadRequestError("Cannot update priority of delivered PO");
  }

  const oldPriority = po.priority;
  const updatedPo = await poRepository.update(id, { priority });

  if (oldPriority !== priority && user) {
    await poRepository.createPoHistory({
      po_id: id,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: "PRIORITY_CHANGE",
      field_name: "priority",
      old_value: oldPriority,
      new_value: priority,
    });
  }

  return updatedPo;
}

export async function updatePoStatus(id, status, user) {
  const po = await poRepository.findById(id);

  if (!po) throw new NotFoundError("Purchase order not found");

  const oldStatus = po.status;
  const updatedPo = await poRepository.update(id, { status });

  if (oldStatus !== status && user) {
    await poRepository.createPoHistory({
      po_id: id,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: "STATUS_CHANGE",
      field_name: "status",
      old_value: oldStatus,
      new_value: status,
    });
  }

  return updatedPo;
}

export async function acceptPo(id, user) {
  const po = await poRepository.findById(id);

  if (!po) throw new NotFoundError("Purchase order not found");

  if (po.status !== "Pending") {
    throw new BadRequestError("PO can only be accepted when in Pending status");
  }

  // Update only vendor status when vendor accepts PO
  await poRepository.update(id, {
    vendor_status: "acknowledged",
  });

  if (user) {
    await poRepository.createPoHistory({
      po_id: id,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: "VENDOR_ACCEPT",
      field_name: "vendor_status",
      old_value: null,
      new_value: "acknowledged",
    });
  }

  return await getPoById(id);
}

export async function updateLineItemExpectedDate(
  poId,
  lineItemId,
  expectedDeliveryDate,
  user,
) {
  const lineItem = await poRepository.findLineItemById(lineItemId);

  if (!lineItem) throw new NotFoundError("Line item not found");

  if (lineItem.po_id !== poId) {
    throw new BadRequestError("Line item does not belong to this PO");
  }

  // Check vendor ownership if this is a vendor request
  if (user && user.role === "VENDOR") {
    if (!user.vendor_id) {
      throw new ForbiddenError(
        "Your user account is not associated with a vendor",
      );
    }

    const po = await poRepository.findById(poId);
    if (!po) throw new NotFoundError("Purchase order not found");

    if (!po.vendor_id) {
      throw new BadRequestError(
        "This purchase order is not associated with a vendor",
      );
    }

    // Compare UUIDs as strings (normalize whitespace)
    if (String(po.vendor_id).trim() !== String(user.vendor_id).trim()) {
      throw new ForbiddenError(
        "You do not have permission to update this line item",
      );
    }
  }

  if (lineItem.status === "DELIVERED") {
    throw new BadRequestError(
      "Cannot update expected date for delivered line item",
    );
  }

  const oldDate = lineItem.expected_delivery_date;
  const updatedItem = await poRepository.updateLineItem(lineItemId, {
    expected_delivery_date: expectedDeliveryDate,
  });

  if (oldDate !== expectedDeliveryDate && user) {
    await poRepository.createLineItemHistory({
      po_id: poId,
      line_item_id: lineItemId,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: "DATE_CHANGE",
      field_name: "expected_delivery_date",
      old_value: oldDate,
      new_value: expectedDeliveryDate,
    });
  }

  return updatedItem;
}

export async function updateLineItemStatus(poId, lineItemId, status, user) {
  const lineItem = await poRepository.findLineItemById(lineItemId);

  if (!lineItem) throw new NotFoundError("Line item not found");

  if (lineItem.po_id !== poId) {
    throw new BadRequestError("Line item does not belong to this PO");
  }

  // Check vendor ownership if this is a vendor request
  if (user && user.role === "VENDOR") {
    if (!user.vendor_id) {
      throw new ForbiddenError(
        "Your user account is not associated with a vendor",
      );
    }

    const po = await poRepository.findById(poId);
    if (!po) throw new NotFoundError("Purchase order not found");

    if (!po.vendor_id) {
      throw new BadRequestError(
        "This purchase order is not associated with a vendor",
      );
    }

    // Compare UUIDs as strings (normalize whitespace)
    if (String(po.vendor_id).trim() !== String(user.vendor_id).trim()) {
      throw new ForbiddenError(
        "You do not have permission to update this line item",
      );
    }
  }

  const statusProgression = ["CREATED", "ACCEPTED", "PLANNED", "DELIVERED"];
  const currentIndex = statusProgression.indexOf(lineItem.status);
  const newIndex = statusProgression.indexOf(status);

  if (newIndex < currentIndex) {
    throw new BadRequestError("Cannot move line item to a previous status");
  }

  const oldStatus = lineItem.status;
  await poRepository.updateLineItem(lineItemId, { status });

  if (oldStatus !== status && user) {
    await poRepository.createLineItemHistory({
      po_id: poId,
      line_item_id: lineItemId,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: "STATUS_CHANGE",
      field_name: "status",
      old_value: oldStatus,
      new_value: status,
    });
  }

  const totalCount = await poRepository.countTotalLineItems(poId);
  const deliveredCount = await poRepository.countLineItemsByStatus(
    poId,
    "DELIVERED",
  );

  if (deliveredCount === totalCount) {
    await poRepository.update(poId, { status: "Fully Delivered" });
  }

  return await poRepository.findLineItemById(lineItemId);
}

export async function updateLineItemPriority(poId, lineItemId, priority, user) {
  const lineItem = await poRepository.findLineItemById(lineItemId);

  if (!lineItem) throw new NotFoundError("Line item not found");

  if (lineItem.po_id !== poId) {
    throw new BadRequestError("Line item does not belong to this PO");
  }

  if (lineItem.status === "DELIVERED") {
    throw new BadRequestError("Cannot update priority for delivered line item");
  }

  const oldPriority = lineItem.line_priority;
  const updatedItem = await poRepository.updateLineItem(lineItemId, {
    line_priority: priority,
  });

  if (oldPriority !== priority && user) {
    await poRepository.createLineItemHistory({
      po_id: poId,
      line_item_id: lineItemId,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: "PRIORITY_CHANGE",
      field_name: "line_priority",
      old_value: oldPriority,
      new_value: priority,
    });
  }

  return updatedItem;
}

export async function updatePoClosure(id, closureData, user) {
  const po = await poRepository.findById(id);

  if (!po) throw new NotFoundError("Purchase order not found");

  if (closureData.closed_amount && closureData.closed_amount < 0) {
    throw new BadRequestError("Closed amount cannot be negative");
  }

  const oldClosureStatus = po.closure_status;
  const oldClosedAmount = po.closed_amount;

  const updatedPo = await poRepository.update(id, {
    closure_status: closureData.closure_status,
    closed_amount: closureData.closed_amount,
    closed_amount_currency: "INR",
  });

  if (oldClosureStatus !== closureData.closure_status) {
    await poRepository.createPoHistory({
      po_id: id,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: "CLOSURE_CHANGE",
      field_name: "closure_status",
      old_value: oldClosureStatus,
      new_value: closureData.closure_status,
    });
  }

  if (oldClosedAmount !== closureData.closed_amount) {
    await poRepository.createPoHistory({
      po_id: id,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: "CLOSURE_CHANGE",
      field_name: "closed_amount",
      old_value: String(oldClosedAmount || 0),
      new_value: String(closureData.closed_amount),
    });
  }

  return updatedPo;
}

export async function getPoHistory(poId) {
  const po = await poRepository.findById(poId);

  if (!po) throw new NotFoundError("Purchase order not found");

  return await poRepository.getPoHistory(poId);
}

export async function getAllHistory(filters = {}, limit = null, offset = null) {
  return await poRepository.getAllHistory(filters, limit, offset);
}

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function quoteIdentifier(identifier) {
  const escaped = String(identifier).replace(/"/g, '""');
  return `"${escaped}"`;
}

function parseCsv(text) {
  const input = String(text ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = input[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    if (ch === "\r") {
      continue;
    }

    field += ch;
  }

  row.push(field);
  rows.push(row);

  // Drop trailing empty row
  while (rows.length > 0) {
    const last = rows[rows.length - 1];
    const isEmpty = last.every((v) => String(v || "").trim() === "");
    if (isEmpty) rows.pop();
    else break;
  }

  return rows;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isUuid(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

export async function importPoLineItemsFromCsv(poId, csvText, user) {
  if (!csvText || String(csvText).trim().length === 0) {
    throw new BadRequestError("CSV text is required");
  }

  const po = await poRepository.findById(poId);
  if (!po) throw new NotFoundError("Purchase order not found");

  if (po.status === "Fully Delivered") {
    throw new BadRequestError("Cannot import line items for delivered PO");
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new BadRequestError(
      "CSV must include a header row and at least one data row",
    );
  }

  const headerRow = rows[0];
  const normalizedHeaders = headerRow.map(normalizeHeader);

  const dbColumns = await query(
    `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'purchase_order_line_items'
    `,
  );

  if (!dbColumns || dbColumns.length === 0) {
    throw new BadRequestError(
      "Unable to read DB schema for purchase_order_line_items",
    );
  }

  const excludedNormalized = new Set(["id", "created_at", "updated_at"]);

  const dbByNormalized = new Map();
  const dbTypeByActual = new Map();

  for (const col of dbColumns) {
    const normalized = normalizeHeader(col.column_name);
    if (excludedNormalized.has(normalized)) continue;
    if (!dbByNormalized.has(normalized)) {
      dbByNormalized.set(normalized, col.column_name);
    }
    dbTypeByActual.set(
      col.column_name,
      String(col.data_type || "").toLowerCase(),
    );
  }

  const csvIndexByActualDbCol = new Map();
  normalizedHeaders.forEach((h, idx) => {
    if (h === "po_id") return; // always derived from URL
    const actual = dbByNormalized.get(h);
    if (actual && !csvIndexByActualDbCol.has(actual)) {
      csvIndexByActualDbCol.set(actual, idx);
    }
  });

  const requiredNormalized = [
    "product_code",
    "product_name",
    "quantity",
    "gst_percent",
    "price",
    "mrp",
    "line_priority",
  ];

  const missingDbCols = requiredNormalized.filter(
    (c) => !dbByNormalized.has(c),
  );
  if (missingDbCols.length > 0) {
    throw new BadRequestError(
      `DB table is missing required columns: ${missingDbCols.join(", ")}`,
    );
  }

  const missingCsvCols = requiredNormalized.filter((c) => {
    const actual = dbByNormalized.get(c);
    return !actual || !csvIndexByActualDbCol.has(actual);
  });
  if (missingCsvCols.length > 0) {
    throw new BadRequestError(
      `Missing required columns in CSV header: ${missingCsvCols.join(", ")}`,
    );
  }

  const insertCols = ["po_id", ...Array.from(csvIndexByActualDbCol.keys())];

  const allowedPriorities = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
  const allowedStatuses = new Set([
    "CREATED",
    "ACCEPTED",
    "PLANNED",
    "DELIVERED",
  ]);

  const errors = [];
  const toInsert = [];

  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r];
    const rowNumber = r + 1; // 1-based for humans, includes header

    // Skip completely empty rows
    const isEmpty = raw.every((v) => String(v || "").trim() === "");
    if (isEmpty) continue;

    const record = { po_id: poId };

    for (const actualCol of csvIndexByActualDbCol.keys()) {
      const idx = csvIndexByActualDbCol.get(actualCol);
      const rawVal = idx === undefined ? "" : raw[idx];
      const dataType = dbTypeByActual.get(actualCol) || "";
      const s = String(rawVal ?? "").trim();

      if (!s) {
        record[actualCol] = null;
        continue;
      }

      if (
        dataType.includes("int") ||
        dataType === "numeric" ||
        dataType === "decimal" ||
        dataType === "real" ||
        dataType === "double precision"
      ) {
        record[actualCol] = toNumber(s);
      } else if (dataType === "boolean") {
        const v = s.toLowerCase();
        record[actualCol] = v === "true" || v === "1" || v === "yes";
      } else {
        record[actualCol] = s;
      }
    }

    // Required field validation (by normalized names)
    const productCodeCol = dbByNormalized.get("product_code");
    const productNameCol = dbByNormalized.get("product_name");
    const quantityCol = dbByNormalized.get("quantity");
    const gstPercentCol = dbByNormalized.get("gst_percent");
    const priceCol = dbByNormalized.get("price");
    const mrpCol = dbByNormalized.get("mrp");
    const priorityCol = dbByNormalized.get("line_priority");

    const product_code = String(record[productCodeCol] || "").trim();
    const product_name = String(record[productNameCol] || "").trim();
    const quantity = record[quantityCol];
    const gst_percent = record[gstPercentCol];
    const price = record[priceCol];
    const mrp = record[mrpCol];
    const line_priority = String(record[priorityCol] || "")
      .trim()
      .toUpperCase();

    if (!product_code) {
      errors.push({ row: rowNumber, message: "product_code is required" });
      continue;
    }
    if (!product_name) {
      errors.push({ row: rowNumber, message: "product_name is required" });
      continue;
    }
    if (quantity === null || quantity === undefined || Number(quantity) <= 0) {
      errors.push({ row: rowNumber, message: "quantity must be a number > 0" });
      continue;
    }
    if (
      gst_percent === null ||
      gst_percent === undefined ||
      Number(gst_percent) < 0
    ) {
      errors.push({
        row: rowNumber,
        message: "gst_percent must be a number >= 0",
      });
      continue;
    }
    if (price === null || price === undefined || Number(price) < 0) {
      errors.push({ row: rowNumber, message: "price must be a number >= 0" });
      continue;
    }
    if (mrp === null || mrp === undefined || Number(mrp) < 0) {
      errors.push({ row: rowNumber, message: "mrp must be a number >= 0" });
      continue;
    }
    if (!allowedPriorities.has(line_priority)) {
      errors.push({
        row: rowNumber,
        message: "line_priority must be one of LOW, MEDIUM, HIGH, URGENT",
      });
      continue;
    }

    record[priorityCol] = line_priority;

    const statusCol = dbByNormalized.get("status");
    if (statusCol && csvIndexByActualDbCol.has(statusCol)) {
      const status = String(record[statusCol] || "")
        .trim()
        .toUpperCase();
      if (!allowedStatuses.has(status)) {
        errors.push({
          row: rowNumber,
          message:
            "status must be one of CREATED, ACCEPTED, PLANNED, DELIVERED",
        });
        continue;
      }
      record[statusCol] = status;
    }

    toInsert.push(record);
  }

  if (toInsert.length === 0) {
    return {
      inserted_count: 0,
      failed_count: errors.length,
      errors,
    };
  }

  const chunkSize = 500;
  const inserted = await transaction(async (client) => {
    let totalInserted = 0;

    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);

      const cols = insertCols;
      const values = [];
      const placeholders = chunk
        .map((row, rowIdx) => {
          const rowPlaceholders = cols
            .map((col, colIdx) => {
              values.push(row[col] ?? null);
              return `$${rowIdx * cols.length + colIdx + 1}`;
            })
            .join(", ");
          return `(${rowPlaceholders})`;
        })
        .join(", ");

      const sql = `INSERT INTO purchase_order_line_items (${cols
        .map(quoteIdentifier)
        .join(", ")}) VALUES ${placeholders}`;

      await client.query(sql, values);
      totalInserted += chunk.length;
    }

    return totalInserted;
  });

  return {
    inserted_count: inserted,
    failed_count: errors.length,
    errors,
  };
}

export async function importPosFromCsv(csvText, user) {
  if (!csvText || String(csvText).trim().length === 0) {
    throw new BadRequestError("CSV text is required");
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new BadRequestError(
      "CSV must include a header row and at least one data row",
    );
  }

  const headerRow = rows[0];
  const normalizedHeaders = headerRow.map(normalizeHeader);

  const vendorCodeIdx = normalizedHeaders.indexOf("vendor_code");

  const dbColumns = await query(
    `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'purchase_orders'
    `,
  );

  if (!dbColumns || dbColumns.length === 0) {
    throw new BadRequestError("Unable to read DB schema for purchase_orders");
  }

  const excludedNormalized = new Set(["id", "created_at", "updated_at"]);

  const dbByNormalized = new Map();
  const dbTypeByActual = new Map();

  for (const col of dbColumns) {
    const normalized = normalizeHeader(col.column_name);
    if (excludedNormalized.has(normalized)) continue;
    if (!dbByNormalized.has(normalized)) {
      dbByNormalized.set(normalized, col.column_name);
    }
    dbTypeByActual.set(
      col.column_name,
      String(col.data_type || "").toLowerCase(),
    );
  }

  const csvIndexByActualDbCol = new Map();
  normalizedHeaders.forEach((h, idx) => {
    const actual = dbByNormalized.get(h);
    if (actual && !csvIndexByActualDbCol.has(actual)) {
      csvIndexByActualDbCol.set(actual, idx);
    }
  });

  const requiredNormalized = ["po_number", "po_date", "priority", "type"];
  const missingDbCols = requiredNormalized.filter(
    (c) => !dbByNormalized.has(c),
  );
  if (missingDbCols.length > 0) {
    throw new BadRequestError(
      `DB table is missing required columns: ${missingDbCols.join(", ")}`,
    );
  }

  const missingCsvCols = requiredNormalized.filter((c) => {
    const actual = dbByNormalized.get(c);
    return !actual || !csvIndexByActualDbCol.has(actual);
  });
  if (missingCsvCols.length > 0) {
    throw new BadRequestError(
      `Missing required columns in CSV header: ${missingCsvCols.join(", ")}`,
    );
  }

  const vendorIdCol = dbByNormalized.get("vendor_id");
  if (!vendorIdCol) {
    throw new BadRequestError("DB table is missing required column: vendor_id");
  }

  const hasVendorIdInCsv = csvIndexByActualDbCol.has(vendorIdCol);
  const hasVendorCodeInCsv = vendorCodeIdx >= 0;
  if (!hasVendorIdInCsv && !hasVendorCodeInCsv) {
    throw new BadRequestError(
      "CSV must include either vendor_id or vendor_code column",
    );
  }

  const insertBase = [
    dbByNormalized.get("po_number"),
    dbByNormalized.get("po_date"),
    dbByNormalized.get("priority"),
    dbByNormalized.get("type"),
    vendorIdCol,
  ].filter(Boolean);

  const extraCols = Array.from(csvIndexByActualDbCol.keys()).filter(
    (c) => !insertBase.includes(c),
  );
  const insertCols = [...insertBase, ...extraCols];

  const foreignKeys = await query(
    `
      SELECT
        kcu.column_name AS column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'purchase_orders'
    `,
  );

  const fkByColumn = new Map();
  for (const fk of foreignKeys || []) {
    if (!fk?.column_name || !fk?.foreign_table_name || !fk?.foreign_column_name)
      continue;
    fkByColumn.set(fk.column_name, {
      table: fk.foreign_table_name,
      column: fk.foreign_column_name,
    });
  }

  const allowedPriorities = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
  const allowedTypes = new Set(["NEW_ITEMS", "REPEAT"]);
  const allowedStatuses = new Set([
    "CREATED",
    "ACCEPTED",
    "PLANNED",
    "DELIVERED",
  ]);
  const allowedClosureStatuses = new Set([
    "OPEN",
    "PARTIALLY_CLOSED",
    "CLOSED",
  ]);

  // Build vendor_code -> vendor_id map (if needed)
  const vendorCodeToId = new Map();
  if (hasVendorCodeInCsv) {
    const codes = new Set();
    for (let r = 1; r < rows.length; r++) {
      const raw = rows[r];
      const s = String(raw?.[vendorCodeIdx] ?? "").trim();
      if (s) codes.add(s);
    }

    const codeList = Array.from(codes);
    const chunkSize = 500;
    for (let i = 0; i < codeList.length; i += chunkSize) {
      const chunk = codeList.slice(i, i + chunkSize);
      const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(", ");
      const vendorRows = await query(
        `SELECT id, code FROM vendors WHERE code IN (${placeholders})`,
        chunk,
      );
      for (const v of vendorRows) {
        vendorCodeToId.set(String(v.code).trim(), v.id);
      }
    }
  }

  const referencedValuesByFkColumn = new Map();
  for (const col of insertCols) {
    if (!fkByColumn.has(col)) continue;
    referencedValuesByFkColumn.set(col, new Set());
  }

  for (const [col, values] of referencedValuesByFkColumn.entries()) {
    const idx = csvIndexByActualDbCol.get(col);
    if (idx === undefined) continue;

    for (let r = 1; r < rows.length; r++) {
      const raw = rows[r];
      const s = String(raw?.[idx] ?? "").trim();
      if (!s) continue;
      values.add(s);
    }
  }

  const vendorIdsFromCode = new Set(
    Array.from(vendorCodeToId.values()).map((v) => String(v).trim()),
  );
  const vendorIdsToValidate = new Set([
    ...vendorIdsFromCode,
    ...Array.from(referencedValuesByFkColumn.get(vendorIdCol) || []).map((v) =>
      String(v).trim(),
    ),
  ]);
  referencedValuesByFkColumn.set(vendorIdCol, vendorIdsToValidate);

  const existingReferencedValuesByFkColumn = new Map();
  for (const [fkCol, values] of referencedValuesByFkColumn.entries()) {
    const fk = fkByColumn.get(fkCol);
    if (!fk) continue;

    const colType = dbTypeByActual.get(fkCol) || "";
    const candidates = Array.from(values).filter((v) => {
      if (colType === "uuid") return isUuid(v);
      return true;
    });

    const existing = new Set();
    const chunkSize = 500;
    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(", ");
      const sql = `SELECT ${quoteIdentifier(fk.column)} AS v FROM ${quoteIdentifier(
        fk.table,
      )} WHERE ${quoteIdentifier(fk.column)} IN (${placeholders})`;
      const rowsFound = await query(sql, chunk);
      for (const row of rowsFound || []) {
        if (row?.v != null) existing.add(String(row.v).trim());
      }
    }

    existingReferencedValuesByFkColumn.set(fkCol, existing);
  }

  // Existing po_numbers to detect duplicates up front
  const poNumberCol = dbByNormalized.get("po_number");
  const poNumberIdx = csvIndexByActualDbCol.get(poNumberCol);
  const csvPoNumbers = new Set();
  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r];
    const s = String(raw?.[poNumberIdx] ?? "").trim();
    if (s) csvPoNumbers.add(s);
  }

  const existingPoNumbers = new Set();
  const poList = Array.from(csvPoNumbers);
  const poChunkSize = 500;
  for (let i = 0; i < poList.length; i += poChunkSize) {
    const chunk = poList.slice(i, i + poChunkSize);
    const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(", ");
    const existing = await query(
      `SELECT po_number FROM purchase_orders WHERE po_number IN (${placeholders})`,
      chunk,
    );
    for (const row of existing) {
      existingPoNumbers.add(String(row.po_number).trim());
    }
  }

  const errors = [];
  const toInsert = [];
  const seenInFile = new Set();

  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r];
    const rowNumber = r + 1;

    const isEmpty = raw.every((v) => String(v || "").trim() === "");
    if (isEmpty) continue;

    const record = {};

    for (const actualCol of csvIndexByActualDbCol.keys()) {
      const idx = csvIndexByActualDbCol.get(actualCol);
      const rawVal = idx === undefined ? "" : raw[idx];
      const dataType = dbTypeByActual.get(actualCol) || "";
      const s = String(rawVal ?? "").trim();

      if (!s) {
        record[actualCol] = null;
        continue;
      }

      if (
        dataType.includes("int") ||
        dataType === "numeric" ||
        dataType === "decimal" ||
        dataType === "real" ||
        dataType === "double precision"
      ) {
        record[actualCol] = toNumber(s);
      } else if (dataType === "boolean") {
        const v = s.toLowerCase();
        record[actualCol] = v === "true" || v === "1" || v === "yes";
      } else {
        record[actualCol] = s;
      }
    }

    const po_number = String(record[poNumberCol] || "").trim();
    if (!po_number) {
      errors.push({ row: rowNumber, message: "po_number is required" });
      continue;
    }

    if (seenInFile.has(po_number)) {
      errors.push({ row: rowNumber, message: "Duplicate po_number in CSV" });
      continue;
    }
    seenInFile.add(po_number);

    if (existingPoNumbers.has(po_number)) {
      errors.push({
        row: rowNumber,
        message: "Duplicate po_number already exists",
      });
      continue;
    }

    const poDateCol = dbByNormalized.get("po_date");
    const priorityCol = dbByNormalized.get("priority");
    const typeCol = dbByNormalized.get("type");
    const statusCol = dbByNormalized.get("status");
    const closureStatusCol = dbByNormalized.get("closure_status");

    const po_date = String(record[poDateCol] || "").trim();
    if (!po_date) {
      errors.push({ row: rowNumber, message: "po_date is required" });
      continue;
    }

    const priority = String(record[priorityCol] || "")
      .trim()
      .toUpperCase();
    if (!allowedPriorities.has(priority)) {
      errors.push({
        row: rowNumber,
        message: "priority must be one of LOW, MEDIUM, HIGH, URGENT",
      });
      continue;
    }
    record[priorityCol] = priority;

    const type = String(record[typeCol] || "")
      .trim()
      .toUpperCase();
    if (!allowedTypes.has(type)) {
      errors.push({
        row: rowNumber,
        message: "type must be one of NEW_ITEMS, REPEAT",
      });
      continue;
    }
    record[typeCol] = type;

    // Vendor mapping
    let vendor_id = String(record[vendorIdCol] || "").trim();
    if (!vendor_id && hasVendorCodeInCsv) {
      const vendor_code = String(raw?.[vendorCodeIdx] ?? "").trim();
      if (!vendor_code) {
        errors.push({ row: rowNumber, message: "vendor_code is required" });
        continue;
      }
      vendor_id = vendorCodeToId.get(vendor_code) || "";
      if (!vendor_id) {
        errors.push({
          row: rowNumber,
          message: `Unknown vendor_code: ${vendor_code}`,
        });
        continue;
      }
    }

    if (!vendor_id) {
      errors.push({ row: rowNumber, message: "vendor_id is required" });
      continue;
    }

    if (dbTypeByActual.get(vendorIdCol) === "uuid" && !isUuid(vendor_id)) {
      errors.push({
        row: rowNumber,
        message: "vendor_id must be a valid UUID",
      });
      continue;
    }

    const existingVendors = existingReferencedValuesByFkColumn.get(vendorIdCol);
    if (existingVendors && !existingVendors.has(String(vendor_id).trim())) {
      errors.push({
        row: rowNumber,
        message: `Unknown vendor_id: ${vendor_id}`,
      });
      continue;
    }

    record[vendorIdCol] = vendor_id;

    let foreignKeysValid = true;
    for (const [
      fkCol,
      existingSet,
    ] of existingReferencedValuesByFkColumn.entries()) {
      if (fkCol === vendorIdCol) continue;
      if (!insertCols.includes(fkCol)) continue;

      const fk = fkByColumn.get(fkCol);
      const val = record[fkCol];
      if (val == null || String(val).trim() === "") continue;

      const fkType = dbTypeByActual.get(fkCol) || "";
      if (fkType === "uuid" && !isUuid(val)) {
        errors.push({
          row: rowNumber,
          message: `${normalizeHeader(fkCol)} must be a valid UUID`,
        });
        foreignKeysValid = false;
        break;
      }

      if (existingSet && !existingSet.has(String(val).trim())) {
        const target = fk ? `${fk.table}.${fk.column}` : "referenced table";
        errors.push({
          row: rowNumber,
          message: `Foreign key not found for ${normalizeHeader(fkCol)} in ${target}`,
        });
        foreignKeysValid = false;
        break;
      }
    }

    if (!foreignKeysValid) {
      continue;
    }

    // Defaults + validation
    if (statusCol) {
      const status = String(record[statusCol] || "CREATED")
        .trim()
        .toUpperCase();
      if (!allowedStatuses.has(status)) {
        errors.push({
          row: rowNumber,
          message:
            "status must be one of CREATED, ACCEPTED, PLANNED, DELIVERED",
        });
        continue;
      }
      record[statusCol] = status;
    }

    if (closureStatusCol && record[closureStatusCol] != null) {
      const cs = String(record[closureStatusCol] || "")
        .trim()
        .toUpperCase();
      if (cs && !allowedClosureStatuses.has(cs)) {
        errors.push({
          row: rowNumber,
          message:
            "closure_status must be one of OPEN, PARTIALLY_CLOSED, CLOSED",
        });
        continue;
      }
      if (cs) record[closureStatusCol] = cs;
    }

    // Ensure record has all insert columns
    const stable = {};
    for (const c of insertCols) {
      stable[c] = record[c] ?? null;
    }

    toInsert.push(stable);
  }

  if (toInsert.length === 0) {
    return {
      inserted_count: 0,
      failed_count: errors.length,
      errors,
    };
  }

  const chunkSize = 200;
  const inserted = await transaction(async (client) => {
    let totalInserted = 0;

    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const cols = insertCols;
      const values = [];

      const placeholders = chunk
        .map((row, rowIdx) => {
          const rowPlaceholders = cols
            .map((col, colIdx) => {
              values.push(row[col] ?? null);
              return `$${rowIdx * cols.length + colIdx + 1}`;
            })
            .join(", ");
          return `(${rowPlaceholders})`;
        })
        .join(", ");

      const sql = `INSERT INTO purchase_orders (${cols
        .map(quoteIdentifier)
        .join(
          ", ",
        )}) VALUES ${placeholders} ON CONFLICT (po_number) DO NOTHING`;

      const result = await client.query(sql, values);
      totalInserted += result.rowCount || 0;
    }

    return totalInserted;
  });

  return {
    inserted_count: inserted,
    failed_count: errors.length,
    errors,
  };
}
