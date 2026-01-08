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
