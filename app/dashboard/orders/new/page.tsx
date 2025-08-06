"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
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
  floor?: Floor
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
    const tax_amount = subtotal * 0.05 // 5% tax (2.5% SGST + 2.5% CGST)
    const total_amount = subtotal + tax_amount

    setOrderForm((prev) => ({
      ...prev,
      subtotal,
      tax_amount,
      total_amount,
    }))
  }

  const addItemToOrder = (menuItem: MenuItem) => {
    const existingItemIndex = orderForm.items.findIndex((item) => item.menu_item_id === menuItem.id)

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const updatedItems = [...orderForm.items]
      updatedItems[existingItemIndex].quantity += 1
      updatedItems[existingItemIndex].total_price = updatedItems[existingItemIndex].quantity * menuItem.price

      setOrderForm((prev) => ({
        ...prev,
        items: updatedItems,
      }))
    } else {
      // Add new item
      const newItem: OrderItem = {
        menu_item_id: menuItem.id,
        menu_item: menuItem,
        quantity: 1,
        modifiers: "",
        total_price: menuItem.price,
      }

      setOrderForm((prev) => ({
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

    const updatedItems = [...orderForm.items]
    updatedItems[itemIndex].quantity = newQuantity
    updatedItems[itemIndex].total_price = newQuantity * updatedItems[itemIndex].menu_item.price

    setOrderForm((prev) => ({
      ...prev,
      items: updatedItems,
    }))
  }

  const removeItemFromOrder = (itemIndex: number) => {
    const updatedItems = orderForm.items.filter((_, index) => index !== itemIndex)
    setOrderForm((prev) => ({
      ...prev,
      items: updatedItems,
    }))
  }

  const updateItemModifiers = (itemIndex: number, modifiers: string) => {
    const updatedItems = [...orderForm.items]
    updatedItems[itemIndex].modifiers = modifiers

    setOrderForm((prev) => ({
      ...prev,
      items: updatedItems,
    }))
  }

  const submitOrder = async () => {
    if (!orderForm.table_id || !orderForm.customer_name || orderForm.items.length === 0) {
      toast({
        title: "Validation Error",
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
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          table_id: orderForm.table_id,
          customer_name: orderForm.customer_name,
          guest_count: orderForm.guest_count,
          subtotal: orderForm.subtotal,
          tax_amount: orderForm.tax_amount,
          total_amount: orderForm.total_amount,
          created_by: user?.id,
          status: "active",
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = orderForm.items.map((item) => ({
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
        .eq("id", orderForm.table_id)

      if (tableError) throw tableError

      // Update inventory
      for (const item of orderForm.items) {
        const { error: inventoryError } = await supabase.rpc("update_inventory_stock", {
          p_menu_item_id: item.menu_item_id,
          p_quantity_used: item.quantity,
        })

        if (inventoryError) {
          console.error("Inventory update error:", inventoryError)
        }
      }

      toast({
        title: "Order Created",
        description: `Order ${orderNumber} has been created successfully.`,
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

  const filteredMenuItems = menuItems.filter((item) =>
    selectedCategory ? item.category_id === selectedCategory : true,
  )

  const selectedTable = tables.find((table) => table.id === orderForm.table_id)

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Order</h1>
          <p className="text-gray-600 dark:text-gray-400">Take a new order for table service</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="table">Table Selection</Label>
                  <Select
                    value={orderForm.table_id}
                    onValueChange={(value) => setOrderForm((prev) => ({ ...prev, table_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {table.floors?.floor_name} - Table {table.table_number}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest_count">Number of Guests</Label>
                  <Input
                    id="guest_count"
                    type="number"
                    min="1"
                    value={orderForm.guest_count}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        guest_count: Number.parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  placeholder="Enter customer name"
                  value={orderForm.customer_name}
                  onChange={(e) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      customer_name: e.target.value,
                    }))
                  }
                />
              </div>

              {selectedTable && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">
                      {selectedTable.floors?.floor_name} - Table {selectedTable.table_number}
                    </span>
                    <Badge variant="outline">Capacity: {selectedTable.capacity}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Menu Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Utensils className="mr-2 h-5 w-5" />
                Menu Selection
              </CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Order Summary
              </CardTitle>
              <CardDescription>{orderForm.items.length} items in cart</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderForm.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No items added yet</div>
              ) : (
                <>
                  {orderForm.items.map((item, index) => (
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

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{orderForm.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>SGST (2.5%):</span>
                      <span>₹{(orderForm.tax_amount / 2).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>CGST (2.5%):</span>
                      <span>₹{(orderForm.tax_amount / 2).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>₹{orderForm.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={submitOrder}
                    disabled={submitting || orderForm.items.length === 0}
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Order...
                      </div>
                    ) : (
                      "Create Order"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
