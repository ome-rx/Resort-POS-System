"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, ShoppingCart, Users, MapPin, Utensils, Leaf, Beef } from "lucide-react"

interface Floor {
  id: string
  floor_name: string
  floor_number: number
}

interface Table {
  id: string
  table_number: number
  capacity: number
  status: string
  floor_id: string
  floors?: Floor  // Fixed: Changed from 'floor' to 'floors' to match database relationship
}

interface Category {
  id: string
  name: string
  description: string
}

interface MenuItem {
  id: string
  name: string
  price: number
  description: string
  sub_category: "veg" | "non_veg"
  category_id: string
  is_available: boolean
  image_url?: string
}

interface OrderItem {
  menu_item_id: string
  menu_item: MenuItem
  quantity: number
  modifiers: string
  total_price: number
}

interface OrderForm {
  table_id: string
  customer_name: string
  guest_count: number
  items: OrderItem[]
  subtotal: number
  tax_amount: number
  total_amount: number
}

export default function NewOrderPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  const [floors, setFloors] = useState<Floor[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [orderForm, setOrderForm] = useState<OrderForm>({
    table_id: searchParams.get("table") || "",
    customer_name: "",
    guest_count: 1,
    items: [],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  })

  const [selectedCategory, setSelectedCategory] = useState<string>("")

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    calculateTotals()
  }, [orderForm.items])

  const fetchData = async () => {
    try {
      // Fetch floors
      const { data: floorsData } = await supabase.from("floors").select("*").eq("is_active", true).order("floor_number")

      // Fetch available tables
      const { data: tablesData } = await supabase
        .from("restaurant_tables")
        .select(`
          *,
          floors(*)
        `)
        .eq("is_active", true)
        .eq("status", "available")

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order")

      // Fetch menu items
      const { data: menuItemsData } = await supabase.from("menu_items").select("*").eq("is_available", true)

      if (floorsData) setFloors(floorsData)
      if (tablesData) setTables(tablesData)
      if (categoriesData) {
        setCategories(categoriesData)
        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0].id)
        }
      }
      if (menuItemsData) setMenuItems(menuItemsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    const subtotal = orderForm.items.reduce((sum, item) => sum + item.total_price, 0)
    const tax_amount = subtotal * 0.18 // 18% tax
    const total_amount = subtotal + tax_amount

    setOrderForm(prev => ({
      ...prev,
      subtotal,
      tax_amount,
      total_amount
    }))
  }

  const addItemToOrder = (menuItem: MenuItem) => {
    const existingItem = orderForm.items.find(item => item.menu_item_id === menuItem.id)
    
    if (existingItem) {
      setOrderForm(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.menu_item_id === menuItem.id
            ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * menuItem.price }
            : item
        )
      }))
    } else {
      const newItem: OrderItem = {
        menu_item_id: menuItem.id,
        menu_item: menuItem,
        quantity: 1,
        modifiers: "",
        total_price: menuItem.price
      }
      setOrderForm(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }))
    }
  }

  const updateItemQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(menuItemId)
      return
    }

    setOrderForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.menu_item_id === menuItemId
          ? { ...item, quantity: newQuantity, total_price: newQuantity * item.menu_item.price }
          : item
      )
    }))
  }

  const removeItem = (menuItemId: string) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.menu_item_id !== menuItemId)
    }))
  }

  const updateModifiers = (menuItemId: string, modifiers: string) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.menu_item_id === menuItemId
          ? { ...item, modifiers }
          : item
      )
    }))
  }

  const submitOrder = async () => {
    if (!orderForm.table_id || !orderForm.customer_name || orderForm.items.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one item.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now()}`

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          table_id: orderForm.table_id,
          customer_name: orderForm.customer_name,
          guest_count: orderForm.guest_count,
          subtotal: orderForm.subtotal,
          tax_amount: orderForm.tax_amount,
          total_amount: orderForm.total_amount,
          status: "active",
          created_by: user?.id
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = orderForm.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.menu_item.price,
        total_price: item.total_price,
        modifiers: item.modifiers
      }))

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Update table status
      await supabase
        .from("restaurant_tables")
        .update({ 
          status: "occupied",
          current_order_id: order.id
        })
        .eq("id", orderForm.table_id)

      toast({
        title: "Success",
        description: `Order ${orderNumber} has been created successfully!`,
      })

      router.push("/dashboard/orders")
    } catch (error) {
      console.error("Error creating order:", error)
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMenuItems = menuItems.filter(item => 
    selectedCategory ? item.category_id === selectedCategory : true
  )

  const getTablesByFloor = (floorId: string) => {
    return tables.filter(table => table.floor_id === floorId)
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New Order</h1>
          <p className="text-gray-600 dark:text-gray-400">Create a new order for restaurant table</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Enter customer details for the order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Customer Name *</Label>
                  <Input
                    id="customer-name"
                    placeholder="Enter customer name"
                    value={orderForm.customer_name}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-count">Guest Count</Label>
                  <Input
                    id="guest-count"
                    type="number"
                    min="1"
                    value={orderForm.guest_count}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, guest_count: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              
              {/* Table Selection */}
              <div className="space-y-2">
                <Label htmlFor="table">Select Table *</Label>
                <Select value={orderForm.table_id} onValueChange={(value) => setOrderForm(prev => ({ ...prev, table_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {floors.map((floor) => (
                      <div key={floor.id}>
                        <div className="font-medium text-sm text-gray-500 px-2 py-1">
                          {floor.floor_name}
                        </div>
                        {getTablesByFloor(floor.id).map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            Table {table.table_number} (Capacity: {table.capacity})
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Menu Items */}
          <Card>
            <CardHeader>
              <CardTitle>Menu Items</CardTitle>
              <CardDescription>Select items to add to the order</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="grid w-full grid-cols-4">
                  {categories.slice(0, 4).map((category) => (
                    <TabsTrigger key={category.id} value={category.id}>
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {categories.map((category) => (
                  <TabsContent key={category.id} value={category.id} className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredMenuItems.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium flex items-center gap-2">
                                {item.name}
                                {item.sub_category === "veg" ? (
                                  <Leaf className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Beef className="h-4 w-4 text-red-600" />
                                )}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">₹{item.price}</p>
                              <Button size="sm" onClick={() => addItemToOrder(item)}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderForm.items.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items added yet</p>
              ) : (
                <>
                  {orderForm.items.map((item) => (
                    <div key={item.menu_item_id} className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium">{item.menu_item.name}</h5>
                          <p className="text-sm text-gray-600">₹{item.menu_item.price} each</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{item.total_price}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateItemQuantity(item.menu_item_id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateItemQuantity(item.menu_item_id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`modifiers-${item.menu_item_id}`} className="text-sm">Special Instructions</Label>
                        <Textarea
                          id={`modifiers-${item.menu_item_id}`}
                          placeholder="e.g., No spicy, extra cheese..."
                          value={item.modifiers}
                          onChange={(e) => updateModifiers(item.menu_item_id, e.target.value)}
                          className="text-sm"
                          rows={2}
                        />
                      </div>
                      
                      <Separator />
                    </div>
                  ))}
                  
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{orderForm.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (18%):</span>
                      <span>₹{orderForm.tax_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>₹{orderForm.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
              
              <Button 
                className="w-full" 
                onClick={submitOrder}
                disabled={submitting || orderForm.items.length === 0}
              >
                {submitting ? "Creating Order..." : "Create Order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
