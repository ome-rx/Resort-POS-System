"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, ShoppingCart, Clock, TrendingUp, Users, ChefHat, Receipt, Package } from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  todayRevenue: number
  averageOrderValue: number
  pendingOrders: number
  takeawayOrders: number
  activeOrders: number
  ongoingOrders: number
  completedOrders: number
  lowStockItems: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 2450.75,
    averageOrderValue: 485.15,
    pendingOrders: 3,
    takeawayOrders: 2,
    activeOrders: 5,
    ongoingOrders: 2,
    completedOrders: 12,
    lowStockItems: 4,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // For demo purposes, we'll use mock data
    // In production, you would fetch real data from Supabase
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const getDashboardContent = () => {
    switch (user?.role) {
      case "chef":
        return <ChefDashboard stats={stats} />
      case "waiter":
        return <WaiterDashboard stats={stats} />
      default:
        return <AdminDashboard stats={stats} />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back, {user?.full_name}!</p>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link href="/dashboard/orders/new">Create New Order</Link>
          </Button>
        </div>
      </div>

      {getDashboardContent()}
    </div>
  )
}

function AdminDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.todayRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Resets every 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per order today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting preparation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Order Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-blue-600" />
              Active Orders
            </CardTitle>
            <CardDescription>Orders pending preparation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.activeOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ChefHat className="mr-2 h-5 w-5 text-orange-600" />
              Ongoing Orders
            </CardTitle>
            <CardDescription>Currently being prepared</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.ongoingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="mr-2 h-5 w-5 text-green-600" />
              Completed Orders
            </CardTitle>
            <CardDescription>Ready for serving</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.completedOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild className="h-20 flex-col">
              <Link href="/dashboard/orders/new">
                <ShoppingCart className="h-6 w-6 mb-2" />
                Create Order
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
              <Link href="/dashboard/reports">
                <TrendingUp className="h-6 w-6 mb-2" />
                View Reports
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
              <Link href="/dashboard/inventory">
                <Package className="h-6 w-6 mb-2" />
                Manage Inventory
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
              <Link href="/dashboard/tables">
                <Users className="h-6 w-6 mb-2" />
                Table Status
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function ChefDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-blue-600" />
              New Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.activeOrders}</div>
            <p className="text-sm text-muted-foreground">Ready to prepare</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ChefHat className="mr-2 h-5 w-5 text-orange-600" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.ongoingOrders}</div>
            <p className="text-sm text-muted-foreground">Currently cooking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="mr-2 h-5 w-5 text-green-600" />
              Ready to Serve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.completedOrders}</div>
            <p className="text-sm text-muted-foreground">Completed today</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kitchen Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button asChild className="h-16 flex-col">
              <Link href="/dashboard/kitchen">
                <ChefHat className="h-6 w-6 mb-2" />
                Kitchen Display System
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-16 flex-col bg-transparent">
              <Link href="/dashboard/orders">
                <Receipt className="h-6 w-6 mb-2" />
                View All Orders
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function WaiterDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-blue-600" />
              Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.activeOrders}</div>
            <p className="text-sm text-muted-foreground">Orders in kitchen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="mr-2 h-5 w-5 text-green-600" />
              Ready to Serve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.completedOrders}</div>
            <p className="text-sm text-muted-foreground">Ready for pickup</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Waiter Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild className="h-16 flex-col">
              <Link href="/dashboard/orders/new">
                <ShoppingCart className="h-6 w-6 mb-2" />
                Take Order
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-16 flex-col bg-transparent">
              <Link href="/dashboard/tables">
                <Users className="h-6 w-6 mb-2" />
                Table Status
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-16 flex-col bg-transparent">
              <Link href="/dashboard/orders">
                <Receipt className="h-6 w-6 mb-2" />
                View Orders
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
