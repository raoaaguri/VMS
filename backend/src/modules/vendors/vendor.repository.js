import { getDbClient } from '../../config/db.js';

export async function findAll() {
  const db = getDbClient();

  const { data, error } = await db
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function findById(id) {
  const db = getDbClient();

  const { data, error } = await db
    .from('vendors')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByCode(code) {
  const db = getDbClient();

  const { data, error } = await db
    .from('vendors')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(vendorData) {
  const db = getDbClient();

  const { data, error } = await db
    .from('vendors')
    .insert(vendorData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function update(id, vendorData) {
  const db = getDbClient();

  const updateData = {
    ...vendorData,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await db
    .from('vendors')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteById(id) {
  const db = getDbClient();

  const { error } = await db
    .from('vendors')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function generateNextVendorCode() {
  const db = getDbClient();

  const { data, error } = await db
    .from('vendors')
    .select('code')
    .like('code', 'KUS_VND_%')
    .not('code', 'is', null)
    .order('code', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNumber = 1;

  if (data && data.length > 0 && data[0].code) {
    const lastCode = data[0].code;
    const match = lastCode.match(/KUS_VND_(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const paddedNumber = String(nextNumber).padStart(5, '0');
  return `KUS_VND_${paddedNumber}`;
}

export async function approveVendor(vendorId, vendorCode) {
  const db = getDbClient();

  const { data, error } = await db
    .from('vendors')
    .update({
      status: 'ACTIVE',
      is_active: true,
      code: vendorCode,
      updated_at: new Date().toISOString()
    })
    .eq('id', vendorId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function rejectVendor(vendorId) {
  const db = getDbClient();

  const { data, error } = await db
    .from('vendors')
    .update({
      status: 'REJECTED',
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', vendorId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function activateVendorUsers(vendorId) {
  const db = getDbClient();

  const { error } = await db
    .from('users')
    .update({
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('vendor_id', vendorId);

  if (error) throw error;
}

export async function deactivateVendorUsers(vendorId) {
  const db = getDbClient();

  const { error } = await db
    .from('users')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('vendor_id', vendorId);

  if (error) throw error;
}
