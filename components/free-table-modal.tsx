"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Banknote, Smartphone, Building } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import QRCode from "qrcode"

interface Order {
  id: string
  table_id: string
  customer_name: string
  guest_count: number
  total_amount: number
  status: string
  created_at: string
  order_items: {
    id: string
    menu_item: {
      name: string
      price: number
    }
    quantity: number
    custom_note?: string
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
  const [step, setStep] = useState<"payment" | "confirmation">("payment")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [upiQrCode, setUpiQrCode] = useState<string>("")
  const [creditDetails, setCreditDetails] = useState({
    roomNumber: "",
    guestName: "",
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (paymentMethod === "upi" && table?.current_order_id) {
      generateUpiQrCode()
    }
  }, [paymentMethod, table])

  const generateUpiQrCode = async () => {
    if (!table?.current_order_id) return

    try {
      const { data: orderData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("id", table.current_order_id)
        .single()

      if (!orderData) throw new Error("Order not found")

      const upiString = `upi://pay?pa=restaurant@upi&pn=Resort Restaurant&am=${orderData.total_amount}&cu=INR&tn=Table ${table.table_number} Payment`
      const qrCode = await QRCode.toDataURL(upiString, {
        width: 200,
        margin: 2,
      })
      setUpiQrCode(qrCode)
    } catch (error) {
      console.error("Error generating UPI QR code:", error)
    }
  }

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method)
    setCreditDetails({ roomNumber: "", guestName: "" })
  }

  const handleProcessPayment = async () => {
    if (!table?.current_order_id) return

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
        payment_status: "completed",
        ...(paymentMethod === "credit" && {
          credit_room_number: creditDetails.roomNumber,
          credit_guest_name: creditDetails.guestName,
        }),
      }

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          ...paymentData,
          status: "completed",
        })
        .eq("id", table.current_order_id)

      if (orderError) throw orderError

      const { error: tableError } = await supabase
        .from("tables")
        .update({ status: "available", current_order_id: null })
        .eq("id", table.id)

      if (tableError) throw tableError

      setStep("confirmation")
      toast({
        title: "Success",
        description: "Payment processed successfully",
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
    onClose()
    setStep("payment")
    setPaymentMethod("cash")
    setCreditDetails({ roomNumber: "", guestName: "" })
    toast({
      title: "Success",
      description: `Table ${table?.table_number} has been freed successfully`,
    })
  }

  const handleClose = () => {
    onClose()
    setStep("payment")
    setPaymentMethod("cash")
    setCreditDetails({ roomNumber: "", guestName: "" })
  }

  if (!table || !table.current_order_id) return null

  const { data: orderData } = supabase.from("orders").select("*").eq("id", table.current_order_id).single()

  const order = orderData as Order

  const subtotal = order.order_items.reduce((sum, item) => sum + item.menu_item.price * item.quantity, 0)
  const sgst = subtotal * 0.09
  const cgst = subtotal * 0.09
  const total = subtotal + sgst + cgst

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "payment" ? "Process Payment & Free Table" : "Confirm Table Release"}</DialogTitle>
          {step === "payment" && (
            <DialogDescription>
              Are you sure you want to free this table? This will mark any current order as completed.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "payment" ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order Summary</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-medium">{order.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guests:</span>
                  <span className="font-medium">{order.guest_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-medium">{new Date(order.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Items Ordered:</h4>
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b">
                    <div>
                      <span className="font-medium">{item.menu_item.name}</span>
                      <span className="text-gray-600 ml-2">x{item.quantity}</span>
                      {item.custom_note && <p className="text-sm text-gray-500 italic">Note: {item.custom_note}</p>}
                    </div>
                    <span className="font-medium">₹{(item.menu_item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>SGST (9%):</span>
                  <span>₹{sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>CGST (9%):</span>
                  <span>₹{cgst.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Payment Method</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  onClick={() => handlePaymentMethodSelect("cash")}
                  className="h-20 flex-col space-y-2"
                >
                  <Banknote className="h-6 w-6" />
                  <span>Cash</span>
                </Button>

                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => handlePaymentMethodSelect("card")}
                  className="h-20 flex-col space-y-2"
                >
                  <CreditCard className="h-6 w-6" />
                  <span>Card</span>
                </Button>

                <Button
                  variant={paymentMethod === "upi" ? "default" : "outline"}
                  onClick={() => handlePaymentMethodSelect("upi")}
                  className="h-20 flex-col space-y-2"
                >
                  <Smartphone className="h-6 w-6" />
                  <span>UPI</span>
                </Button>

                <Button
                  variant={paymentMethod === "credit" ? "default" : "outline"}
                  onClick={() => handlePaymentMethodSelect("credit")}
                  className="h-20 flex-col space-y-2"
                >
                  <Building className="h-6 w-6" />
                  <span>Credit</span>
                </Button>
              </div>

              {paymentMethod === "upi" && upiQrCode && (
                <div className="flex flex-col items-center space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium">Scan QR Code to Pay ₹{total.toFixed(2)}</p>
                  <img src={upiQrCode || "/placeholder.svg"} alt="UPI QR Code" className="w-48 h-48" />
                </div>
              )}

              {paymentMethod === "credit" && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium">Credit Payment Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="roomNumber">Room Number</Label>
                      <Input
                        id="roomNumber"
                        value={creditDetails.roomNumber}
                        onChange={(e) =>
                          setCreditDetails({
                            ...creditDetails,
                            roomNumber: e.target.value,
                          })
                        }
                        placeholder="e.g., 101"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="guestName">Guest Name</Label>
                      <Input
                        id="guestName"
                        value={creditDetails.guestName}
                        onChange={(e) =>
                          setCreditDetails({
                            ...creditDetails,
                            guestName: e.target.value,
                          })
                        }
                        placeholder="Guest full name"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleProcessPayment} disabled={loading}>
                {loading ? "Processing..." : "Process Payment"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Payment Completed Successfully</h3>
              <p className="text-gray-600">
                Payment of ₹{total.toFixed(2)} has been processed via {paymentMethod.toUpperCase()}
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

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Are you sure you want to free this table? This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-center space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Keep Table Occupied
              </Button>
              <Button onClick={handleConfirmFreeTable}>Confirm & Free Table</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
