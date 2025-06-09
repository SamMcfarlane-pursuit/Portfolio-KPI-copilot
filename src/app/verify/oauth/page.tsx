"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw,
  Copy,
  Play,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

interface OAuthStatus {
  overall_status: string
  validation: any
  session: any
  oauth_urls: any
  google_config: any
  next_steps: string[]
  google_console_requirements: any
  quick_links: any
}

export default function OAuthVerificationPage() {
  const [status, setStatus] = useState<OAuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const { data: session, status: sessionStatus } = useSession()

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/test-oauth')
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError('Failed to fetch OAuth status')
      console.error('Error fetching OAuth status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [sessionStatus])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FULLY_WORKING': return 'bg-green-100 text-green-800'
      case 'READY_FOR_TESTING': return 'bg-blue-100 text-blue-800'
      case 'NEEDS_CONFIGURATION': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
      case 'FULLY_WORKING':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'READY_FOR_TESTING':
        return <AlertCircle className="h-5 w-5 text-blue-600" />
      case 'FAIL':
      case 'NEEDS_CONFIGURATION':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading OAuth verification status...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            OAuth Verification Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Real-time Google OAuth configuration and testing
          </p>
          {status && (
            <Badge className={`mt-4 ${getStatusColor(status.overall_status)}`}>
              {status.overall_status.replace('_', ' ')}
            </Badge>
          )}
        </div>

        {error && (
          <Alert className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status && (
          <div className="space-y-6">
            {/* Overall Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {getStatusIcon(status.overall_status)}
                  <span className="ml-2">Overall Status</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchStatus}
                    className="ml-auto"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    {getStatusIcon(status.validation.environment_variables.status)}
                    <p className="font-semibold mt-2">Environment Variables</p>
                    <p className="text-sm text-gray-600">{status.validation.environment_variables.status}</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    {getStatusIcon(status.validation.oauth_configuration.status)}
                    <p className="font-semibold mt-2">OAuth Configuration</p>
                    <p className="text-sm text-gray-600">{status.validation.oauth_configuration.status}</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    {getStatusIcon(status.validation.session_status.authenticated ? 'PASS' : 'READY_FOR_TESTING')}
                    <p className="font-semibold mt-2">Authentication</p>
                    <p className="text-sm text-gray-600">
                      {status.validation.session_status.authenticated ? 'Active' : 'Not Authenticated'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Session */}
            <Card>
              <CardHeader>
                <CardTitle>Current Session Status</CardTitle>
              </CardHeader>
              <CardContent>
                {session ? (
                  <div className="space-y-2">
                    <p><strong>✅ Authenticated:</strong> Yes</p>
                    <p><strong>👤 User:</strong> {session.user?.name || session.user?.email}</p>
                    <p><strong>📧 Email:</strong> {session.user?.email}</p>
                    <p><strong>🕒 Expires:</strong> {new Date(session.expires).toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-gray-600 mb-4">No active session - authentication needed</p>
                    <Link href="/auth/signin">
                      <Button>
                        <Play className="h-4 w-4 mr-2" />
                        Test Google OAuth
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Google Console Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Google Console Configuration</CardTitle>
                <CardDescription>Required settings for your Google OAuth app</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="font-semibold">Authorized Redirect URI:</label>
                  <div className="flex items-center mt-1">
                    <code className="bg-gray-100 px-2 py-1 rounded flex-1 text-sm">
                      {status.google_console_requirements.redirect_uri}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(status.google_console_requirements.redirect_uri, 'redirect-uri')}
                      className="ml-2"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedText === 'redirect-uri' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold">Authorized Domains:</label>
                  <div className="mt-1 space-y-1">
                    {status.google_console_requirements.authorized_domains.map((domain: string) => (
                      <div key={domain} className="flex items-center">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{domain}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold">Required Scopes:</label>
                  <div className="mt-1">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {status.google_console_requirements.required_scopes.join(', ')}
                    </code>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical:</strong> {status.google_console_requirements.publishing_status}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {status.next_steps.map((step: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <span className="text-sm">{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" asChild className="h-auto p-4">
                    <a href={status.quick_links.google_console} target="_blank">
                      <div className="text-center">
                        <ExternalLink className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-semibold">Google Console</div>
                        <div className="text-xs text-gray-600">Configure OAuth</div>
                      </div>
                    </a>
                  </Button>

                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/auth/signin">
                      <div className="text-center">
                        <Play className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-semibold">Test Sign In</div>
                        <div className="text-xs text-gray-600">Try OAuth flow</div>
                      </div>
                    </Link>
                  </Button>

                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/setup/oauth">
                      <div className="text-center">
                        <Settings className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-semibold">Setup Guide</div>
                        <div className="text-xs text-gray-600">Step-by-step</div>
                      </div>
                    </Link>
                  </Button>

                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/admin/test-users">
                      <div className="text-center">
                        <Settings className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-semibold">Test Users</div>
                        <div className="text-xs text-gray-600">Manage access</div>
                      </div>
                    </Link>
                  </Button>

                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/dashboard">
                      <div className="text-center">
                        <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-semibold">Demo Mode</div>
                        <div className="text-xs text-gray-600">Try features</div>
                      </div>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link href="/">
            <Button variant="outline">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
