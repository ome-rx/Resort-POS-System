'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type UserRole = 'super-admin' | 'owner' | 'manager' | 'waiter' | 'chef' | 'admin'

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  full_name: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<boolean>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo users for authentication
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'super-admin': {
    password: 'super-admin',
    user: {
      id: '1',
      username: 'super-admin',
      email: 'superadmin@resort.com',
      role: 'super-admin',
      full_name: 'Super Administrator'
    }
  },
  'owner': {
    password: 'owner123',
    user: {
      id: '2',
      username: 'owner',
      email: 'owner@resort.com',
      role: 'owner',
      full_name: 'Resort Owner'
    }
  },
  'manager': {
    password: 'manager123',
    user: {
      id: '3',
      username: 'manager',
      email: 'manager@resort.com',
      role: 'manager',
      full_name: 'Restaurant Manager'
    }
  },
  'waiter': {
    password: 'waiter123',
    user: {
      id: '4',
      username: 'waiter',
      email: 'waiter@resort.com',
      role: 'waiter',
      full_name: 'Waiter Staff'
    }
  },
  'chef': {
    password: 'chef123',
    user: {
      id: '5',
      username: 'chef',
      email: 'chef@resort.com',
      role: 'chef',
      full_name: 'Head Chef'
    }
  },
  'admin': {
    password: 'password123',
    user: {
      id: '6',
      username: 'admin',
      email: 'admin@resort.com',
      role: 'admin',
      full_name: 'System Admin'
    }
  },
  'waiter1': {
    password: 'password123',
    user: {
      id: '7',
      username: 'waiter1',
      email: 'waiter1@resort.com',
      role: 'waiter',
      full_name: 'Waiter One'
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('resort-pos-user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('resort-pos-user')
      }
    }
    setLoading(false)
  }, [])

  const signIn = async (username: string, password: string): Promise<boolean> => {
    setLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check demo credentials
    if (DEMO_USERS[username] && DEMO_PASSWORDS[username] === password) {
      const user = DEMO_USERS[username]
      setUser(user)
      localStorage.setItem('resort-pos-user', JSON.stringify(user))
      setLoading(false)
      return true
    }
    
    setLoading(false)
    return false
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem('resort-pos-user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}
