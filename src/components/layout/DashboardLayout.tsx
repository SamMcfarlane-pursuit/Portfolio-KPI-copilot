'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { MainNavigation } from '@/components/navigation/MainNavigation'
import { Sidebar } from '@/components/navigation/Sidebar'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { LandingPage } from '@/components/landing/landing-page'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show landing page for unauthenticated users on home page
  if (!session && pathname === '/') {
    return <LandingPage />
  }

  // Show landing page for auth pages
  if (pathname.startsWith('/auth/')) {
    return <>{children}</>
  }

  // For authenticated users, show dashboard layout
  if (session) {
    return (
      <div className="min-h-screen bg-background">
        {/* Main Navigation Header */}
        <MainNavigation />
        
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-6">
              {/* Breadcrumbs */}
              <Breadcrumbs />
              
              {/* Page Content */}
              {children}
            </div>
          </main>
        </div>
      </div>
    )
  }

  // For unauthenticated users trying to access protected routes
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">Please sign in to access this page.</p>
        <div className="space-x-2">
          <a href="/auth/signin" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Sign In
          </a>
          <a href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
