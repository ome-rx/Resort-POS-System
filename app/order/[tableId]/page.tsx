"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Users, 
  UtensilsCrossed, 
  Clock, 
  CheckCircle, 
  Download,
  Receipt,
  ChefHat,
  Truck
} from "lucide-react"

interface Table {
  id: string
  table_number: number
  capacity: number
  floors: {
    floor_name: string
  }
}

interface Category {
  id: string
  name: string
  description: string
  display_order: number
}

interface MenuItem {
  id: string
  name: string
  category_id: string
  sub_category: string
  price: number
  description: string
  image_url: string | null
  is_available: boolean
  categories: {
    name: string
  }
  inventory: {
    current_stock: number
  }[]
}

interface OrderItem {
  id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  total_price: number
  modifiers: string
  menu_item: MenuItem
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  guest_count: number
  status: string
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_status: string
  created_at: string
  order_items: {
    id: string
    quantity: number
    unit_price: number
    total_price: number
    modifiers: string
    is_prepared: boolean
    menu_items: {
      name: string
      sub_category: string
    }
  }[]
}

interface CartItem {
  menu_item: MenuItem
  quantity: number
  modifiers: string
}

export default function CustomerOrderPage() {
  const params = useParams()
  const tableId = params.tableId as string
  const { toast } = useToast()
  
  const [table, setTable] = useState<Table | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [customerName, setCustomerName] = useState("")
  const [guestCount, setGuestCount] = useState(1)
  const [orderPlaced, setOrderPlaced] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (tableId) {
      fetchData()
      // Set up real-time subscription for order updates
      const subscription = supabase
        .channel('orders')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'orders', filter: `table_id=eq.${tableId}` },
          () => {
            fetchActiveOrders()
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'order_items' },
          () => {
            fetchActiveOrders()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    }
  }, [tableId])

  const fetchData = async () => {
    try {
      // Fetch table info
      const { data: tableData, error: tableError } = await supabase
        .from("restaurant_tables")
        .select(`
          *,
          floors(floor_name)
        `)
        .eq("id", tableId)
        .single()

      if (tableError) throw tableError
      setTable(tableData)

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order")

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Fetch menu items with inventory
      const { data: menuData, error: menuError } = await supabase
        .from("menu_items")
        .select(`
          *,
          categories(name),
          inventory(current_stock)
        `)
        .eq("is_available", true)
        .order("name")

      if (menuError) throw menuError
      setMenuItems(menuData || [])

      // Fetch active orders for this table
      await fetchActiveOrders()

    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load menu data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            modifiers,
            is_prepared,
            menu_items(name, sub_category)
          )
        `)
        .eq("table_id", tableId)
        .in("status", ["active", "ongoing", "serving"])
        .order("created_at", { ascending: false })

      if (error) throw error
      setActiveOrders(data || [])
    } catch (error) {
      console.error("Error fetching active orders:", error)
    }
  }

  const addToCart = (menuItem: MenuItem) => {
    const existingItem = cart.find(item => item.menu_item.id === menuItem.id)
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.menu_item.id === menuItem.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { menu_item: menuItem, quantity: 1, modifiers: "" }])
    }
    
    toast({
      title: "Added to Cart",
      description: `${menuItem.name} added to your cart.`,
    })
  }

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItemFromOrder(index)
      return
    }
    
    const updatedCart = [...cart]
    updatedCart[index].quantity = newQuantity
    setCart(updatedCart)
  }

  const updateItemModifiers = (index: number, modifiers: string) => {
    const updatedCart = [...cart]
    updatedCart[index].modifiers = modifiers
    setCart(updatedCart)
  }

  const removeItemFromOrder = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.menu_item.price * item.quantity), 0)
    const taxAmount = subtotal * 0.18 // 18% tax
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    }
  }

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before placing an order.",
        variant: "destructive",
      })
      return
    }

    if (!customerName.trim()) {
      toast({
        title: "Customer Name Required",
        description: "Please enter your name to place the order.",
        variant: "destructive",
      })
      return
    }

    try {
      const { subtotal, taxAmount, total } = calculateTotal()
      const orderNumber = `ORD-${Date.now()}`

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          table_id: tableId,
          customer_name: customerName,
          guest_count: guestCount,
          status: "active",
          subtotal: subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          payment_status: "pending"
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.menu_item.id,
        quantity: item.quantity,
        unit_price: item.menu_item.price,
        total_price: item.menu_item.price * item.quantity,
        modifiers: item.modifiers
      }))

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Update table status
      await supabase
        .from("restaurant_tables")
        .update({ status: "in_kitchen" })
        .eq("id", tableId)

      // Clear cart and show success
      setCart([])
      setOrderPlaced(true)
      
      toast({
        title: "Order Placed Successfully!",
        description: `Your order ${orderNumber} has been sent to the kitchen.`,
      })

      // Refresh active orders
      fetchActiveOrders()

    } catch (error) {
      console.error("Error placing order:", error)
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      })
    }
  }

  const downloadReceipt = async (order: Order) => {
    try {
      const receiptContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Order Receipt - ${order.order_number}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .order-info { margin-bottom: 15px; }
        .items { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .items th, .items td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
        .items th { background-color: #f5f5f5; }
        .total-section { border-top: 2px solid #000; padding-top: 10px; margin-top: 15px; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .status.active { background-color: #e3f2fd; color: #1976d2; }
        .status.ongoing { background-color: #fff3e0; color: #f57c00; }
        .status.serving { background-color: #e8f5e8; color: #388e3c; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h2>RESORT RESTAURANT</h2>
        <p>Order Receipt</p>
        <h3>Order #${order.order_number}</h3>
    </div>
    
    <div class="order-info">
        <strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}<br>
        <strong>Time:</strong> ${new Date(order.created_at).toLocaleTimeString()}<br>
        <strong>Table:</strong> ${table?.floors.floor_name} - Table ${table?.table_number}<br>
        <strong>Customer:</strong> ${order.customer_name}<br>
        <strong>Guests:</strong> ${order.guest_count}
    </div>
    
    <div class="status ${order.status}">
        <strong>Status:</strong> ${order.status.toUpperCase()}
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
                        ${item.menu_items.name} ${item.is_prepared ? '✓' : '⏳'}
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
            <strong>Tax (18%):</strong>
            <strong>₹${order.tax_amount.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 18px; margin-top: 10px;">
            <strong>TOTAL:</strong>
            <strong>₹${order.total_amount.toFixed(2)}</strong>
        </div>
    </div>
    
    <div class="footer">
        <p>Thank you for your order!</p>
        <p>Your food is being prepared with care</p>
        <p style="margin-top: 15px; font-size: 10px;">Generated on ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
      `

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(receiptContent)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }

      toast({
        title: "Receipt Downloaded",
        description: "Your receipt has been opened for download/printing.",
      })
    } catch (error) {
      console.error("Error downloading receipt:", error)
      toast({
        title: "Error",
        description: "Failed to download receipt.",
        variant: "destructive",
      })
    }
  }

  const getOrderStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return {
          icon: Clock,
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
          message: "Order received - Being prepared in kitchen"
        }
      case "ongoing":
        return {
          icon: ChefHat,
          color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
          message: "Currently cooking - Almost ready!"
        }
      case "serving":
        return {
          icon: Truck,
          color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
          message: "Ready to serve - Will be delivered shortly"
        }
      default:
        return {
          icon: CheckCircle,
          color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
          message: "Order status unknown"
        }
    }
  }

  const filteredMenuItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.category_id === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!table) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Table Not Found</h1>
          <p className="text-gray-600">The requested table could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Resort Restaurant</CardTitle>
            <CardDescription>
              {table.floors.floor_name} - Table {table.table_number} (Capacity: {table.capacity} guests)
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Active Orders Status */}
        {activeOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="mr-2 h-5 w-5" />
                Your Active Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeOrders.map((order) => {
                const statusInfo = getOrderStatusInfo(order.status)
                const StatusIcon = statusInfo.icon
                const preparedItems = order.order_items.filter(item => item.is_prepared).length
                
                return (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{order.order_number}</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadReceipt(order)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Receipt
                      </Button>
                    </div>
                    
                    <div className="flex items-center mb-3">
                      <StatusIcon className="h-5 w-5 mr-2" />
                      <Badge className={statusInfo.color}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                      <span className="ml-2 text-sm text-gray-600">{statusInfo.message}</span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Items: {order.order_items.length}</span>
                        <span>Prepared: {preparedItems}/{order.order_items.length}</span>
                        <span className="font-medium">₹{order.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(preparedItems / order.order_items.length) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {preparedItems === order.order_items.length 
                          ? "All items prepared - Ready to serve!" 
                          : `${preparedItems} of ${order.order_items.length} items ready`
                        }
                      </p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Customer Details */}
        {!orderPlaced && (
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Your Name</Label>
                  <Input
                    id="customer-name"
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-count">Number of Guests</Label>
                  <Select value={guestCount.toString()} onValueChange={(value) => setGuestCount(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: table.capacity }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'Guest' : 'Guests'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategory("all")}
                size="sm"
              >
                All Items
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.id)}
                  size="sm"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenuItems.map((item) => {
            const stock = item.inventory && item.inventory.length > 0 ? item.inventory[0].current_stock : 0
            const inStock = stock > 0
            
            return (
              <Card key={item.id} className={!inStock ? "opacity-50" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant="outline" className={
                      item.sub_category === 'veg' 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-red-50 text-red-700'
                    }>
                      {item.sub_category === 'veg' ? 'VEG' : 'NON-VEG'}
                    </Badge>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">₹{item.price.toFixed(2)}</span>
                    {inStock ? (
                      <Button onClick={() => addToCart(item)} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        Out of Stock
                      </Badge>
                    )}
                  </div>
                  {stock > 0 && stock <= 5 && (
                    <p className="text-xs text-orange-600 mt-1">Only {stock} left!</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Your Order ({cart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{item.menu_item.name}</h4>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(index, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(index, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => removeItemFromOrder(index)}>
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`modifiers-${index}`} className="text-xs">
                      Special Instructions
                    </Label>
                    <Textarea
                      id={`modifiers-${index}`}
                      placeholder="e.g., less spicy, no onions"
                      value={item.modifiers}
                      onChange={(e) => updateItemModifiers(index, e.target.value)}
                      className="text-sm"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">
                      ₹{item.menu_item.price.toFixed(2)} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      ₹{(item.menu_item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Order Total */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{calculateTotal().subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (18%):</span>
                    <span>₹{calculateTotal().taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>₹{calculateTotal().total.toFixed(2)}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={placeOrder} 
                  className="w-full mt-4" 
                  size="lg"
                  disabled={!customerName.trim()}
                >
                  <UtensilsCrossed className="mr-2 h-5 w-5" />
                  Place Order
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {orderPlaced && cart.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Order Placed Successfully!</h2>
              <p className="text-gray-600 mb-4">
                Your order has been sent to the kitchen. You can track its progress above.
              </p>
              <Button onClick={() => setOrderPlaced(false)}>
                Order More Items
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
