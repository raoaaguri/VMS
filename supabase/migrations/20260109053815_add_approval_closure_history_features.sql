/*
  # Add Vendor Approval, PO Closure, and History Features

  ## Overview
  Extends the vendor management system with vendor signup approval workflow, 
  PO closure tracking, and comprehensive audit history.

  ## Schema Changes

  ### 1. vendors table modifications
  - Add `status` column with values: 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED'
  - Existing vendors default to 'ACTIVE'

  ### 2. users table modifications
  - Add `is_active` column (boolean) for user account activation
  - Existing users default to true

  ### 3. purchase_orders table modifications
  - Add `closure_status` with values: 'OPEN', 'PARTIALLY_CLOSED', 'CLOSED'
  - Add `closed_amount` (numeric) for closure amount in INR
  - Add `closed_amount_currency` (text) always 'INR'

  ### 4. New table: po_history
  - Tracks PO-level changes (status, priority, closure)
  - Fields: id, po_id, changed_by_user_id, changed_by_role, action_type, 
    field_name, old_value, new_value, changed_at

  ### 5. New table: po_line_item_history
  - Tracks line-item-level changes (status, priority, expected date)
  - Fields: id, po_id, line_item_id, changed_by_user_id, changed_by_role, 
    action_type, field_name, old_value, new_value, changed_at

  ## Security
  - Enable RLS on new history tables
  - Admins can view all history
  - Vendors can view their own PO history
*/

-- Add status column to vendors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'status'
  ) THEN
    ALTER TABLE vendors 
    ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE' 
    CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED'));
  END IF;
END $$;

-- Add is_active column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Add closure fields to purchase_orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'closure_status'
  ) THEN
    ALTER TABLE purchase_orders 
    ADD COLUMN closure_status text NOT NULL DEFAULT 'OPEN' 
    CHECK (closure_status IN ('OPEN', 'PARTIALLY_CLOSED', 'CLOSED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'closed_amount'
  ) THEN
    ALTER TABLE purchase_orders 
    ADD COLUMN closed_amount numeric DEFAULT 0 CHECK (closed_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'closed_amount_currency'
  ) THEN
    ALTER TABLE purchase_orders 
    ADD COLUMN closed_amount_currency text DEFAULT 'INR';
  END IF;
END $$;

-- Create po_history table
CREATE TABLE IF NOT EXISTS po_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  changed_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role text NOT NULL CHECK (changed_by_role IN ('ADMIN', 'VENDOR')),
  action_type text NOT NULL CHECK (action_type IN ('STATUS_CHANGE', 'PRIORITY_CHANGE', 'CLOSURE_CHANGE')),
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
  changed_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role text NOT NULL CHECK (changed_by_role IN ('ADMIN', 'VENDOR')),
  action_type text NOT NULL CHECK (action_type IN ('STATUS_CHANGE', 'PRIORITY_CHANGE', 'EXPECTED_DATE_CHANGE')),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz DEFAULT now()
);

-- Create indexes for history tables
CREATE INDEX IF NOT EXISTS idx_po_history_po_id ON po_history(po_id);
CREATE INDEX IF NOT EXISTS idx_po_history_changed_at ON po_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_line_item_history_po_id ON po_line_item_history(po_id);
CREATE INDEX IF NOT EXISTS idx_po_line_item_history_line_item_id ON po_line_item_history(line_item_id);
CREATE INDEX IF NOT EXISTS idx_po_line_item_history_changed_at ON po_line_item_history(changed_at DESC);

-- Enable Row Level Security on history tables
ALTER TABLE po_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_line_item_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for po_history
CREATE POLICY "Admins can view all PO history"
  ON po_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Vendors can view their PO history"
  ON po_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN purchase_orders ON purchase_orders.id = po_history.po_id
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = purchase_orders.vendor_id
    )
  );

CREATE POLICY "Admins can insert PO history"
  ON po_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Vendors can insert PO history"
  ON po_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      JOIN purchase_orders ON purchase_orders.id = po_history.po_id
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = purchase_orders.vendor_id
    )
  );

-- RLS Policies for po_line_item_history
CREATE POLICY "Admins can view all line item history"
  ON po_line_item_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Vendors can view their line item history"
  ON po_line_item_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN purchase_orders ON purchase_orders.id = po_line_item_history.po_id
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = purchase_orders.vendor_id
    )
  );

CREATE POLICY "Admins can insert line item history"
  ON po_line_item_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Vendors can insert line item history"
  ON po_line_item_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      JOIN purchase_orders ON purchase_orders.id = po_line_item_history.po_id
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = purchase_orders.vendor_id
    )
  );
