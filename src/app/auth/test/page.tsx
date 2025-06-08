'use client'

import { SessionProvider } from 'next-auth/react'
import { AuthTestPanel } from '@/components/auth/AuthTestPanel'
import { WorkshopHeader } from '@/components/navigation/WorkshopHeader'
import { Shield } from 'lucide-react'

export default function AuthTestPage() {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        {/* Header */}
        <WorkshopHeader
          title="Authentication Testing"
          subtitle="Verify and test all authentication providers and connections"
          icon={<Shield className="w-6 h-6 text-white" />}
          status="🔐 Auth Test"
          statusColor="blue"
          showNavigation={true}
        />

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <AuthTestPanel />
          </div>
        </div>
      </div>
    </SessionProvider>
  )
}
