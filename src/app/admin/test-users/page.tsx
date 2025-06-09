"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  UserPlus, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Users,
  Shield
} from 'lucide-react'
import Link from 'next/link'

export default function TestUsersPage() {
  const [newEmail, setNewEmail] = useState('')
  const [testUsers, setTestUsers] = useState<string[]>([])
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const addTestUser = () => {
    if (newEmail && !testUsers.includes(newEmail)) {
      setTestUsers([...testUsers, newEmail])
      setNewEmail('')
    }
  }

  const removeTestUser = (email: string) => {
    setTestUsers(testUsers.filter(user => user !== email))
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const copyAllEmails = () => {
    const emailList = testUsers.join('\n')
    copyToClipboard(emailList, 'all-emails')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Google OAuth Test Users Manager
          </h1>
          <p className="text-gray-600 text-lg">
            Add specific users who can sign in without publishing your OAuth app
          </p>
          <Badge variant="secondary" className="mt-2">
            No Publishing Required
          </Badge>
        </div>

        {/* Instructions */}
        <Alert className="mb-8">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> Add email addresses as "test users" in Google Console. 
            These users can sign in immediately without app verification.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Add Test User */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Add Test User
              </CardTitle>
              <CardDescription>
                Add email addresses of users who should be able to sign in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTestUser()}
                  className="flex-1"
                />
                <Button onClick={addTestUser} disabled={!newEmail}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Users List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Test Users ({testUsers.length})
                </div>
                {testUsers.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllEmails}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copiedText === 'all-emails' ? 'Copied!' : 'Copy All'}
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Users who can sign in to your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test users added yet</p>
                  <p className="text-sm">Add email addresses above to enable specific users</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {testUsers.map((email, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-mono text-sm">{email}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTestUser(email)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Google Console Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Google Console Setup Instructions</CardTitle>
              <CardDescription>
                Follow these steps to add test users in Google Console
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <p className="font-semibold">Open Google Cloud Console</p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open OAuth Consent Screen
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <p className="font-semibold">Find "Test users" Section</p>
                    <p className="text-sm text-gray-600">Scroll down to the "Test users" section on the OAuth consent screen page</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <p className="font-semibold">Add Test Users</p>
                    <p className="text-sm text-gray-600">Click "+ ADD USERS" and paste the email addresses from your list above</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">✓</span>
                  <div>
                    <p className="font-semibold">Save and Test</p>
                    <p className="text-sm text-gray-600">Click "SAVE" and test authentication immediately</p>
                  </div>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tip:</strong> You can add up to 100 test users. They can sign in immediately 
                  without any verification process.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Alternative for Unverified App */}
          <Card>
            <CardHeader>
              <CardTitle>Alternative: Guide Users Through "Unverified App" Warning</CardTitle>
              <CardDescription>
                If you don't want to add test users, users can still sign in by following these steps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-semibold text-amber-800 mb-2">User Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-amber-700">
                    <li>Click "Continue with Google" on the sign-in page</li>
                    <li>When you see "This app isn't verified" warning</li>
                    <li>Click <strong>"Advanced"</strong> (small text at bottom)</li>
                    <li>Click <strong>"Go to Portfolio KPI Copilot (unsafe)"</strong></li>
                    <li>Grant permissions and continue</li>
                  </ol>
                </div>
                <p className="text-sm text-gray-600">
                  This method works for any Google user but requires them to acknowledge the unverified app warning.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button variant="outline" asChild className="h-auto p-4">
                  <Link href="/verify/oauth">
                    <div className="text-center">
                      <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-semibold">Verify OAuth</div>
                      <div className="text-xs text-gray-600">Check current status</div>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" asChild className="h-auto p-4">
                  <Link href="/auth/signin">
                    <div className="text-center">
                      <UserPlus className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-semibold">Test Sign In</div>
                      <div className="text-xs text-gray-600">Try authentication</div>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" asChild className="h-auto p-4">
                  <Link href="/dashboard">
                    <div className="text-center">
                      <Shield className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-semibold">Demo Mode</div>
                      <div className="text-xs text-gray-600">Try without auth</div>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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
