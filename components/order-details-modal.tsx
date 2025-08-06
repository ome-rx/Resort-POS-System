"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Printer } from "lucide-react"

interface OrderItem {
  id: string
  quantity: number
  price: number
  menu_items: {
    name: string
    category: string
  }
}

interface Order {
  id: string
  table_number: number
  customer_name?: string
  total_amount: number
  status: string
  created_at: string
  order_items: OrderItem[]
}

interface OrderDetailsModalProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function OrderDetailsModal({ order, open, onOpenChange, onSuccess }: OrderDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return

    setLoading(true)
    try {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id)

      if (error) throw error

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!order) return

    const printContent = `
      <div style="font-family: monospace; max-width: 300px;">
        <h2 style="text-align: center;">RESTAURANT NAME</h2>
        <p style="text-align: center;">Order #${order.id.slice(-6)}</p>
        <p>Table: ${order.table_number}</p>
        ${order.customer_name ? `<p>Customer: ${order.customer_name}</p>` : ""}
        <p>Date: ${new Date(order.created_at).toLocaleString()}</p>
        <hr>
        ${order.order_items
          .map(
            (item) => `
          <div style="display: flex; justify-content: space-between;">
            <span>${item.quantity}x ${item.menu_items.name}</span>
            <span>₹${(item.quantity * item.price).toFixed(2)}</span>
          </div>
        `,
          )
          .join("")}
        <hr>
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>Total:</span>
          <span>₹${order.total_amount.toFixed(2)}</span>
        </div>
        <p style="text-align: center; margin-top: 20px;">Thank you for dining with us!</p>
      </div>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "preparing":
        return "bg-blue-100 text-blue-800"
      case "ready":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            Table {order.table_number} • Order #{order.id.slice(-6)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
          </div>

          {order.customer_name && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Customer</span>
              <span className="text-sm">{order.customer_name}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order Time</span>
            <span className="text-sm">{new Date(order.created_at).toLocaleString()}</span>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Order Items</h4>
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <span className="text-sm">
                    {item.quantity}x {item.menu_items.name}
                  </span>
                  <p className="text-xs text-muted-foreground">{item.menu_items.category}</p>
                </div>
                <span className="text-sm font-medium">₹{(item.quantity * item.price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex justify-between items-center font-medium">
            <span>Total Amount</span>
            <span>₹{order.total_amount.toFixed(2)}</span>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>

            {order.status === "pending" && (
              <Button size="sm" onClick={() => handleStatusUpdate("preparing")} disabled={loading}>
                Start Preparing
              </Button>
            )}

            {order.status === "preparing" && (
              <Button size="sm" onClick={() => handleStatusUpdate("ready")} disabled={loading}>
                Mark Ready
              </Button>
            )}

            {order.status === "ready" && (
              <Button size="sm" onClick={() => handleStatusUpdate("completed")} disabled={loading}>
                Complete Order
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
