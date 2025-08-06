"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Users, Clock, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Floor {
  id: string
  floor_name: string
  floor_number: number
}

interface Table {
  id: string
  table_number: number
  capacity: number
  status: "available" | "in_kitchen" | "serving"
  floor_id: string
  current_order?: {
    customer_name: string
    guest_count: number
    created_at: string
  }
}

export default function TablesPage() {
  const { user } = useAuth()
  const [floors, setFloors] = useState<Floor[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFloor, setSelectedFloor] = useState<string>("")
  const supabase = createClient()

  useEffect(() => {
    fetchFloorsAndTables()
  }, [])

  const fetchFloorsAndTables = async () => {
    try {
      // Fetch floors
      const { data: floorsData } = await supabase.from("floors").select("*").eq("is_active", true).order("floor_number")

      if (floorsData) {
        setFloors(floorsData)
        if (floorsData.length > 0 && !selectedFloor) {
          setSelectedFloor(floorsData[0].id)
        }
      }

      // Fetch tables with current orders
      const { data: tablesData } = await supabase
        .from("restaurant_tables")
        .select(`
          *,
          orders!inner(
            customer_name,
            guest_count,
            created_at,
            status
          )
        `)
        .eq("is_active", true)
        .in("orders.status", ["active", "ongoing", "serving"])

      // Also fetch tables without orders
      const { data: emptyTablesData } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("is_active", true)
        .eq("status", "available")

      const allTables = [
        ...(tablesData || []).map((table) => ({
          ...table,
          current_order: table.orders?.[0],
        })),
        ...(emptyTablesData || []),
      ]

      setTables(allTables)
    } catch (error) {
      console.error("Error fetching tables:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-white border-gray-200 hover:bg-gray-50"
      case "in_kitchen":
        return "bg-blue-50 border-blue-200 hover:bg-blue-100"
      case "serving":
        return "bg-green-50 border-green-200 hover:bg-green-100"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <Badge variant="outline" className="bg-white text-gray-700">
            Available
          </Badge>
        )
      case "in_kitchen":
        return <Badge className="bg-blue-600 text-white">In Kitchen</Badge>
      case "serving":
        return <Badge className="bg-green-600 text-white">Serving</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const filteredTables = tables.filter((table) => (selectedFloor ? table.floor_id === selectedFloor : true))

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Table Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor table status and manage reservations</p>
        </div>
        {(user?.role === "super_admin" || user?.role === "owner" || user?.role === "manager") && (
          <Button asChild>
            <Link href="/dashboard/tables/manage">
              <Plus className="mr-2 h-4 w-4" />
              Manage Tables
            </Link>
          </Button>
        )}
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
            {/* Floor Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-white border-2 border-gray-300 rounded"></div>
                    <span className="text-sm font-medium">Available</span>
                    <span className="text-lg font-bold">
                      {filteredTables.filter((t) => t.status === "available").length}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-sm font-medium">In Kitchen</span>
                    <span className="text-lg font-bold">
                      {filteredTables.filter((t) => t.status === "in_kitchen").length}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-sm font-medium">Serving</span>
                    <span className="text-lg font-bold">
                      {filteredTables.filter((t) => t.status === "serving").length}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Total Tables</span>
                    <span className="text-lg font-bold">{filteredTables.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredTables
                .sort((a, b) => a.table_number - b.table_number)
                .map((table) => (
                  <Card
                    key={table.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      getStatusColor(table.status),
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="text-center space-y-2">
                        <div className="text-2xl font-bold">{table.table_number}</div>
                        <div className="flex justify-center">{getStatusBadge(table.status)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center justify-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>Seats {table.capacity}</span>
                          </div>
                        </div>

                        {table.current_order && (
                          <div className="text-xs space-y-1 pt-2 border-t">
                            <div className="font-medium">{table.current_order.customer_name}</div>
                            <div className="text-gray-500">{table.current_order.guest_count} guests</div>
                            <div className="flex items-center justify-center space-x-1 text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(table.current_order.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        )}

                        {table.status === "available" && (
                          <Button size="sm" className="w-full mt-2" asChild>
                            <Link href={`/dashboard/orders/new?table=${table.id}`}>Take Order</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
