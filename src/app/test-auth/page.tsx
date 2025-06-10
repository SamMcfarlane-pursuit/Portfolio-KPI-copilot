'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, User, Mail, Shield, Calendar } from 'lucide-react'

export default function TestAuthPage() {
  const { data: session, status } = useSession()

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/test-auth' })
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/test-auth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            🔐 Authentication Test Page
          </h1>
          <p className="text-gray-600">
            Test the OAuth authentication system
          </p>
        </div>

        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === 'authenticated' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Authentication Status
            </CardTitle>
            <CardDescription>
              Current authentication state and session information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant={status === 'authenticated' ? 'default' : 'secondary'}>
                {status}
              </Badge>
            </div>

            {status === 'authenticated' && session ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Name:</span>
                    <span>{session.user?.name || 'Not provided'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Email:</span>
                    <span>{session.user?.email || 'Not provided'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Role:</span>
                    <span>{(session.user as any)?.role || 'VIEWER'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Expires:</span>
                    <span>{new Date(session.expires).toLocaleDateString()}</span>
                  </div>
                </div>

                {session.user?.image && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={session.user.image} 
                      alt="Profile" 
                      className="w-12 h-12 rounded-full"
                    />
                    <span className="text-sm text-gray-600">Profile Image</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-600">
                {status === 'loading' ? 'Loading session...' : 'Not authenticated'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Authentication Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Actions</CardTitle>
            <CardDescription>
              Test different authentication methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'authenticated' ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">
                    ✅ Authentication Successful!
                  </p>
                  <p className="text-green-700 text-sm">
                    You are successfully signed in with OAuth.
                  </p>
                </div>
                
                <Button 
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-medium">
                    🔐 Ready to Test Authentication
                  </p>
                  <p className="text-blue-700 text-sm">
                    Click the button below to test Google OAuth sign-in.
                  </p>
                </div>

                <Button 
                  onClick={handleGoogleSignIn}
                  className="w-full"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Test Google Sign-In
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Or try other authentication methods:
                  </p>
                  <div className="mt-2 space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => signIn('github', { callbackUrl: '/test-auth' })}
                    >
                      GitHub
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => signIn('azure-ad', { callbackUrl: '/test-auth' })}
                    >
                      Azure AD
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
            <CardDescription>
              If authentication fails, here are common solutions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>If you see "Access Denied" error:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>The Google OAuth app is in testing mode</li>
                <li>Your email needs to be added as a test user in Google Console</li>
                <li>Or the OAuth app needs to be published</li>
              </ul>
              
              <p className="mt-3"><strong>Quick fixes:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Try using an incognito/private browser window</li>
                <li>Clear your browser cache and cookies</li>
                <li>Try a different OAuth provider (GitHub, Azure AD)</li>
              </ul>
            </div>
            
            <div className="pt-2 border-t">
              <Button variant="outline" size="sm" asChild>
                <a href="/api/auth/test-oauth" target="_blank">
                  View OAuth Configuration
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
