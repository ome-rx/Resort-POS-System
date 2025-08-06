"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth, hasPermission } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Search, Filter, Plus, Eye, Printer, Users, MapPin, Clock, Receipt, ChefHat } from "lucide-react"
import Link from "next/link"

interface Order {
  id: string
  order_number: string
  customer_name: string
  guest_count: number
  status: string
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_method: string | null
  payment_status: string
  created_at: string
  updated_at: string
  restaurant_tables: {
    table_number: number
    floors: {
      floor_name: string
    }
  }
  order_items: {
    id: string
    quantity: number
    unit_price: number
    total_price: number
    modifiers: string
    is_prepared: boolean
    prepared_at: string | null
    menu_items: {
      name: string
      sub_category: string
      categories: {
        name: string
      }
    }
  }[]
}

export default function OrdersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner", "manager", "waiter"])) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          restaurant_tables(
            table_number,
            floors(floor_name)
          ),
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            modifiers,
            is_prepared,
            prepared_at,
            menu_items(
              name,
              sub_category,
              categories(name)
            )
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to load orders.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      case "ongoing":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
      case "serving":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
      case "credit":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
    }
  }

  const printKOT = async (order: Order) => {
    try {
      // Generate KOT content
      const kotContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Kitchen Order Ticket - ${order.order_number}</title>
    <style>
        body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
        .order-info { margin-bottom: 15px; }
        .items { border-collapse: collapse; width: 100%; }
        .items th, .items td { border: 1px solid #000; padding: 5px; text-align: left; }
        .items th { background-color: #f0f0f0; }
        .footer { margin-top: 15px; text-align: center; font-size: 10px; }
        .modifiers { font-style: italic; color: #666; font-size: 10px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h2>KITCHEN ORDER TICKET</h2>
        <h3>Order #${order.order_number}</h3>
    </div>
    
    <div class="order-info">
        <strong>Table:</strong> ${order.restaurant_tables.floors.floor_name} - Table ${order.restaurant_tables.table_number}<br>
        <strong>Customer:</strong> ${order.customer_name}<br>
        <strong>Guests:</strong> ${order.guest_count}<br>
        <strong>Time:</strong> ${new Date(order.created_at).toLocaleString()}<br>
        <strong>Status:</strong> ${order.status.toUpperCase()}
    </div>
    
    <table class="items">
        <thead>
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Category</th>
                <th>Type</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>
            ${order.order_items.map(item => `
                <tr>
                    <td><strong>${item.menu_items.name}</strong></td>
                    <td>${item.quantity}</td>
                    <td>${item.menu_items.categories.name}</td>
                    <td>${item.menu_items.sub_category.toUpperCase()}</td>
                    <td class="modifiers">${item.modifiers || 'None'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="footer">
        <p>Prepared at: ________________ by: ________________</p>
        <p>Time: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
      `

      // Create a new window and print
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(kotContent)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }

      toast({
        title: "KOT Printed",
        description: "Kitchen Order Ticket has been sent to printer and opened in new window.",
      })
    } catch (error) {
      toast({
        title: "Print Error",
        description: "Failed to print KOT.",
        variant: "destructive",
      })
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId)

      if (error) throw error

      toast({
        title: "Status Updated",
        description: `Order status updated to ${newStatus}.`,
      })

      fetchOrders()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      })
    }
  }

  const markItemPrepared = async (orderItemId: string) => {
    try {
      const { error } = await supabase
        .from("order_items")
        .update({ 
          is_prepared: true, 
          prepared_at: new Date().toISOString() 
        })
        .eq("id", orderItemId)

      if (error) throw error

      toast({
        title: "Item Prepared",
        description: "Item marked as prepared.",
      })

      fetchOrders()
    } catch (error) {
      console.error("Error marking item as prepared:", error)
      toast({
        title: "Error",
        description: "Failed to mark item as prepared.",
        variant: "destructive",
      })
    }
  }

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order)
    setOrderDetailsOpen(true)
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesPayment = paymentFilter === "all" || order.payment_status === paymentFilter

    return matchesSearch && matchesStatus && matchesPayment
  })

  if (!hasPermission(user?.role || "", ["super_admin", "owner", "manager", "waiter"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access orders.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders Management</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage all restaurant orders</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Orders</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Order number or customer"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Order Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="serving">Serving</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Payment Status</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All payments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>Click on an order row to view full details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => openOrderDetails(order)}
                  >
                    <TableCell>
                      <div className="font-medium">{order.order_number}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="h-3 w-3 mr-1" />
                          {order.guest_count} guests
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-3 w-3 mr-1" />
                        {order.restaurant_tables.floors.floor_name} - Table {order.restaurant_tables.table_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.order_items.length} items
                        <div className="text-xs text-gray-500">
                          {order.order_items.filter(item => item.is_prepared).length} prepared
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">₹{order.total_amount.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">
                        +₹{order.tax_amount.toFixed(2)} tax
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(order.payment_status)}>
                        {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation()
                            openOrderDetails(order)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation()
                            printKOT(order)
                          }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No orders found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Complete order information and item management
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-medium">{selectedOrder.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium">{selectedOrder.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Table:</span>
                      <span className="font-medium">
                        {selectedOrder.restaurant_tables.floors.floor_name} - Table {selectedOrder.restaurant_tables.table_number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Guests:</span>
                      <span className="font-medium">{selectedOrder.guest_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={getStatusColor(selectedOrder.status)}>
                        {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">₹{selectedOrder.tax_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>₹{selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium">{selectedOrder.payment_method || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <Badge className={getPaymentStatusColor(selectedOrder.payment_status)}>
                        {selectedOrder.payment_status.charAt(0).toUpperCase() + selectedOrder.payment_status.slice(1)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedOrder.order_items.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{item.menu_items.name}</h4>
                              <Badge variant="outline" className={
                                item.menu_items.sub_category === 'veg' 
                                  ? 'bg-green-50 text-green-700' 
                                  : 'bg-red-50 text-red-700'
                              }>
                                {item.menu_items.sub_category.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{item.menu_items.categories.name}</p>
                            {item.modifiers && (
                              <p className="text-sm text-gray-500 italic">Special Instructions: {item.modifiers}</p>
                            )}
                            <div className="mt-2 flex items-center space-x-4">
                              <span className="text-sm">Qty: {item.quantity}</span>
                              <span className="text-sm">₹{item.unit_price.toFixed(2)} each</span>
                              <span className="font-medium">Total: ₹{item.total_price.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {item.is_prepared ? (
                              <Badge className="bg-green-100 text-green-800">
                                <ChefHat className="h-3 w-3 mr-1" />
                                Prepared
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markItemPrepared(item.id)}
                                className="text-xs"
                              >
                                Mark Prepared
                              </Button>
                            )}
                          </div>
                        </div>
                        {item.prepared_at && (
                          <div className="mt-2 text-xs text-gray-500">
                            Prepared at: {new Date(item.prepared_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Order Actions */}
              <div className="flex justify-between items-center">
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => printKOT(selectedOrder)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print KOT
                  </Button>
                </div>
                <div className="space-x-2">
                  {selectedOrder.status === 'active' && (
                    <Button onClick={() => updateOrderStatus(selectedOrder.id, 'ongoing')}>
                      Start Cooking
                    </Button>
                  )}
                  {selectedOrder.status === 'ongoing' && (
                    <Button onClick={() => updateOrderStatus(selectedOrder.id, 'serving')}>
                      Ready to Serve
                    </Button>
                  )}
                  {selectedOrder.status === 'serving' && (
                    <Button onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}>
                      Mark Completed
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
