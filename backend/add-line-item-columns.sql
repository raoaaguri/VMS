-- Migration: Add product detail columns to purchase_order_line_items table

ALTER TABLE purchase_order_line_items
ADD COLUMN IF NOT EXISTS design_code text,
ADD COLUMN IF NOT EXISTS combination_code text,
ADD COLUMN IF NOT EXISTS style text,
ADD COLUMN IF NOT EXISTS sub_style text,
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS sub_color text,
ADD COLUMN IF NOT EXISTS polish text,
ADD COLUMN IF NOT EXISTS size text,
ADD COLUMN IF NOT EXISTS weight numeric,
ADD COLUMN IF NOT EXISTS Item_Code text,
ADD COLUMN IF NOT EXISTS Order_No text,
ADD COLUMN IF NOT EXISTS Item_Name text,
ADD COLUMN IF NOT EXISTS Order_Rate numeric,
ADD COLUMN IF NOT EXISTS Landing_Cost numeric,
ADD COLUMN IF NOT EXISTS HSN_SAC_CODE text,
ADD COLUMN IF NOT EXISTS Order_Amount numeric
ADD COLUMN IF NOT EXISTS received_qty numeric DEFAULT 0;

