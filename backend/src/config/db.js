import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabaseClient = null;

export function getDbClient() {
  if (!supabaseClient) {
    const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
    supabaseClient = createClient(
      config.supabase.url,
      key,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return supabaseClient;
}

export async function query(sql, params = []) {
  const client = getDbClient();

  const { data, error } = await client.rpc('exec_sql', {
    query: sql,
    params: params
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function transaction(callback) {
  const client = getDbClient();

  try {
    const result = await callback(client);
    return result;
  } catch (error) {
    throw error;
  }
}
