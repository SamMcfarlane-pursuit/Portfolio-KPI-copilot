"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  Brain,
  MessageSquare,
  Database,
  Activity,
  Home,
  Menu,
  X,
  ChevronDown,
  Shield
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface WorkshopHeaderProps {
  title: string
  subtitle: string
  icon?: React.ReactNode
  status?: string
  statusColor?: 'green' | 'blue' | 'purple' | 'orange'
  showNavigation?: boolean
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/ai-dashboard',
    icon: BarChart3,
    description: 'Portfolio analytics & insights'
  },
  {
    name: 'AI Assistant',
    href: '/ai-assistant',
    icon: Brain,
    description: 'AI-powered portfolio analysis'
  },
  {
    name: 'Data',
    href: '/real-data',
    icon: Database,
    description: 'Portfolio data & entry'
  },
  {
    name: 'Auth Test',
    href: '/auth/test',
    icon: Shield,
    description: 'Authentication testing & verification'
  }
]

export function WorkshopHeader({ 
  title, 
  subtitle, 
  icon, 
  status = "Active", 
  statusColor = "green",
  showNavigation = true 
}: WorkshopHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const getStatusColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-600 hover:bg-green-700'
      case 'blue':
        return 'bg-blue-600 hover:bg-blue-700'
      case 'purple':
        return 'bg-purple-600 hover:bg-purple-700'
      case 'orange':
        return 'bg-orange-600 hover:bg-orange-700'
      default:
        return 'bg-green-600 hover:bg-green-700'
    }
  }

  const getIconColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'from-green-500 to-emerald-600'
      case 'blue':
        return 'from-blue-600 to-purple-600'
      case 'purple':
        return 'from-purple-600 to-pink-600'
      case 'orange':
        return 'from-orange-500 to-red-600'
      default:
        return 'from-green-500 to-emerald-600'
    }
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${getIconColorClasses(statusColor)} rounded-xl flex items-center justify-center shadow-glow`}>
            {icon || <BarChart3 className="w-6 h-6 text-white" />}
          </div>
          <div>
            <h1 className={`text-xl font-bold bg-gradient-to-r ${getIconColorClasses(statusColor)} bg-clip-text text-transparent`}>
              {title}
            </h1>
            <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        {showNavigation && (
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`h-10 px-3 ${isActive ? 'btn-primary-enhanced' : 'hover:bg-muted'}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </div>
        )}

        {/* Right Side Actions */}
        <div className="flex items-center space-x-3">
          {/* Status Badge */}
          <Badge variant="default" className={`${getStatusColorClasses(statusColor)} shadow-md`}>
            <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse mr-2"></div>
            {status}
          </Badge>

          {/* Mobile Navigation */}
          {showNavigation && (
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="w-4 h-4 mr-2" />
                    Menu
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex items-center">
                          <Icon className="w-4 h-4 mr-2" />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Home Button */}
          <Link href="/">
            <Button variant="outline" size="sm" className="btn-secondary-enhanced">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
