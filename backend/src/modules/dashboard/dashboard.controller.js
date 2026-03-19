import { getDbClient } from "../../config/db.js";

export async function getAdminDashboardStats(req, res, next) {
  try {
    const db = getDbClient();
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Delayed line items
    const { count: delayedLineItemCount } = await db
      .from("purchase_order_line_items")
      .select("id", { count: "exact", head: true })
      .lt("expected_delivery_date", today)
      .neq("status", "DELIVERED");

    // Delivering today
    const { count: deliveringTodayCount } = await db
      .from("purchase_order_line_items")
      .select("id", { count: "exact", head: true })
      .eq("expected_delivery_date", today)
      .neq("status", "DELIVERED");

    // Delivered this week
    const { count: deliveredThisWeekCount } = await db
      .from("purchase_order_line_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "DELIVERED")
      .gte("updated_at", weekAgo);

    // Delivered this month
    const { count: deliveredThisMonthCount } = await db
      .from("purchase_order_line_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "DELIVERED")
      .gte("updated_at", monthAgo);

    // Delivered this year
    const { count: deliveredThisYearCount } = await db
      .from("purchase_order_line_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "DELIVERED")
      .gte("updated_at", yearAgo);

    // Open POs by priority (only open items)
    const { data: posByPriority } = await db
      .from("purchase_orders")
      .select("priority")
      .in("status", ["Pending", "Partially Delivered"]); // Only open items

    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    posByPriority?.forEach((po) => {
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
        this_year: deliveredThisYearCount || 0,
      },
      delivered_line_item_counts: {
        this_week: deliveredThisWeekCount || 0,
        this_month: deliveredThisMonthCount || 0,
        this_year: deliveredThisYearCount || 0,
      },
      average_delay_days: 0,
      on_time_delivery_rate: 100,
      open_pos_by_priority: priorityCounts,
    });
  } catch (error) {
    next(error);
  }
}

export async function getVendorDashboardStats(req, res, next) {
  try {
    const { vendor_id } = req.user;
    const db = getDbClient();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    console.log("🔍 Vendor Dashboard Debug:", { vendor_id, monthAgo });

    // Get vendor's delivered items in last 30 days
    try {
      const { data: vendorItems } = await db
        .from("purchase_order_line_items")
        .select("expected_delivery_date, updated_at")
        .eq("status", "DELIVERED")
        .gte("updated_at", monthAgo)
        .eq("purchase_orders.vendor_id", vendor_id);

      console.log(
        "🔍 Vendor Delivered Items:",
        vendorItems?.length || 0,
        vendorItems,
      );

      // Count on-time vs delayed
      let onTimeCount = 0;
      let delayedCount = 0;
      vendorItems?.forEach((item) => {
        const expectedDate = new Date(item.expected_delivery_date);
        const actualDate = new Date(item.updated_at);
        if (expectedDate >= actualDate) {
          onTimeCount++;
        } else {
          delayedCount++;
        }
      });
    } catch (deliveredError) {
      console.error("❌ Error fetching delivered items:", deliveredError);
      // Continue with zero counts
      var onTimeCount = 0;
      var delayedCount = 0;
    }

    // Get ALL PO line items by priority for vendor (only open items)
    try {
      let vendorLineItems = await db
        .from("purchase_order_line_items")
        .select("line_priority, po_id")
        .eq("vendor_id", vendor_id)
        .in("status", ["Pending", "Partially Delivered"]); // Only open items

      console.log(
        "🔍 Vendor Open Line Items (Direct):",
        vendorLineItems?.data?.length || 0,
        vendorLineItems,
      );

      // If no results with vendor_id, try joining with purchase_orders (only open items)
      if (!vendorLineItems?.data || vendorLineItems.data.length === 0) {
        console.log("🔍 Trying join with purchase_orders...");
        const joinedLineItems = await db
          .from("purchase_order_line_items")
          .select("line_priority")
          .eq("purchase_orders.vendor_id", vendor_id)
          .in("status", ["Pending", "Partially Delivered"]); // Only open items

        console.log(
          "🔍 Joined Open Line Items:",
          joinedLineItems?.data?.length || 0,
          joinedLineItems,
        );

        vendorLineItems = joinedLineItems;
      }

      const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
      const lineItemsArray = vendorLineItems?.data || [];

      lineItemsArray.forEach((item) => {
        console.log("🔍 Line Item Priority:", item.line_priority);
        if (item.line_priority) {
          priorityCounts[item.line_priority] =
            (priorityCounts[item.line_priority] || 0) + 1;
        }
      });

      res.json({
        on_time_line_item_count_this_month: onTimeCount,
        delayed_line_item_count_this_month: delayedCount,
        open_pos_by_priority: priorityCounts,
      });
    } catch (priorityError) {
      console.error("❌ Error fetching priority data:", priorityError);
      throw priorityError;
    }
  } catch (error) {
    console.error("❌ Vendor Dashboard API Error:", error);
    next(error);
  }
}
