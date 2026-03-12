-- Add expected_delivery_date field to purchase_orders table
-- This will store the Order Info delivery date separately from line items

ALTER TABLE purchase_orders 
ADD COLUMN expected_delivery_date date;

-- Create index for better performance
CREATE INDEX idx_purchase_orders_expected_delivery_date ON purchase_orders(expected_delivery_date);
