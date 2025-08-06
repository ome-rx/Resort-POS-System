"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth, hasPermission } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Search, Users, Key, Eye, EyeOff } from "lucide-react"

interface User {
  id: string
  username: string
  password_hash: string
  role: string
  full_name: string
  email?: string
  phone?: string
  is_active: boolean
  created_at: string
}

interface UserFormData {
  username: string
  password: string
  role: string
  full_name: string
  email: string
  phone: string
  is_active: boolean
}

export default function UsersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [passwordViewDialog, setPasswordViewDialog] = useState(false)
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null)
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    password: "",
    role: "waiter",
    full_name: "",
    email: "",
    phone: "",
    is_active: true,
  })
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner"])) {
      fetchUsers()
    }
  }, [user])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingUser) {
        // Update existing user
        const updateData: any = {
          role: formData.role,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          is_active: formData.is_active,
        }

        // Only update password if provided
        if (formData.password) {
          updateData.password_hash = formData.password // Store plain text for demo (hash in production)
        }

        const { error } = await supabase.from("users").update(updateData).eq("id", editingUser.id)

        if (error) throw error

        toast({
          title: "User Updated",
          description: "User has been updated successfully.",
        })
      } else {
        // Create new user - Check if username already exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("username")
          .eq("username", formData.username)
          .single()

        if (existingUser) {
          toast({
            title: "Username Exists",
            description: "This username is already taken. Please choose another.",
            variant: "destructive",
          })
          return
        }

        // Create new user with plain text password (for demo - hash in production)
        const { error } = await supabase.from("users").insert({
          username: formData.username,
          password_hash: formData.password, // Store plain text for demo
          role: formData.role,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          is_active: formData.is_active,
        })

        if (error) throw error

        toast({
          title: "User Created",
          description: `New user "${formData.username}" has been created successfully. They can now log in.`,
        })
      }

      setDialogOpen(false)
      setEditingUser(null)
      resetForm()
      fetchUsers()
    } catch (error) {
      console.error("Error saving user:", error)
      toast({
        title: "Error",
        description: "Failed to save user.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      full_name: user.full_name,
      email: user.email || "",
      phone: user.phone || "",
      is_active: user.is_active,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return

    try {
      const { error } = await supabase.from("users").delete().eq("id", userId)

      if (error) throw error

      toast({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      })

      fetchUsers()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      })
    }
  }

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from("users").update({ is_active: isActive }).eq("id", userId)

      if (error) throw error

      toast({
        title: "Status Updated",
        description: `User is now ${isActive ? "active" : "inactive"}.`,
      })

      fetchUsers()
    } catch (error) {
      console.error("Error updating user status:", error)
      toast({
        title: "Error",
        description: "Failed to update user status.",
        variant: "destructive",
      })
    }
  }

  const resetPassword = async (userId: string, username: string) => {
    const newPassword = prompt(`Enter new password for ${username}:`)
    if (!newPassword) return

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({ password_hash: newPassword }) // Store plain text for demo
        .eq("id", userId)

      if (error) throw error

      toast({
        title: "Password Reset",
        description: "Password has been reset successfully.",
      })
    } catch (error) {
      console.error("Error resetting password:", error)
      toast({
        title: "Error",
        description: "Failed to reset password.",
        variant: "destructive",
      })
    }
  }

  const viewPassword = (user: User) => {
    setSelectedUserForPassword(user)
    setPasswordViewDialog(true)
  }

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      role: "waiter",
      full_name: "",
      email: "",
      phone: "",
      is_active: true,
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      case "owner":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
      case "manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      case "waiter":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case "chef":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesRole = roleFilter === "all" || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  if (!hasPermission(user?.role || "", ["super_admin", "owner"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access user management.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage system users and their permissions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm()
                setEditingUser(null)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
              <DialogDescription>
                {editingUser ? "Update user details and permissions." : "Create a new user account with login access."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  required
                  disabled={!!editingUser}
                  placeholder="Enter unique username"
                />
                {!editingUser && (
                  <p className="text-xs text-gray-500">Used for logging into the system</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? "New Password (leave blank to keep current)" : "Password"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  required={!editingUser}
                  placeholder="Enter secure password"
                  minLength={6}
                />
                <p className="text-xs text-gray-500">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  required
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waiter">Waiter</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="bartender">Bartender</SelectItem>
                    <SelectItem value="busser">Busser</SelectItem>
                    {user?.role === "super_admin" && (
                      <>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="system_admin">System Admin</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active (can login)</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? "Update User" : "Create User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Name, username, or email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="waiter">Waiter</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="bartender">Bartender</SelectItem>
                  <SelectItem value="busser">Busser</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Users ({filteredUsers.length})</CardTitle>
          <CardDescription>Manage user accounts and access permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((userData) => (
                  <TableRow key={userData.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{userData.full_name}</div>
                        <div className="text-sm text-gray-500">@{userData.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(userData.role)}>
                        {userData.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {userData.email && <div>{userData.email}</div>}
                        {userData.phone && <div>{userData.phone}</div>}
                        {!userData.email && !userData.phone && (
                          <span className="text-gray-400">No contact info</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={userData.is_active}
                        onCheckedChange={(checked) => toggleUserStatus(userData.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(userData.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(userData)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => viewPassword(userData)}
                          title="View Password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetPassword(userData.id, userData.username)}
                          title="Reset Password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        {userData.username !== "super-admin" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(userData.id, userData.username)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password View Dialog */}
      <Dialog open={passwordViewDialog} onOpenChange={setPasswordViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>View Password</DialogTitle>
            <DialogDescription>
              Password for {selectedUserForPassword?.full_name} (@{selectedUserForPassword?.username})
            </DialogDescription>
          </DialogHeader>
          
          {selectedUserForPassword && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label>Password:</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => togglePasswordVisibility(selectedUserForPassword.id)}
                  >
                    {showPasswords[selectedUserForPassword.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="font-mono text-lg mt-2">
                  {showPasswords[selectedUserForPassword.id] 
                    ? selectedUserForPassword.password_hash 
                    : "••••••••••"
                  }
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p><strong>Note:</strong> This is the current password for this user account.</p>
                <p><strong>Security:</strong> Passwords should be kept confidential and changed regularly.</p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => resetPassword(selectedUserForPassword.id, selectedUserForPassword.username)}
                >
                  Reset Password
                </Button>
                <Button onClick={() => setPasswordViewDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
