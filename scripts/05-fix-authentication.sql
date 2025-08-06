-- Fix authentication and user login issues
-- This script ensures proper user authentication setup

-- Update users table to ensure proper password handling
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Update existing users to ensure they can login
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Ensure all demo users exist with correct credentials
INSERT INTO users (username, password_hash, role, full_name, email, is_active) 
VALUES 
  ('super-admin', 'super-admin', 'super_admin', 'Super Administrator', 'admin@resort.com', true),
  ('owner', 'owner123', 'owner', 'Restaurant Owner', 'owner@resort.com', true),
  ('manager', 'manager123', 'manager', 'Restaurant Manager', 'manager@resort.com', true),
  ('waiter', 'waiter123', 'waiter', 'Waiter Staff', 'waiter@resort.com', true),
  ('chef', 'chef123', 'chef', 'Head Chef', 'chef@resort.com', true)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = true;

-- Create settings table for restaurant configuration
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name VARCHAR(255) DEFAULT 'Resort Restaurant',
  address TEXT DEFAULT '123 Restaurant Street, Goa, India',
  phone VARCHAR(50) DEFAULT '+91 832 123 4567',
  email VARCHAR(255) DEFAULT 'info@resortrestaurant.com',
  tax_rate DECIMAL(5,2) DEFAULT 5.00,
  currency VARCHAR(10) DEFAULT 'INR',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  auto_print_kot BOOLEAN DEFAULT true,
  enable_notifications BOOLEAN DEFAULT true,
  allow_self_ordering BOOLEAN DEFAULT true,
  require_customer_info BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO restaurant_settings (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Add room_number and guest_name columns to orders table for credit payments
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS room_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255);

-- Update restaurant_tables to ensure QR codes are properly set
UPDATE restaurant_tables 
SET qr_code_url = CONCAT(
  'https://your-domain.com/order/', 
  id
) 
WHERE qr_code_url IS NULL AND is_active = true;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for restaurant_settings
DROP TRIGGER IF EXISTS update_restaurant_settings_updated_at ON restaurant_settings;
CREATE TRIGGER update_restaurant_settings_updated_at
    BEFORE UPDATE ON restaurant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
