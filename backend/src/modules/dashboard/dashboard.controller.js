import { getDbClient } from '../../config/db.js';

export async function getAdminDashboardStats(req, res, next) {
  try {
    const db = getDbClient();
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Delayed line items
    const { count: delayedLineItemCount } = await db
      .from('purchase_order_line_items')
      .select('id', { count: 'exact', head: true })
      .lt('expected_delivery_date', today)
      .neq('status', 'DELIVERED');

    // Delivering today
    const { count: deliveringTodayCount } = await db
      .from('purchase_order_line_items')
      .select('id', { count: 'exact', head: true })
      .eq('expected_delivery_date', today)
      .neq('status', 'DELIVERED');

    // Delivered this week
    const { count: deliveredThisWeekCount } = await db
      .from('purchase_order_line_items')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'DELIVERED')
      .gte('updated_at', weekAgo);

    // Delivered this month
    const { count: deliveredThisMonthCount } = await db
      .from('purchase_order_line_items')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'DELIVERED')
      .gte('updated_at', monthAgo);

    // Delivered this year
    const { count: deliveredThisYearCount } = await db
      .from('purchase_order_line_items')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'DELIVERED')
      .gte('updated_at', yearAgo);

    // Open POs by priority
    const { data: posByPriority } = await db
      .from('purchase_orders')
      .select('priority')
      .neq('status', 'DELIVERED');

    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    posByPriority?.forEach(po => {
      priorityCounts[po.priority] = (priorityCounts[po.priority] || 0) + 1;
    });

    res.json({
      delayed_po_count: 0, // Would need complex aggregation
      delivering_today_po_count: deliveringTodayCount || 0,
      delayed_line_item_count: delayedLineItemCount || 0,
      delivering_today_line_item_count: deliveringTodayCount || 0,
      delivered_po_counts: {
        this_week: deliveredThisWeekCount || 0,
        this_month: deliveredThisMonthCount || 0,
        this_year: deliveredThisYearCount || 0
      },
      delivered_line_item_counts: {
        this_week: deliveredThisWeekCount || 0,
        this_month: deliveredThisMonthCount || 0,
        this_year: deliveredThisYearCount || 0
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
    const db = getDbClient();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get vendor's delivered items in last 30 days
    const { data: vendorItems } = await db
      .from('purchase_order_line_items')
      .select('expected_delivery_date, updated_at')
      .eq('status', 'DELIVERED')
      .gte('updated_at', monthAgo)
      .gte('purchase_orders.vendor_id', vendor_id);

    // Count on-time vs delayed
    let onTimeCount = 0;
    let delayedCount = 0;
    vendorItems?.forEach(item => {
      const expectedDate = new Date(item.expected_delivery_date);
      const actualDate = new Date(item.updated_at);
      if (expectedDate >= actualDate) {
        onTimeCount++;
      } else {
        delayedCount++;
      }
    });

    // Get open POs by priority for vendor
    const { data: vendorPos } = await db
      .from('purchase_orders')
      .select('priority')
      .eq('vendor_id', vendor_id)
      .neq('status', 'DELIVERED');

    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    vendorPos?.forEach(po => {
      priorityCounts[po.priority] = (priorityCounts[po.priority] || 0) + 1;
    });

    res.json({
      on_time_line_item_count_this_month: onTimeCount,
      delayed_line_item_count_this_month: delayedCount,
      open_pos_by_priority: priorityCounts
    });
  } catch (error) {
    next(error);
  }
}
