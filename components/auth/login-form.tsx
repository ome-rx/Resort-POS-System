"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, LogIn } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Demo credentials for testing
      const validCredentials = [
        {
          username: "super-admin",
          password: "super-admin",
          role: "super_admin",
          full_name: "Super Administrator",
          email: "admin@resort.com",
        },
        {
          username: "owner",
          password: "owner123",
          role: "owner",
          full_name: "Resort Owner",
          email: "owner@resort.com",
        },
        {
          username: "manager",
          password: "manager123",
          role: "manager",
          full_name: "Restaurant Manager",
          email: "manager@resort.com",
        },
        { username: "waiter", password: "waiter123", role: "waiter", full_name: "Waiter", email: "waiter@resort.com" },
        { username: "chef", password: "chef123", role: "chef", full_name: "Head Chef", email: "chef@resort.com" },
        {
          username: "admin",
          password: "password123",
          role: "super_admin",
          full_name: "Administrator",
          email: "admin@resort.com",
        },
        {
          username: "waiter1",
          password: "password123",
          role: "waiter",
          full_name: "Waiter 1",
          email: "waiter1@resort.com",
        },
      ]

      const validUser = validCredentials.find((cred) => cred.username === username && cred.password === password)

      if (!validUser) {
        setError("Invalid username or password")
        setLoading(false)
        return
      }

      // Create user object
      const userData = {
        id: `user_${validUser.username}`,
        username: validUser.username,
        role: validUser.role,
        full_name: validUser.full_name,
        email: validUser.email,
        is_active: true,
      }

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(userData))

      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.full_name}!`,
      })

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (err) {
      setError("An error occurred during login")
      console.error("Login error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Sign In</CardTitle>
        <CardDescription className="text-center">Enter your credentials to access the POS system</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              <div className="flex items-center">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </div>
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm font-medium mb-2">Demo Credentials:</p>
          <div className="text-xs space-y-1">
            <p>
              <strong>Super Admin:</strong> super-admin / super-admin
            </p>
            <p>
              <strong>Owner:</strong> owner / owner123
            </p>
            <p>
              <strong>Manager:</strong> manager / manager123
            </p>
            <p>
              <strong>Waiter:</strong> waiter / waiter123
            </p>
            <p>
              <strong>Chef:</strong> chef / chef123
            </p>
            <p>
              <strong>Admin:</strong> admin / password123
            </p>
            <p>
              <strong>Waiter 1:</strong> waiter1 / password123
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
