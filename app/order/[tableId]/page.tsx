"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Plus, Minus, ShoppingCart, Users, MapPin, Utensils, Leaf, Beef, Clock } from "lucide-react"

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
}

interface MenuItem {
  id: string
  name: string
  price: number
  description: string
  sub_category: "veg" | "non_veg"
  category_id: string
  is_available: boolean
}

interface OrderItem {
  menu_item_id: string
  menu_item: MenuItem
  quantity: number
  modifiers: string
  total_price: number
}

interface CustomerOrder {
  customer_name: string
  guest_count: number
  items: OrderItem[]
  subtotal: number
  tax_amount: number
  total_amount: number
}

export default function CustomerOrderPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const tableId = params.tableId as string

  const [table, setTable] = useState<Table | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("")

  const [customerOrder, setCustomerOrder] = useState<CustomerOrder>({
    customer_name: "",
    guest_count: 1,
    items: [],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [tableId])

  useEffect(() => {
    calculateTotals()
  }, [customerOrder.items])

  const fetchData = async () => {
    try {
      // Fetch table information
      const { data: tableData, error: tableError } = await supabase
        .from("restaurant_tables")
        .select(`
          *,
          floors(floor_name)
        `)
        .eq("id", tableId)
        .eq("is_active", true)
        .single()

      if (tableError) throw tableError
      if (!tableData) {
        toast({
          title: "Table Not Found",
          description: "The requested table could not be found.",
          variant: "destructive",
        })
        return
      }

      // Check if table is available
      if (tableData.status !== "available") {
        toast({
          title: "Table Unavailable",
          description: "This table is currently occupied or being served.",
          variant: "destructive",
        })
        return
      }

      setTable(tableData)

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order")

      // Fetch available menu items
      const { data: menuItemsData } = await supabase.from("menu_items").select("*").eq("is_available", true)

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
        description: "Failed to load menu data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    const subtotal = customerOrder.items.reduce((sum, item) => sum + item.total_price, 0)
    const tax_amount = subtotal * 0.05 // 5% tax (2.5% SGST + 2.5% CGST)
    const total_amount = subtotal + tax_amount

    setCustomerOrder((prev) => ({
      ...prev,
      subtotal,
      tax_amount,
      total_amount,
    }))
  }

  const addItemToOrder = (menuItem: MenuItem) => {
    const existingItemIndex = customerOrder.items.findIndex((item) => item.menu_item_id === menuItem.id)

    if (existingItemIndex >= 0) {
      const updatedItems = [...customerOrder.items]
      updatedItems[existingItemIndex].quantity += 1
      updatedItems[existingItemIndex].total_price = updatedItems[existingItemIndex].quantity * menuItem.price

      setCustomerOrder((prev) => ({
        ...prev,
        items: updatedItems,
      }))
    } else {
      const newItem: OrderItem = {
        menu_item_id: menuItem.id,
        menu_item: menuItem,
        quantity: 1,
        modifiers: "",
        total_price: menuItem.price,
      }

      setCustomerOrder((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }))
    }
  }

  const updateItemQuantity = (itemIndex: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(itemIndex)
      return
    }

    const updatedItems = [...customerOrder.items]
    updatedItems[itemIndex].quantity = newQuantity
    updatedItems[itemIndex].total_price = newQuantity * updatedItems[itemIndex].menu_item.price

    setCustomerOrder((prev) => ({
      ...prev,
      items: updatedItems,
    }))
  }

  const removeItemFromOrder = (itemIndex: number) => {
    const updatedItems = customerOrder.items.filter((_, index) => index !== itemIndex)
    setCustomerOrder((prev) => ({
      ...prev,
      items: updatedItems,
    }))
  }

  const updateItemModifiers = (itemIndex: number, modifiers: string) => {
    const updatedItems = [...customerOrder.items]
    updatedItems[itemIndex].modifiers = modifiers

    setCustomerOrder((prev) => ({
      ...prev,
      items: updatedItems,
    }))
  }

  const submitOrder = async () => {
    if (!customerOrder.customer_name || customerOrder.items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter your name and add at least one item.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now()}`

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          table_id: tableId,
          customer_name: customerOrder.customer_name,
          guest_count: customerOrder.guest_count,
          subtotal: customerOrder.subtotal,
          tax_amount: customerOrder.tax_amount,
          total_amount: customerOrder.total_amount,
          status: "active",
          payment_status: "pending",
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = customerOrder.items.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.menu_item.price,
        total_price: item.total_price,
        modifiers: item.modifiers,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

      if (itemsError) throw itemsError

      // Update table status
      const { error: tableError } = await supabase
        .from("restaurant_tables")
        .update({ status: "in_kitchen" })
        .eq("id", tableId)

      if (tableError) throw tableError

      // Update inventory
      for (const item of customerOrder.items) {
        const { error: inventoryError } = await supabase.rpc("update_inventory_stock", {
          p_menu_item_id: item.menu_item_id,
          p_quantity_used: item.quantity,
        })

        if (inventoryError) {
          console.error("Inventory update error:", inventoryError)
        }
      }

      toast({
        title: "Order Placed Successfully!",
        description: `Your order ${orderNumber} has been sent to the kitchen.`,
      })

      // Redirect to order confirmation page
      router.push(`/order/${tableId}/confirmation/${orderData.id}`)
    } catch (error) {
      console.error("Error creating order:", error)
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMenuItems = menuItems.filter((item) =>
    selectedCategory ? item.category_id === selectedCategory : true,
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Table Not Available</h3>
            <p className="text-gray-600 dark:text-gray-400">This table is not available for ordering.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Resort Restaurant</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>
                  {table.floors.floor_name} - Table {table.table_number}
                </span>
                <Users className="h-4 w-4 ml-2" />
                <span>Capacity: {table.capacity}</span>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Available for Ordering
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Information & Menu */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Your Name</Label>
                    <Input
                      id="customer_name"
                      placeholder="Enter your name"
                      value={customerOrder.customer_name}
                      onChange={(e) =>
                        setCustomerOrder((prev) => ({
                          ...prev,
                          customer_name: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guest_count">Number of People</Label>
                    <Input
                      id="guest_count"
                      type="number"
                      min="1"
                      max={table.capacity}
                      value={customerOrder.guest_count}
                      onChange={(e) =>
                        setCustomerOrder((prev) => ({
                          ...prev,
                          guest_count: Number.parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Menu Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Utensils className="mr-2 h-5 w-5" />
                  Our Menu
                </CardTitle>
                <CardDescription>Select items to add to your order</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                    {categories.map((category) => (
                      <TabsTrigger key={category.id} value={category.id}>
                        {category.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {categories.map((category) => (
                    <TabsContent key={category.id} value={category.id} className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredMenuItems.map((item) => (
                          <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h3 className="font-medium">{item.name}</h3>
                                    {item.sub_category === "veg" ? (
                                      <Leaf className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Beef className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
                                  <p className="text-lg font-bold text-blue-600">₹{item.price.toFixed(2)}</p>
                                </div>
                              </div>
                              <Button size="sm" className="w-full" onClick={() => addItemToOrder(item)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add to Order
                              </Button>
                            </CardContent>
                          </Card>
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
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Your Order
                </CardTitle>
                <CardDescription>{customerOrder.items.length} items selected</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerOrder.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>No items added yet</p>
                    <p className="text-sm">Browse our menu and add items to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {customerOrder.items.map((item, index) => (
                        <div key={index} className="space-y-3 pb-3 border-b last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium">{item.menu_item.name}</h4>
                              <p className="text-sm text-gray-600">₹{item.menu_item.price.toFixed(2)} each</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">₹{item.total_price.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
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
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{customerOrder.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>SGST (2.5%):</span>
                        <span>₹{(customerOrder.tax_amount / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>CGST (2.5%):</span>
                        <span>₹{(customerOrder.tax_amount / 2).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>₹{customerOrder.total_amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        className="w-full"
                        onClick={submitOrder}
                        disabled={submitting || customerOrder.items.length === 0 || !customerOrder.customer_name}
                      >
                        {submitting ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Placing Order...
                          </div>
                        ) : (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            Place Order
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-gray-500 text-center">
                        Your order will be sent directly to our kitchen. Estimated preparation time: 15-25 minutes.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
