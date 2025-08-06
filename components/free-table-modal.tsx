"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Banknote, Smartphone, Building } from 'lucide-react'
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import QRCode from "qrcode"

interface Order {
  id: string
  table_id: string
  customer_name: string
  guest_count: number
  total_amount: number
  subtotal: number
  tax_amount: number
  status: string
  created_at: string
  order_items: {
    id: string
    menu_item_id: string
    quantity: number
    unit_price: number
    total_price: number
    modifiers?: string
    menu_items: {
      name: string
      price: number
    }
  }[]
}

interface Table {
  id: string
  table_number: number
  capacity: number
  status: string
  current_order_id?: string
}

interface FreeTableModalProps {
  isOpen: boolean
  onClose: () => void
  table: Table | null
  onSuccess: () => void
}

type PaymentMethod = "cash" | "card" | "upi" | "credit"

export function FreeTableModal({ isOpen, onClose, table, onSuccess }: FreeTableModalProps) {
  const [step, setStep] = useState<"loading" | "payment" | "confirmation">("loading")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [upiQrCode, setUpiQrCode] = useState<string>("")
  const [creditDetails, setCreditDetails] = useState({
    roomNumber: "",
    guestName: "",
  })
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && table?.current_order_id) {
      fetchOrderDetails()
    }
  }, [isOpen, table])

  useEffect(() => {
    if (paymentMethod === "upi" && order) {
      generateUpiQrCode()
    }
  }, [paymentMethod, order])

  const fetchOrderDetails = async () => {
    if (!table?.current_order_id) return

    try {
      setStep("loading")
      const { data: orderData, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            menu_items (name, price)
          )
        `)
        .eq("id", table.current_order_id)
        .single()

      if (error) throw error

      setOrder(orderData)
      setStep("payment")
    } catch (error) {
      console.error("Error fetching order:", error)
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      })
      onClose()
    }
  }

  const generateUpiQrCode = async () => {
    if (!order) return

    try {
      const amount = order.total_amount
      const upiString = `upi://pay?pa=restaurant@upi&pn=Resort Restaurant&am=${amount}&cu=INR&tn=Table ${table?.table_number} Payment - Order ${order.id.slice(-6)}`
      
      const qrCode = await QRCode.toDataURL(upiString, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setUpiQrCode(qrCode)
    } catch (error) {
      console.error("Error generating UPI QR code:", error)
      toast({
        title: "Error",
        description: "Failed to generate UPI QR code",
        variant: "destructive",
      })
    }
  }

  const handleProcessPayment = async () => {
    if (!order || !table) return

    if (paymentMethod === "credit") {
      if (!creditDetails.roomNumber.trim() || !creditDetails.guestName.trim()) {
        toast({
          title: "Error",
          description: "Please provide both room number and guest name for credit payment",
          variant: "destructive",
        })
        return
      }
    }

    setLoading(true)

    try {
      const paymentData = {
        payment_method: paymentMethod,
        payment_status: paymentMethod === "credit" ? "credit" : "paid",
        status: "completed",
        ...(paymentMethod === "credit" && {
          room_number: creditDetails.roomNumber,
          guest_name: creditDetails.guestName,
        }),
      }

      // Update order
      const { error: orderError } = await supabase
        .from("orders")
        .update(paymentData)
        .eq("id", order.id)

      if (orderError) throw orderError

      // Update table status
      const { error: tableError } = await supabase
        .from("restaurant_tables")
        .update({ 
          status: "available", 
          current_order_id: null 
        })
        .eq("id", table.id)

      if (tableError) throw tableError

      setStep("confirmation")
      toast({
        title: "Payment Processed",
        description: `Payment of ₹${order.total_amount.toFixed(2)} processed successfully`,
      })
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmFreeTable = () => {
    onSuccess()
    handleClose()
    toast({
      title: "Table Freed",
      description: `Table ${table?.table_number} is now available`,
    })
  }

  const handleClose = () => {
    onClose()
    setStep("loading")
    setPaymentMethod("cash")
    setCreditDetails({ roomNumber: "", guestName: "" })
    setOrder(null)
    setUpiQrCode("")
  }

  if (!table) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "loading" ? "Loading Order Details..." 
             : step === "payment" ? "Process Payment & Free Table" 
             : "Payment Completed"}
          </DialogTitle>
          {step === "payment" && (
            <DialogDescription>
              Complete the payment for Table {table.table_number} to free the table.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "loading" && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {step === "payment" && order && (
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary - Table {table.table_number}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests:</span>
                    <span>{order.guest_count}</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {order.order_items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.menu_items.name} × {item.quantity}</span>
                        <span>₹{item.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>₹{order.tax_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>₹{order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <div className="space-y-4">
              <Label>Select Payment Method:</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("cash")}
                  className="h-16"
                >
                  <Banknote className="w-6 h-6 mr-2" />
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("card")}
                  className="h-16"
                >
                  <CreditCard className="w-6 h-6 mr-2" />
                  Card
                </Button>
                <Button
                  variant={paymentMethod === "upi" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("upi")}
                  className="h-16"
                >
                  <Smartphone className="w-6 h-6 mr-2" />
                  UPI
                </Button>
                <Button
                  variant={paymentMethod === "credit" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("credit")}
                  className="h-16"
                >
                  <Building className="w-6 h-6 mr-2" />
                  Room Credit
                </Button>
              </div>
            </div>

            {/* UPI QR Code */}
            {paymentMethod === "upi" && upiQrCode && (
              <Card>
                <CardHeader>
                  <CardTitle>Scan to Pay</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <img src={upiQrCode} alt="UPI QR Code" className="mx-auto mb-4" />
                  <p className="text-sm text-gray-600">
                    Amount: ₹{order.total_amount.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Credit Details */}
            {paymentMethod === "credit" && (
              <Card>
                <CardHeader>
                  <CardTitle>Room Credit Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="roomNumber">Room Number</Label>
                    <Input
                      id="roomNumber"
                      value={creditDetails.roomNumber}
                      onChange={(e) => setCreditDetails(prev => ({
                        ...prev,
                        roomNumber: e.target.value
                      }))}
                      placeholder="Enter room number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="guestName">Guest Name</Label>
                    <Input
                      id="guestName"
                      value={creditDetails.guestName}
                      onChange={(e) => setCreditDetails(prev => ({
                        ...prev,
                        guestName: e.target.value
                      }))}
                      placeholder="Enter guest name"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleProcessPayment} disabled={loading}>
                {loading ? "Processing..." : "Process Payment"}
              </Button>
            </div>
          </div>
        )}

        {step === "confirmation" && order && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Payment Completed Successfully</h3>
              <p className="text-gray-600">
                Payment of ₹{order.total_amount.toFixed(2)} has been processed via {paymentMethod.toUpperCase()}
              </p>
              {paymentMethod === "credit" && (
                <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>Room:</strong> {creditDetails.roomNumber} | <strong>Guest:</strong>{" "}
                    {creditDetails.guestName}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Keep Table Occupied
              </Button>
              <Button onClick={handleConfirmFreeTable}>
                Confirm & Free Table
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}