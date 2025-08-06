"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, Clock, ChefHat, Utensils, Download, RefreshCw } from "lucide-react"

interface OrderConfirmation {
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
    id: string
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
  const { toast } = useToast()
  const tableId = params.tableId as string
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderConfirmation | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchOrderDetails()

    // Set up real-time subscription for order status updates
    const subscription = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) => (prev ? { ...prev, status: payload.new.status } : null))
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
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
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            modifiers,
            menu_items(
              name,
              sub_category
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

  const downloadReceipt = () => {
    if (!order) return

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt - ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .restaurant-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .address { font-size: 12px; color: #666; }
            .order-details { margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .items-section { margin: 20px 0; }
            .item { margin: 10px 0; padding: 10px 0; border-bottom: 1px dotted #ccc; }
            .item-name { font-weight: bold; }
            .item-details { font-size: 12px; color: #666; margin-top: 5px; }
            .total-section { border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .grand-total { font-weight: bold; font-size: 18px; border-top: 1px solid #000; padding-top: 5px; }
            .status-section { text-align: center; margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-radius: 8px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="restaurant-name">RESORT RESTAURANT</div>
            <div class="address">Goa, India<br>Phone: +91 832 123 4567</div>
          </div>

          <div class="order-details">
            <div class="detail-row"><span><strong>Order Number:</strong></span><span>${order.order_number}</span></div>
            <div class="detail-row"><span><strong>Date & Time:</strong></span><span>${new Date(order.created_at).toLocaleString()}</span></div>
            <div class="detail-row"><span><strong>Table:</strong></span><span>${order.restaurant_tables.floors.floor_name} - Table ${order.restaurant_tables.table_number}</span></div>
            <div class="detail-row"><span><strong>Customer:</strong></span><span>${order.customer_name}</span></div>
            <div class="detail-row"><span><strong>Guests:</strong></span><span>${order.guest_count}</span></div>
          </div>

          <div class="status-section">
            <div style="font-weight: bold; color: #1e40af;">Order Status: ${order.status.toUpperCase()}</div>
            <div style="font-size: 12px; margin-top: 5px;">
              ${
                order.status === "active"
                  ? "Your order has been received and will be prepared shortly."
                  : order.status === "ongoing"
                    ? "Your order is being prepared in the kitchen."
                    : order.status === "serving"
                      ? "Your order is ready! Please wait for service."
                      : "Your order has been completed. Thank you!"
              }
            </div>
          </div>

          <div class="items-section">
            <h3>Order Items:</h3>
            ${order.order_items
              .map(
                (item) => `
              <div class="item">
                <div class="item-name">${item.quantity}x ${item.menu_items.name}</div>
                <div class="item-details">
                  Type: ${item.menu_items.sub_category === "veg" ? "Vegetarian" : "Non-Vegetarian"} | 
                  Price: ₹${item.unit_price.toFixed(2)} each | 
                  Total: ₹${item.total_price.toFixed(2)}
                </div>
                ${item.modifiers ? `<div class="item-details"><strong>Special Instructions:</strong> ${item.modifiers}</div>` : ""}
              </div>
            `,
              )
              .join("")}
          </div>

          <div class="total-section">
            <div class="total-row"><span>Subtotal:</span><span>₹${order.subtotal.toFixed(2)}</span></div>
            <div class="total-row"><span>SGST (2.5%):</span><span>₹${(order.tax_amount / 2).toFixed(2)}</span></div>
            <div class="total-row"><span>CGST (2.5%):</span><span>₹${(order.tax_amount / 2).toFixed(2)}</span></div>
            <div class="total-row grand-total"><span>Grand Total:</span><span>₹${order.total_amount.toFixed(2)}</span></div>
          </div>

          <div class="footer">
            <p>Thank you for your order!</p>
            <p>Estimated preparation time: 15-25 minutes</p>
            <p>Please keep this receipt for your reference</p>
          </div>
        </body>
      </html>
    `

    const blob = new Blob([receiptContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Receipt-${order.order_number}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Receipt Downloaded",
      description: "Your order receipt has been downloaded successfully.",
    })
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return {
          icon: Clock,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          title: "Order Received",
          description: "Your order has been received and will be prepared shortly.",
          estimatedTime: "15-25 minutes",
        }
      case "ongoing":
        return {
          icon: ChefHat,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          title: "Being Prepared",
          description: "Our chefs are preparing your delicious meal.",
          estimatedTime: "10-15 minutes",
        }
      case "serving":
        return {
          icon: Utensils,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          title: "Ready to Serve",
          description: "Your order is ready! Our staff will serve it shortly.",
          estimatedTime: "2-5 minutes",
        }
      case "completed":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          title: "Order Completed",
          description: "Your order has been served. Enjoy your meal!",
          estimatedTime: "Completed",
        }
      default:
        return {
          icon: Clock,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          title: "Processing",
          description: "Processing your order...",
          estimatedTime: "Please wait",
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
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Order Confirmation</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{order.order_number}</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={fetchOrderDetails}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={downloadReceipt}>
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Status */}
          <div className="lg:col-span-2 space-y-6">
            <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${statusInfo.bgColor}`}>
                    <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.title}</h2>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">{statusInfo.description}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <strong>Estimated time:</strong> {statusInfo.estimatedTime}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Order Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full ${order.status === "active" || order.status === "ongoing" || order.status === "serving" || order.status === "completed" ? "bg-green-500" : "bg-gray-300"}`}
                    ></div>
                    <span className="text-sm">Order Received</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full ${order.status === "ongoing" || order.status === "serving" || order.status === "completed" ? "bg-green-500" : "bg-gray-300"}`}
                    ></div>
                    <span className="text-sm">Preparation Started</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full ${order.status === "serving" || order.status === "completed" ? "bg-green-500" : "bg-gray-300"}`}
                    ></div>
                    <span className="text-sm">Ready to Serve</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full ${order.status === "completed" ? "bg-green-500" : "bg-gray-300"}`}
                    ></div>
                    <span className="text-sm">Order Completed</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Your Order</CardTitle>
                <CardDescription>{order.order_items.length} items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{item.menu_items.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.menu_items.sub_category === "veg" ? "🟢 Vegetarian" : "🔴 Non-Vegetarian"}
                        </p>
                        {item.modifiers && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <strong>Note:</strong> {item.modifiers}
                          </p>
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

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Table:</span>
                    <span>
                      {order.restaurant_tables.floors.floor_name} - Table {order.restaurant_tables.table_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{order.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests:</span>
                    <span>{order.guest_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Order Time:</span>
                    <span>{new Date(order.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <Separator />

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
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>If you have any questions about your order, please contact our staff.</p>
                  <div className="mt-4">
                    <p>
                      <strong>Restaurant Phone:</strong>
                    </p>
                    <p>+91 832 123 4567</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
