"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth, hasPermission } from "@/lib/auth"
import { Table, Users, Plus, Settings, QrCode, Eye, Clock, CheckCircle, AlertCircle, Wrench } from 'lucide-react'
import Link from "next/link"

interface TableData {
  id: string
  table_number: number
  capacity: number
  status: 'available' | 'occupied' | 'reserved' | 'maintenance'
  current_order?: {
    id: string
    customer_name: string
    guest_count: number
    created_at: string
    total_amount: number
  }
}

export default function TablesPage() {
  const { user } = useAuth()
  const [tables, setTables] = useState<TableData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for tables
    const mockTables: TableData[] = [
      {
        id: "1",
        table_number: 1,
        capacity: 4,
        status: "occupied",
        current_order: {
          id: "ORD-001",
          customer_name: "John Doe",
          guest_count: 3,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          total_amount: 850
        }
      },
      {
        id: "2",
        table_number: 2,
        capacity: 2,
        status: "available"
      },
      {
        id: "3",
        table_number: 3,
        capacity: 6,
        status: "reserved"
      },
      {
        id: "4",
        table_number: 4,
        capacity: 4,
        status: "occupied",
        current_order: {
          id: "ORD-002",
          customer_name: "Jane Smith",
          guest_count: 2,
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          total_amount: 1200
        }
      },
      {
        id: "5",
        table_number: 5,
        capacity: 8,
        status: "maintenance"
      },
      {
        id: "6",
        table_number: 6,
        capacity: 4,
        status: "available"
      },
      {
        id: "7",
        table_number: 7,
        capacity: 2,
        status: "available"
      },
      {
        id: "8",
        table_number: 8,
        capacity: 6,
        status: "occupied",
        current_order: {
          id: "ORD-003",
          customer_name: "Mike Johnson",
          guest_count: 4,
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          total_amount: 650
        }
      }
    ]

    setTables(mockTables)
    setLoading(false)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "occupied":
        return <Users className="h-4 w-4 text-blue-600" />
      case "reserved":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "maintenance":
        return <Wrench className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case "occupied":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      case "reserved":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
      case "maintenance":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
    }
  }

  const getTimeSince = (dateString: string) => {
    const now = new Date()
    const orderTime = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} mins ago`
    } else {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    }
  }

  const tableStats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    maintenance: tables.filter(t => t.status === 'maintenance').length,
  }

  if (!hasPermission(user?.role || "", ["super-admin", "owner", "manager", "waiter", "admin"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access tables.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tables Overview</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor and manage restaurant tables</p>
        </div>
        <div className="flex space-x-2">
          {hasPermission(user?.role || "", ["super-admin", "owner", "manager", "admin"]) && (
            <>
              <Button variant="outline" asChild>
                <Link href="/dashboard/tables/manage">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Tables
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/qr-codes">
                  <QrCode className="mr-2 h-4 w-4" />
                  QR Codes
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Table className="h-5 w-5 text-gray-600" />
              <div>
                <div className="text-2xl font-bold">{tableStats.total}</div>
                <div className="text-sm text-gray-600">Total Tables</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{tableStats.available}</div>
                <div className="text-sm text-gray-600">Available</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{tableStats.occupied}</div>
                <div className="text-sm text-gray-600">Occupied</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{tableStats.reserved}</div>
                <div className="text-sm text-gray-600">Reserved</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{tableStats.maintenance}</div>
                <div className="text-sm text-gray-600">Maintenance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map((table) => (
          <Card key={table.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Table {table.table_number}</CardTitle>
                <Badge className={getStatusColor(table.status)}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(table.status)}
                    <span className="capitalize">{table.status}</span>
                  </div>
                </Badge>
              </div>
              <CardDescription>
                Capacity: {table.capacity} guests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {table.current_order ? (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        {table.current_order.customer_name}
                      </span>
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        {table.current_order.guest_count} guests
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700 dark:text-blue-300">
                        ₹{table.current_order.total_amount}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {getTimeSince(table.current_order.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href={`/dashboard/orders/${table.current_order.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Order
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    {table.status === 'available' && "Ready for new guests"}
                    {table.status === 'reserved' && "Reserved for guests"}
                    {table.status === 'maintenance' && "Under maintenance"}
                  </div>
                  {table.status === 'available' && hasPermission(user?.role || "", ["super-admin", "owner", "manager", "waiter", "admin"]) && (
                    <Button size="sm" className="w-full" asChild>
                      <Link href={`/dashboard/orders/new?table=${table.id}`}>
                        <Plus className="h-4 w-4 mr-1" />
                        New Order
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
