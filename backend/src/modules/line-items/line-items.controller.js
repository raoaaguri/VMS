import { getDbClient } from '../../config/db.js';

export async function getAdminLineItems(req, res, next) {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const db = getDbClient();

    // Build base query
    let query = db
      .from('purchase_order_line_items')
      .select(`
        id,
        po_id,
        product_code,
        product_name,
        quantity,
        line_priority,
        expected_delivery_date,
        status,
        purchase_orders!inner(po_number, vendor_id, vendors!inner(name))
      `)
      .order('expected_delivery_date', { ascending: true })
      .order('line_priority', { ascending: false });

    // Apply status filter
    if (status && status !== 'ALL') {
      if (status === 'DELAYED') {
        query = query.lt('expected_delivery_date', new Date().toISOString().split('T')[0]);
        query = query.neq('status', 'DELIVERED');
      } else {
        query = query.eq('status', status);
      }
    }

    // Apply priority filter
    if (priority && priority !== 'ALL') {
      query = query.eq('line_priority', priority);
    }

    // Get total count
    const { count } = await db
      .from('purchase_order_line_items')
      .select('id', { count: 'exact', head: true });

    // Apply pagination
    const { data: items, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      items: items || [],
      page: parseInt(page),
      limit: parseInt(limit),
      total: count || 0
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

    const db = getDbClient();

    // Build base query
    let query = db
      .from('purchase_order_line_items')
      .select(`
        id,
        po_id,
        product_code,
        product_name,
        quantity,
        line_priority,
        expected_delivery_date,
        status,
        purchase_orders!inner(po_number, vendor_id)
      `)
      .eq('purchase_orders.vendor_id', vendor_id)
      .order('expected_delivery_date', { ascending: true })
      .order('line_priority', { ascending: false });

    // Apply status filter
    if (status && status !== 'ALL') {
      if (status === 'DELAYED') {
        query = query.lt('expected_delivery_date', new Date().toISOString().split('T')[0]);
        query = query.neq('status', 'DELIVERED');
      } else {
        query = query.eq('status', status);
      }
    }

    // Apply priority filter
    if (priority && priority !== 'ALL') {
      query = query.eq('line_priority', priority);
    }

    const { data: items, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      items: items || [],
      page: parseInt(page),
      limit: parseInt(limit),
      total: count || 0
    });
  } catch (error) {
    next(error);
  }
}
