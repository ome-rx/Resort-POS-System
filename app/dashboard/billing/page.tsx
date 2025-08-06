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
    id: string
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

interface CreditPaymentData {
  room_number: string
  guest_name: string
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
  const [creditPaymentData, setCreditPaymentData] = useState<CreditPaymentData>({
    room_number: "",
    guest_name: ""
  })
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
            id,
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

    // Validate credit payment data
    if (paymentMethod === "credit") {
      if (!creditPaymentData.room_number.trim() || !creditPaymentData.guest_name.trim()) {
        toast({
          title: "Missing Information",
          description: "Please provide both room number and guest name for credit payment.",
          variant: "destructive",
        })
        return
      }
    }

    try {
      const updateData: any = {
        payment_method: paymentMethod,
        payment_status: paymentMethod === "credit" ? "credit" : "paid",
        status: "completed",
      }

      // Store credit payment details if applicable
      if (paymentMethod === "credit") {
        updateData.credit_details = JSON.stringify({
          room_number: creditPaymentData.room_number,
          guest_name: creditPaymentData.guest_name,
          processed_by: user?.full_name,
          processed_at: new Date().toISOString()
        })
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", selectedOrder.id)

      if (error) throw error

      // Update table status to available
      await supabase
        .from("restaurant_tables")
        .update({ status: "available" })
        .eq("id", selectedOrder.restaurant_tables.id)

      toast({
        title: "Payment Processed",
        description: paymentMethod === "credit" 
          ? `Credit payment processed for Room ${creditPaymentData.room_number} - ${creditPaymentData.guest_name}`
          : `Payment of ₹${selectedOrder.total_amount.toFixed(2)} has been processed.`,
      })

      setPaymentDialog(false)
      setSelectedOrder(null)
      setPaymentMethod("")
      setUpiQRCode("")
      setCreditPaymentData({ room_number: "", guest_name: "" })
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

  const generateBill = async (order: Order) => {
    try {
      const billContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Restaurant Bill - ${order.order_number}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .order-info { margin-bottom: 15px; }
        .items { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .items th, .items td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
        .items th { background-color: #f5f5f5; }
        .total-section { border-top: 2px solid #000; padding-top: 10px; margin-top: 15px; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; }
        .payment-info { background-color: #f9f9f9; padding: 10px; margin: 10px 0; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h2>RESORT RESTAURANT</h2>
        <p>Bill Receipt</p>
        <h3>Order #${order.order_number}</h3>
    </div>
    
    <div class="order-info">
        <strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}<br>
        <strong>Time:</strong> ${new Date(order.created_at).toLocaleTimeString()}<br>
        <strong>Table:</strong> ${order.restaurant_tables.floors.floor_name} - Table ${order.restaurant_tables.table_number}<br>
        <strong>Customer:</strong> ${order.customer_name}<br>
        <strong>Guests:</strong> ${order.guest_count}<br>
        <strong>Server:</strong> ${user?.full_name || 'N/A'}
    </div>
    
    <table class="items">
        <thead>
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${order.order_items.map(item => `
                <tr>
                    <td>
                        ${item.menu_items.name}
                        ${item.modifiers ? `<br><small style="color: #666;">${item.modifiers}</small>` : ''}
                    </td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unit_price.toFixed(2)}</td>
                    <td>₹${item.total_price.toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="total-section">
        <div style="display: flex; justify-content: space-between;">
            <strong>Subtotal:</strong>
            <strong>₹${order.subtotal.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <strong>Tax:</strong>
            <strong>₹${order.tax_amount.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 18px; margin-top: 10px;">
            <strong>TOTAL:</strong>
            <strong>₹${order.total_amount.toFixed(2)}</strong>
        </div>
    </div>
    
    ${order.payment_method ? `
        <div class="payment-info">
            <strong>Payment Method:</strong> ${order.payment_method.toUpperCase()}<br>
            <strong>Payment Status:</strong> ${order.payment_status.toUpperCase()}
            ${order.payment_method === 'credit' && order.credit_details ? `
                <br><strong>Room Details:</strong> ${JSON.parse(order.credit_details).room_number} - ${JSON.parse(order.credit_details).guest_name}
            ` : ''}
        </div>
    ` : ''}
    
    <div class="footer">
        <p>Thank you for dining with us!</p>
        <p>Visit us again soon</p>
        <p style="margin-top: 15px; font-size: 10px;">Generated on ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
      `

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(billContent)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }

      toast({
        title: "Bill Generated",
        description: "Bill has been generated and opened for printing.",
      })
    } catch (error) {
      console.error("Error generating bill:", error)
      toast({
        title: "Error",
        description: "Failed to generate bill.",
        variant: "destructive",
      })
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
      case "credit":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
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
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Ready for Payment ({filteredOrders.length})</CardTitle>
          <CardDescription>Process payments for completed orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Details</TableHead>
                  <TableHead>Customer & Table</TableHead>
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
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-gray-500">
                        {order.order_items.length} items
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-3 w-3 mr-1" />
                          {order.restaurant_tables.floors.floor_name} - Table {order.restaurant_tables.table_number}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="h-3 w-3 mr-1" />
                          {order.guest_count} guests
                        </div>
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
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
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
                                  setCreditPaymentData({ room_number: "", guest_name: "" })
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

                                {paymentMethod === "credit" && (
                                  <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <h4 className="font-medium text-purple-800 dark:text-purple-200">Credit Payment Details</h4>
                                    <div className="space-y-2">
                                      <Label htmlFor="room-number">Room Number</Label>
                                      <Input
                                        id="room-number"
                                        placeholder="Enter room number"
                                        value={creditPaymentData.room_number}
                                        onChange={(e) => setCreditPaymentData(prev => ({ ...prev, room_number: e.target.value }))}
                                        required
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="guest-name">Guest Name</Label>
                                      <Input
                                        id="guest-name"
                                        placeholder="Enter guest name"
                                        value={creditPaymentData.guest_name}
                                        onChange={(e) => setCreditPaymentData(prev => ({ ...prev, guest_name: e.target.value }))}
                                        required
                                      />
                                    </div>
                                    <div className="text-sm text-purple-700 dark:text-purple-300">
                                      This amount will be charged to the specified room.
                                    </div>
                                  </div>
                                )}

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
                                  <Button 
                                    onClick={handlePayment} 
                                    disabled={!paymentMethod || (paymentMethod === 'credit' && (!creditPaymentData.room_number.trim() || !creditPaymentData.guest_name.trim()))}
                                  >
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
