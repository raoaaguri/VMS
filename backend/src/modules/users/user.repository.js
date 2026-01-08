import { getDbClient } from '../../config/db.js';

export async function findById(id) {
  const db = getDbClient();

  const { data, error } = await db
    .from('users')
    .select('id, name, email, role, vendor_id, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByEmail(email) {
  const db = getDbClient();

  const { data, error } = await db
    .from('users')
    .select('id, name, email, password_hash, role, vendor_id, created_at, updated_at')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findAll() {
  const db = getDbClient();

  const { data, error } = await db
    .from('users')
    .select('id, name, email, role, vendor_id, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function create(userData) {
  const db = getDbClient();

  const { data, error } = await db
    .from('users')
    .insert(userData)
    .select('id, name, email, role, vendor_id, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function update(id, userData) {
  const db = getDbClient();

  const updateData = {
    ...userData,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await db
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select('id, name, email, role, vendor_id, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteById(id) {
  const db = getDbClient();

  const { error } = await db
    .from('users')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
