"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth, hasPermission } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Download, MapPin, Users } from "lucide-react"
import QRCodeLib from "qrcode"

interface Floor {
  id: string
  floor_name: string
  floor_number: number
}

interface Table {
  id: string
  table_number: number
  capacity: number
  floor_id: string
  qr_code_url?: string
  floors: Floor
}

export default function QRCodesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [floors, setFloors] = useState<Floor[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [singleTableNumber, setSingleTableNumber] = useState("")
  const [rangeStart, setRangeStart] = useState("")
  const [rangeEnd, setRangeEnd] = useState("")
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner"])) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      // Fetch floors
      const { data: floorsData } = await supabase.from("floors").select("*").eq("is_active", true).order("floor_number")

      // Fetch tables with floors
      const { data: tablesData } = await supabase
        .from("restaurant_tables")
        .select(`
          *,
          floors(*)
        `)
        .eq("is_active", true)
        .order("table_number")

      if (floorsData) setFloors(floorsData)
      if (tablesData) setTables(tablesData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async (tableId: string, tableNumber: number, floorName: string) => {
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
      console.error("Error generating QR code:", error)
      throw error
    }
  }

  const generateAllQRCodes = async () => {
    setGenerating(true)
    try {
      const qrCodes = []

      for (const table of tables) {
        const qrCode = await generateQRCode(table.id, table.table_number, table.floors.floor_name)
        qrCodes.push(qrCode)

        // Update table with QR code URL
        await supabase.from("restaurant_tables").update({ qr_code_url: qrCode.url }).eq("id", table.id)
      }

      // Generate PDF with all QR codes
      await downloadQRCodesPDF(qrCodes, "All Tables QR Codes")

      toast({
        title: "QR Codes Generated",
        description: `Generated QR codes for ${qrCodes.length} tables.`,
      })

      fetchData()
    } catch (error) {
      console.error("Error generating QR codes:", error)
      toast({
        title: "Error",
        description: "Failed to generate QR codes.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const generateSingleQRCode = async () => {
    if (!singleTableNumber) {
      toast({
        title: "Validation Error",
        description: "Please enter a table number.",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    try {
      const table = tables.find((t) => t.table_number === Number.parseInt(singleTableNumber))
      if (!table) {
        toast({
          title: "Error",
          description: "Table not found.",
          variant: "destructive",
        })
        return
      }

      const qrCode = await generateQRCode(table.id, table.table_number, table.floors.floor_name)

      // Update table with QR code URL
      await supabase.from("restaurant_tables").update({ qr_code_url: qrCode.url }).eq("id", table.id)

      await downloadQRCodesPDF([qrCode], `Table ${table.table_number} QR Code`)

      toast({
        title: "QR Code Generated",
        description: `Generated QR code for Table ${table.table_number}.`,
      })

      setSingleTableNumber("")
      fetchData()
    } catch (error) {
      console.error("Error generating single QR code:", error)
      toast({
        title: "Error",
        description: "Failed to generate QR code.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const generateRangeQRCodes = async () => {
    if (!rangeStart || !rangeEnd) {
      toast({
        title: "Validation Error",
        description: "Please enter both start and end table numbers.",
        variant: "destructive",
      })
      return
    }

    const start = Number.parseInt(rangeStart)
    const end = Number.parseInt(rangeEnd)

    if (start > end) {
      toast({
        title: "Validation Error",
        description: "Start table number must be less than or equal to end table number.",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    try {
      const rangeTables = tables.filter((t) => t.table_number >= start && t.table_number <= end)

      if (rangeTables.length === 0) {
        toast({
          title: "Error",
          description: "No tables found in the specified range.",
          variant: "destructive",
        })
        return
      }

      const qrCodes = []

      for (const table of rangeTables) {
        const qrCode = await generateQRCode(table.id, table.table_number, table.floors.floor_name)
        qrCodes.push(qrCode)

        // Update table with QR code URL
        await supabase.from("restaurant_tables").update({ qr_code_url: qrCode.url }).eq("id", table.id)
      }

      await downloadQRCodesPDF(qrCodes, `Tables ${start}-${end} QR Codes`)

      toast({
        title: "QR Codes Generated",
        description: `Generated QR codes for tables ${start} to ${end}.`,
      })

      setRangeStart("")
      setRangeEnd("")
      fetchData()
    } catch (error) {
      console.error("Error generating range QR codes:", error)
      toast({
        title: "Error",
        description: "Failed to generate QR codes.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const downloadQRCodesPDF = async (qrCodes: any[], filename: string) => {
    // Create a simple HTML page with QR codes for printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .qr-container { 
              display: inline-block; 
              margin: 20px; 
              text-align: center; 
              page-break-inside: avoid;
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 8px;
            }
            .qr-code { margin-bottom: 10px; }
            .table-info { font-weight: bold; margin-bottom: 5px; }
            .floor-info { color: #666; font-size: 14px; }
            .url-info { font-size: 12px; color: #888; margin-top: 10px; word-break: break-all; }
            @media print {
              .qr-container { margin: 10px; }
            }
          </style>
        </head>
        <body>
          <h1>${filename}</h1>
          <p>Scan these QR codes to place orders for the respective tables.</p>
          ${qrCodes
            .map(
              (qr) => `
            <div class="qr-container">
              <div class="table-info">Table ${qr.tableNumber}</div>
              <div class="floor-info">${qr.floorName}</div>
              <div class="qr-code">
                <img src="${qr.qrCodeDataUrl}" alt="QR Code for Table ${qr.tableNumber}" />
              </div>
              <div class="url-info">${qr.url}</div>
            </div>
          `,
            )
            .join("")}
        </body>
      </html>
    `

    // Create blob and download
    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
          <p className="text-gray-600 dark:text-gray-400">Generate QR codes for table ordering</p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generate QR Codes</TabsTrigger>
          <TabsTrigger value="existing">Existing QR Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Bulk Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="mr-2 h-5 w-5" />
                Bulk QR Generation
              </CardTitle>
              <CardDescription>Generate QR codes for all tables at once</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    This will generate QR codes for all {tables.length} tables and download them as a single file.
                  </p>
                  <p className="text-xs text-gray-500">
                    Each QR code will contain the table number and restaurant URL for customer ordering.
                  </p>
                </div>
                <Button onClick={generateAllQRCodes} disabled={generating}>
                  {generating ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Generate All QR Codes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Individual Generation */}
          <Card>
            <CardHeader>
              <CardTitle>Individual QR Generation</CardTitle>
              <CardDescription>Generate QR code for a specific table</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end space-x-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="single-table">Table Number</Label>
                  <Input
                    id="single-table"
                    type="number"
                    placeholder="Enter table number (e.g., 18)"
                    value={singleTableNumber}
                    onChange={(e) => setSingleTableNumber(e.target.value)}
                  />
                </div>
                <Button onClick={generateSingleQRCode} disabled={generating}>
                  {generating ? "Generating..." : "Generate QR Code"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Range Generation */}
          <Card>
            <CardHeader>
              <CardTitle>Range QR Generation</CardTitle>
              <CardDescription>Generate QR codes for a range of tables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end space-x-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="range-start">Start Table</Label>
                  <Input
                    id="range-start"
                    type="number"
                    placeholder="12"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="range-end">End Table</Label>
                  <Input
                    id="range-end"
                    type="number"
                    placeholder="19"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </div>
                <Button onClick={generateRangeQRCodes} disabled={generating}>
                  {generating ? "Generating..." : "Generate Range"}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Example: Enter 12-19 to generate QR codes for tables 12 through 19
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existing" className="space-y-6">
          {/* Existing QR Codes by Floor */}
          {floors.map((floor) => {
            const floorTables = tables.filter((t) => t.floor_id === floor.id)
            const tablesWithQR = floorTables.filter((t) => t.qr_code_url)

            return (
              <Card key={floor.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-5 w-5" />
                      {floor.floor_name}
                    </div>
                    <Badge variant="outline">
                      {tablesWithQR.length}/{floorTables.length} tables have QR codes
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {floorTables.map((table) => (
                      <div key={table.id} className="border rounded-lg p-4 text-center space-y-2">
                        <div className="font-medium">Table {table.table_number}</div>
                        <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                          <Users className="h-3 w-3" />
                          <span>{table.capacity} seats</span>
                        </div>
                        {table.qr_code_url ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            QR Generated
                          </Badge>
                        ) : (
                          <Badge variant="outline">No QR Code</Badge>
                        )}
                        {table.qr_code_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const qrCode = await generateQRCode(table.id, table.table_number, floor.floor_name)
                              await downloadQRCodesPDF([qrCode], `Table ${table.table_number} QR Code`)
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}
