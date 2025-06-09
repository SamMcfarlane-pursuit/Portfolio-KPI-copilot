'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'

const errorMessages: Record<string, { title: string; description: string; action?: string }> = {
  Configuration: {
    title: 'Server Configuration Error',
    description: 'There is a problem with the server configuration. Please contact support.',
  },
  AccessDenied: {
    title: 'Google OAuth Access Denied',
    description: 'Your Google account does not have permission to access this application. This usually means the OAuth app is in testing mode and you are not added as a test user.',
    action: 'Contact the administrator to either publish the OAuth app or add you as a test user in Google Console.',
  },
  Verification: {
    title: 'Verification Error',
    description: 'The verification token has expired or has already been used.',
    action: 'Please request a new verification email.',
  },
  OAuthSignin: {
    title: 'Google OAuth Sign-in Error',
    description: 'There was an error during the Google OAuth sign-in process. This could be due to incorrect redirect URI configuration.',
    action: 'Verify that the redirect URI in Google Console matches: https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google',
  },
  OAuthCallback: {
    title: 'Google OAuth Callback Error',
    description: 'There was an error processing the OAuth callback from Google. The redirect URI may be misconfigured.',
    action: 'Check that the authorized redirect URI in Google Console is exactly: https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google',
  },
  OAuthCreateAccount: {
    title: 'OAuth Account Creation Error',
    description: 'Could not create an account with the OAuth provider.',
    action: 'Please try a different sign-in method.',
  },
  EmailCreateAccount: {
    title: 'Email Account Creation Error',
    description: 'Could not create an account with this email address.',
    action: 'Please try a different email or contact support.',
  },
  Callback: {
    title: 'Callback Error',
    description: 'There was an error during the authentication callback.',
    action: 'Please try signing in again.',
  },
  OAuthAccountNotLinked: {
    title: 'Account Not Linked',
    description: 'This account is already associated with another sign-in method.',
    action: 'Please sign in using your original method.',
  },
  EmailSignin: {
    title: 'Email Sign-in',
    description: 'Check your email for the sign-in link.',
    action: 'If you don\'t see the email, check your spam folder.',
  },
  CredentialsSignin: {
    title: 'Invalid Credentials',
    description: 'The email or password you entered is incorrect.',
    action: 'Please check your credentials and try again.',
  },
  SessionRequired: {
    title: 'Session Required',
    description: 'You must be signed in to access this page.',
    action: 'Please sign in to continue.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An unexpected error occurred during authentication.',
    action: 'Please try again or contact support if the problem persists.',
  },
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'
  
  const errorInfo = errorMessages[error] || errorMessages.Default

  const handleRetry = () => {
    window.location.href = '/auth/signin'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">
              {errorInfo.title}
            </CardTitle>
            <CardDescription className="text-red-700">
              Authentication failed
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorInfo.description}
              </AlertDescription>
            </Alert>

            {errorInfo.action && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>What to do next:</strong> {errorInfo.action}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button
                variant="outline"
                asChild
                className="w-full"
                size="lg"
              >
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>

            {/* Support Information */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Need help? Contact our support team
              </p>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Email: support@portfoliokpicopilot.com
                </p>
                <p className="text-xs text-muted-foreground">
                  Error Code: {error}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          {(error === 'AccessDenied' || error === 'OAuthSignin' || error === 'OAuthCallback') ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Google OAuth Troubleshooting:
              </p>
              <div className="space-y-2 text-xs text-muted-foreground text-left bg-blue-50 p-4 rounded-lg">
                <p><strong>Most Common Fix:</strong></p>
                <p>• Go to Google Console → OAuth consent screen</p>
                <p>• Either click "PUBLISH APP" or add your email to "Test users"</p>
                <p></p>
                <p><strong>Other Solutions:</strong></p>
                <p>• Verify redirect URI: https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google</p>
                <p>• Check authorized domains include: portfolio-kpi-copilot.vercel.app</p>
                <p>• Try incognito/private browser window</p>
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/api/auth/test-oauth" target="_blank">
                    View OAuth Configuration
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Common solutions:
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Clear your browser cache and cookies</p>
                <p>• Try using an incognito/private browser window</p>
                <p>• Disable browser extensions temporarily</p>
                <p>• Check if your email provider is blocking sign-in emails</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
