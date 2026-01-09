import { getDbClient } from '../../config/db.js';

export async function findAll(filters = {}) {
  const db = getDbClient();
  let query = db
    .from('purchase_orders')
    .select(`
      *,
      vendors (
        id,
        name,
        code,
        contact_person,
        contact_email
      )
    `)
    .order('created_at', { ascending: false });

  if (filters.vendor_id) {
    query = query.eq('vendor_id', filters.vendor_id);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }

  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function findById(id) {
  const db = getDbClient();

  const { data, error } = await db
    .from('purchase_orders')
    .select(`
      *,
      vendors (
        id,
        name,
        code,
        contact_person,
        contact_email,
        contact_phone,
        address,
        gst_number
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByPoNumber(poNumber) {
  const db = getDbClient();

  const { data, error } = await db
    .from('purchase_orders')
    .select('*')
    .eq('po_number', poNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(poData) {
  const db = getDbClient();

  const { data, error } = await db
    .from('purchase_orders')
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
    updated_at: new Date().toISOString()
  };

  const { data, error } = await db
    .from('purchase_orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findLineItems(poId) {
  const db = getDbClient();

  const { data, error } = await db
    .from('purchase_order_line_items')
    .select('*')
    .eq('po_id', poId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function findLineItemById(id) {
  const db = getDbClient();

  const { data, error } = await db
    .from('purchase_order_line_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createLineItem(lineItemData) {
  const db = getDbClient();

  const { data, error } = await db
    .from('purchase_order_line_items')
    .insert(lineItemData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createLineItems(lineItemsData) {
  const db = getDbClient();

  const { data, error } = await db
    .from('purchase_order_line_items')
    .insert(lineItemsData)
    .select();

  if (error) throw error;
  return data;
}

export async function updateLineItem(id, lineItemData) {
  const db = getDbClient();

  const updateData = {
    ...lineItemData,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await db
    .from('purchase_order_line_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function countLineItemsByStatus(poId, status) {
  const db = getDbClient();

  const { count, error } = await db
    .from('purchase_order_line_items')
    .select('*', { count: 'exact', head: true })
    .eq('po_id', poId)
    .eq('status', status);

  if (error) throw error;
  return count;
}

export async function countTotalLineItems(poId) {
  const db = getDbClient();

  const { count, error } = await db
    .from('purchase_order_line_items')
    .select('*', { count: 'exact', head: true })
    .eq('po_id', poId);

  if (error) throw error;
  return count;
}

export async function createPoHistory(historyData) {
  const db = getDbClient();

  const { data, error } = await db
    .from('po_history')
    .insert(historyData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createLineItemHistory(historyData) {
  const db = getDbClient();

  const { data, error } = await db
    .from('po_line_item_history')
    .insert(historyData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPoHistory(poId) {
  const db = getDbClient();

  const [poHistoryResult, lineItemHistoryResult] = await Promise.all([
    db
      .from('po_history')
      .select(`
        *,
        users:changed_by_user_id (
          name,
          email
        )
      `)
      .eq('po_id', poId)
      .order('changed_at', { ascending: false }),
    db
      .from('po_line_item_history')
      .select(`
        *,
        users:changed_by_user_id (
          name,
          email
        ),
        purchase_order_line_items:line_item_id (
          product_code,
          product_name
        )
      `)
      .eq('po_id', poId)
      .order('changed_at', { ascending: false })
  ]);

  if (poHistoryResult.error) throw poHistoryResult.error;
  if (lineItemHistoryResult.error) throw lineItemHistoryResult.error;

  const poHistory = poHistoryResult.data.map(h => ({
    ...h,
    level: 'PO',
    line_item_reference: null
  }));

  const lineItemHistory = lineItemHistoryResult.data.map(h => ({
    ...h,
    level: 'LINE_ITEM',
    line_item_reference: h.purchase_order_line_items
      ? `${h.purchase_order_line_items.product_code} - ${h.purchase_order_line_items.product_name}`
      : 'Unknown Item'
  }));

  const allHistory = [...poHistory, ...lineItemHistory].sort(
    (a, b) => new Date(b.changed_at) - new Date(a.changed_at)
  );

  return allHistory;
}

export async function getAllHistory(filters = {}) {
  const db = getDbClient();

  let poHistoryQuery = db
    .from('po_history')
    .select(`
      *,
      users:changed_by_user_id (
        name,
        email
      ),
      purchase_orders:po_id (
        po_number,
        vendor_id,
        vendors:vendor_id (
          name
        )
      )
    `)
    .order('changed_at', { ascending: false });

  let lineItemHistoryQuery = db
    .from('po_line_item_history')
    .select(`
      *,
      users:changed_by_user_id (
        name,
        email
      ),
      purchase_order_line_items:line_item_id (
        product_code,
        product_name,
        po_id
      ),
      purchase_orders!inner(
        po_number,
        vendor_id,
        vendors:vendor_id (
          name
        )
      )
    `)
    .order('changed_at', { ascending: false });

  if (filters.vendor_id) {
    poHistoryQuery = poHistoryQuery.eq('purchase_orders.vendor_id', filters.vendor_id);
    lineItemHistoryQuery = lineItemHistoryQuery.eq('purchase_orders.vendor_id', filters.vendor_id);
  }

  const [poHistoryResult, lineItemHistoryResult] = await Promise.all([
    poHistoryQuery,
    lineItemHistoryQuery
  ]);

  if (poHistoryResult.error) throw poHistoryResult.error;
  if (lineItemHistoryResult.error) throw lineItemHistoryResult.error;

  const poHistory = poHistoryResult.data.map(h => ({
    ...h,
    level: 'PO',
    po_number: h.purchase_orders?.po_number || 'Unknown',
    vendor_name: h.purchase_orders?.vendors?.name || 'Unknown',
    changed_by_name: h.users?.name || 'Unknown',
    line_item_reference: null
  }));

  const lineItemHistory = lineItemHistoryResult.data.map(h => ({
    ...h,
    level: 'LINE_ITEM',
    po_number: h.purchase_orders?.po_number || 'Unknown',
    vendor_name: h.purchase_orders?.vendors?.name || 'Unknown',
    po_id: h.purchase_order_line_items?.po_id,
    changed_by_name: h.users?.name || 'Unknown',
    line_item_reference: h.purchase_order_line_items
      ? `${h.purchase_order_line_items.product_code} - ${h.purchase_order_line_items.product_name}`
      : 'Unknown Item'
  }));

  const allHistory = [...poHistory, ...lineItemHistory].sort(
    (a, b) => new Date(b.changed_at) - new Date(a.changed_at)
  );

  return allHistory;
}
