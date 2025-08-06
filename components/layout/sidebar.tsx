'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { LayoutDashboard, ShoppingCart, Users, ChefHat, Receipt, BarChart3, Settings, QrCode, Table, Package } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super-admin', 'owner', 'manager', 'admin'] },
  { name: 'Tables', href: '/dashboard/tables', icon: Table, roles: ['super-admin', 'owner', 'manager', 'waiter', 'admin'] },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart, roles: ['super-admin', 'owner', 'manager', 'waiter', 'admin'] },
  { name: 'Kitchen', href: '/dashboard/kitchen', icon: ChefHat, roles: ['super-admin', 'owner', 'manager', 'chef', 'admin'] },
  { name: 'Menu', href: '/dashboard/menu', icon: Package, roles: ['super-admin', 'owner', 'manager', 'admin'] },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package, roles: ['super-admin', 'owner', 'manager', 'admin'] },
  { name: 'Billing', href: '/dashboard/billing', icon: Receipt, roles: ['super-admin', 'owner', 'manager', 'waiter', 'admin'] },
  { name: 'QR Codes', href: '/dashboard/qr-codes', icon: QrCode, roles: ['super-admin', 'owner', 'manager', 'admin'] },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['super-admin', 'owner', 'manager', 'admin'] },
  { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['super-admin', 'owner', 'admin'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['super-admin', 'owner', 'manager', 'admin'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  const filteredNavigation = navigation.filter(item => 
    user && item.roles.includes(user.role)
  )

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Resort POS
            </h1>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive
                        ? 'text-gray-500 dark:text-gray-300'
                        : 'text-gray-400 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300',
                      'mr-3 flex-shrink-0 h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
