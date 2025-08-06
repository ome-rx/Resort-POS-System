-- Add room_number and guest_name columns to orders table for credit payments
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS room_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS guest_name VARCHAR(100);

-- Update inventory function to properly handle stock updates
CREATE OR REPLACE FUNCTION update_inventory_stock(
  p_menu_item_id UUID,
  p_quantity_used INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE inventory 
  SET current_stock = GREATEST(0, current_stock - p_quantity_used)
  WHERE menu_item_id = p_menu_item_id;
  
  -- Update menu item availability based on stock
  UPDATE menu_items 
  SET is_available = (
    SELECT CASE 
      WHEN current_stock > 0 THEN true 
      ELSE false 
    END
    FROM inventory 
    WHERE menu_item_id = p_menu_item_id
  )
  WHERE id = p_menu_item_id;
END;
$$ LANGUAGE plpgsql;

-- Add QR code URL column to restaurant_tables if it doesn't exist
ALTER TABLE restaurant_tables 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Update existing tables to ensure they have proper status
UPDATE restaurant_tables 
SET status = 'available' 
WHERE status IS NULL OR status = '';

-- Create index for better performance on table lookups
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_orders_table_status ON orders(status);
