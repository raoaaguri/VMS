import pool from '../../config/db.js';

export async function getAdminLineItems(req, res, next) {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];
    let paramCounter = 1;

    if (status && status !== 'ALL') {
      if (status === 'DELAYED') {
        whereClause += ` WHERE poli.status != 'DELIVERED' AND poli.expected_delivery_date < CURRENT_DATE`;
      } else {
        whereClause += ` WHERE poli.status = $${paramCounter}`;
        params.push(status);
        paramCounter++;
      }
    }

    if (priority && priority !== 'ALL') {
      if (whereClause) {
        whereClause += ` AND poli.line_priority = $${paramCounter}`;
      } else {
        whereClause += ` WHERE poli.line_priority = $${paramCounter}`;
      }
      params.push(priority);
      paramCounter++;
    }

    const query = `
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
          WHEN poli.status != 'DELIVERED' AND poli.expected_delivery_date < CURRENT_DATE THEN true
          ELSE false
        END as is_delayed
      FROM purchase_order_line_items poli
      JOIN purchase_orders po ON po.id = poli.po_id
      JOIN vendors v ON v.id = po.vendor_id
      ${whereClause}
      ORDER BY poli.expected_delivery_date ASC, poli.line_priority DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      items: result.rows,
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.rows.length
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

    let whereClause = 'WHERE po.vendor_id = $1';
    const params = [vendor_id];
    let paramCounter = 2;

    if (status && status !== 'ALL') {
      if (status === 'DELAYED') {
        whereClause += ` AND poli.status != 'DELIVERED' AND poli.expected_delivery_date < CURRENT_DATE`;
      } else {
        whereClause += ` AND poli.status = $${paramCounter}`;
        params.push(status);
        paramCounter++;
      }
    }

    if (priority && priority !== 'ALL') {
      whereClause += ` AND poli.line_priority = $${paramCounter}`;
      params.push(priority);
      paramCounter++;
    }

    const query = `
      SELECT
        poli.id,
        poli.po_id,
        po.po_number,
        poli.product_code,
        poli.product_name,
        poli.quantity,
        poli.line_priority,
        poli.expected_delivery_date,
        poli.status,
        CASE
          WHEN poli.status != 'DELIVERED' AND poli.expected_delivery_date < CURRENT_DATE THEN true
          ELSE false
        END as is_delayed
      FROM purchase_order_line_items poli
      JOIN purchase_orders po ON po.id = poli.po_id
      ${whereClause}
      ORDER BY poli.expected_delivery_date ASC, poli.line_priority DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      items: result.rows,
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.rows.length
    });
  } catch (error) {
    next(error);
  }
}
