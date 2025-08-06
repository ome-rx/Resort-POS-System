import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          role: 'super-admin' | 'owner' | 'manager' | 'waiter' | 'chef' | 'admin'
          full_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          role: 'super-admin' | 'owner' | 'manager' | 'waiter' | 'chef' | 'admin'
          full_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          role?: 'super-admin' | 'owner' | 'manager' | 'waiter' | 'chef' | 'admin'
          full_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      tables: {
        Row: {
          id: string
          table_number: string
          capacity: number
          status: 'available' | 'occupied' | 'reserved' | 'maintenance'
          qr_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_number: string
          capacity: number
          status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
          qr_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_number?: string
          capacity?: number
          status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
          qr_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          table_id: string
          customer_name: string | null
          customer_phone: string | null
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
          total_amount: number
          payment_status: 'pending' | 'paid' | 'failed'
          payment_method: 'cash' | 'card' | 'upi' | 'credit' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_id: string
          customer_name?: string | null
          customer_phone?: string | null
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
          total_amount: number
          payment_status?: 'pending' | 'paid' | 'failed'
          payment_method?: 'cash' | 'card' | 'upi' | 'credit' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
          total_amount?: number
          payment_status?: 'pending' | 'paid' | 'failed'
          payment_method?: 'cash' | 'card' | 'upi' | 'credit' | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
