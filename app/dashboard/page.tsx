'use client'

import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, ShoppingCart, DollarSign, TrendingUp, Table, ChefHat, Clock, AlertTriangle } from 'lucide-react'
import Link from "next/link"

export default function DashboardPage() {
  const { user } = useAuth()

  // Mock data for dashboard stats
  const stats = [
    {
      title: "Total Tables",
      value: "24",
      change: "+12%",
      icon: Table,
      color: "text-blue-600",
    },
    {
      title: "Active Orders",
      value: "12",
      change: "+8%",
      icon: ShoppingCart,
      color: "text-green-600",
    },
    {
      title: "Today's Revenue",
      value: "₹15,240",
      change: "+12%",
      icon: DollarSign,
      color: "text-yellow-600",
    },
    {
      title: "Staff Online",
      value: "8",
      change: "+5%",
      icon: Users,
      color: "text-purple-600",
    },
  ]

  const recentOrders = [
    { id: 'ORD-001', table: 'Table 5', items: 3, status: 'preparing', time: '10 mins ago' },
    { id: 'ORD-002', table: 'Table 12', items: 2, status: 'served', time: '15 mins ago' },
    { id: 'ORD-003', table: 'Table 8', items: 4, amount: 680, status: 'pending', time: '20 mins ago' },
    { id: 'ORD-004', table: 'Table 3', items: 1, amount: 150, status: 'ready', time: '25 mins ago' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
      case 'preparing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      case 'served': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, {user?.full_name}! Here's what's happening at your restaurant today.
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Role: <span className="capitalize font-medium">{user?.role?.replace('-', ' ')}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 dark:text-green-400">
                  {stat.change}
                </span>{" "}
                from yesterday
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks based on your role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user?.role === 'waiter' && (
                <>
                  <div className="flex items-center p-3 border rounded-lg hover:bg-muted cursor-pointer">
                    <Table className="h-5 w-5 mr-3 text-blue-600" />
                    <span>View Table Status</span>
                  </div>
                  <div className="flex items-center p-3 border rounded-lg hover:bg-muted cursor-pointer">
                    <ShoppingCart className="h-5 w-5 mr-3 text-green-600" />
                    <span>Take New Order</span>
                  </div>
                </>
              )}
              {user?.role === 'chef' && (
                <>
                  <div className="flex items-center p-3 border rounded-lg hover:bg-muted cursor-pointer">
                    <ChefHat className="h-5 w-5 mr-3 text-orange-600" />
                    <span>Kitchen Orders</span>
                  </div>
                  <div className="flex items-center p-3 border rounded-lg hover:bg-muted cursor-pointer">
                    <Clock className="h-5 w-5 mr-3 text-yellow-600" />
                    <span>Order Queue</span>
                  </div>
                </>
              )}
              {(user?.role === 'manager' || user?.role === 'owner' || user?.role === 'admin') && (
                <>
                  <div className="flex items-center p-3 border rounded-lg hover:bg-muted cursor-pointer">
                    <Receipt className="h-5 w-5 mr-3 text-purple-600" />
                    <span>View Reports</span>
                  </div>
                  <div className="flex items-center p-3 border rounded-lg hover:bg-muted cursor-pointer">
                    <Users className="h-5 w-5 mr-3 text-blue-600" />
                    <span>Manage Staff</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/orders">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.table}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{order.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
