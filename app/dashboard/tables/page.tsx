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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, MapPin, Users, Clock, CreditCard, Receipt, Building, AlertTriangle, CheckCircle, QrCode, Download, Settings, Table, Eye } from 'lucide-react'
import Link from "next/link"
import QRCodeLib from "qrcode"

interface Floor {
  id: string
  floor_name: string
  floor_number: number
  is_active: boolean
}

interface TableWithDetails {
  id: string
  table_number: number
  capacity: number
  status: string
  qr_code_url: string | null
  floors: {
    id: string
    floor_name: string
    floor_number: number
  }
  current_order?: {
    id: string
    order_number: string
    customer_name: string
    guest_count: number
    total_amount: number
    payment_status: string
    created_at: string
    order_items: {
      quantity: number
      menu_items: {
        name: string
      }
    }[]
  }
}

interface CreditPaymentData {
  room_number: string
  guest_name: string
}

export default function TablesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tables, setTables] = useState<TableWithDetails[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFloor, setSelectedFloor] = useState<string>("")
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [freeTableDialog, setFreeTableDialog] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableWithDetails | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [upiQRCode, setUpiQRCode] = useState<string>("")
  const [creditPaymentData, setCreditPaymentData] = useState<CreditPaymentData>({
    room_number: "",
    guest_name: ""
  })
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner", "manager", "waiter", "busser"])) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      // Fetch floors
      const { data: floorsData, error: floorsError } = await supabase
        .from("floors")
        .select("*")
        .eq("is_active", true)
        .order("floor_number")

      if (floorsError) throw floorsError
      setFloors(floorsData || [])
      
      if (floorsData && floorsData.length > 0 && !selectedFloor) {
        setSelectedFloor(floorsData[0].id)
      }

      // Fetch tables with current orders
      const { data: tablesData, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select(`
          *,
          floors(id, floor_name, floor_number)
        `)
        .eq("is_active", true)
        .order("table_number")

      if (tablesError) throw tablesError

      // For each table, get current active order if any
      const tablesWithOrders = await Promise.all(
        (tablesData || []).map(async (table) => {
          if (table.status !== 'available') {
            const { data: orderData } = await supabase
              .from("orders")
              .select(`
                id,
                order_number,
                customer_name,
                guest_count,
                total_amount,
                payment_status,
                created_at,
                order_items(
                  quantity,
                  menu_items(name)
                )
              `)
              .eq("table_id", table.id)
              .in("status", ["active", "ongoing", "serving"])
              .order("created_at", { ascending: false })
              .limit(1)
              .single()

            return {
              ...table,
              current_order: orderData || undefined
            }
          }
          return table
        })
      )

      setTables(tablesWithOrders)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load tables data.",
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

  const initiateTableFreeing = (table: TableWithDetails) => {
    if (table.status === 'available') {
      toast({
        title: "Table Already Available",
        description: "This table is already available.",
        variant: "destructive",
      })
      return
    }

    if (!table.current_order) {
      // If no current order, free the table directly
      freeTableDirectly(table)
      return
    }

    if (table.current_order.payment_status === 'paid') {
      // If already paid, just confirm freeing
      setSelectedTable(table)
      setFreeTableDialog(true)
    } else {
      // Route to payment first
      setSelectedTable(table)
      setPaymentMethod("")
      setUpiQRCode("")
      setCreditPaymentData({ room_number: "", guest_name: "" })
      setPaymentDialog(true)
    }
  }

  const processPaymentAndFree = async () => {
    if (!selectedTable || !selectedTable.current_order || !paymentMethod) return

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
        .eq("id", selectedTable.current_order.id)

      if (error) throw error

      toast({
        title: "Payment Processed",
        description: paymentMethod === "credit" 
          ? `Credit payment processed for Room ${creditPaymentData.room_number}`
          : `Payment of ₹${selectedTable.current_order.total_amount.toFixed(2)} processed.`,
      })

      setPaymentDialog(false)
      
      // Now show confirmation dialog for freeing table
      setFreeTableDialog(true)

    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Error",
        description: "Failed to process payment.",
        variant: "destructive",
      })
    }
  }

  const confirmFreeTable = async () => {
    if (!selectedTable) return

    try {
      // Update table status to available
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ status: "available" })
        .eq("id", selectedTable.id)

      if (error) throw error

      toast({
        title: "Table Freed",
        description: `Table ${selectedTable.table_number} has been freed and is now available.`,
      })

      setFreeTableDialog(false)
      setSelectedTable(null)
      setPaymentMethod("")
      setUpiQRCode("")
      setCreditPaymentData({ room_number: "", guest_name: "" })
      
      // Refresh data
      fetchData()

    } catch (error) {
      console.error("Error freeing table:", error)
      toast({
        title: "Error",
        description: "Failed to free table.",
        variant: "destructive",
      })
    }
  }

  const freeTableDirectly = async (table: TableWithDetails) => {
    if (!confirm(`Are you sure you want to free Table ${table.table_number}?`)) return

    try {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ status: "available" })
        .eq("id", table.id)

      if (error) throw error

      toast({
        title: "Table Freed",
        description: `Table ${table.table_number} has been freed.`,
      })

      fetchData()
    } catch (error) {
      console.error("Error freeing table:", error)
      toast({
        title: "Error",
        description: "Failed to free table.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "occupied":
        return "bg-red-100 text-red-800"
      case "reserved":
        return "bg-yellow-100 text-yellow-800"
      case "maintenance":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available": return '🟢'
      case "occupied": return '🔴'
      case "reserved": return '🟡'
      case "maintenance": return '⚙️'
      default: return '⚪'
    }
  }

  const filteredTables = tables.filter((table) => (selectedFloor ? table.floors.id === selectedFloor : true))

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    maintenance: tables.filter(t => t.status === 'maintenance').length,
  }

  if (!hasPermission(user?.role || "", ["super_admin", "owner", "manager", "waiter", "busser"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access table management.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Tables Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor all restaurant tables
          </p>
        </div>
        <div className="flex space-x-2">
          {(user?.role === "super_admin" || user?.role === "owner" || user?.role === "manager") && (
            <Link href="/dashboard/tables/manage">
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Manage Tables
              </Button>
            </Link>
          )}
          <Button asChild>
            <Link href="/dashboard/tables/manage">
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.reserved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.maintenance}</div>
          </CardContent>
        </Card>
      </div>

      {/* Floor Tabs */}
      <Tabs value={selectedFloor} onValueChange={setSelectedFloor}>
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-none lg:inline-flex">
          {floors.map((floor) => (
            <TabsTrigger key={floor.id} value={floor.id}>
              <MapPin className="mr-2 h-4 w-4" />
              {floor.floor_name}
            </TabsTrigger>
          ))}
        </TabsList>

        {floors.map((floor) => (
          <TabsContent key={floor.id} value={floor.id} className="space-y-6">
            {/* Tables Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTables.map((table) => (
                <Card key={table.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        <Table className="h-5 w-5 mr-2" />
                        {table.table_number}
                      </CardTitle>
                      <span className="text-2xl">{getStatusIcon(table.status)}</span>
                    </div>
                    <CardDescription className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      Capacity: {table.capacity} people
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge className={getStatusColor(table.status)}>
                      {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                    </Badge>
                    
                    {table.current_order && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Current Order: <span className="font-medium">{table.current_order.order_number}</span>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      {table.status === 'occupied' && table.current_order && (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => console.log('View Order')}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Order
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(table.qr_code_url!, '_blank')}>
                        <QrCode className="h-4 w-4 mr-1" />
                        QR Code
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payment to Free Table</DialogTitle>
            <DialogDescription>
              Payment is required before freeing Table {selectedTable?.table_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTable?.current_order && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">₹{selectedTable.current_order.total_amount.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Total Amount Due</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Order: {selectedTable.current_order.order_number}
                  </div>
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
                    onClick={() => generateUPIQRCode(selectedTable.current_order!.total_amount)}
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
                        Scan with any UPI app to pay ₹{selectedTable.current_order.total_amount.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={processPaymentAndFree} 
                  disabled={!paymentMethod || (paymentMethod === 'credit' && (!creditPaymentData.room_number.trim() || !creditPaymentData.guest_name.trim()))}
                >
                  Process Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Free Table Confirmation Dialog */}
      <Dialog open={freeTableDialog} onOpenChange={setFreeTableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Free Table</DialogTitle>
            <DialogDescription>
              Are you sure you want to free Table {selectedTable?.table_number}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center text-green-800 dark:text-green-200">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Payment Completed</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Table {selectedTable?.table_number} can now be freed for new customers.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setFreeTableDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmFreeTable}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Free Table
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
