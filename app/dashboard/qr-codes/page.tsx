"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth, hasPermission } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Download, Eye, Building, MapPin } from "lucide-react"
import QRCodeLib from "qrcode"
import jsPDF from "jspdf"

interface RestaurantTable {
  id: string
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

export default function QRCodesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner"])) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select(`
          *,
          floors(floor_name, floor_number)
        `)
        .eq("is_active", true)
        .order("table_number")

      if (error) throw error
      setTables(data || [])

      // Auto-generate QR codes for tables that don't have them
      await autoGenerateQRCodes(data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load QR codes data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const autoGenerateQRCodes = async (tablesList: RestaurantTable[]) => {
    const tablesWithoutQR = tablesList.filter(table => !table.qr_code_url)
    
    if (tablesWithoutQR.length > 0) {
      console.log(`Auto-generating QR codes for ${tablesWithoutQR.length} tables...`)
      
      for (const table of tablesWithoutQR) {
        try {
          const qrUrl = await generateQRCodeForTable(table.id, table.table_number, table.floors.floor_name)
          
          // Update table with QR code URL
          await supabase
            .from("restaurant_tables")
            .update({ qr_code_url: qrUrl })
            .eq("id", table.id)
            
        } catch (error) {
          console.error(`Error generating QR code for table ${table.table_number}:`, error)
        }
      }
      
      // Refresh data to show updated QR codes
      if (tablesWithoutQR.length > 0) {
        setTimeout(() => fetchData(), 1000)
      }
    }
  }

  const generateQRCodeForTable = async (tableId: string, tableNumber: number, floorName: string) => {
    const baseUrl = window.location.origin
    const qrData = `${baseUrl}/order/${tableId}`
    return qrData
  }

  const generateQRCodeImage = async (tableId: string, tableNumber: number, floorName: string) => {
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

      return {
        tableId,
        tableNumber,
        floorName,
        qrCodeDataUrl,
        url: qrData,
      }
    } catch (error) {
      console.error("Error generating QR code image:", error)
      throw error
    }
  }

  const downloadQRCodesPDF = async (qrCodes: any[], filename: string) => {
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20
      const qrSize = 60
      const cols = 3
      const rows = 4
      
      let currentPage = 0
      let currentRow = 0
      let currentCol = 0

      for (let i = 0; i < qrCodes.length; i++) {
        const qrCode = qrCodes[i]
        
        if (currentRow === 0 && currentCol === 0) {
          if (currentPage > 0) pdf.addPage()
          pdf.setFontSize(16)
          pdf.text("Restaurant QR Codes", pageWidth / 2, margin, { align: "center" })
          pdf.setFontSize(10)
          pdf.text(`Page ${currentPage + 1}`, pageWidth / 2, margin + 10, { align: "center" })
        }

        const x = margin + currentCol * ((pageWidth - 2 * margin) / cols)
        const y = margin + 30 + currentRow * ((pageHeight - 60) / rows)

        // Add QR code image
        try {
          pdf.addImage(qrCode.qrCodeDataUrl, "PNG", x, y, qrSize, qrSize)
        } catch (err) {
          console.error("Error adding QR code to PDF:", err)
        }

        // Add table info
        pdf.setFontSize(12)
        pdf.text(`Table ${qrCode.tableNumber}`, x + qrSize / 2, y + qrSize + 8, { align: "center" })
        pdf.setFontSize(10)
        pdf.text(qrCode.floorName, x + qrSize / 2, y + qrSize + 15, { align: "center" })

        currentCol++
        if (currentCol >= cols) {
          currentCol = 0
          currentRow++
          if (currentRow >= rows) {
            currentRow = 0
            currentPage++
          }
        }
      }

      pdf.save(`${filename}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      throw error
    }
  }

  const downloadSingleQRCode = async (table: RestaurantTable) => {
    try {
      const qrCode = await generateQRCodeImage(table.id, table.table_number, table.floors.floor_name)
      await downloadQRCodesPDF([qrCode], `Table-${table.table_number}-QR-Code`)
      
      toast({
        title: "QR Code Downloaded",
        description: `QR code for Table ${table.table_number} has been downloaded.`,
      })
    } catch (error) {
      console.error("Error downloading QR code:", error)
      toast({
        title: "Error",
        description: "Failed to download QR code.",
        variant: "destructive",
      })
    }
  }

  const downloadAllQRCodes = async () => {
    setGenerating(true)
    try {
      const qrCodes = []

      for (const table of tables) {
        const qrCode = await generateQRCodeImage(table.id, table.table_number, table.floors.floor_name)
        qrCodes.push(qrCode)
      }

      await downloadQRCodesPDF(qrCodes, "All-Tables-QR-Codes")

      toast({
        title: "QR Codes Downloaded",
        description: `Downloaded QR codes for ${qrCodes.length} tables.`,
      })
    } catch (error) {
      console.error("Error downloading QR codes:", error)
      toast({
        title: "Error",
        description: "Failed to download QR codes.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const previewQRCode = (table: RestaurantTable) => {
    if (table.qr_code_url) {
      window.open(table.qr_code_url, '_blank')
    }
  }

  const regenerateQRCode = async (table: RestaurantTable) => {
    try {
      const qrUrl = await generateQRCodeForTable(table.id, table.table_number, table.floors.floor_name)
      
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ qr_code_url: qrUrl })
        .eq("id", table.id)

      if (error) throw error

      toast({
        title: "QR Code Regenerated",
        description: `QR code for Table ${table.table_number} has been regenerated.`,
      })

      fetchData()
    } catch (error) {
      console.error("Error regenerating QR code:", error)
      toast({
        title: "Error",
        description: "Failed to regenerate QR code.",
        variant: "destructive",
      })
    }
  }

  const tablesWithQR = tables.filter(table => table.qr_code_url)
  const tablesWithoutQR = tables.filter(table => !table.qr_code_url)

  if (!hasPermission(user?.role || "", ["super_admin", "owner"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access QR code management.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">QR Code Management</h1>
          <p className="text-gray-600 dark:text-gray-400">QR codes are automatically generated when tables are added</p>
        </div>
        <Button onClick={downloadAllQRCodes} disabled={generating || tables.length === 0}>
          {generating ? (
            <>Generating...</>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download All QR Codes
            </>
          )}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
            <p className="text-xs text-muted-foreground">Active tables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Codes Generated</CardTitle>
            <QrCode className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tablesWithQR.length}</div>
            <p className="text-xs text-muted-foreground">Ready for use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending QR Codes</CardTitle>
            <QrCode className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{tablesWithoutQR.length}</div>
            <p className="text-xs text-muted-foreground">Being generated</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="existing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="existing">Existing QR Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Table QR Codes</CardTitle>
              <CardDescription>
                QR codes are automatically generated when tables are created. Click on any QR code to test it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>QR Code Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map((table) => (
                      <TableRow key={table.id}>
                        <TableCell>
                          <div className="font-medium">Table {table.table_number}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {table.floors.floor_name}
                          </div>
                        </TableCell>
                        <TableCell>{table.capacity} guests</TableCell>
                        <TableCell>
                          <Badge className={
                            table.status === 'available' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                              : table.status === 'in_kitchen'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
                          }>
                            {table.status.charAt(0).toUpperCase() + table.status.slice(1).replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {table.qr_code_url ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              <QrCode className="h-3 w-3 mr-1" />
                              Generated
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                              Generating...
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {table.qr_code_url && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => previewQRCode(table)}
                                  title="Test QR Code"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => downloadSingleQRCode(table)}
                                  title="Download QR Code"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => regenerateQRCode(table)}
                                  title="Regenerate QR Code"
                                >
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {tables.length === 0 && (
                <div className="text-center py-8">
                  <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tables found. QR codes will be generated automatically when tables are added.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {tablesWithoutQR.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">QR Codes Being Generated</CardTitle>
                <CardDescription>
                  The following tables are having their QR codes generated automatically. This may take a few moments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tablesWithoutQR.map((table) => (
                    <div key={table.id} className="flex items-center justify-between p-2 border rounded">
                      <span>Table {table.table_number} - {table.floors.floor_name}</span>
                      <Badge className="bg-yellow-100 text-yellow-800">Generating...</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
