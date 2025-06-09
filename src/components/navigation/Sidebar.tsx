'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  BarChart3,
  Brain,
  Database,
  Settings,
  Users,
  FileText,
  Activity,
  Home,
  Building2,
  TrendingUp,
  Shield,
  ChevronLeft,
  ChevronRight,
  Zap,
  Bell,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  description?: string
  requiresAuth?: boolean
  adminOnly?: boolean
}

const mainNavItems: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Overview and key metrics',
    requiresAuth: true
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: Building2,
    description: 'Portfolio companies',
    requiresAuth: true
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    description: 'Advanced insights',
    requiresAuth: true
  },
  {
    name: 'AI Assistant',
    href: '/ai-assistant',
    icon: Brain,
    description: 'AI-powered analysis',
    badge: 'AI',
    requiresAuth: true
  }
]

const dataNavItems: SidebarItem[] = [
  {
    name: 'Data Sources',
    href: '/data',
    icon: Database,
    description: 'Manage data connections',
    requiresAuth: true
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    description: 'Generate reports',
    requiresAuth: true
  },
  {
    name: 'System Health',
    href: '/system',
    icon: Activity,
    description: 'Monitor system status',
    requiresAuth: true
  }
]

const adminNavItems: SidebarItem[] = [
  {
    name: 'User Management',
    href: '/admin/users',
    icon: Users,
    description: 'Manage users',
    requiresAuth: true,
    adminOnly: true
  },
  {
    name: 'System Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'Configure system',
    requiresAuth: true,
    adminOnly: true
  },
  {
    name: 'Admin Panel',
    href: '/admin',
    icon: Shield,
    description: 'Admin dashboard',
    requiresAuth: true,
    adminOnly: true
  }
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isAuthenticated = !!session
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'

  const isActivePath = (href: string) => {
    if (href === '/dashboard' && pathname === '/') return true
    return pathname.startsWith(href)
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <span className="font-semibold text-sm">KPI Copilot</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-xs font-medium text-muted-foreground px-3 py-2">
              Main
            </p>
          )}
          {mainNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActivePath(item.href) ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  collapsed && "justify-center px-2",
                  isActivePath(item.href) && "bg-primary text-primary-foreground"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn("w-4 h-4", !collapsed && "mr-2")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </Link>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Data & Tools */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-xs font-medium text-muted-foreground px-3 py-2">
              Data & Tools
            </p>
          )}
          {dataNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActivePath(item.href) ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  collapsed && "justify-center px-2",
                  isActivePath(item.href) && "bg-primary text-primary-foreground"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn("w-4 h-4", !collapsed && "mr-2")} />
                {!collapsed && <span className="flex-1 text-left">{item.name}</span>}
              </Button>
            </Link>
          ))}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              {!collapsed && (
                <p className="text-xs font-medium text-muted-foreground px-3 py-2">
                  Administration
                </p>
              )}
              {adminNavItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActivePath(item.href) ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      collapsed && "justify-center px-2",
                      isActivePath(item.href) && "bg-primary text-primary-foreground"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className={cn("w-4 h-4", !collapsed && "mr-2")} />
                    {!collapsed && <span className="flex-1 text-left">{item.name}</span>}
                  </Button>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="border-t p-2">
        {!collapsed && (
          <div className="space-y-1">
            <Link href="/help">
              <Button variant="ghost" className="w-full justify-start">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help & Support
              </Button>
            </Link>
            <div className="px-3 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">System Online</span>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full" title="System Online"></div>
          </div>
        )}
      </div>
    </div>
  )
}
