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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Download, FileText, TrendingUp, DollarSign, ShoppingCart, Users, Calendar } from "lucide-react"
import * as XLSX from "xlsx"

interface ReportData {
  daily: {
    date: string
    revenue: number
    orders: number
    customers: number
  }[]
  monthly: {
    month: string
    revenue: number
    orders: number
    customers: number
  }[]
  yearly: {
    year: string
    revenue: number
    orders: number
    customers: number
  }[]
  popularDishes: {
    name: string
    category: string
    orders: number
    quantity: number
  }[]
  paymentMethods: {
    method: string
    count: number
    amount: number
  }[]
  summary: {
    totalRevenue: number
    totalOrders: number
    averageOrderValue: number
    totalCustomers: number
    creditAmount: number
  }
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

export default function ReportsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [reportData, setReportData] = useState<ReportData>({
    daily: [],
    monthly: [],
    yearly: [],
    popularDishes: [],
    paymentMethods: [],
    summary: {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      totalCustomers: 0,
      creditAmount: 0,
    },
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
      fetchReportData()
    }
  }, [user, dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)

      // Fetch orders within date range
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            quantity,
            total_price,
            menu_items(name, categories(name))
          )
        `)
        .gte("created_at", `${dateRange.startDate}T00:00:00`)
        .lte("created_at", `${dateRange.endDate}T23:59:59`)
        .order("created_at", { ascending: true })

      if (ordersError) throw ordersError

      // Process daily data
      const dailyData = processDaily(orders || [])
      const monthlyData = processMonthly(orders || [])
      const yearlyData = processYearly(orders || [])
      const popularDishes = processPopularDishes(orders || [])
      const paymentMethods = processPaymentMethods(orders || [])
      const summary = processSummary(orders || [])

      setReportData({
        daily: dailyData,
        monthly: monthlyData,
        yearly: yearlyData,
        popularDishes,
        paymentMethods,
        summary,
      })
    } catch (error) {
      console.error("Error fetching report data:", error)
      toast({
        title: "Error",
        description: "Failed to load report data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const processDaily = (orders: any[]) => {
    const dailyMap = new Map()

    orders.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split("T")[0]
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { revenue: 0, orders: 0, customers: new Set() })
      }
      const day = dailyMap.get(date)
      day.revenue += Number(order.total_amount)
      day.orders += 1
      day.customers.add(order.customer_name)
    })

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
      customers: data.customers.size,
    }))
  }

  const processMonthly = (orders: any[]) => {
    const monthlyMap = new Map()

    orders.forEach((order) => {
      const month = new Date(order.created_at).toISOString().substring(0, 7)
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { revenue: 0, orders: 0, customers: new Set() })
      }
      const monthData = monthlyMap.get(month)
      monthData.revenue += Number(order.total_amount)
      monthData.orders += 1
      monthData.customers.add(order.customer_name)
    })

    return Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      orders: data.orders,
      customers: data.customers.size,
    }))
  }

  const processYearly = (orders: any[]) => {
    const yearlyMap = new Map()

    orders.forEach((order) => {
      const year = new Date(order.created_at).getFullYear().toString()
      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, { revenue: 0, orders: 0, customers: new Set() })
      }
      const yearData = yearlyMap.get(year)
      yearData.revenue += Number(order.total_amount)
      yearData.orders += 1
      yearData.customers.add(order.customer_name)
    })

    return Array.from(yearlyMap.entries()).map(([year, data]) => ({
      year,
      revenue: data.revenue,
      orders: data.orders,
      customers: data.customers.size,
    }))
  }

  const processPopularDishes = (orders: any[]) => {
    const dishMap = new Map()

    orders.forEach((order) => {
      order.order_items?.forEach((item: any) => {
        const dishName = item.menu_items.name
        const category = item.menu_items.categories.name
        const key = `${dishName}-${category}`

        if (!dishMap.has(key)) {
          dishMap.set(key, { name: dishName, category, orders: 0, quantity: 0 })
        }
        const dish = dishMap.get(key)
        dish.orders += 1
        dish.quantity += item.quantity
      })
    })

    return Array.from(dishMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  }

  const processPaymentMethods = (orders: any[]) => {
    const paymentMap = new Map()

    orders.forEach((order) => {
      const method = order.payment_method || "pending"
      if (!paymentMap.has(method)) {
        paymentMap.set(method, { count: 0, amount: 0 })
      }
      const payment = paymentMap.get(method)
      payment.count += 1
      payment.amount += Number(order.total_amount)
    })

    return Array.from(paymentMap.entries()).map(([method, data]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      count: data.count,
      amount: data.amount,
    }))
  }

  const processSummary = (orders: any[]) => {
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0)
    const totalOrders = orders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const uniqueCustomers = new Set(orders.map((order) => order.customer_name))
    const creditAmount = orders
      .filter((order) => order.payment_status === "credit")
      .reduce((sum, order) => sum + Number(order.total_amount), 0)

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalCustomers: uniqueCustomers.size,
      creditAmount,
    }
  }

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  const exportToPDF = (reportType: string) => {
    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportType} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Resort Restaurant - ${reportType} Report</h1>
            <p>Period: ${dateRange.startDate} to ${dateRange.endDate}</p>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <h3>Total Revenue</h3>
              <p>₹${reportData.summary.totalRevenue.toFixed(2)}</p>
            </div>
            <div class="summary-card">
              <h3>Total Orders</h3>
              <p>${reportData.summary.totalOrders}</p>
            </div>
            <div class="summary-card">
              <h3>Average Order Value</h3>
              <p>₹${reportData.summary.averageOrderValue.toFixed(2)}</p>
            </div>
            <div class="summary-card">
              <h3>Total Customers</h3>
              <p>${reportData.summary.totalCustomers}</p>
            </div>
          </div>
        </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${reportType}-Report.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive business analytics and reporting</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReportData}>Update Report</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{reportData.summary.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">For selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Orders processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{reportData.summary.averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Unique customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Amount</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{reportData.summary.creditAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">To be collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily">Daily Reports</TabsTrigger>
          <TabsTrigger value="popular">Popular Dishes</TabsTrigger>
          <TabsTrigger value="payments">Payment Analysis</TabsTrigger>
          <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daily Revenue Report</CardTitle>
                  <CardDescription>Daily breakdown of revenue and orders</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => exportToExcel(reportData.daily, "Daily-Report")}>
                    <Download className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => exportToPDF("Daily")}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 mb-6">
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-1))",
                    },
                    orders: {
                      label: "Orders",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" name="Revenue (₹)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Customers</TableHead>
                      <TableHead>Avg Order Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.daily.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">₹{day.revenue.toFixed(2)}</TableCell>
                        <TableCell>{day.orders}</TableCell>
                        <TableCell>{day.customers}</TableCell>
                        <TableCell>₹{day.orders > 0 ? (day.revenue / day.orders).toFixed(2) : "0.00"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popular" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Popular Dishes</CardTitle>
                  <CardDescription>Most ordered dishes by quantity</CardDescription>
                </div>
                <Button variant="outline" onClick={() => exportToExcel(reportData.popularDishes, "Popular-Dishes")}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Dish Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>Total Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.popularDishes.map((dish, index) => (
                      <TableRow key={`${dish.name}-${dish.category}`}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "outline"}>#{index + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{dish.name}</TableCell>
                        <TableCell>{dish.category}</TableCell>
                        <TableCell>{dish.orders}</TableCell>
                        <TableCell className="font-medium">{dish.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Analysis</CardTitle>
              <CardDescription>Breakdown of payment methods used</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80">
                  <ChartContainer
                    config={{
                      count: {
                        label: "Count",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.paymentMethods}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ method, count }) => `${method}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {reportData.paymentMethods.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>

                <div className="space-y-4">
                  {reportData.paymentMethods.map((payment, index) => (
                    <div key={payment.method} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{payment.method}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₹{payment.amount.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{payment.count} orders</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Revenue and order trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-1))",
                    },
                    orders: {
                      label: "Orders",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--color-revenue)"
                        strokeWidth={2}
                        name="Revenue (₹)"
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="var(--color-orders)"
                        strokeWidth={2}
                        name="Orders"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
