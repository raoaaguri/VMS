/*
  # Add History Tables for PO and Line Item Change Tracking
  
  ## Tables
  - `po_history` - Tracks PO-level changes (priority, closure status, closed amount)
  - `po_line_item_history` - Tracks line item changes (priority, status, expected delivery date)
  
  ## Fields
  Both tables store:
  - What changed (field_name)
  - Old and new values
  - Who made the change (user_id, role)
  - When it was changed (timestamp)
  - Type of action for audit trail
*/

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
CREATE INDEX IF NOT EXISTS idx_po_history_po_id ON po_history(po_id);
CREATE INDEX IF NOT EXISTS idx_po_history_changed_at ON po_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_po_line_item_history_po_id ON po_line_item_history(po_id);
CREATE INDEX IF NOT EXISTS idx_po_line_item_history_line_item_id ON po_line_item_history(line_item_id);
CREATE INDEX IF NOT EXISTS idx_po_line_item_history_changed_at ON po_line_item_history(changed_at);

-- Enable Row Level Security
ALTER TABLE po_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_line_item_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for po_history table
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

CREATE POLICY "Allow inserting PO history"
  ON po_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for po_line_item_history table
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

CREATE POLICY "Allow inserting line item history"
  ON po_line_item_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
