'use client'

import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, ShoppingCart, DollarSign, TrendingUp, Table, ChefHat, Clock, CheckCircle } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()

  const stats = [
    {
      title: 'Total Tables',
      value: '24',
      description: '18 occupied, 6 available',
      icon: Table,
      color: 'text-blue-600'
    },
    {
      title: 'Active Orders',
      value: '42',
      description: '12 pending, 30 in progress',
      icon: ShoppingCart,
      color: 'text-green-600'
    },
    {
      title: 'Today\'s Revenue',
      value: '₹45,230',
      description: '+12% from yesterday',
      icon: DollarSign,
      color: 'text-yellow-600'
    },
    {
      title: 'Kitchen Queue',
      value: '8',
      description: '3 preparing, 5 ready',
      icon: ChefHat,
      color: 'text-red-600'
    }
  ]

  const recentOrders = [
    { id: 'ORD-001', table: 'T-05', items: 3, amount: '₹1,250', status: 'preparing', time: '10:30 AM' },
    { id: 'ORD-002', table: 'T-12', items: 2, amount: '₹850', status: 'ready', time: '10:25 AM' },
    { id: 'ORD-003', table: 'T-08', items: 5, amount: '₹2,100', status: 'served', time: '10:20 AM' },
    { id: 'ORD-004', table: 'T-03', items: 1, amount: '₹450', status: 'pending', time: '10:15 AM' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'preparing': return 'bg-blue-100 text-blue-800'
      case 'ready': return 'bg-green-100 text-green-800'
      case 'served': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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
            Welcome back, {user?.full_name}! Here's what's happening at your resort today.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Role: {user?.role}
        </Badge>
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
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            Latest orders from your restaurant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.table} • {order.items} items
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                  <div className="text-right">
                    <p className="font-medium">{order.amount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {order.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
