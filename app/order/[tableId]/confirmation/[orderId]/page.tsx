"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, MapPin, Receipt, Phone } from "lucide-react"
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
  created_at: string
  restaurant_tables: {
    table_number: number
    floors: {
      floor_name: string
    }
  }
  order_items: {
    quantity: number
    unit_price: number
    total_price: number
    modifiers: string
    menu_items: {
      name: string
      sub_category: string
    }
  }[]
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const tableId = params.tableId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchOrder()

    // Set up real-time subscription for order status updates
    const subscription = supabase
      .channel("order-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          fetchOrder()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [orderId])

  const fetchOrder = async () => {
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
            quantity,
            unit_price,
            total_price,
            modifiers,
            menu_items(name, sub_category)
          )
        `)
        .eq("id", orderId)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error("Error fetching order:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return {
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
          message: "Your order has been received and is being prepared",
          icon: Clock,
        }
      case "ongoing":
        return {
          color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
          message: "Your order is currently being prepared in the kitchen",
          icon: Clock,
        }
      case "serving":
        return {
          color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
          message: "Your order is ready and will be served shortly",
          icon: CheckCircle,
        }
      case "completed":
        return {
          color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
          message: "Your order has been completed. Thank you!",
          icon: CheckCircle,
        }
      default:
        return {
          color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
          message: "Order status unknown",
          icon: Clock,
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Order Not Found</h3>
            <p className="text-gray-600 dark:text-gray-400">The requested order could not be found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Resort Restaurant</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Order Confirmation</p>
            </div>
            <Badge className={statusInfo.color}>
              <StatusIcon className="h-4 w-4 mr-1" />
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Order Status */}
          <Card>
            <CardContent className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Order Placed Successfully!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{statusInfo.message}</p>
              <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Estimated time: 15-25 minutes</span>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer Name:</span>
                  <span className="font-medium">{order.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Table:</span>
                  <span className="font-medium">
                    {order.restaurant_tables.floors.floor_name} - Table {order.restaurant_tables.table_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Guests:</span>
                  <span className="font-medium">{order.guest_count} people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Time:</span>
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Restaurant Phone</p>
                    <p className="text-sm text-gray-600">+91 832 123 4567</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-gray-600">Resort Restaurant, Goa</p>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Need help?</strong> Call us or ask any staff member for assistance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="mr-2 h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start py-3 border-b last:border-b-0">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.menu_items.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge
                          variant={item.menu_items.sub_category === "veg" ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          {item.menu_items.sub_category === "veg" ? "VEG" : "NON-VEG"}
                        </Badge>
                        <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                      </div>
                      {item.modifiers && (
                        <p className="text-sm text-orange-600 mt-1">
                          <strong>Note:</strong> {item.modifiers}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{item.total_price.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">₹{item.unit_price.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4 space-y-2">
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
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Amount:</span>
                    <span>₹{order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center space-x-4">
            <Button asChild variant="outline">
              <Link href={`/order/${tableId}`}>Place Another Order</Link>
            </Button>
            <Button onClick={() => window.print()}>Print Receipt</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
