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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { 
  BarChart3, 
  Download, 
  Calendar, 
  DollarSign, 
  Receipt, 
  Users, 
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  Building
} from "lucide-react"
import * as XLSX from "xlsx"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"

interface OrderReport {
  id: string
  order_number: string
  customer_name: string
  table_number: number
  floor_name: string
  guest_count: number
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_method: string | null
  payment_status: string
  created_at: string
  order_items: {
    quantity: number
    unit_price: number
    total_price: number
    menu_items: {
      name: string
      sub_category: string
      categories: {
        name: string
      }
    }
  }[]
}

interface ReportSummary {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  totalCustomers: number
  creditAmount: number
  cashAmount: number
  cardAmount: number
  upiAmount: number
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<OrderReport[]>([])
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<"daily" | "monthly" | "yearly">("daily")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [reportData, setReportData] = useState<{
    orders: OrderReport[]
    summary: ReportSummary
    analytics: any
  }>({
    orders: [],
    summary: {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      totalCustomers: 0,
      creditAmount: 0,
      cashAmount: 0,
      cardAmount: 0,
      upiAmount: 0
    },
    analytics: {}
  })
  
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
      generateReport()
    }
  }, [user, reportType, selectedDate, selectedMonth, selectedYear])

  const generateReport = async () => {
    setLoading(true)
    try {
      let startDate: string
      let endDate: string

      // Calculate date range based on report type
      switch (reportType) {
        case "daily":
          startDate = `${selectedDate} 00:00:00`
          endDate = `${selectedDate} 23:59:59`
          break
        case "monthly":
          const monthStart = new Date(selectedMonth + "-01")
          const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
          startDate = `${monthStart.toISOString().split('T')[0]} 00:00:00`
          endDate = `${monthEnd.toISOString().split('T')[0]} 23:59:59`
          break
        case "yearly":
          startDate = `${selectedYear}-01-01 00:00:00`
          endDate = `${selectedYear}-12-31 23:59:59`
          break
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          restaurant_tables(
            table_number,
            floors(floor_name)
          ),
          order_items(
            quantity,
            unit_price,
            total_price,
            menu_items(
              name,
              sub_category,
              categories(name)
            )
          )
        `)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Transform data for better display
      const transformedOrders = (data || []).map(order => ({
        ...order,
        table_number: order.restaurant_tables?.table_number || 0,
        floor_name: order.restaurant_tables?.floors?.floor_name || 'Unknown'
      }))

      // Calculate summary
      const summary = calculateSummary(transformedOrders)
      
      // Generate analytics data
      const analytics = generateAnalytics(transformedOrders)

      setReportData({
        orders: transformedOrders,
        summary,
        analytics
      })

    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateSummary = (orders: OrderReport[]): ReportSummary => {
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0)
    const totalOrders = orders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const uniqueCustomers = new Set(orders.map((order) => order.customer_name))
    
    const creditAmount = orders
      .filter((order) => order.payment_method === "credit")
      .reduce((sum, order) => sum + Number(order.total_amount), 0)
    
    const cashAmount = orders
      .filter((order) => order.payment_method === "cash")
      .reduce((sum, order) => sum + Number(order.total_amount), 0)
    
    const cardAmount = orders
      .filter((order) => order.payment_method === "card")
      .reduce((sum, order) => sum + Number(order.total_amount), 0)
    
    const upiAmount = orders
      .filter((order) => order.payment_method === "upi")
      .reduce((sum, order) => sum + Number(order.total_amount), 0)

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalCustomers: uniqueCustomers.size,
      creditAmount,
      cashAmount,
      cardAmount,
      upiAmount
    }
  }

  const generateAnalytics = (orders: OrderReport[]) => {
    // Revenue by day/hour based on report type
    const revenueByTime = {}
    const ordersByHour = {}
    const paymentMethodData = [
      { name: 'Cash', value: reportData.summary.cashAmount, color: '#10B981' },
      { name: 'Card', value: reportData.summary.cardAmount, color: '#3B82F6' },
      { name: 'UPI', value: reportData.summary.upiAmount, color: '#8B5CF6' },
      { name: 'Credit', value: reportData.summary.creditAmount, color: '#EF4444' }
    ]

    // Popular items
    const itemCounts = {}
    orders.forEach(order => {
      order.order_items.forEach(item => {
        const itemName = item.menu_items.name
        itemCounts[itemName] = (itemCounts[itemName] || 0) + item.quantity
      })
    })

    const popularItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // Hourly distribution
    orders.forEach(order => {
      const hour = new Date(order.created_at).getHours()
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1
    })

    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      orders: ordersByHour[hour] || 0
    }))

    return {
      paymentMethodData,
      popularItems,
      hourlyData,
      revenueByTime
    }
  }

  const exportToExcel = () => {
    const exportData = reportData.orders.map(order => ({
      'Order Number': order.order_number,
      'Date & Time': new Date(order.created_at).toLocaleString(),
      'Customer Name': order.customer_name,
      'Table': `${order.floor_name} - Table ${order.table_number}`,
      'Guests': order.guest_count,
      'Items': order.order_items.map(item => 
        `${item.menu_items.name} (${item.quantity}x)`
      ).join(', '),
      'Subtotal': order.subtotal,
      'Tax Amount': order.tax_amount,
      'Total Amount': order.total_amount,
      'Payment Method': order.payment_method || 'Not Set',
      'Payment Status': order.payment_status
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Orders Report")
    
    // Add summary sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Revenue', `₹${reportData.summary.totalRevenue.toFixed(2)}`],
      ['Total Orders', reportData.summary.totalOrders],
      ['Average Order Value', `₹${reportData.summary.averageOrderValue.toFixed(2)}`],
      ['Total Customers', reportData.summary.totalCustomers],
      ['Cash Payments', `₹${reportData.summary.cashAmount.toFixed(2)}`],
      ['Card Payments', `₹${reportData.summary.cardAmount.toFixed(2)}`],
      ['UPI Payments', `₹${reportData.summary.upiAmount.toFixed(2)}`],
      ['Credit Payments', `₹${reportData.summary.creditAmount.toFixed(2)}`]
    ]
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")
    
    const fileName = `${reportType}-report-${reportType === 'daily' ? selectedDate : reportType === 'monthly' ? selectedMonth : selectedYear}.xlsx`
    XLSX.writeFile(wb, fileName)
    
    toast({
      title: "Report Exported",
      description: "Report has been exported to Excel successfully.",
    })
  }

  const getPaymentMethodColor = (method: string | null) => {
    switch (method) {
      case "cash":
        return "bg-green-100 text-green-800 border-green-200"
      case "card":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "upi":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "credit":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "credit":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access reports.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive business insights and reporting</p>
        </div>
        <Button onClick={exportToExcel} disabled={loading || reportData.orders.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(value: "daily" | "monthly" | "yearly") => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Report</SelectItem>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="yearly">Yearly Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "daily" && (
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            )}

            {reportType === "monthly" && (
              <div className="space-y-2">
                <Label>Month</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            )}

            {reportType === "yearly" && (
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end">
              <Button onClick={generateReport} disabled={loading}>
                {loading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tabular" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tabular">Tabular Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="tabular" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{reportData.summary.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{reportData.summary.averageOrderValue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.totalCustomers}</div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
                <Banknote className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{reportData.summary.cashAmount.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Card Payments</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">₹{reportData.summary.cardAmount.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">UPI Payments</CardTitle>
                <Smartphone className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">₹{reportData.summary.upiAmount.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credit Payments</CardTitle>
                <Building className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{reportData.summary.creditAmount.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Orders Report</CardTitle>
              <CardDescription>
                {reportType.charAt(0).toUpperCase() + reportType.slice(1)} report for {
                  reportType === 'daily' ? selectedDate : 
                  reportType === 'monthly' ? selectedMonth : 
                  selectedYear
                } - {reportData.orders.length} orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-sm">
                          {new Date(order.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer_name}</div>
                            <div className="text-sm text-gray-500">{order.guest_count} guests</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.floor_name} - Table {order.table_number}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {order.order_items.map((item, idx) => (
                              <div key={idx} className="text-sm">
                                {item.menu_items.name} ({item.quantity}x)
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>₹{order.subtotal.toFixed(2)}</TableCell>
                        <TableCell>₹{order.tax_amount.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">
                          ₹{order.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentMethodColor(order.payment_method)}>
                            {order.payment_method ? order.payment_method.toUpperCase() : 'NOT SET'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentStatusColor(order.payment_status)}>
                            {order.payment_status.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {reportData.orders.length === 0 && !loading && (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No orders found for the selected period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Payment Methods Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.analytics.paymentMethodData?.filter(item => item.value > 0) || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.analytics.paymentMethodData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders by Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.analytics.hourlyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Popular Items */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Menu Items</CardTitle>
              <CardDescription>Most ordered items in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={reportData.analytics.popularItems || []} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
