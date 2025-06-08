'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut, getProviders } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User, 
  Shield, 
  Key,
  RefreshCw,
  ExternalLink
} from 'lucide-react'

interface AuthStatus {
  success: boolean
  status: string
  authentication: any
  environment: any
  capabilities: any
  recommendations: string[]
  test_urls: any
}

export function AuthTestPanel() {
  const { data: session, status } = useSession()
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [providers, setProviders] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAuthStatus()
    loadProviders()
  }, [])

  const loadAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/verify-setup')
      const data = await response.json()
      setAuthStatus(data)
    } catch (error) {
      setError('Failed to load authentication status')
    }
  }

  const loadProviders = async () => {
    try {
      const providers = await getProviders()
      setProviders(providers || {})
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const testSignIn = async (providerId: string) => {
    setLoading(true)
    try {
      await signIn(providerId, { callbackUrl: '/' })
    } catch (error) {
      setError(`Failed to sign in with ${providerId}`)
    } finally {
      setLoading(false)
    }
  }

  const testSignOut = async () => {
    setLoading(true)
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      setError('Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Session Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Current Session
          </CardTitle>
          <CardDescription>
            Your current authentication status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'loading' && (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading session...</span>
            </div>
          )}
          
          {status === 'authenticated' && session && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Authenticated</span>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p><strong>Name:</strong> {session.user?.name || 'N/A'}</p>
                <p><strong>Email:</strong> {session.user?.email || 'N/A'}</p>
                <p><strong>Role:</strong> {(session.user as any)?.role || 'N/A'}</p>
                <p><strong>ID:</strong> {(session.user as any)?.id || 'N/A'}</p>
              </div>
              <Button onClick={testSignOut} disabled={loading} variant="outline">
                Sign Out
              </Button>
            </div>
          )}
          
          {status === 'unauthenticated' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium">Not Authenticated</span>
              </div>
              <p className="text-sm text-gray-600">
                You are not currently signed in. Test the authentication providers below.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authentication System Status */}
      {authStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Authentication System Status
              <Badge className={getStatusColor(authStatus.status)}>
                {authStatus.status.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Overall health of the authentication system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* System Status */}
            <div className="flex items-center gap-2">
              {getStatusIcon(authStatus.status)}
              <span className="font-medium">
                System Status: {authStatus.status}
              </span>
            </div>

            {/* Configured Providers */}
            <div>
              <h4 className="font-medium mb-2">Configured Providers:</h4>
              <div className="grid grid-cols-2 gap-2">
                {authStatus.authentication?.providers?.configured?.map((provider: any) => (
                  <div key={provider.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{provider.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <h4 className="font-medium mb-2">Capabilities:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(authStatus.capabilities || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    {value ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {authStatus.recommendations && authStatus.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recommendations:</h4>
                <div className="space-y-1">
                  {authStatus.recommendations.map((rec, index) => (
                    <Alert key={index} className="py-2">
                      <AlertDescription className="text-sm">{rec}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Provider Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Test Authentication Providers
          </CardTitle>
          <CardDescription>
            Test each configured authentication provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(providers).length === 0 ? (
            <p className="text-sm text-gray-600">No providers configured</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(providers).map((provider: any) => (
                <Button
                  key={provider.id}
                  variant="outline"
                  className="h-12 justify-start"
                  onClick={() => testSignIn(provider.id)}
                  disabled={loading || status === 'authenticated'}
                >
                  <span>Test {provider.name}</span>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test URLs */}
      {authStatus?.test_urls && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Test URLs
            </CardTitle>
            <CardDescription>
              Direct links to test authentication endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(authStatus.test_urls).map(([key, url]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{key.replace(/_/g, ' ')}:</span>
                  <a
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    Test <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={loadAuthStatus} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>
    </div>
  )
}
