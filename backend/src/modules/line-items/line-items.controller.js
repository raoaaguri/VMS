import { query } from "../../config/db.js";

export async function getAdminLineItems(req, res, next) {
  try {
    const { status, priority, vendor_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const params = [];
    let paramNum = 1;
    const conditions = [];

    const today = new Date().toISOString().split("T")[0];

    // Apply vendor filter
    if (vendor_id && vendor_id !== "ALL") {
      conditions.push(`po.vendor_id = $${paramNum++}`);
      params.push(vendor_id);
    }

    // Apply status filter
    if (status && status !== "ALL") {
      if (status === "DELAYED") {
        conditions.push(`poli.expected_delivery_date < $${paramNum++}`);
        params.push(today);
        conditions.push(`poli.status != $${paramNum++}`);
        params.push("DELIVERED");
      } else {
        conditions.push(`poli.status = $${paramNum++}`);
        params.push(status);
      }
    }

    // Apply priority filter
    if (priority && priority !== "ALL") {
      conditions.push(`poli.line_priority = $${paramNum++}`);
      params.push(priority);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countSql = `
      SELECT COUNT(*) as count 
      FROM purchase_order_line_items poli 
      JOIN purchase_orders po ON poli.po_id = po.id
      ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult[0]?.count || 0);

    // FIX: Calculate pagination parameter indices based on current params array length
    // This ensures LIMIT and OFFSET reference correct parameter positions
    const paginationStartIndex = params.length + 1;

    // Get items with pagination
    const itemsSql = `
      SELECT 
        poli.id,
        poli.po_id,
        po.po_number,
        v.name as vendor_name,
        poli.product_code,
        poli.product_name,
        poli.quantity,
        poli.line_priority,
        poli.expected_delivery_date,
        poli.status,
        CASE 
          WHEN poli.expected_delivery_date < CURRENT_DATE AND poli.status != 'DELIVERED' THEN true
          ELSE false
        END as is_delayed
      FROM purchase_order_line_items poli
      JOIN purchase_orders po ON poli.po_id = po.id
      JOIN vendors v ON po.vendor_id = v.id
      ${whereClause}
      ORDER BY poli.expected_delivery_date ASC, poli.line_priority DESC
      LIMIT $${paginationStartIndex} OFFSET $${paginationStartIndex + 1}
    `;

    params.push(limit, offset);

    const items = await query(itemsSql, params);

    res.json({
      items: items || [],
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
    });
  } catch (error) {
    next(error);
  }
}

export async function getVendorLineItems(req, res, next) {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    const { vendor_id } = req.user;
    const offset = (page - 1) * limit;

    const params = [];
    let paramNum = 1;
    const conditions = [];

    const today = new Date().toISOString().split("T")[0];

    // Always filter by vendor
    conditions.push(`po.vendor_id = $${paramNum++}`);
    params.push(vendor_id);

    // Apply status filter
    if (status && status !== "ALL") {
      if (status === "DELAYED") {
        conditions.push(`poli.expected_delivery_date < $${paramNum++}`);
        params.push(today);
        conditions.push(`poli.status != $${paramNum++}`);
        params.push("DELIVERED");
      } else {
        conditions.push(`poli.status = $${paramNum++}`);
        params.push(status);
      }
    }

    // Apply priority filter
    if (priority && priority !== "ALL") {
      conditions.push(`poli.line_priority = $${paramNum++}`);
      params.push(priority);
    }

    const whereClause = ` WHERE ${conditions.join(" AND ")}`;

    // Get total count
    const countSql = `
      SELECT COUNT(*) as count 
      FROM purchase_order_line_items poli
      JOIN purchase_orders po ON poli.po_id = po.id
      ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult[0]?.count || 0);

    // FIX: Calculate pagination parameter indices based on current params array length
    // This ensures LIMIT and OFFSET reference correct parameter positions
    const paginationStartIndex = params.length + 1;

    // Get items with pagination
    const itemsSql = `
      SELECT 
        poli.id,
        poli.po_id,
        po.po_number,
        poli.product_code,
        poli.product_name,
        poli.quantity,
        poli.line_priority,
        poli.expected_delivery_date,
        poli.status
      FROM purchase_order_line_items poli
      JOIN purchase_orders po ON poli.po_id = po.id
      ${whereClause}
      ORDER BY poli.expected_delivery_date ASC, poli.line_priority DESC
      LIMIT $${paginationStartIndex} OFFSET $${paginationStartIndex + 1}
    `;

    params.push(limit, offset);

    const items = await query(itemsSql, params);

    res.json({
      items: items || [],
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
    });
  } catch (error) {
    next(error);
  }
}
