import { getDbClient, query, queryOne } from "../../config/db.js";

export async function findAll(filters = {}, limit = null, offset = null) {
  let sql = `
    SELECT 
      po.*,
      jsonb_build_object(
        'id', v.id,
        'name', v.name,
        'code', v.code,
        'contact_person', v.contact_person,
        'contact_email', v.contact_email
      ) as vendor,
      (SELECT COUNT(*) FROM purchase_order_line_items WHERE po_id = po.id) as line_items_count
    FROM purchase_orders po
    LEFT JOIN vendors v ON po.vendor_id = v.id
  `;

  // Build count query for total
  let countSql = `
    SELECT COUNT(*) as total
    FROM purchase_orders po
    LEFT JOIN vendors v ON po.vendor_id = v.id
  `;

  const params = [];
  const conditions = [];
  let paramNum = 1;
  let whereParamCount = 0; // Track WHERE clause parameters

  if (filters.vendor_id) {
    conditions.push(`po.vendor_id = $${paramNum++}`);
    params.push(filters.vendor_id);
    whereParamCount++;
  }

  if (filters.status) {
    // Ensure status is always an array
    const statusArray = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    const validStatuses = statusArray.filter((s) => s && s.length > 0);

    if (validStatuses.length === 1) {
      conditions.push(`po.status = $${paramNum++}`);
      params.push(validStatuses[0]);
      whereParamCount++;
    } else if (validStatuses.length > 1) {
      const statusParams = validStatuses.map(() => `$${paramNum++}`);
      conditions.push(`po.status IN (${statusParams.join(", ")})`);
      params.push(...validStatuses);
      whereParamCount += validStatuses.length;
    }
  }

  if (filters.priority) {
    conditions.push(`po.priority = $${paramNum++}`);
    params.push(filters.priority);
    whereParamCount++;
  }

  if (filters.type) {
    conditions.push(`po.type = $${paramNum++}`);
    params.push(filters.type);
    whereParamCount++;
  }

  if (filters.created_after) {
    conditions.push(`po.po_date >= $${paramNum++}`);
    params.push(filters.created_after);
    whereParamCount++;
  }

  if (conditions.length > 0) {
    const whereClause = ` WHERE ${conditions.join(" AND ")}`;
    sql += whereClause;
    countSql += whereClause;
  }

  sql += ` ORDER BY po.created_at DESC`;

  // Add pagination if provided
  if (limit !== null) {
    sql += ` LIMIT $${paramNum++}`;
    params.push(limit);
  }

  if (offset !== null) {
    sql += ` OFFSET $${paramNum++}`;
    params.push(offset);
  }

  // Execute both queries
  const [data, countResult] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, whereParamCount)), // Use only WHERE clause parameters for count
  ]);

  const total = parseInt(countResult[0]?.total || "0");

  return {
    items: data,
    total: total,
    page:
      offset !== null && limit !== null ? Math.floor(offset / limit) + 1 : 1,
    totalPages: limit !== null ? Math.ceil(total / limit) : 1,
  };
}

export async function findById(id) {
  const sql = `
    SELECT 
      po.*,
      jsonb_build_object(
        'id', v.id,
        'name', v.name,
        'code', v.code,
        'contact_person', v.contact_person,
        'contact_email', v.contact_email,
        'contact_phone', v.contact_phone,
        'address', v.address,
        'gst_number', v.gst_number
      ) as vendor
    FROM purchase_orders po
    LEFT JOIN vendors v ON po.vendor_id = v.id
    WHERE po.id = $1
  `;

  return await queryOne(sql, [id]);
}

