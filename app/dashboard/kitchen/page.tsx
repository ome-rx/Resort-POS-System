"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Clock, ChefHat, Users, MapPin, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  total_price: number
  modifiers: string
  is_prepared: boolean
  menu_item: {
    name: string
    sub_category: string
  }
}

interface KitchenOrder {
  id: string
  order_number: string
  customer_name: string
  guest_count: number
  status: string
  created_at: string
  table: {
    table_number: number
    floors: {
      floor_name: string
    }
  }
  order_items: OrderItem[]
}

export default function KitchenDisplayPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchKitchenOrders()

    // Set up real-time subscription
    const subscription = supabase
      .channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchKitchenOrders()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        fetchKitchenOrders()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchKitchenOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          restaurant_tables!inner(
            table_number,
            floors(floor_name)
          ),
          order_items(
            *,
            menu_items(name, sub_category)
          )
        `)
        .in("status", ["active", "ongoing"])
        .order("created_at", { ascending: true })

      if (error) throw error

      const formattedOrders =
        data?.map((order) => ({
          ...order,
          table: order.restaurant_tables,
          order_items: order.order_items.map((item: any) => ({
            ...item,
            menu_item: item.menu_items,
          })),
        })) || []

      setOrders(formattedOrders)
    } catch (error) {
      console.error("Error fetching kitchen orders:", error)
      toast({
        title: "Error",
        description: "Failed to load kitchen orders.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleItemPrepared = async (orderId: string, itemId: string, isPrepared: boolean) => {
    try {
      const { error } = await supabase
        .from("order_items")
        .update({
          is_prepared: isPrepared,
          prepared_at: isPrepared ? new Date().toISOString() : null,
        })
        .eq("id", itemId)

      if (error) throw error

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                order_items: order.order_items.map((item) =>
                  item.id === itemId ? { ...item, is_prepared: isPrepared } : item,
                ),
              }
            : order,
        ),
      )

      // Check if all items are prepared
      const order = orders.find((o) => o.id === orderId)
      if (order) {
        const updatedItems = order.order_items.map((item) =>
          item.id === itemId ? { ...item, is_prepared: isPrepared } : item,
        )
        const allPrepared = updatedItems.every((item) => item.is_prepared)

        if (allPrepared && isPrepared) {
          // Automatically mark order as serving
          await markOrderAsServing(orderId)
        }
      }
    } catch (error) {
      console.error("Error updating item status:", error)
      toast({
        title: "Error",
        description: "Failed to update item status.",
        variant: "destructive",
      })
    }
  }

  const markOrderAsServing = async (orderId: string) => {
    try {
      const { error: orderError } = await supabase.from("orders").update({ status: "serving" }).eq("id", orderId)

      if (orderError) throw orderError

      // Update table status
      const order = orders.find((o) => o.id === orderId)
      if (order) {
        const { error: tableError } = await supabase
          .from("restaurant_tables")
          .update({ status: "serving" })
          .eq("id", order.table_id)

        if (tableError) throw tableError
      }

      toast({
        title: "Order Ready",
        description: "Order marked as ready for serving.",
      })

      fetchKitchenOrders()
    } catch (error) {
      console.error("Error marking order as serving:", error)
      toast({
        title: "Error",
        description: "Failed to mark order as serving.",
        variant: "destructive",
      })
    }
  }

  const getOrderPriority = (createdAt: string) => {
    const orderTime = new Date(createdAt)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60))

    if (diffMinutes > 30) return "high"
    if (diffMinutes > 15) return "medium"
    return "low"
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500 bg-red-50 dark:bg-red-900/20"
      case "medium":
        return "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
      default:
        return "border-green-500 bg-green-50 dark:bg-green-900/20"
    }
  }

  const getTimeSinceOrder = (createdAt: string) => {
    const orderTime = new Date(createdAt)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes === 1) return "1 minute ago"
    return `${diffMinutes} minutes ago`
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kitchen Display System</h1>
          <p className="text-gray-600 dark:text-gray-400">Track and manage order preparation</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {orders.length} Active Orders
          </Badge>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ChefHat className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders in kitchen</h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              All caught up! New orders will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const priority = getOrderPriority(order.created_at)
            const allItemsPrepared = order.order_items.every((item) => item.is_prepared)
            const preparedCount = order.order_items.filter((item) => item.is_prepared).length
            const totalItems = order.order_items.length

            return (
              <Card
                key={order.id}
                className={cn(
                  "border-2 transition-all duration-200",
                  getPriorityColor(priority),
                  allItemsPrepared && "ring-2 ring-green-500",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {priority === "high" && <AlertCircle className="h-5 w-5 text-red-500" />}
                      <Badge variant={order.status === "active" ? "default" : "secondary"}>
                        {order.status === "active" ? "New" : "In Progress"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {order.table.floors.floor_name} - Table {order.table.table_number}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{order.guest_count}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="font-medium">{order.customer_name}</p>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{getTimeSinceOrder(order.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Progress: {preparedCount}/{totalItems} items
                    </span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(preparedCount / totalItems) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border",
                        item.is_prepared
                          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                          : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700",
                      )}
                    >
                      <Checkbox
                        checked={item.is_prepared}
                        onCheckedChange={(checked) => toggleItemPrepared(order.id, item.id, checked as boolean)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={cn("font-medium", item.is_prepared && "line-through text-gray-500")}>
                            {item.quantity}x {item.menu_item.name}
                          </span>
                          <Badge
                            variant={item.menu_item.sub_category === "veg" ? "outline" : "secondary"}
                            className={cn(
                              "text-xs",
                              item.menu_item.sub_category === "veg"
                                ? "border-green-500 text-green-700"
                                : "border-red-500 text-red-700",
                            )}
                          >
                            {item.menu_item.sub_category === "veg" ? "VEG" : "NON-VEG"}
                          </Badge>
                        </div>
                        {item.modifiers && (
                          <p className="text-sm text-orange-600 mt-1">
                            <strong>Note:</strong> {item.modifiers}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {allItemsPrepared && (
                    <div className="pt-3 border-t">
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => markOrderAsServing(order.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Ready to Serve
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
