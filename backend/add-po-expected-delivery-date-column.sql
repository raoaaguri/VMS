-- Add expected_delivery_date column to purchase_orders table
-- This column is needed for Order Info level delivery date updates

ALTER TABLE purchase_orders 
ADD COLUMN expected_delivery_date date;

-- Create index for better performance
CREATE INDEX idx_purchase_orders_expected_delivery_date ON purchase_orders(expected_delivery_date);

-- Add comment for documentation
COMMENT ON COLUMN purchase_orders.expected_delivery_date IS 'Order Info level expected delivery date - when updated, applies to all line items';
