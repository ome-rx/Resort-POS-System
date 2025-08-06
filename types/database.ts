// types/database.ts - Standardized database interfaces

export interface Floor {
  id: string
  floor_name: string
  floor_number: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RestaurantTable {
  id: string
  floor_id: string
  table_number: number
  capacity: number
  status: 'available' | 'occupied' | 'reserved' | 'maintenance'
  qr_code_url?: string | null
  is_active: boolean
  current_order_id?: string | null
  created_at: string
  updated_at: string
  // Relations - when joined
  floors?: Floor
}

export interface Category {
  id: string
  name: string
  description?: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  name: string
  description?: string | null
  price: number
  category_id: string
  sub_category: 'veg' | 'non_veg'
  image_url?: string | null
  is_available: boolean
  created_at: string
  updated_at: string
  // Relations - when joined
  categories?: Category
  inventory?: Inventory[]
}

export interface Order {
  id: string
  order_number: string
  table_id: string
  customer_name: string
  guest_count: number
  room_number?: string | null
  subtotal: number
  tax_amount: number
  total_amount: number
  status: 'active' | 'ongoing' | 'serving' | 'completed'
  payment_method?: 'cash' | 'card' | 'upi' | 'credit' | null
  payment_status: 'pending' | 'paid' | 'credit'
  created_by?: string | null
  created_at: string
  updated_at: string
  // Relations - when joined
  restaurant_tables?: RestaurantTable
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  total_price: number
  modifiers?: string | null
  is_prepared: boolean
  prepared_at?: string | null
  created_at: string
  // Relations - when joined
  menu_items?: MenuItem
}

export interface User {
  id: string
  username: string
  password_hash: string
  role: 'super_admin' | 'owner' | 'manager' | 'waiter' | 'chef' | 'bartender' | 'busser' | 'customer' | 'system_admin'
  full_name: string
  email?: string | null
  phone?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  last_login?: string | null
  login_attempts: number
  locked_until?: string | null
}

export interface Inventory {
  id: string
  menu_item_id: string
  total_quantity: number
  current_stock: number
  low_stock_threshold: number
  last_restocked_at?: string | null
  restocked_by?: string | null
  created_at: string
  updated_at: string
  // Relations - when joined
  menu_items?: MenuItem
  users?: User
}

export interface TableSession {
  id: string
  table_id: string
  customer_name: string
  guest_count: number
  session_start: string
  session_end?: string | null
  total_orders: number
  session_total: number
  is_active: boolean
  // Relations - when joined
  restaurant_tables?: RestaurantTable
}

export interface RestaurantSettings {
  id: string
  restaurant_name: string
  address: string
  phone: string
  email: string
  tax_rate: number
  currency: string
  timezone: string
  auto_print_kot: boolean
  enable_notifications: boolean
  allow_self_ordering: boolean
  require_customer_info: boolean
  created_at: string
  updated_at: string
}

// Utility types for forms and API responses
export type OrderStatus = Order['status']
export type PaymentMethod = NonNullable<Order['payment_method']>
export type PaymentStatus = Order['payment_status']
export type TableStatus = RestaurantTable['status']
export type UserRole = User['role']
export type SubCategory = MenuItem['sub_category']

// Form data interfaces
export interface OrderFormData {
  table_id: string
  customer_name: string
  guest_count: number
  room_number?: string
  items: {
    menu_item_id: string
    quantity: number
    modifiers?: string
    unit_price: number
    total_price: number
  }[]
  subtotal: number
  tax_amount: number
  total_amount: number
}

export interface TableFormData {
  floor_id: string
  table_number: number
  capacity: number
  is_active: boolean
}

export interface MenuItemFormData {
  name: string
  description?: string
  price: number
  category_id: string
  sub_category: SubCategory
  image_url?: string
  is_available: boolean
}

export interface UserFormData {
  username: string
  password?: string
  role: UserRole
  full_name: string
  email?: string
  phone?: string
  is_active: boolean
}