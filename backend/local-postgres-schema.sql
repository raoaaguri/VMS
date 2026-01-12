-- Vendor Management System - Complete Schema for Local PostgreSQL
-- This is a clean version without Supabase-specific RLS policies

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  contact_person text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  address text,
  gst_number text,
  is_active boolean DEFAULT true,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'VENDOR')),
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  po_date date NOT NULL,
  priority text NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  type text NOT NULL CHECK (type IN ('NEW_ITEMS', 'REPEAT')),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED')),
  erp_reference_id text,
  closure_status text NOT NULL DEFAULT 'OPEN' CHECK (closure_status IN ('OPEN', 'PARTIALLY_CLOSED', 'CLOSED')),
  closed_amount numeric DEFAULT 0 CHECK (closed_amount >= 0),
  closed_amount_currency text DEFAULT 'INR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase_order_line_items table
CREATE TABLE IF NOT EXISTS purchase_order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_code text NOT NULL,
  product_name text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  gst_percent numeric NOT NULL CHECK (gst_percent >= 0),
  price numeric NOT NULL CHECK (price >= 0),
  mrp numeric NOT NULL CHECK (mrp >= 0),
  line_priority text NOT NULL CHECK (line_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  expected_delivery_date date,
  status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create po_history table
CREATE TABLE IF NOT EXISTS po_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  changed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role text NOT NULL,
  action_type text NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz DEFAULT now()
);

-- Create po_line_item_history table
CREATE TABLE IF NOT EXISTS po_line_item_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_item_id uuid NOT NULL REFERENCES purchase_order_line_items(id) ON DELETE CASCADE,
  changed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role text NOT NULL,
  action_type text NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_vendor_id ON users(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(code);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_items_po_id ON purchase_order_line_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_history_po_id ON po_history(po_id);
CREATE INDEX IF NOT EXISTS idx_po_history_changed_at ON po_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_po_line_item_history_po_id ON po_line_item_history(po_id);
CREATE INDEX IF NOT EXISTS idx_po_line_item_history_line_item_id ON po_line_item_history(line_item_id);
CREATE INDEX IF NOT EXISTS idx_po_line_item_history_changed_at ON po_line_item_history(changed_at);
