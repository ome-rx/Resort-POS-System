-- Insert default super admin user
INSERT INTO users (username, password_hash, role, full_name, email) VALUES 
('super-admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', 'Super Administrator', 'admin@resort.com');

-- Insert sample floors
INSERT INTO floors (floor_name, floor_number) VALUES 
('Ground Floor', 1),
('First Floor', 2);

-- Insert sample categories
INSERT INTO categories (name, description, display_order) VALUES 
('Appetizers', 'Starters and small plates', 1),
('Beverages', 'Drinks and refreshments', 2),
('Main Course', 'Primary dishes', 3),
('Desserts', 'Sweet treats', 4);

-- Insert sample menu items
INSERT INTO menu_items (name, category_id, sub_category, price, description, is_available) VALUES 
('Chicken Tikka', (SELECT id FROM categories WHERE name = 'Appetizers'), 'non_veg', 350.00, 'Grilled chicken with spices', true),
('Paneer Tikka', (SELECT id FROM categories WHERE name = 'Appetizers'), 'veg', 280.00, 'Grilled cottage cheese', true),
('Masala Chai', (SELECT id FROM categories WHERE name = 'Beverages'), 'veg', 50.00, 'Traditional spiced tea', true),
('Butter Chicken', (SELECT id FROM categories WHERE name = 'Main Course'), 'non_veg', 450.00, 'Creamy chicken curry', true),
('Dal Makhani', (SELECT id FROM categories WHERE name = 'Main Course'), 'veg', 320.00, 'Rich lentil curry', true),
('Gulab Jamun', (SELECT id FROM categories WHERE name = 'Desserts'), 'veg', 120.00, 'Sweet milk dumplings', true);

-- Insert sample tables for ground floor
INSERT INTO restaurant_tables (floor_id, table_number, capacity) 
SELECT 
    (SELECT id FROM floors WHERE floor_number = 1),
    generate_series(1, 10),
    4;

-- Insert sample tables for first floor
INSERT INTO restaurant_tables (floor_id, table_number, capacity) 
SELECT 
    (SELECT id FROM floors WHERE floor_number = 2),
    generate_series(1, 8),
    4;

-- Insert inventory for menu items
INSERT INTO inventory (menu_item_id, total_quantity, current_stock) 
SELECT id, 50, 50 FROM menu_items;
