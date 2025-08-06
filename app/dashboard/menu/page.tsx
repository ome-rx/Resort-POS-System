"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth, hasPermission } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Plus, Edit, Trash2, Search, UtensilsCrossed, Package, AlertTriangle } from "lucide-react"

interface Category {
  id: string
  name: string
  description: string
  display_order: number
  is_active: boolean
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
  created_at: string
  categories: {
    name: string
  }
  inventory: {
    id: string
    total_quantity: number
    current_stock: number
    low_stock_threshold: number
  }[]
}

interface MenuFormData {
  name: string
  category_id: string
  sub_category: string
  price: number
  description: string
  image_url: string
  is_available: boolean
}

export default function MenuPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState<MenuFormData>({
    name: "",
    category_id: "",
    sub_category: "veg",
    price: 0,
    description: "",
    image_url: "",
    is_available: true,
  })
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesTotal, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order")

      if (categoriesError) throw categoriesError
      setCategories(categoriesTotal || [])

      // Fetch menu items with inventory data
      const { data: menuData, error: menuError } = await supabase
        .from("menu_items")
        .select(`
          *,
          categories(name),
          inventory(
            id,
            total_quantity,
            current_stock,
            low_stock_threshold
          )
        `)
        .order("name")

      if (menuError) throw menuError
      setMenuItems(menuData || [])
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingItem) {
        // Update existing menu item
        const { error } = await supabase
          .from("menu_items")
          .update({
            name: formData.name,
            category_id: formData.category_id,
            sub_category: formData.sub_category,
            price: formData.price,
            description: formData.description,
            image_url: formData.image_url || null,
            is_available: formData.is_available,
          })
          .eq("id", editingItem.id)

        if (error) throw error

        toast({
          title: "Menu Item Updated",
          description: "Menu item has been updated successfully.",
        })
      } else {
        // Create new menu item
        const { data: newMenuItem, error } = await supabase
          .from("menu_items")
          .insert({
            name: formData.name,
            category_id: formData.category_id,
            sub_category: formData.sub_category,
            price: formData.price,
            description: formData.description,
            image_url: formData.image_url || null,
            is_available: formData.is_available,
          })
          .select()
          .single()

        if (error) throw error

        // Create corresponding inventory entry
        if (newMenuItem) {
          const { error: inventoryError } = await supabase
            .from("inventory")
            .insert({
              menu_item_id: newMenuItem.id,
              total_quantity: 0,
              current_stock: 0,
              low_stock_threshold: 10,
            })

          if (inventoryError) {
            console.error("Error creating inventory entry:", inventoryError)
            // Don't throw error, just log it
          }
        }

        toast({
          title: "Menu Item Created",
          description: "New menu item has been created successfully with inventory tracking.",
        })
      }

      setDialogOpen(false)
      setEditingItem(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error saving menu item:", error)
      toast({
        title: "Error",
        description: "Failed to save menu item.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      category_id: item.category_id,
      sub_category: item.sub_category,
      price: item.price,
      description: item.description,
      image_url: item.image_url || "",
      is_available: item.is_available,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return

    try {
      // Delete inventory entry first
      await supabase.from("inventory").delete().eq("menu_item_id", itemId)
      
      // Then delete menu item
      const { error } = await supabase.from("menu_items").delete().eq("id", itemId)

      if (error) throw error

      toast({
        title: "Menu Item Deleted",
        description: "Menu item has been deleted successfully.",
      })

      fetchData()
    } catch (error) {
      console.error("Error deleting menu item:", error)
      toast({
        title: "Error",
        description: "Failed to delete menu item.",
        variant: "destructive",
      })
    }
  }

  const toggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: isAvailable })
        .eq("id", itemId)

      if (error) throw error

      toast({
        title: "Availability Updated",
        description: `Menu item is now ${isAvailable ? "available" : "unavailable"}.`,
      })

      fetchData()
    } catch (error) {
      console.error("Error updating availability:", error)
      toast({
        title: "Error",
        description: "Failed to update availability.",
        variant: "destructive",
      })
    }
  }

  const getStockInfo = (item: MenuItem) => {
    if (!item.inventory || item.inventory.length === 0) {
      return {
        stock: 0,
        status: "No Stock Data",
        color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
      }
    }

    const inventory = item.inventory[0]
    const stock = inventory.current_stock
    const threshold = inventory.low_stock_threshold

    if (stock === 0) {
      return {
        stock,
        status: "Out of Stock",
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      }
    } else if (stock <= threshold) {
      return {
        stock,
        status: "Low Stock",
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
      }
    } else {
      return {
        stock,
        status: "In Stock",
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      category_id: categories.length > 0 ? categories[0].id : "",
      sub_category: "veg",
      price: 0,
      description: "",
      image_url: "",
      is_available: true,
    })
  }

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category_id === categoryFilter
    
    let matchesStock = true
    if (stockFilter !== "all") {
      const stockInfo = getStockInfo(item)
      if (stockFilter === "out" && stockInfo.stock > 0) matchesStock = false
      if (stockFilter === "low" && (stockInfo.stock === 0 || stockInfo.stock > (item.inventory[0]?.low_stock_threshold || 0))) matchesStock = false
      if (stockFilter === "in" && stockInfo.stock <= (item.inventory[0]?.low_stock_threshold || 0)) matchesStock = false
    }
    
    return matchesSearch && matchesCategory && matchesStock
  })

  // Calculate stock statistics
  const stockStats = menuItems.reduce((acc, item) => {
    const stockInfo = getStockInfo(item)
    if (stockInfo.stock === 0) acc.outOfStock++
    else if (stockInfo.stock <= (item.inventory[0]?.low_stock_threshold || 0)) acc.lowStock++
    else acc.inStock++
    return acc
  }, { outOfStock: 0, lowStock: 0, inStock: 0 })

  if (!hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access menu management.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage restaurant menu items with real-time inventory tracking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm()
                setEditingItem(null)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update the menu item details." : "Create a new menu item. Inventory tracking will be set up automatically."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sub_category">Type</Label>
                <Select
                  value={formData.sub_category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, sub_category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">Vegetarian</SelectItem>
                    <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: Number.parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL (Optional)</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_available"
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_available: checked }))}
                />
                <Label htmlFor="is_available">Available</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? "Update Item" : "Create Item"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stockStats.inStock}</div>
            <p className="text-xs text-muted-foreground">Items available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stockStats.lowStock}</div>
            <p className="text-xs text-muted-foreground">Items running low</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stockStats.outOfStock}</div>
            <p className="text-xs text-muted-foreground">Items unavailable</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Menu Items</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock Status</Label>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items ({filteredItems.length})</CardTitle>
          <CardDescription>Manage menu items with live inventory tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const stockInfo = getStockInfo(item)
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.categories.name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            item.sub_category === 'veg' 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-red-50 text-red-700'
                          }
                        >
                          {item.sub_category === 'veg' ? 'VEG' : 'NON-VEG'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">₹{item.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={stockInfo.color}>
                          {stockInfo.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {stockInfo.stock}
                          {item.inventory && item.inventory.length > 0 && (
                            <span className="text-sm text-gray-500 ml-1">
                              (Alert at {item.inventory[0].low_stock_threshold})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={(checked) => toggleAvailability(item.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(item.id, item.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <UtensilsCrossed className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No menu items found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
