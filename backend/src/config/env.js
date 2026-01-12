import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,

  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'vendor-management-secret-key-change-in-production',
    expiresIn: '7d'
  },

  erp: {
    apiKey: process.env.ERP_API_KEY || 'erp-api-key-change-in-production'
  },

  postgres: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'vms',
    user: process.env.PGUSER || 'postgres',
    password: String(process.env.PGPASSWORD || 'postgres'),
    ssl: process.env.PGSSLMODE === 'require'
  }
};
