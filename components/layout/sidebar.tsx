"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth, hasPermission } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  Package,
  Receipt,
  BarChart3,
  Settings,
  ChefHat,
  QrCode,
  CreditCard,
  Building,
  Menu,
  X,
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "owner", "manager", "waiter", "chef"],
  },
  {
    name: "Tables",
    href: "/dashboard/tables",
    icon: Building,
    roles: ["super_admin", "owner", "manager", "waiter", "busser"],
  },
  {
    name: "Orders",
    href: "/dashboard/orders",
    icon: Receipt,
    roles: ["super_admin", "owner", "manager", "waiter"],
  },
  {
    name: "Menu",
    href: "/dashboard/menu",
    icon: UtensilsCrossed,
    roles: ["super_admin", "owner", "manager"],
  },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    roles: ["super_admin", "owner", "manager"],
  },
  {
    name: "Kitchen Display",
    href: "/dashboard/kitchen",
    icon: ChefHat,
    roles: ["super_admin", "owner", "manager", "chef"],
  },
  {
    name: "QR Codes",
    href: "/dashboard/qr-codes",
    icon: QrCode,
    roles: ["super_admin", "owner"],
  },
  {
    name: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    roles: ["super_admin", "owner", "manager"],
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["super_admin", "owner", "manager"],
  },
  {
    name: "Users",
    href: "/dashboard/users",
    icon: Users,
    roles: ["super_admin", "owner"],
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["super_admin", "owner", "manager"],
  },
]

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  const filteredNavigation = navigation.filter((item) => user && hasPermission(user.role, item.roles))

  return (
    <>
      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Resort POS</h1>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white dark:bg-gray-800">
            <div className="flex h-16 items-center justify-between px-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Resort POS</h1>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                      isActive
                        ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white",
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Resort POS</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    isActive
                      ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white",
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}
