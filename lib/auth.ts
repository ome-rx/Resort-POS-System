"use client"

import { useEffect, useState } from "react"

export interface User {
  id: string
  username: string
  role: string
  full_name: string
  email?: string
  phone?: string
  is_active: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error("Error parsing user data:", error)
        localStorage.removeItem("user")
      }
    }
    setLoading(false)
  }, [])

  const logout = () => {
    localStorage.removeItem("user")
    setUser(null)
    window.location.href = "/"
  }

  return { user, loading, logout }
}

export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}
