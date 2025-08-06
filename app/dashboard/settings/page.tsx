"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth, hasPermission } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  Settings, 
  Building, 
  Users, 
  Receipt, 
  CreditCard, 
  Bell, 
  Shield,
  Database,
  Wifi,
  Printer,
  Save,
  RefreshCw
} from "lucide-react"

interface RestaurantSettings {
  restaurant_name: string
  address: string
  phone: string
  email: string
  tax_rate: number
  currency: string
  timezone: string
  service_charge: number
  auto_print_kot: boolean
  auto_print_bill: boolean
  table_timeout: number
  low_stock_alert: boolean
  order_notifications: boolean
  payment_gateway_enabled: boolean
  upi_id: string
}

interface SystemSettings {
  backup_frequency: string
  maintenance_mode: boolean
  debug_mode: boolean
  max_concurrent_users: number
  session_timeout: number
  auto_logout: boolean
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>({
    restaurant_name: "Resort Restaurant",
    address: "123 Resort Lane, City, State 12345",
    phone: "+91 9876543210",
    email: "info@resortrestaurant.com",
    tax_rate: 18,
    currency: "INR",
    timezone: "Asia/Kolkata",
    service_charge: 10,
    auto_print_kot: true,
    auto_print_bill: false,
    table_timeout: 30,
    low_stock_alert: true,
    order_notifications: true,
    payment_gateway_enabled: true,
    upi_id: "7259911243@yespop"
  })

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    backup_frequency: "daily",
    maintenance_mode: false,
    debug_mode: false,
    max_concurrent_users: 50,
    session_timeout: 60,
    auto_logout: true
  })

  const supabase = createClient()

  useEffect(() => {
    if (hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    try {
      // In production, you would load these from a settings table
      // For now, we'll use localStorage to persist settings
      const savedRestaurantSettings = localStorage.getItem('restaurant_settings')
      const savedSystemSettings = localStorage.getItem('system_settings')

      if (savedRestaurantSettings) {
        setRestaurantSettings(JSON.parse(savedRestaurantSettings))
      }

      if (savedSystemSettings) {
        setSystemSettings(JSON.parse(savedSystemSettings))
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const saveRestaurantSettings = async () => {
    setLoading(true)
    try {
      // In production, save to database
      localStorage.setItem('restaurant_settings', JSON.stringify(restaurantSettings))
      
      toast({
        title: "Settings Saved",
        description: "Restaurant settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving restaurant settings:", error)
      toast({
        title: "Error",
        description: "Failed to save restaurant settings.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSystemSettings = async () => {
    setLoading(true)
    try {
      // In production, save to database
      localStorage.setItem('system_settings', JSON.stringify(systemSettings))
      
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving system settings:", error)
      toast({
        title: "Error",
        description: "Failed to save system settings.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetToDefaults = (type: 'restaurant' | 'system') => {
    if (!confirm(`Are you sure you want to reset ${type} settings to defaults?`)) return

    if (type === 'restaurant') {
      setRestaurantSettings({
        restaurant_name: "Resort Restaurant",
        address: "123 Resort Lane, City, State 12345",
        phone: "+91 9876543210",
        email: "info@resortrestaurant.com",
        tax_rate: 18,
        currency: "INR",
        timezone: "Asia/Kolkata",
        service_charge: 10,
        auto_print_kot: true,
        auto_print_bill: false,
        table_timeout: 30,
        low_stock_alert: true,
        order_notifications: true,
        payment_gateway_enabled: true,
        upi_id: "7259911243@yespop"
      })
    } else {
      setSystemSettings({
        backup_frequency: "daily",
        maintenance_mode: false,
        debug_mode: false,
        max_concurrent_users: 50,
        session_timeout: 60,
        auto_logout: true
      })
    }

    toast({
      title: "Settings Reset",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} settings have been reset to defaults.`,
    })
  }

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1)
      if (error) throw error
      
      toast({
        title: "Connection Test Successful",
        description: "Database connection is working properly.",
      })
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description: "There's an issue with the database connection.",
        variant: "destructive",
      })
    }
  }

  if (!hasPermission(user?.role || "", ["super_admin", "owner", "manager"])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure restaurant and system preferences</p>
        </div>
      </div>

      <Tabs defaultValue="restaurant" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Restaurant Information
              </CardTitle>
              <CardDescription>Basic restaurant details and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurant_name">Restaurant Name</Label>
                  <Input
                    id="restaurant_name"
                    value={restaurantSettings.restaurant_name}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, restaurant_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={restaurantSettings.phone}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={restaurantSettings.email}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={restaurantSettings.currency} onValueChange={(value) => setRestaurantSettings(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={restaurantSettings.address}
                  onChange={(e) => setRestaurantSettings(prev => ({ ...prev, address: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={restaurantSettings.tax_rate}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_charge">Service Charge (%)</Label>
                  <Input
                    id="service_charge"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={restaurantSettings.service_charge}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, service_charge: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="table_timeout">Table Timeout (minutes)</Label>
                  <Input
                    id="table_timeout"
                    type="number"
                    min="5"
                    max="480"
                    value={restaurantSettings.table_timeout}
                    onChange={(e) => setRestaurantSettings(prev => ({ ...prev, table_timeout: parseInt(e.target.value) || 30 }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Printing Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto_print_kot">Auto Print KOT</Label>
                      <p className="text-sm text-gray-500">Automatically print Kitchen Order Tickets</p>
                    </div>
                    <Switch
                      id="auto_print_kot"
                      checked={restaurantSettings.auto_print_kot}
                      onCheckedChange={(checked) => setRestaurantSettings(prev => ({ ...prev, auto_print_kot: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto_print_bill">Auto Print Bill</Label>
                      <p className="text-sm text-gray-500">Automatically print bills after payment</p>
                    </div>
                    <Switch
                      id="auto_print_bill"
                      checked={restaurantSettings.auto_print_bill}
                      onCheckedChange={(checked) => setRestaurantSettings(prev => ({ ...prev, auto_print_bill: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="low_stock_alert">Low Stock Alerts</Label>
                      <p className="text-sm text-gray-500">Notify when inventory is running low</p>
                    </div>
                    <Switch
                      id="low_stock_alert"
                      checked={restaurantSettings.low_stock_alert}
                      onCheckedChange={(checked) => setRestaurantSettings(prev => ({ ...prev, low_stock_alert: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="order_notifications">Order Notifications</Label>
                      <p className="text-sm text-gray-500">Sound alerts for new orders</p>
                    </div>
                    <Switch
                      id="order_notifications"
                      checked={restaurantSettings.order_notifications}
                      onCheckedChange={(checked) => setRestaurantSettings(prev => ({ ...prev, order_notifications: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => resetToDefaults('restaurant')}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset to Defaults
                </Button>
                <Button onClick={saveRestaurantSettings} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Restaurant Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment Configuration
              </CardTitle>
              <CardDescription>Configure payment methods and gateways</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="payment_gateway_enabled">Enable Payment Gateway</Label>
                  <p className="text-sm text-gray-500">Allow digital payments through the system</p>
                </div>
                <Switch
                  id="payment_gateway_enabled"
                  checked={restaurantSettings.payment_gateway_enabled}
                  onCheckedChange={(checked) => setRestaurantSettings(prev => ({ ...prev, payment_gateway_enabled: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upi_id">UPI ID</Label>
                <Input
                  id="upi_id"
                  value={restaurantSettings.upi_id}
                  onChange={(e) => setRestaurantSettings(prev => ({ ...prev, upi_id: e.target.value }))}
                  placeholder="Enter UPI ID for payments"
                />
                <p className="text-sm text-gray-500">This will be used to generate UPI QR codes for payments</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Accepted Payment Methods</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="cash" defaultChecked className="rounded" />
                    <Label htmlFor="cash">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="card" defaultChecked className="rounded" />
                    <Label htmlFor="card">Card</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="upi" defaultChecked className="rounded" />
                    <Label htmlFor="upi">UPI</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="credit" defaultChecked className="rounded" />
                    <Label htmlFor="credit">Credit</Label>
                  </div>
                </div>
              </div>

              <Button onClick={saveRestaurantSettings} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                Save Payment Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>System performance and maintenance settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_concurrent_users">Max Concurrent Users</Label>
                  <Input
                    id="max_concurrent_users"
                    type="number"
                    min="1"
                    max="500"
                    value={systemSettings.max_concurrent_users}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, max_concurrent_users: parseInt(e.target.value) || 50 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session_timeout"
                    type="number"
                    min="5"
                    max="480"
                    value={systemSettings.session_timeout}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, session_timeout: parseInt(e.target.value) || 60 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backup_frequency">Backup Frequency</Label>
                <Select value={systemSettings.backup_frequency} onValueChange={(value) => setSystemSettings(prev => ({ ...prev, backup_frequency: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">System Modes</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="maintenance_mode">Maintenance Mode</Label>
                      <p className="text-sm text-gray-500">Restrict system access for maintenance</p>
                    </div>
                    <Switch
                      id="maintenance_mode"
                      checked={systemSettings.maintenance_mode}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, maintenance_mode: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="debug_mode">Debug Mode</Label>
                      <p className="text-sm text-gray-500">Enable detailed logging and error reporting</p>
                    </div>
                    <Switch
                      id="debug_mode"
                      checked={systemSettings.debug_mode}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, debug_mode: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto_logout">Auto Logout</Label>
                      <p className="text-sm text-gray-500">Automatically logout inactive users</p>
                    </div>
                    <Switch
                      id="auto_logout"
                      checked={systemSettings.auto_logout}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, auto_logout: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => resetToDefaults('system')}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset to Defaults
                </Button>
                <Button onClick={saveSystemSettings} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save System Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security & Access Control
              </CardTitle>
              <CardDescription>Security settings and system diagnostics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Connection Status</h4>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Wifi className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Database Connection</p>
                      <p className="text-sm text-gray-500">Connection to main database</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={testConnection}>
                    Test Connection
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">System Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium">Version</h5>
                    <p className="text-sm text-gray-600">Resort POS v1.0.0</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium">Last Backup</h5>
                    <p className="text-sm text-gray-600">{new Date().toLocaleString()}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium">Active Users</h5>
                    <p className="text-sm text-gray-600">5 users currently online</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium">System Status</h5>
                    <p className="text-sm text-green-600">All systems operational</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Emergency Actions</h4>
                <div className="flex space-x-2">
                  <Button variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Restart System
                  </Button>
                  <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                    <Shield className="mr-2 h-4 w-4" />
                    Emergency Lock
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Emergency actions should only be used when necessary. Contact system administrator if unsure.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
