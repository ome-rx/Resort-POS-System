"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Users, MapPin, Clock, Utensils, Leaf, Beef, CreditCard, Printer } from "lucide-react"
import Link from "next/link"

interface OrderDetails {
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
  users: {
    full_name: string
  } | null
  order_items: {
    id: string
    quantity: number
    unit_price: number
    total_price: number
    modifiers: string
    menu_items: {
      name: string
      sub_category: string
      categories: {
        name: string
      }
    }
  }[]
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const orderId = params.id as string

  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchOrderDetails()
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          restaurant_tables(
            table_number,
            floors(floor_name)
          ),
          users(full_name),
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            modifiers,
            menu_items(
              name,
              sub_category,
              categories(name)
            )
          )
        `)
        .eq("id", orderId)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error("Error fetching order details:", error)
      toast({
        title: "Error",
        description: "Failed to load order details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return

    try {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id)

      if (error) throw error

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}.`,
      })

      fetchOrderDetails()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      })
    }
  }

  const printKOT = () => {
    if (!order) return

    const kotContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>KOT - ${order.order_number}</title>
          <style>
            body { font-family: monospace; max-width: 300px; margin: 0 auto; padding: 10px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .order-info { margin: 10px 0; }
            .items { margin: 15px 0; }
            .item { margin: 5px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
            .item-name { font-weight: bold; }
            .item-details { font-size: 12px; color: #666; }
            .footer { text-align: center; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>KITCHEN ORDER TICKET</h2>
            <div>Order: ${order.order_number}</div>
            <div>Time: ${new Date(order.created_at).toLocaleString()}</div>
          </div>

          <div class="order-info">
            <div><strong>Table:</strong> ${order.restaurant_tables.floors.floor_name} - Table ${order.restaurant_tables.table_number}</div>
            <div><strong>Customer:</strong> ${order.customer_name}</div>
            <div><strong>Guests:</strong> ${order.guest_count}</div>
            <div><strong>Waiter:</strong> ${order.users?.full_name || "Self-Order"}</div>
          </div>

          <div class="items">
            <h3>ITEMS TO PREPARE:</h3>
            ${order.order_items
              .map(
                (item) => `
              <div class="item">
                <div class="item-name">${item.quantity}x ${item.menu_items.name}</div>
                <div class="item-details">
                  Category: ${item.menu_items.categories.name} | 
                  Type: ${item.menu_items.sub_category === "veg" ? "VEG" : "NON-VEG"}
                </div>
                ${item.modifiers ? `<div class="item-details"><strong>Special Instructions:</strong> ${item.modifiers}</div>` : ""}
              </div>
            `,
              )
              .join("")}
          </div>

          <div class="footer">
            <div>Status: ${order.status.toUpperCase()}</div>
            <div>Printed: ${new Date().toLocaleString()}</div>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(kotContent)
      printWindow.document.close()
      printWindow.print()
    }

    toast({
      title: "KOT Printed",
      description: "Kitchen Order Ticket has been sent to printer.",
    })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Order Not Found</h3>
          <p className="text-gray-600 dark:text-gray-400">The requested order could not be found.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Details</h1>
            <p className="text-gray-600 dark:text-gray-400">{order.order_number}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={printKOT}>
            <Printer className="mr-2 h-4 w-4" />
            Print KOT
          </Button>
          {order.status === "serving" && (
            <Button asChild>
              <Link href={`/dashboard/billing?order=${order.id}`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Process Payment
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Order Information
                <div className="flex space-x-2">
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                  <Badge className={getPaymentStatusColor(order.payment_status)}>
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.guest_count} guests</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {order.restaurant_tables.floors.floor_name} - Table {order.restaurant_tables.table_number}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">Order Time</div>
                    <div className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</div>
                  </div>
                </div>
                {order.users && (
                  <div>
                    <div className="font-medium">Served by</div>
                    <div className="text-sm text-gray-500">{order.users.full_name}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Utensils className="mr-2 h-5 w-5" />
                Order Items ({order.order_items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{item.menu_items.name}</h4>
                        {item.menu_items.sub_category === "veg" ? (
                          <Leaf className="h-4 w-4 text-green-600" />
                        ) : (
                          <Beef className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">Category: {item.menu_items.categories.name}</div>
                      {item.modifiers && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Special Instructions:</strong> {item.modifiers}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-medium">₹{item.total_price.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">
                        {item.quantity} × ₹{item.unit_price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary & Actions */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>SGST (2.5%):</span>
                  <span>₹{(order.tax_amount / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>CGST (2.5%):</span>
                  <span>₹{(order.tax_amount / 2).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{order.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {order.payment_method && (
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600">Payment Method:</div>
                  <div className="font-medium capitalize">{order.payment_method}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Actions */}
          {(user?.role === "super_admin" ||
            user?.role === "owner" ||
            user?.role === "manager" ||
            user?.role === "chef") && (
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>Change the order status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.status === "active" && (
                  <Button className="w-full" onClick={() => updateOrderStatus("ongoing")}>
                    Start Preparation
                  </Button>
                )}
                {order.status === "ongoing" && (
                  <Button className="w-full" onClick={() => updateOrderStatus("serving")}>
                    Ready to Serve
                  </Button>
                )}
                {order.status === "serving" && (
                  <Button className="w-full" onClick={() => updateOrderStatus("completed")}>
                    Mark as Completed
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
