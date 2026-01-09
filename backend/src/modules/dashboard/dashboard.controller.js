import pool from '../../config/db.js';

export async function getAdminDashboardStats(req, res, next) {
  try {
    const statsQuery = `
      WITH delayed_line_items AS (
        SELECT poli.id, poli.po_id
        FROM purchase_order_line_items poli
        WHERE poli.status != 'DELIVERED'
        AND poli.expected_delivery_date < CURRENT_DATE
      ),
      delayed_pos AS (
        SELECT DISTINCT po_id FROM delayed_line_items
      ),
      delivering_today_items AS (
        SELECT poli.po_id
        FROM purchase_order_line_items poli
        WHERE poli.status != 'DELIVERED'
        AND poli.expected_delivery_date = CURRENT_DATE
      ),
      delivering_today_pos AS (
        SELECT DISTINCT po_id FROM delivering_today_items
      )
      SELECT
        (SELECT COUNT(*) FROM delayed_pos) as delayed_po_count,
        (SELECT COUNT(*) FROM delivering_today_pos) as delivering_today_po_count,
        (SELECT COUNT(*) FROM delayed_line_items) as delayed_line_item_count,
        (SELECT COUNT(*) FROM delivering_today_items) as delivering_today_line_item_count,
        (SELECT COUNT(DISTINCT po_id) FROM purchase_order_line_items WHERE status = 'DELIVERED' AND updated_at >= CURRENT_DATE - INTERVAL '7 days') as delivered_this_week,
        (SELECT COUNT(DISTINCT po_id) FROM purchase_order_line_items WHERE status = 'DELIVERED' AND updated_at >= CURRENT_DATE - INTERVAL '30 days') as delivered_this_month,
        (SELECT COUNT(DISTINCT po_id) FROM purchase_order_line_items WHERE status = 'DELIVERED' AND updated_at >= CURRENT_DATE - INTERVAL '365 days') as delivered_this_year,
        (SELECT COUNT(*) FROM purchase_order_line_items WHERE status = 'DELIVERED' AND updated_at >= CURRENT_DATE - INTERVAL '7 days') as line_items_delivered_this_week,
        (SELECT COUNT(*) FROM purchase_order_line_items WHERE status = 'DELIVERED' AND updated_at >= CURRENT_DATE - INTERVAL '30 days') as line_items_delivered_this_month,
        (SELECT COUNT(*) FROM purchase_order_line_items WHERE status = 'DELIVERED' AND updated_at >= CURRENT_DATE - INTERVAL '365 days') as line_items_delivered_this_year
    `;

    const priorityQuery = `
      SELECT
        priority,
        COUNT(*) as count
      FROM purchase_orders
      WHERE status != 'DELIVERED'
      GROUP BY priority
    `;

    const [statsResult, priorityResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(priorityQuery)
    ]);

    const stats = statsResult.rows[0];
    const priorityCounts = priorityResult.rows.reduce((acc, row) => {
      acc[row.priority] = parseInt(row.count);
      return acc;
    }, { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 });

    res.json({
      delayed_po_count: parseInt(stats.delayed_po_count || 0),
      delivering_today_po_count: parseInt(stats.delivering_today_po_count || 0),
      delayed_line_item_count: parseInt(stats.delayed_line_item_count || 0),
      delivering_today_line_item_count: parseInt(stats.delivering_today_line_item_count || 0),
      delivered_po_counts: {
        this_week: parseInt(stats.delivered_this_week || 0),
        this_month: parseInt(stats.delivered_this_month || 0),
        this_year: parseInt(stats.delivered_this_year || 0)
      },
      delivered_line_item_counts: {
        this_week: parseInt(stats.line_items_delivered_this_week || 0),
        this_month: parseInt(stats.line_items_delivered_this_month || 0),
        this_year: parseInt(stats.line_items_delivered_this_year || 0)
      },
      average_delay_days: 0,
      on_time_delivery_rate: 100,
      open_pos_by_priority: priorityCounts
    });
  } catch (error) {
    next(error);
  }
}

export async function getVendorDashboardStats(req, res, next) {
  try {
    const { vendor_id } = req.user;

    const statsQuery = `
      WITH vendor_line_items AS (
        SELECT poli.*
        FROM purchase_order_line_items poli
        JOIN purchase_orders po ON po.id = poli.po_id
        WHERE po.vendor_id = $1
        AND poli.updated_at >= CURRENT_DATE - INTERVAL '30 days'
        AND poli.status = 'DELIVERED'
      )
      SELECT
        COUNT(*) FILTER (WHERE expected_delivery_date >= updated_at::date) as on_time_count,
        COUNT(*) FILTER (WHERE expected_delivery_date < updated_at::date) as delayed_count
      FROM vendor_line_items
    `;

    const priorityQuery = `
      SELECT
        po.priority,
        COUNT(*) as count
      FROM purchase_orders po
      WHERE po.vendor_id = $1
      AND po.status != 'DELIVERED'
      GROUP BY po.priority
    `;

    const [statsResult, priorityResult] = await Promise.all([
      pool.query(statsQuery, [vendor_id]),
      pool.query(priorityQuery, [vendor_id])
    ]);

    const stats = statsResult.rows[0];
    const priorityCounts = priorityResult.rows.reduce((acc, row) => {
      acc[row.priority] = parseInt(row.count);
      return acc;
    }, { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 });

    res.json({
      on_time_line_item_count_this_month: parseInt(stats.on_time_count || 0),
      delayed_line_item_count_this_month: parseInt(stats.delayed_count || 0),
      open_pos_by_priority: priorityCounts
    });
  } catch (error) {
    next(error);
  }
}
