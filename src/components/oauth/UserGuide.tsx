"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  UserPlus, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Shield,
  Clock
} from 'lucide-react'
import Link from 'next/link'

interface UserGuideProps {
  className?: string
}

export function UserGuide({ className }: UserGuideProps) {
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Enable Google OAuth Without Publishing
          </CardTitle>
          <CardDescription>
            Three ways to allow users to sign in without publishing your OAuth app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Option 1: Test Users */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-700">Option 1: Add Test Users</h3>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Recommended
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Immediate Access</p>
                  <p className="text-sm text-gray-600">Specific users can sign in right away</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">No Verification Required</p>
                  <p className="text-sm text-gray-600">No Google review process needed</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Up to 100 Users</p>
                  <p className="text-sm text-gray-600">Add specific email addresses</p>
                </div>
              </div>
              <div className="pt-2">
                <Button asChild size="sm">
                  <Link href="/admin/test-users">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Manage Test Users
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Option 2: Unverified App Flow */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-700">Option 2: Guide Users Through Warning</h3>
              <Badge variant="outline" className="border-blue-200 text-blue-700">
                Any User
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Works for Any Google User</p>
                  <p className="text-sm text-gray-600">No need to add specific users</p>
                </div>
              </div>
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-2">User Instructions:</p>
                <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                  <li>Click "Continue with Google"</li>
                  <li>When seeing "This app isn't verified"</li>
                  <li>Click <strong>"Advanced"</strong> (small text)</li>
                  <li>Click <strong>"Go to Portfolio KPI Copilot (unsafe)"</strong></li>
                  <li>Continue with normal sign-in</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Option 3: Internal Users */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-purple-700">Option 3: Internal User Type</h3>
              <Badge variant="outline" className="border-purple-200 text-purple-700">
                Google Workspace
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium">Organization Users Only</p>
                  <p className="text-sm text-gray-600">All users in your Google Workspace</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <strong>Requirements:</strong> Google Workspace account, change User Type to "Internal" in OAuth consent screen
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Quick Start:</strong> For immediate testing, use Option 1 (Test Users) or guide users through Option 2 (Unverified App Warning).
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/admin/test-users">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Test Users
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Google Console
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