export async function findByPoNumber(poNumber) {
  const db = getDbClient();

  const { data, error } = await db
    .from("purchase_orders")
    .select("*")
    .eq("po_number", poNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(poData) {
  const db = getDbClient();

  const { data, error } = await db
    .from("purchase_orders")
    .insert(poData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function update(id, poData) {
  const db = getDbClient();

  const updateData = {
    ...poData,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("purchase_orders")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findLineItems(poId) {
  const sql = `
    SELECT 
      id,
      po_id,
      product_code,
      product_name,
      quantity,
      gst_percent,
      price,
      mrp,
      line_priority,
      expected_delivery_date,
      status,
      design_code,
      combination_code,
      style,
      sub_style,
      region,
      color,
      sub_color,
      polish,
      size,
      weight,
      received_qty,
      created_at,
      order_rate,
      landing_cost,
      hsn_sac_code,
      order_amount,
      item_code,
      order_no,
      item_name,
      category,
      updated_at
    FROM purchase_order_line_items
    WHERE po_id = $1
    ORDER BY created_at ASC
  `;

  const data = await query(sql, [poId]);
  return data;
}

export async function findLineItemById(id) {
  const sql = `
    SELECT 
      id,
      po_id,
      product_code,
      product_name,
      quantity,
      gst_percent,
      price,
      mrp,
      line_priority,
      expected_delivery_date,
      status,
      design_code,
      combination_code,
      style,
      sub_style,
      region,
      color,
      sub_color,
      polish,
      size,
      weight,
      received_qty,
      created_at,
      updated_at
    FROM purchase_order_line_items
    WHERE id = $1
  `;

  const data = await queryOne(sql, [id]);
  return data;
}

export async function createLineItem(lineItemData) {
  const db = getDbClient();

  const { data, error } = await db
    .from("purchase_order_line_items")
    .insert(lineItemData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createLineItems(lineItemsData) {
  const db = getDbClient();

  const { data, error } = await db
    .from("purchase_order_line_items")
    .insert(lineItemsData)
    .select();

  if (error) throw error;
  return data;
}

export async function updateLineItem(id, lineItemData) {
  const db = getDbClient();

  const updateData = {
    ...lineItemData,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("purchase_order_line_items")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function countLineItemsByStatus(poId, status) {
  const db = getDbClient();

  const { count, error } = await db
    .from("purchase_order_line_items")
    .select("*", { count: "exact", head: true })
    .eq("po_id", poId)
    .eq("status", status);

  if (error) throw error;
  return count;
}

export async function countTotalLineItems(poId) {
  const db = getDbClient();

  const { count, error } = await db
    .from("purchase_order_line_items")
    .select("*", { count: "exact", head: true })
    .eq("po_id", poId);

  if (error) throw error;
  return count;
}

export async function createPoHistory(historyData) {
  const db = getDbClient();

  const { data, error } = await db
    .from("po_history")
    .insert(historyData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createLineItemHistory(historyData) {
  const db = getDbClient();

  const { data, error } = await db
    .from("po_line_item_history")
    .insert(historyData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPoHistory(poId) {
  const poHistorySql = `
    SELECT 
      ph.*,
      jsonb_build_object('name', u.name, 'email', u.email) as users
    FROM po_history ph
    LEFT JOIN users u ON ph.changed_by_user_id = u.id
    WHERE ph.po_id = $1
    ORDER BY ph.changed_at DESC
  `;

  const lineItemHistorySql = `
    SELECT 
      lih.*,
      jsonb_build_object('name', u.name, 'email', u.email) as users,
      jsonb_build_object(
        'product_code', poli.product_code,
        'product_name', poli.product_name
      ) as purchase_order_line_items
    FROM po_line_item_history lih
    LEFT JOIN users u ON lih.changed_by_user_id = u.id
    LEFT JOIN purchase_order_line_items poli ON lih.line_item_id = poli.id
    WHERE lih.po_id = $1
    ORDER BY lih.changed_at DESC
  `;

  const [poHistoryData, lineItemHistoryData] = await Promise.all([
    query(poHistorySql, [poId]),
    query(lineItemHistorySql, [poId]),
  ]);

  const poHistory = poHistoryData.map((h) => ({
    ...h,
    level: "PO",
    line_item_reference: null,
  }));

  const lineItemHistory = lineItemHistoryData.map((h) => ({
    ...h,
    level: "LINE_ITEM",
    line_item_reference: h.purchase_order_line_items
      ? `${h.purchase_order_line_items.product_code} - ${h.purchase_order_line_items.product_name}`
      : "Unknown Item",
  }));

  const allHistory = [...poHistory, ...lineItemHistory].sort(
    (a, b) => new Date(b.changed_at) - new Date(a.changed_at),
  );

  return allHistory;
}

export async function getAllHistory(filters = {}, limit = null, offset = null) {
  const params = [];
  let paramNum = 1;

  const whereClause = filters.vendor_id
    ? ` WHERE po.vendor_id = $${paramNum++}`
    : "";

  if (filters.vendor_id) {
    params.push(filters.vendor_id);
  }

  const poHistorySql = `
    SELECT 
      ph.*,
      po.po_number,
      po.vendor_id,
      v.name as vendor_name,
      jsonb_build_object('name', u.name, 'email', u.email) as users
    FROM po_history ph
    LEFT JOIN purchase_orders po ON ph.po_id = po.id
    LEFT JOIN vendors v ON po.vendor_id = v.id
    LEFT JOIN users u ON ph.changed_by_user_id = u.id
    ${whereClause}
    ORDER BY ph.changed_at DESC
  `;

  const lineItemHistorySql = `
    SELECT 
      lih.*,
      po.po_number,
      po.vendor_id,
      v.name as vendor_name,
      poli.po_id,
      poli.product_code,
      poli.product_name,
      jsonb_build_object('name', u.name, 'email', u.email) as users
    FROM po_line_item_history lih
    LEFT JOIN purchase_order_line_items poli ON lih.line_item_id = poli.id
    LEFT JOIN purchase_orders po ON lih.po_id = po.id
    LEFT JOIN vendors v ON po.vendor_id = v.id
    LEFT JOIN users u ON lih.changed_by_user_id = u.id
    ${whereClause}
    ORDER BY lih.changed_at DESC
  `;

  const [poHistoryData, lineItemHistoryData] = await Promise.all([
    query(poHistorySql, params),
    query(lineItemHistorySql, params),
  ]);

  const poHistory = poHistoryData.map((h) => ({
    ...h,
    level: "PO",
    changed_by_name: h.users?.name || "Unknown",
    changed_by_role: h.users?.email?.includes("@") ? "Admin" : "System",
    line_item_reference: null,
  }));

  const lineItemHistory = lineItemHistoryData.map((h) => ({
    ...h,
    level: "LINE_ITEM",
    changed_by_name: h.users?.name || "Unknown",
    changed_by_role: h.users?.email?.includes("@") ? "Admin" : "System",
    line_item_reference:
      h.product_code && h.product_name
        ? `${h.product_code} - ${h.product_name}`
        : "Unknown Item",
  }));

  const allHistory = [...poHistory, ...lineItemHistory].sort(
    (a, b) => new Date(b.changed_at) - new Date(a.changed_at),
  );

  // Apply pagination if needed
  const total = allHistory.length;
  const items =
    limit !== null
      ? allHistory.slice(offset || 0, (offset || 0) + limit)
      : allHistory;

  return {
    items: items,
    total: total,
    page:
      offset !== null && limit !== null ? Math.floor(offset / limit) + 1 : 1,
    totalPages: limit !== null ? Math.ceil(total / limit) : 1,
  };
}
