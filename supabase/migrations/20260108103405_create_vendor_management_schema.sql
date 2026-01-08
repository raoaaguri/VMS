/*
  # Vendor Management System - Database Schema
  
  ## Overview
  Complete schema for a vendor management system with purchase orders, designed to be Postgres-compatible for future migration.
  
  ## New Tables
  
  ### 1. vendors
  Stores vendor/supplier information
  - `id` (uuid, primary key)
  - `name` (text) - Vendor company name
  - `code` (text, unique) - Vendor code for reference
  - `contact_person` (text) - Primary contact name
  - `contact_email` (text) - Contact email
  - `contact_phone` (text) - Contact phone
  - `address` (text) - Vendor address
  - `gst_number` (text) - GST registration number
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. users
  Stores both admin and vendor users with role-based access
  - `id` (uuid, primary key)
  - `name` (text) - User full name
  - `email` (text, unique) - Login email
  - `password_hash` (text) - Hashed password
  - `role` (text) - 'ADMIN' or 'VENDOR'
  - `vendor_id` (uuid, nullable) - Links to vendors table for VENDOR role
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 3. purchase_orders
  Stores purchase orders from ERP system
  - `id` (uuid, primary key)
  - `po_number` (text, unique) - PO number from ERP
  - `po_date` (date) - PO creation date
  - `priority` (text) - 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  - `type` (text) - 'NEW_ITEMS' or 'REPEAT'
  - `vendor_id` (uuid) - Links to vendors table
  - `status` (text) - 'CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED'
  - `erp_reference_id` (text, nullable) - External ERP reference
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 4. purchase_order_line_items
  Stores line items for each purchase order
  - `id` (uuid, primary key)
  - `po_id` (uuid) - Links to purchase_orders
  - `product_code` (text) - Product identifier
  - `product_name` (text) - Product description
  - `quantity` (numeric) - Order quantity
  - `gst_percent` (numeric) - GST percentage
  - `price` (numeric) - Unit price
  - `mrp` (numeric) - Maximum retail price
  - `line_priority` (text) - 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  - `expected_delivery_date` (date, nullable) - Expected delivery date
  - `status` (text) - 'CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Security
  - Enable RLS on all tables
  - Admin users can access all data
  - Vendor users can only access their own vendor data and related POs
  
  ## Important Notes
  - All table and column names are designed to be Postgres-compatible
  - Schema can be migrated to external Postgres without changes
  - Only connection configuration needs to change for migration
*/

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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_vendor_id ON users(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(code);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_items_po_id ON purchase_order_line_items(po_id);

-- Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors table
CREATE POLICY "Vendors table accessible by admins"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Vendors can view their own vendor record"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = vendors.id
    )
  );

CREATE POLICY "Admins can insert vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- RLS Policies for users table
CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  TO authenticated
  USING (users.id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- RLS Policies for purchase_orders table
CREATE POLICY "Admins can view all purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Vendors can view their own purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = purchase_orders.vendor_id
    )
  );

CREATE POLICY "Admins can insert purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Vendors can update their purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = purchase_orders.vendor_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = purchase_orders.vendor_id
    )
  );

-- RLS Policies for purchase_order_line_items table
CREATE POLICY "Admins can view all line items"
  ON purchase_order_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Vendors can view their line items"
  ON purchase_order_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN purchase_orders ON purchase_orders.id = purchase_order_line_items.po_id
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = purchase_orders.vendor_id
    )
  );

CREATE POLICY "Admins can insert line items"
  ON purchase_order_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update line items"
  ON purchase_order_line_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Vendors can update their line items"
  ON purchase_order_line_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN purchase_orders ON purchase_orders.id = purchase_order_line_items.po_id
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = purchase_orders.vendor_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      JOIN purchase_orders ON purchase_orders.id = purchase_order_line_items.po_id
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = purchase_orders.vendor_id
    )
  );