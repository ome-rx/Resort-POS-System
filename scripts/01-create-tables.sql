-- Users Table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    role VARCHAR CHECK (role IN ('super_admin', 'owner', 'manager', 'waiter', 'chef', 'bartender', 'busser', 'customer', 'system_admin')) NOT NULL,
    full_name VARCHAR NOT NULL,
    email VARCHAR,
    phone VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Floors Table
CREATE TABLE floors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    floor_name VARCHAR NOT NULL,
    floor_number INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tables Table
CREATE TABLE restaurant_tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    floor_id UUID REFERENCES floors(id),
    table_number INTEGER NOT NULL,
    capacity INTEGER DEFAULT 4,
    status VARCHAR CHECK (status IN ('available', 'in_kitchen', 'serving')) DEFAULT 'available',
    qr_code_url VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(floor_id, table_number)
);

-- Categories Table
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Menu Items Table
CREATE TABLE menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    category_id UUID REFERENCES categories(id),
    sub_category VARCHAR CHECK (sub_category IN ('veg', 'non_veg')),
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    image_url VARCHAR,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inventory Table
CREATE TABLE inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_item_id UUID REFERENCES menu_items(id),
    total_quantity INTEGER NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    last_restocked_at TIMESTAMP,
    restocked_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number VARCHAR UNIQUE NOT NULL,
    table_id UUID REFERENCES restaurant_tables(id),
    customer_name VARCHAR NOT NULL,
    guest_count INTEGER DEFAULT 1,
    status VARCHAR CHECK (status IN ('active', 'ongoing', 'serving', 'completed')) DEFAULT 'active',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR CHECK (payment_method IN ('cash', 'card', 'upi', 'credit')),
    payment_status VARCHAR CHECK (payment_status IN ('pending', 'paid', 'credit')) DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    modifiers TEXT,
    is_prepared BOOLEAN DEFAULT false,
    prepared_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE table_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id UUID REFERENCES restaurant_tables(id),
    customer_name VARCHAR NOT NULL,
    guest_count INTEGER DEFAULT 1,
    session_start TIMESTAMP DEFAULT NOW(),
    session_end TIMESTAMP,
    total_orders INTEGER DEFAULT 0,
    session_total DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
