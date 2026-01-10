/*
  Add status column to vendors table for approval workflow
  - PENDING_APPROVAL: Initial state when vendor signs up
  - ACTIVE: Approved by admin
  - REJECTED: Rejected by admin
*/

-- Add status column to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING_APPROVAL' 
CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED'));

-- Set existing vendors to ACTIVE if they're marked as active
UPDATE vendors 
SET status = CASE 
  WHEN is_active = true THEN 'ACTIVE'
  ELSE 'PENDING_APPROVAL'
END
WHERE status IS NULL OR status = 'PENDING_APPROVAL';

-- Add index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
