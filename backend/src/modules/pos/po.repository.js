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
