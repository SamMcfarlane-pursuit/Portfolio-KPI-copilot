'use client'

/**
 * Data Management Page
 * Comprehensive CRUD interface for all entities
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Database, 
  Building2, 
  TrendingUp, 
  BarChart3,
  Shield,
  History,
  Download,
  Upload,
  Settings
} from 'lucide-react'
import CRUDManager from '@/components/crud/CRUDManager'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DataManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('portfolios')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Data Management</h1>
          <Badge variant="outline" className="ml-2">
            Production Ready
          </Badge>
        </div>
        <p className="text-gray-600 max-w-2xl">
          Comprehensive CRUD operations for portfolios, companies, and KPIs. 
          All operations include audit logging, data validation, and backup capabilities.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Portfolios</p>
                <p className="text-2xl font-bold">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Companies</p>
                <p className="text-2xl font-bold">48</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">KPIs</p>
                <p className="text-2xl font-bold">156</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Audit Logs</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Production Security Features</h3>
              <p className="text-sm text-blue-700 mt-1">
                All CRUD operations include: audit logging, data validation, user permissions, 
                automatic backups before deletion, and referential integrity checks.
              </p>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  <History className="h-3 w-3 mr-1" />
                  Audit Trail
                </Badge>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  <Shield className="h-3 w-3 mr-1" />
                  Data Validation
                </Badge>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  <Database className="h-3 w-3 mr-1" />
                  Auto Backup
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main CRUD Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="portfolios" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Portfolios
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="kpis" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              KPIs
            </TabsTrigger>
          </TabsList>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Portfolio Management */}
        <TabsContent value="portfolios" className="space-y-6">
          <CRUDManager 
            entityType="portfolios" 
            title="Portfolio Management"
          />
        </TabsContent>

        {/* Company Management */}
        <TabsContent value="companies" className="space-y-6">
          <CRUDManager 
            entityType="companies" 
            title="Company Management"
          />
        </TabsContent>

        {/* KPI Management */}
        <TabsContent value="kpis" className="space-y-6">
          <CRUDManager 
            entityType="kpis" 
            title="KPI Management"
          />
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Data Management Help</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Creating Entities</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Click "Create New" to add portfolios, companies, or KPIs</li>
                <li>• All required fields are marked with an asterisk (*)</li>
                <li>• Data is validated before saving</li>
                <li>• Creation is logged for audit purposes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Editing & Deleting</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use the edit button to modify existing entities</li>
                <li>• Soft delete deactivates but preserves data</li>
                <li>• Hard delete permanently removes data</li>
                <li>• All changes are automatically backed up</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Search & Filtering</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use the search box to find specific entities</li>
                <li>• Search works across names, symbols, and categories</li>
                <li>• Results update in real-time as you type</li>
                <li>• Click refresh to reload the latest data</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Security & Compliance</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All operations require authentication</li>
                <li>• User permissions are checked for each action</li>
                <li>• Complete audit trail is maintained</li>
                <li>• Data backups are created before deletions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
