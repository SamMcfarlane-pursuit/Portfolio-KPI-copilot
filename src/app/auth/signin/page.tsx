'use client'

import { useState, useEffect } from 'react'
import { signIn, getProviders, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Github, 
  Mail, 
  Chrome, 
  Linkedin, 
  Building2, 
  Shield, 
  Eye, 
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface Provider {
  id: string
  name: string
  type: string
  signinUrl: string
  callbackUrl: string
}

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [providers, setProviders] = useState<Record<string, Provider>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const callbackUrl = searchParams.get('callbackUrl') || '/summary'
  const errorParam = searchParams.get('error')

  useEffect(() => {
    // Load available providers
    getProviders().then((providers) => {
      if (providers) {
        setProviders(providers)
      }
    })

    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push(callbackUrl)
      }
    })

    // Handle error from URL params
    if (errorParam) {
      switch (errorParam) {
        case 'CredentialsSignin':
          setError('Invalid email or password. Please try again.')
          break
        case 'OAuthSignin':
        case 'OAuthCallback':
        case 'OAuthCreateAccount':
          setError('There was an error with the OAuth provider. Please try again.')
          break
        case 'EmailCreateAccount':
          setError('Could not create account with this email.')
          break
        case 'Callback':
          setError('There was an error during authentication.')
          break
        case 'OAuthAccountNotLinked':
          setError('This account is already linked to another provider.')
          break
        case 'EmailSignin':
          setError('Check your email for the sign-in link.')
          break
        case 'CredentialsSignup':
          setError('Account creation failed. Please try again.')
          break
        default:
          setError('An authentication error occurred.')
      }
    }
  }, [callbackUrl, errorParam, router])

  const handleOAuthSignIn = async (providerId: string) => {
    setLoading(true)
    setError('')
    
    try {
      const result = await signIn(providerId, {
        callbackUrl,
        redirect: false
      })

      if (result?.error) {
        setError('Authentication failed. Please try again.')
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (error) {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        callbackUrl,
        redirect: false
      })

      if (result?.error) {
        setError('Invalid email or password.')
      } else if (result?.url) {
        setSuccess('Sign in successful! Redirecting...')
        setTimeout(() => router.push(result.url || '/'), 1000)
      }
    } catch (error) {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return <Chrome className="w-5 h-5" />
      case 'github':
        return <Github className="w-5 h-5" />
      case 'azure-ad':
        return <Building2 className="w-5 h-5" />
      case 'linkedin':
        return <Linkedin className="w-5 h-5" />
      case 'okta':
        return <Shield className="w-5 h-5" />
      default:
        return <Mail className="w-5 h-5" />
    }
  }

  const getProviderColor = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return 'hover:bg-red-50 border-red-200 text-red-700'
      case 'github':
        return 'hover:bg-gray-50 border-gray-200 text-gray-700'
      case 'azure-ad':
        return 'hover:bg-blue-50 border-blue-200 text-blue-700'
      case 'linkedin':
        return 'hover:bg-blue-50 border-blue-200 text-blue-700'
      case 'okta':
        return 'hover:bg-indigo-50 border-indigo-200 text-indigo-700'
      default:
        return 'hover:bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const oauthProviders = Object.values(providers).filter(
    provider => provider.type === 'oauth' && provider.id !== 'credentials'
  )

  const hasCredentials = providers.credentials

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Portfolio KPI Copilot
          </h1>
          <p className="text-gray-600">
            Sign in to access your portfolio analytics
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Error/Success Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}

            {/* OAuth Providers */}
            {oauthProviders.length > 0 && (
              <div className="space-y-3">
                {oauthProviders.map((provider) => (
                  <Button
                    key={provider.id}
                    variant="outline"
                    className={`w-full h-12 ${getProviderColor(provider.id)}`}
                    onClick={() => handleOAuthSignIn(provider.id)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <>
                        {getProviderIcon(provider.id)}
                        <span className="ml-2">Continue with {provider.name}</span>
                      </>
                    )}
                  </Button>
                ))}
              </div>
            )}

            {/* Separator */}
            {oauthProviders.length > 0 && hasCredentials && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            )}

            {/* Email/Password Form */}
            {hasCredentials && (
              <form onSubmit={handleCredentialsSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={loading}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            )}

            {/* Footer Links */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                <Link href="/auth/forgot-password" className="text-primary hover:underline">
                  Forgot your password?
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
