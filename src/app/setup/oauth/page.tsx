"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, ExternalLink, Copy, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function OAuthSetupPage() {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const redirectUri = 'https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Google OAuth Setup Guide
          </h1>
          <p className="text-gray-600 text-lg">
            Enable Google authentication for your Portfolio KPI Copilot
          </p>
          <Badge variant="secondary" className="mt-2">
            5-minute setup
          </Badge>
        </div>

        {/* Quick Status */}
        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Status:</strong> Google OAuth is configured but may need publishing in Google Console.
            Follow the steps below to enable authentication.
          </AlertDescription>
        </Alert>

        {/* Step-by-step Guide */}
        <div className="space-y-6">
          {/* Step 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">1</span>
                Access Google Cloud Console
              </CardTitle>
              <CardDescription>
                Set up your OAuth application in Google Cloud Console
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-mono text-sm">https://console.cloud.google.com/</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://console.cloud.google.com/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Console
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Navigate to <strong>APIs & Services</strong> → <strong>OAuth consent screen</strong>
              </p>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">2</span>
                Configure Redirect URI
              </CardTitle>
              <CardDescription>
                Add the correct redirect URI to your OAuth client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Go to <strong>Credentials</strong> → Click your OAuth 2.0 Client ID → Add this redirect URI:
              </p>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-mono text-sm break-all">{redirectUri}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(redirectUri, 'redirect-uri')}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copiedText === 'redirect-uri' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">3</span>
                Publish OAuth App (Critical!)
              </CardTitle>
              <CardDescription>
                This is the most common issue - your app needs to be published
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Most Common Fix:</strong> In OAuth consent screen, click <strong>"PUBLISH APP"</strong> 
                  or add your email to <strong>"Test users"</strong> if keeping it in testing mode.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-green-600 mb-2">Option A: Publish App</h4>
                  <p className="text-sm text-gray-600">
                    Click "PUBLISH APP" to allow any Google user to sign in
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-blue-600 mb-2">Option B: Add Test Users</h4>
                  <p className="text-sm text-gray-600">
                    Add specific email addresses to "Test users" section
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">4</span>
                Test Authentication
              </CardTitle>
              <CardDescription>
                Verify that Google OAuth is working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/api/auth/test-oauth" target="_blank">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Check OAuth Config
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button className="w-full sm:w-auto">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test Google Sign-in
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Links & Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Testing & Debugging</h4>
                <div className="space-y-1">
                  <Link href="/api/auth/test-oauth" className="block text-sm text-blue-600 hover:underline">
                    OAuth Configuration Test
                  </Link>
                  <Link href="/dashboard" className="block text-sm text-blue-600 hover:underline">
                    Try Demo Mode
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Documentation</h4>
                <div className="space-y-1">
                  <a href="https://console.cloud.google.com/" target="_blank" className="block text-sm text-blue-600 hover:underline">
                    Google Cloud Console
                  </a>
                  <a href="https://developers.google.com/identity/protocols/oauth2" target="_blank" className="block text-sm text-blue-600 hover:underline">
                    Google OAuth Documentation
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
