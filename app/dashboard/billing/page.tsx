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
import { Search, CreditCard, Receipt, Download, QrCode, Users, MapPin, Clock } from "lucide-react"
import QRCodeLib from "qrcode"

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
      categories: {
        name: string
      }
    }
  }[]
}

export default function BillingPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [upiQRCode, setUpiQRCode] = useState<string>("")
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
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
        .in("status", ["serving", "completed"])
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

  const generateUPIQRCode = async (amount: number) => {
    try {
      const upiId = "7259911243@yespop"
      const upiString = `upi://pay?pa=${upiId}&am=${amount.toFixed(2)}&cu=INR&tn=Restaurant Bill Payment`

      const qrCodeDataUrl = await QRCodeLib.toDataURL(upiString, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      setUpiQRCode(qrCodeDataUrl)
    } catch (error) {
      console.error("Error generating UPI QR code:", error)
      toast({
        title: "Error",
        description: "Failed to generate UPI QR code.",
        variant: "destructive",
      })
    }
  }

  const handlePayment = async () => {
    if (!selectedOrder || !paymentMethod) return

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_method: paymentMethod,
          payment_status: paymentMethod === "credit" ? "credit" : "paid",
          status: "completed",
        })
        .eq("id", selectedOrder.id)

      if (error) throw error

      // Update table status to available
      await supabase
        .from("restaurant_tables")
        .update({ status: "available" })
        .eq("id", selectedOrder.restaurant_tables.id)

      toast({
        title: "Payment Processed",
        description: `Payment of ₹${selectedOrder.total_amount.toFixed(2)} has been processed.`,
      })

      setPaymentDialog(false)
      setSelectedOrder(null)
      setPaymentMethod("")
      setUpiQRCode("")
      fetchOrders()
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Error",
        description: "Failed to process payment.",
        variant: "destructive",
      })
    }
  }

  const generateBill = (order: Order) => {
    const billContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill - ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .restaurant-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .address { font-size: 12px; color: #666; }
            .bill-details { margin: 20px 0; }
            .bill-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f5f5f5; }
            .total-section { border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .grand-total { font-weight: bold; font-size: 18px; border-top: 1px solid #000; padding-top: 5px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="restaurant-name">RESORT RESTAURANT</div>
            <div class="address">Goa, India<br>Phone: +91 832 123 4567</div>
          </div>

          <div class="bill-details">
            <div class="bill-row"><span>Invoice No:</span><span>${order.order_number}</span></div>
            <div class="bill-row"><span>Date:</span><span>${new Date(order.created_at).toLocaleDateString()}</span></div>
            <div class="bill-row"><span>Time:</span><span>${new Date(order.created_at).toLocaleTimeString()}</span></div>
            <div class="bill-row"><span>Table:</span><span>${order.restaurant_tables.floors.floor_name} - Table ${order.restaurant_tables.table_number}</span></div>
            <div class="bill-row"><span>Customer:</span><span>${order.customer_name}</span></div>
            <div class="bill-row"><span>Guests:</span><span>${order.guest_count}</span></div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.order_items
                .map(
                  (item) => `
                <tr>
                  <td>
                    ${item.menu_items.name}
                    ${item.modifiers ? `<br><small style="color: #666;">Note: ${item.modifiers}</small>` : ""}
                  </td>
                  <td>${item.quantity}</td>
                  <td>₹${item.unit_price.toFixed(2)}</td>
                  <td>₹${item.total_price.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row"><span>Subtotal:</span><span>₹${order.subtotal.toFixed(2)}</span></div>
            <div class="total-row"><span>SGST (2.5%):</span><span>₹${(order.tax_amount / 2).toFixed(2)}</span></div>
            <div class="total-row"><span>CGST (2.5%):</span><span>₹${(order.tax_amount / 2).toFixed(2)}</span></div>
            <div class="total-row grand-total"><span>Grand Total:</span><span>₹${order.total_amount.toFixed(2)}</span></div>
          </div>

          <div class="footer">
            <p>Thank you for dining with us!</p>
            <p>Visit us again soon</p>
          </div>
        </body>
      </html>
    `

    const blob = new Blob([billContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Bill-${order.order_number}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || order.payment_status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (!hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access billing.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing & Payments</h1>
          <p className="text-gray-600 dark:text-gray-400">Process payments and generate bills</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Orders</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Order number or customer name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Payment Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Ready for Billing ({filteredOrders.length})</CardTitle>
          <CardDescription>Process payments for completed orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Details</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-sm text-gray-500">{order.order_items.length} items</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="mr-1 h-3 w-3" />
                          {order.guest_count} guests
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>
                          {order.restaurant_tables.floors.floor_name} - Table {order.restaurant_tables.table_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-lg">₹{order.total_amount.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">
                        Subtotal: ₹{order.subtotal.toFixed(2)} + Tax: ₹{order.tax_amount.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(order.payment_status)}>
                        {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => generateBill(order)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        {order.payment_status === "pending" && (
                          <Dialog
                            open={paymentDialog && selectedOrder?.id === order.id}
                            onOpenChange={setPaymentDialog}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setPaymentMethod("")
                                  setUpiQRCode("")
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Process Payment</DialogTitle>
                                <DialogDescription>Process payment for order {order.order_number}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold">₹{order.total_amount.toFixed(2)}</div>
                                    <div className="text-sm text-gray-600">Total Amount</div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="payment-method">Payment Method</Label>
                                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cash">Cash</SelectItem>
                                      <SelectItem value="card">Card</SelectItem>
                                      <SelectItem value="upi">UPI</SelectItem>
                                      <SelectItem value="credit">Credit (Room Charge)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {paymentMethod === "upi" && (
                                  <div className="space-y-4">
                                    <Button
                                      variant="outline"
                                      onClick={() => generateUPIQRCode(order.total_amount)}
                                      className="w-full"
                                    >
                                      <QrCode className="mr-2 h-4 w-4" />
                                      Generate UPI QR Code
                                    </Button>
                                    {upiQRCode && (
                                      <div className="text-center">
                                        <img
                                          src={upiQRCode || "/placeholder.svg"}
                                          alt="UPI QR Code"
                                          className="mx-auto mb-2"
                                        />
                                        <p className="text-sm text-gray-600">
                                          Scan with any UPI app to pay ₹{order.total_amount.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">UPI ID: 7259911243@yespop</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setPaymentDialog(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handlePayment} disabled={!paymentMethod}>
                                    Process Payment
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
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
              <p className="text-gray-500">No orders ready for billing.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
