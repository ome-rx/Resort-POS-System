-- Function to update inventory stock when orders are placed
CREATE OR REPLACE FUNCTION update_inventory_stock(
    p_menu_item_id UUID,
    p_quantity_used INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE inventory 
    SET current_stock = current_stock - p_quantity_used,
        updated_at = NOW()
    WHERE menu_item_id = p_menu_item_id;
    
    -- Disable menu item if out of stock
    UPDATE menu_items 
    SET is_available = FALSE
    WHERE id = p_menu_item_id 
    AND id IN (
        SELECT menu_item_id 
        FROM inventory 
        WHERE menu_item_id = p_menu_item_id 
        AND current_stock <= 0
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get daily revenue
CREATE OR REPLACE FUNCTION get_daily_revenue(target_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL AS $$
DECLARE
    revenue DECIMAL;
BEGIN
    SELECT COALESCE(SUM(total_amount), 0)
    INTO revenue
    FROM orders
    WHERE DATE(created_at) = target_date
    AND payment_status = 'paid';
    
    RETURN revenue;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular dishes
CREATE OR REPLACE FUNCTION get_popular_dishes(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    dish_name VARCHAR,
    category_name VARCHAR,
    total_orders BIGINT,
    total_quantity BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.name as dish_name,
        c.name as category_name,
        COUNT(DISTINCT oi.order_id) as total_orders,
        SUM(oi.quantity) as total_quantity
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN categories c ON mi.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at >= CURRENT_DATE - INTERVAL '%s days' % days_back
    GROUP BY mi.id, mi.name, c.name
    ORDER BY total_quantity DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
