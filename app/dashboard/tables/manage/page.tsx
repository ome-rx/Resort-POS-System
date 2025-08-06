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
import { Plus, Edit, Trash2, Search, Building, Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import QRCodeLib from "qrcode"

interface Floor {
  id: string
  floor_name: string
  floor_number: number
  is_active: boolean
}

interface RestaurantTable {
  id: string
  floor_id: string
  table_number: number
  capacity: number
  status: string
  qr_code_url: string | null
  is_active: boolean
  floors: {
    floor_name: string
    floor_number: number
  }
}

interface TableFormData {
  floor_id: string
  table_number: number
  capacity: number
  is_active: boolean
}

export default function ManageTablesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [floorFilter, setFloorFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null)
  const [formData, setFormData] = useState<TableFormData>({
    floor_id: "",
    table_number: 1,
    capacity: 4,
    is_active: true,
  })
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
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

      // Fetch tables
      const { data: tablesData, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select(`
          *,
          floors(floor_name, floor_number)
        `)
        .order("table_number")

      if (tablesError) throw tablesError
      setTables(tablesData || [])
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

  const generateQRCodeForTable = async (tableId: string, tableNumber: number, floorName: string) => {
    try {
      const baseUrl = window.location.origin
      const qrData = `${baseUrl}/order/${tableId}`

      const qrCodeDataUrl = await QRCodeLib.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      // Update table with QR code URL
      await supabase.from("restaurant_tables").update({ qr_code_url: qrData }).eq("id", tableId)

      return qrData
    } catch (error) {
      console.error("Error generating QR code:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingTable) {
        // Update existing table
        const { error } = await supabase
          .from("restaurant_tables")
          .update({
            floor_id: formData.floor_id,
            table_number: formData.table_number,
            capacity: formData.capacity,
            is_active: formData.is_active,
          })
          .eq("id", editingTable.id)

        if (error) throw error

        toast({
          title: "Table Updated",
          description: "Table has been updated successfully.",
        })
      } else {
        // Create new table
        const { data: newTable, error } = await supabase
          .from("restaurant_tables")
          .insert({
            floor_id: formData.floor_id,
            table_number: formData.table_number,
            capacity: formData.capacity,
            is_active: formData.is_active,
          })
          .select()
          .single()

        if (error) throw error

        // Auto-generate QR code for new table
        const selectedFloor = floors.find(f => f.id === formData.floor_id)
        if (newTable && selectedFloor) {
          await generateQRCodeForTable(newTable.id, newTable.table_number, selectedFloor.floor_name)
        }

        toast({
          title: "Table Created",
          description: "New table has been created successfully with QR code.",
        })
      }

      setDialogOpen(false)
      setEditingTable(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Error saving table:", error)
      toast({
        title: "Error",
        description: "Failed to save table.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (table: RestaurantTable) => {
    setEditingTable(table)
    setFormData({
      floor_id: table.floor_id,
      table_number: table.table_number,
      capacity: table.capacity,
      is_active: table.is_active,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (tableId: string, tableNumber: number) => {
    if (!confirm(`Are you sure you want to delete Table ${tableNumber}?`)) return

    try {
      const { error } = await supabase.from("restaurant_tables").delete().eq("id", tableId)

      if (error) throw error

      toast({
        title: "Table Deleted",
        description: "Table has been deleted successfully.",
      })

      fetchData()
    } catch (error) {
      console.error("Error deleting table:", error)
      toast({
        title: "Error",
        description: "Failed to delete table.",
        variant: "destructive",
      })
    }
  }

  const toggleTableStatus = async (tableId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ is_active: isActive })
        .eq("id", tableId)

      if (error) throw error

      toast({
        title: "Status Updated",
        description: `Table is now ${isActive ? "active" : "inactive"}.`,
      })

      fetchData()
    } catch (error) {
      console.error("Error updating table status:", error)
      toast({
        title: "Error",
        description: "Failed to update table status.",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      floor_id: floors.length > 0 ? floors[0].id : "",
      table_number: 1,
      capacity: 4,
      is_active: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case "in_kitchen":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      case "serving":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
    }
  }

  const filteredTables = tables.filter((table) => {
    const matchesSearch = table.table_number.toString().includes(searchTerm) ||
      table.floors.floor_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFloor = floorFilter === "all" || table.floor_id === floorFilter
    return matchesSearch && matchesFloor
  })

  if (!hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to manage tables.</p>
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
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/tables">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tables
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Tables</h1>
            <p className="text-gray-600 dark:text-gray-400">Add, edit, and remove restaurant tables</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm()
                setEditingTable(null)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTable ? "Edit Table" : "Add New Table"}</DialogTitle>
              <DialogDescription>
                {editingTable ? "Update table details." : "Create a new table. QR code will be auto-generated."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Select
                  value={formData.floor_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, floor_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    {floors.map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.floor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="table_number">Table Number</Label>
                <Input
                  id="table_number"
                  type="number"
                  min="1"
                  value={formData.table_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, table_number: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.capacity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, capacity: parseInt(e.target.value) || 4 }))}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTable ? "Update Table" : "Create Table"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Tables</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Table number or floor"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Select value={floorFilter} onValueChange={setFloorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All floors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {floors.map((floor) => (
                    <SelectItem key={floor.id} value={floor.id}>
                      {floor.floor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tables List */}
      <Card>
        <CardHeader>
          <CardTitle>Tables ({filteredTables.length})</CardTitle>
          <CardDescription>Manage restaurant tables and their properties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table #</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell>
                      <div className="font-medium">Table {table.table_number}</div>
                    </TableCell>
                    <TableCell>{table.floors.floor_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {table.capacity}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(table.status)}>
                        {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {table.qr_code_url ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Generated
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={table.is_active}
                        onChange={(e) => toggleTableStatus(table.id, e.target.checked)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(table)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(table.id, table.table_number)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredTables.length === 0 && (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tables found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
