'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  portfolio: 'Portfolio',
  analytics: 'Analytics',
  'ai-assistant': 'AI Assistant',
  data: 'Data Management',
  reports: 'Reports',
  system: 'System Health',
  admin: 'Admin',
  users: 'User Management',
  settings: 'Settings',
  profile: 'Profile',
  auth: 'Authentication',
  signin: 'Sign In',
  signup: 'Sign Up'
}

export function Breadcrumbs() {
  const pathname = usePathname()
  
  // Don't show breadcrumbs on home page or auth pages
  if (pathname === '/' || pathname.startsWith('/auth/')) {
    return null
  }

  const pathSegments = pathname.split('/').filter(Boolean)
  
  // Build breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Home',
      href: '/dashboard',
      icon: Home
    }
  ]

  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    
    breadcrumbItems.push({
      label,
      href: currentPath
    })
  })

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-1" />}
          {index === breadcrumbItems.length - 1 ? (
            // Current page - not clickable
            <span className="flex items-center font-medium text-foreground">
              {item.icon && <item.icon className="w-4 h-4 mr-1" />}
              {item.label}
            </span>
          ) : (
            // Previous pages - clickable
            <Link
              href={item.href}
              className={cn(
                "flex items-center hover:text-foreground transition-colors",
                index === 0 && "text-primary"
              )}
            >
              {item.icon && <item.icon className="w-4 h-4 mr-1" />}
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
