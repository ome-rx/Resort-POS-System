"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth, hasPermission } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { LayoutDashboard, Users, ShoppingCart, UtensilsCrossed, Receipt, BarChart3, Settings, QrCode, ChefHat, Table, Menu, ChevronLeft, ChevronRight } from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super-admin", "owner", "manager", "waiter", "chef", "admin"],
  },
  {
    title: "Tables",
    href: "/dashboard/tables",
    icon: Table,
    roles: ["super-admin", "owner", "manager", "waiter", "admin"],
  },
  {
    title: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    roles: ["super-admin", "owner", "manager", "waiter", "chef", "admin"],
  },
  {
    title: "Kitchen",
    href: "/dashboard/kitchen",
    icon: ChefHat,
    roles: ["super-admin", "owner", "manager", "chef", "admin"],
  },
  {
    title: "Menu",
    href: "/dashboard/menu",
    icon: UtensilsCrossed,
    roles: ["super-admin", "owner", "manager", "admin"],
  },
  {
    title: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    roles: ["super-admin", "owner", "manager", "admin"],
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: Receipt,
    roles: ["super-admin", "owner", "manager", "waiter", "admin"],
  },
  {
    title: "QR Codes",
    href: "/dashboard/qr-codes",
    icon: QrCode,
    roles: ["super-admin", "owner", "manager", "admin"],
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["super-admin", "owner", "manager", "admin"],
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: Users,
    roles: ["super-admin", "owner", "admin"],
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["super-admin", "owner", "manager", "admin"],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  )

  return (
    <div className={cn(
      "flex flex-col bg-card border-r transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <h2 className="text-lg font-semibold">Resort POS</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    collapsed && "px-2"
                  )}
                >
                  <Icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                  {!collapsed && item.title}
                </Button>
              </Link>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
