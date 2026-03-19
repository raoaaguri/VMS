import { query } from "../../config/db.js";

export async function getAdminLineItems(req, res, next) {
  try {
    const {
      status,
      priority,
      vendor_id,
      start_date,
      end_date,
      items_name,
      page = 1,
      limit = 10,
    } = req.query;
    const offset = (page - 1) * limit;

    // Decode URL-encoded status parameter
    const decodedStatus = status ? decodeURIComponent(status) : status;

    const today = new Date().toISOString().split("T")[0];
    const params = [];
    let paramNum = 1;
    const conditions = [];

    // Apply date range filter if provided
    if (start_date && end_date) {
      conditions.push(`poli.created_at >= $${paramNum++}`);
      params.push(start_date);
      conditions.push(`poli.created_at <= $${paramNum++}`);
      params.push(end_date);
    } else {
      // Add 6-month filter by default only if no date range is specified
      const today = new Date().toISOString().split("T")[0];
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      conditions.push(`poli.created_at >= $${paramNum++}`);
      params.push(sixMonthsAgo.toISOString().split("T")[0]);
    }

    // Apply vendor filter
    if (vendor_id && vendor_id !== "ALL") {
      conditions.push(`po.vendor_id = $${paramNum++}`);
      params.push(vendor_id);
    }

    // Apply status filter
    if (decodedStatus && decodedStatus !== "ALL") {
      if (decodedStatus === "DELAYED") {
        conditions.push(`poli.expected_delivery_date < $${paramNum++}`);
        params.push(today);
        conditions.push(`poli.status != $${paramNum++}`);
        params.push("DELIVERED");
      } else {
        // Handle multiple status values (comma-separated or array)
        const statuses = Array.isArray(decodedStatus)
          ? decodedStatus
          : decodedStatus.includes(",")
            ? decodedStatus
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
            : [decodedStatus];

        if (statuses.length > 0) {
          const statusPlaceholders = statuses
            .map(() => `$${paramNum++}`)
            .join(",");
          conditions.push(`poli.status IN (${statusPlaceholders})`);
          params.push(...statuses);
        }
      }
    }

    // Apply priority filter
    if (priority && priority !== "ALL") {
      conditions.push(`poli.line_priority = $${paramNum++}`);
      params.push(priority);
    }

    // Apply items name filter
    if (items_name && items_name.trim() !== "") {
      conditions.push(`poli.product_name = $${paramNum++}`);
      params.push(items_name.trim());
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
        poli.category,
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
    const {
      status,
      priority,
      items_name,
      category,
      period,
      page = 1,
      limit = 50,
    } = req.query;
    const { vendor_id } = req.user;
    const offset = (page - 1) * limit;

    const params = [];
    let paramNum = 1;
    const conditions = [];

    const today = new Date().toISOString().split("T")[0];

    // Always filter by vendor
    conditions.push(`po.vendor_id = $${paramNum++}`);
    params.push(vendor_id);

    // Add default filter for open items only (when no status is specified)
    if (!status || status === "ALL") {
      conditions.push(`poli.status IN ($${paramNum++}, $${paramNum++})`);
      params.push("Pending", "Partially Delivered");
    }

    // Apply period filter
    if (period && period !== "ALL") {
      const now = new Date();
      let startDate, endDate;

      switch (period) {
        case "TODAY":
          startDate = today;
          endDate = today;
          break;
        case "THIS_WEEK":
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startDate = startOfWeek.toISOString().split("T")[0];
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endDate = endOfWeek.toISOString().split("T")[0];
          break;
        case "THIS_MONTH":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0];
          endDate = today;
          break;
        case "LAST_MONTH":
        case "last_month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            .toISOString()
            .split("T")[0];
          endDate = new Date(now.getFullYear(), now.getMonth(), 0)
            .toISOString()
            .split("T")[0];
          break;
        case "LAST_2_MONTHS":
        case "last_2_months":
          startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
            .toISOString()
            .split("T")[0];
          endDate = today;
          break;
        case "LAST_3_MONTHS":
        case "last_3_months":
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
            .toISOString()
            .split("T")[0];
          endDate = today;
          break;
        case "LAST_6_MONTHS":
        case "last_6_months":
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
            .toISOString()
            .split("T")[0];
          endDate = today;
          break;
        case "THIS_YEAR":
          startDate = new Date(now.getFullYear(), 0, 1)
            .toISOString()
            .split("T")[0];
          endDate = new Date(now.getFullYear(), 11, 31)
            .toISOString()
            .split("T")[0];
          break;
        case "LAST_YEAR":
          startDate = new Date(now.getFullYear() - 1, 0, 1)
            .toISOString()
            .split("T")[0];
          endDate = new Date(now.getFullYear() - 1, 11, 31)
            .toISOString()
            .split("T")[0];
          break;
        default:
          break;
      }

      if (startDate && endDate) {
        conditions.push(`poli.created_at >= $${paramNum++}`);
        params.push(startDate);
        conditions.push(`poli.created_at <= $${paramNum++}`);
        params.push(endDate);
      }
    }

    // Apply status filter
    if (status && status !== "ALL") {
      const decodedStatus = decodeURIComponent(status);
      if (decodedStatus === "DELAYED") {
        conditions.push(`poli.expected_delivery_date < $${paramNum++}`);
        params.push(today);
        conditions.push(`poli.status != $${paramNum++}`);
        params.push("DELIVERED");
      } else {
        // Handle multiple status values (comma-separated string from frontend)
        const statuses = decodedStatus.includes(",")
          ? decodedStatus
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          : [decodedStatus];

        if (statuses.length > 0) {
          const statusPlaceholders = statuses
            .map(() => `$${paramNum++}`)
            .join(",");
          conditions.push(`poli.status IN (${statusPlaceholders})`);
          params.push(...statuses);
        }
      }
    }

    // Apply priority filter
    if (priority && priority !== "ALL") {
      conditions.push(`poli.line_priority = $${paramNum++}`);
      params.push(priority);
    }

    // Apply items name filter
    if (items_name && items_name.trim() !== "") {
      conditions.push(`poli.product_name = $${paramNum++}`);
      params.push(items_name.trim());
    }

    // Apply category filter
    if (category && category !== "ALL") {
      conditions.push(`poli.category = $${paramNum++}`);
      params.push(category);
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
        poli.*,
        po.po_number as order_no,
        po.po_number
      FROM purchase_order_line_items poli
      JOIN purchase_orders po ON poli.po_id = po.id
      ${whereClause}
      ORDER BY poli.expected_delivery_date ASC, poli.line_priority DESC
      LIMIT $${paginationStartIndex} OFFSET $${paginationStartIndex + 1}
    `;

    params.push(limit, offset);

    const items = await query(itemsSql, params);

    // If detail_view is requested, return a structured "Virtual PO" response
    if (req.query.detail_view === "true") {
      const vendorResult = await query(
        "SELECT id, code, name, contact_person, contact_email, contact_phone FROM vendors WHERE id = $1",
        [vendor_id],
      );

      const vendor = vendorResult[0] || null;
      const priorityLabel = priority && priority !== "ALL" ? priority : "ALL";

      return res.json({
        id: `priority-${priorityLabel.toLowerCase()}`,
        po_number: `Priority: ${priorityLabel}`,
        po_date: new Date().toISOString(),
        status: "MULTI",
        type: "FILTERED_VIEW",
        priority: priorityLabel,
        vendor_id: vendor_id,
        vendor: vendor,
        line_items: items || [],
        is_virtual: true,
      });
    }

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
