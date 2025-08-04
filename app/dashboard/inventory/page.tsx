"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth, hasPermission } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Package, AlertTriangle, Plus, Search, TrendingUp, TrendingDown } from "lucide-react"

interface InventoryItem {
  id: string
  total_quantity: number
  current_stock: number
  low_stock_threshold: number
  last_restocked_at: string | null
  menu_items: {
    id: string
    name: string
    price: number
    categories: {
      name: string
    }
  }
  users?: {
    full_name: string
  }
}

export default function InventoryPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [restockDialog, setRestockDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [restockQuantity, setRestockQuantity] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
      fetchInventory()
    }
  }, [user])

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          *,
          menu_items(
            id,
            name,
            price,
            categories(name)
          ),
          users(full_name)
        `)
        .order("current_stock", { ascending: true })

      if (error) throw error
      setInventory(data || [])
    } catch (error) {
      console.error("Error fetching inventory:", error)
      toast({
        title: "Error",
        description: "Failed to load inventory data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestock = async () => {
    if (!selectedItem || restockQuantity <= 0) return

    try {
      const newTotalQuantity = selectedItem.total_quantity + restockQuantity
      const newCurrentStock = selectedItem.current_stock + restockQuantity

      const { error } = await supabase
        .from("inventory")
        .update({
          total_quantity: newTotalQuantity,
          current_stock: newCurrentStock,
          last_restocked_at: new Date().toISOString(),
          restocked_by: user?.id,
        })
        .eq("id", selectedItem.id)

      if (error) throw error

      toast({
        title: "Stock Updated",
        description: `Added ${restockQuantity} units to ${selectedItem.menu_items.name}`,
      })

      setRestockDialog(false)
      setSelectedItem(null)
      setRestockQuantity(0)
      fetchInventory()
    } catch (error) {
      console.error("Error restocking item:", error)
      toast({
        title: "Error",
        description: "Failed to update stock.",
        variant: "destructive",
      })
    }
  }

  const updateLowStockThreshold = async (itemId: string, threshold: number) => {
    try {
      const { error } = await supabase.from("inventory").update({ low_stock_threshold: threshold }).eq("id", itemId)

      if (error) throw error

      toast({
        title: "Threshold Updated",
        description: "Low stock threshold has been updated.",
      })

      fetchInventory()
    } catch (error) {
      console.error("Error updating threshold:", error)
      toast({
        title: "Error",
        description: "Failed to update threshold.",
        variant: "destructive",
      })
    }
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0)
      return { status: "out", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" }
    if (item.current_stock <= item.low_stock_threshold)
      return { status: "low", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" }
    return { status: "good", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" }
  }

  const filteredInventory = inventory.filter((item) =>
    item.menu_items.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const lowStockItems = inventory.filter((item) => item.current_stock <= item.low_stock_threshold)
  const outOfStockItems = inventory.filter((item) => item.current_stock === 0)

  if (!hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access inventory management.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Track and manage restaurant inventory</p>
        </div>
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-xs text-muted-foreground">Menu items tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Items unavailable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{inventory.reduce((sum, item) => sum + item.current_stock * item.menu_items.price, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search inventory items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items ({filteredInventory.length})</CardTitle>
          <CardDescription>Manage stock levels and restock items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Low Stock Alert</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Last Restocked</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => {
                  const stockStatus = getStockStatus(item)
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.menu_items.name}</div>
                        <div className="text-sm text-gray-500">₹{item.menu_items.price.toFixed(2)} per unit</div>
                      </TableCell>
                      <TableCell>{item.menu_items.categories.name}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.current_stock}</div>
                        <div className="text-sm text-gray-500">of {item.total_quantity} total</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={item.low_stock_threshold}
                            onChange={(e) => {
                              const newThreshold = Number.parseInt(e.target.value) || 0
                              updateLowStockThreshold(item.id, newThreshold)
                            }}
                            className="w-20"
                            min="0"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={stockStatus.color}>
                          {stockStatus.status === "out" && "Out of Stock"}
                          {stockStatus.status === "low" && "Low Stock"}
                          {stockStatus.status === "good" && "In Stock"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{(item.current_stock * item.menu_items.price).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.last_restocked_at ? (
                          <div>
                            <div className="text-sm">{new Date(item.last_restocked_at).toLocaleDateString()}</div>
                            {item.users && <div className="text-xs text-gray-500">by {item.users.full_name}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-500">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog open={restockDialog && selectedItem?.id === item.id} onOpenChange={setRestockDialog}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item)
                                setRestockQuantity(0)
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Restock
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Restock Item</DialogTitle>
                              <DialogDescription>Add stock for {item.menu_items.name}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Current Stock:</span>
                                  <div className="font-medium">{item.current_stock} units</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Total Made:</span>
                                  <div className="font-medium">{item.total_quantity} units</div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="restock-quantity">Quantity to Add</Label>
                                <Input
                                  id="restock-quantity"
                                  type="number"
                                  min="1"
                                  value={restockQuantity}
                                  onChange={(e) => setRestockQuantity(Number.parseInt(e.target.value) || 0)}
                                  placeholder="Enter quantity to add"
                                />
                              </div>

                              {restockQuantity > 0 && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                  <div className="text-sm">
                                    <div>
                                      New Stock Level: <strong>{item.current_stock + restockQuantity} units</strong>
                                    </div>
                                    <div>
                                      New Total Made: <strong>{item.total_quantity + restockQuantity} units</strong>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setRestockDialog(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleRestock} disabled={restockQuantity <= 0}>
                                  Add Stock
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {filteredInventory.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No inventory items found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
