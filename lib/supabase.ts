import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Named export for createClient
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

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
          table_number: number
          capacity: number
          status: 'available' | 'occupied' | 'reserved' | 'maintenance'
          qr_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_number: number
          capacity: number
          status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
          qr_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_number?: number
          capacity?: number
          status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
          qr_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
