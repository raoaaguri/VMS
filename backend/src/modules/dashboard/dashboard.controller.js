import { getDbClient } from "../../config/db.js";

export async function getAdminDashboardStats(req, res, next) {
  try {
    const db = getDbClient();
    const today = new Date().toISOString().split("T")[0];
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Get ALL POs (removed month filtering)
    const { data: allPOs } = await db
      .from("purchase_orders")
      .select("status, po_date, updated_at");

    // Calculate completed PO stats
    const completedPOs =
      allPOs?.filter((po) => po.status === "Fully Delivered") || [];
    const completedOnTimePOs = completedPOs.filter((po) => {
      const poDate = new Date(po.po_date);
      const deliveredDate = new Date(po.updated_at);
      const daysDiff = (deliveredDate - poDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 60;
    });
    const completedDelayedPOs = completedPOs.filter((po) => {
      const poDate = new Date(po.po_date);
      const deliveredDate = new Date(po.updated_at);
      const daysDiff = (deliveredDate - poDate) / (1000 * 60 * 60 * 24);
      return daysDiff > 60;
    });

    // Calculate pending PO stats
    const pendingPOs = allPOs?.filter((po) => po.status === "Pending") || [];
    const pendingAbove60POs = pendingPOs.filter(
      (po) => po.po_date < sixtyDaysAgo,
    );
    const pendingBelow60POs = pendingPOs.filter(
      (po) => po.po_date >= sixtyDaysAgo,
    );

    // Calculate on-time rate
    const totalCompletedPOs = completedPOs.length;
    const onTimeRate =
      totalCompletedPOs > 0
        ? ((completedOnTimePOs.length / totalCompletedPOs) * 100).toFixed(1)
        : "0.0";

    // Open POs by priority (only open line items)
    const { data: lineItemsByPriority } = await db
      .from("purchase_order_line_items")
      .select("line_priority")
      .in("status", ["Pending", "Partially Delivered"]); // Only open items

    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    lineItemsByPriority?.forEach((item) => {
      if (item.line_priority) {
        priorityCounts[item.line_priority] =
          (priorityCounts[item.line_priority] || 0) + 1;
      }
    });

    res.json({
      delayed_po_count: 0, // Would need complex aggregation
      delivering_today_po_count: 0,
      delayed_line_item_count: 0,
      delivering_today_line_item_count: 0,
      delivered_po_counts: {
        this_week: 0,
        this_month: 0,
        this_year: 0,
      },
      delivered_line_item_counts: {
        this_week: 0,
        this_month: 0,
        this_year: 0,
      },
      average_delay_days: 0,
      on_time_delivery_rate: parseFloat(onTimeRate),
      open_pos_by_priority: priorityCounts,
      // New fields
      completed_on_time_pos: completedOnTimePOs.length,
      completed_delayed_pos: completedDelayedPOs.length,
      pending_above_60_days_pos: pendingAbove60POs.length,
      pending_below_60_days_pos: pendingBelow60POs.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getVendorDashboardStats(req, res, next) {
  try {
    const { vendor_id } = req.user;
    const db = getDbClient();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    console.log("🔍 Vendor Dashboard Debug:", {
      vendor_id,
      sixtyDaysAgo,
    });

    // Get ALL vendor's POs (removed month filtering)
    const { data: vendorPOs } = await db
      .from("purchase_orders")
      .select("status, po_date, updated_at")
      .eq("vendor_id", vendor_id);

    console.log("🔍 Vendor POs Total:", vendorPOs?.length || 0, vendorPOs);

    // Calculate completed PO stats
    const completedPOs =
      vendorPOs?.filter((po) => po.status === "Fully Delivered") || [];
    const completedOnTimePOs = completedPOs.filter((po) => {
      const poDate = new Date(po.po_date);
      const deliveredDate = new Date(po.updated_at);
      const daysDiff = (deliveredDate - poDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 60;
    });
    const completedDelayedPOs = completedPOs.filter((po) => {
      const poDate = new Date(po.po_date);
      const deliveredDate = new Date(po.updated_at);
      const daysDiff = (deliveredDate - poDate) / (1000 * 60 * 60 * 24);
      return daysDiff > 60;
    });

    // Calculate pending PO stats
    const pendingPOs = vendorPOs?.filter((po) => po.status === "Pending") || [];
    const pendingAbove60POs = pendingPOs.filter(
      (po) => po.po_date < sixtyDaysAgo,
    );
    const pendingBelow60POs = pendingPOs.filter(
      (po) => po.po_date >= sixtyDaysAgo,
    );

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
        // New PO-based fields
        completed_on_time_pos: completedOnTimePOs.length,
        completed_delayed_pos: completedDelayedPOs.length,
        pending_above_60_days_pos: pendingAbove60POs.length,
        pending_below_60_days_pos: pendingBelow60POs.length,
        // Existing fields
        on_time_line_item_count: completedOnTimePOs.length, // Updated to match PO logic
        delayed_line_item_count: completedDelayedPOs.length, // Updated to match PO logic
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
