"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth, hasPermission } from "@/lib/auth"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Receipt,
  BarChart3,
  Settings,
  ChefHat,
  QrCode,
  TableProperties,
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "owner", "manager", "waiter", "chef"],
  },
  {
    name: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    roles: ["super_admin", "owner", "manager", "waiter", "chef"],
  },
  {
    name: "New Order",
    href: "/dashboard/orders/new",
    icon: Receipt,
    roles: ["super_admin", "owner", "manager", "waiter"],
  },
  {
    name: "Kitchen",
    href: "/dashboard/kitchen",
    icon: ChefHat,
    roles: ["super_admin", "owner", "manager", "chef"],
  },
  {
    name: "Tables",
    href: "/dashboard/tables",
    icon: TableProperties,
    roles: ["super_admin", "owner", "manager", "waiter"],
  },
  {
    name: "Table Management",
    href: "/dashboard/tables/manage",
    icon: Users,
    roles: ["super_admin", "owner", "manager"],
  },
  {
    name: "Menu",
    href: "/dashboard/menu",
    icon: Package,
    roles: ["super_admin", "owner", "manager"],
  },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    roles: ["super_admin", "owner", "manager"],
  },
  {
    name: "Billing",
    href: "/dashboard/billing",
    icon: Receipt,
    roles: ["super_admin", "owner", "manager", "waiter"],
  },
  {
    name: "QR Codes",
    href: "/dashboard/qr-codes",
    icon: QrCode,
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
  const pathname = usePathname()
  const { user } = useAuth()

  const filteredNavigation = navigation.filter((item) => (user?.role ? hasPermission(user.role, item.roles) : false))

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Resort POS</h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
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
  )
}
