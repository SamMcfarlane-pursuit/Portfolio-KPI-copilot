import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  Users,
  Shield,
  Zap,
  Brain,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

// Helper function to check if environment variable exists and is not empty
const hasEnvVar = (name: string): boolean => {
  const value = process.env[name]
  return Boolean(value && value.trim() !== '')
}

// Check if any OAuth providers are configured
const hasOAuthProviders = () => {
  return (
    (hasEnvVar('GOOGLE_CLIENT_ID') && hasEnvVar('GOOGLE_CLIENT_SECRET')) ||
    (hasEnvVar('GITHUB_ID') && hasEnvVar('GITHUB_SECRET')) ||
    (hasEnvVar('AZURE_AD_CLIENT_ID') && hasEnvVar('AZURE_AD_CLIENT_SECRET')) ||
    (hasEnvVar('LINKEDIN_CLIENT_ID') && hasEnvVar('LINKEDIN_CLIENT_SECRET')) ||
    (hasEnvVar('OKTA_CLIENT_ID') && hasEnvVar('OKTA_CLIENT_SECRET'))
  )
}

function LandingPage() {
  const authConfigured = hasOAuthProviders() || hasEnvVar('DATABASE_URL')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Portfolio KPI Copilot</span>
          </div>
          <div className="flex items-center space-x-4">
            {authConfigured ? (
              <Link href="/auth/signin">
                <Button>Sign In</Button>
              </Link>
            ) : (
              <Badge variant="secondary">Demo Mode</Badge>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI-Powered Portfolio Analytics
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform your portfolio management with intelligent KPI tracking,
            real-time analytics, and AI-driven insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {authConfigured ? (
              <>
                <Link href="/auth/signin">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Learn More
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    🚀 Try Demo Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-2">
                    Set Up Authentication
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {!authConfigured && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
              <p className="text-blue-800 text-sm">
                <strong>🎯 Demo Mode Active:</strong> Explore the full interface with sample data instantly!
                No signup required - just click "Try Demo Now" above.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Powerful Features for Modern Portfolio Management
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Everything you need to track, analyze, and optimize your portfolio performance
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Real-time Analytics</CardTitle>
              <CardDescription>
                Track your KPIs with live data updates and interactive dashboards
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Brain className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>AI-Powered Insights</CardTitle>
              <CardDescription>
                Get intelligent recommendations and predictive analytics powered by advanced AI
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Users className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Multi-tenant Support</CardTitle>
              <CardDescription>
                Manage multiple portfolios with role-based access control and security
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Shield className="h-10 w-10 text-red-600 mb-2" />
              <CardTitle>Enterprise Security</CardTitle>
              <CardDescription>
                SOC2 compliant with comprehensive audit logging and data protection
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Zap className="h-10 w-10 text-yellow-600 mb-2" />
              <CardTitle>High Performance</CardTitle>
              <CardDescription>
                Optimized for speed with advanced caching and real-time updates
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-indigo-600 mb-2" />
              <CardTitle>Custom KPIs</CardTitle>
              <CardDescription>
                Create and track custom metrics tailored to your specific needs
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Status Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">System Status</CardTitle>
            <CardDescription>Current deployment and configuration status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Application Deployment</span>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Core Features</span>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-green-600 font-medium">Available</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Demo Mode</span>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-green-600 font-medium">Enabled</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Authentication</span>
                  <div className="flex items-center">
                    {authConfigured ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-green-600 font-medium">Configured</span>
                      </>
                    ) : (
                      <>
                        <div className="h-4 w-4 bg-amber-400 rounded-full mr-2" />
                        <span className="text-amber-600 font-medium">Setup Required</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Database</span>
                  <div className="flex items-center">
                    {hasEnvVar('DATABASE_URL') ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-green-600 font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <div className="h-4 w-4 bg-amber-400 rounded-full mr-2" />
                        <span className="text-amber-600 font-medium">Fallback Mode</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>AI Services</span>
                  <div className="flex items-center">
                    {hasEnvVar('OPENROUTER_API_KEY') || hasEnvVar('OPENAI_API_KEY') ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-green-600 font-medium">Available</span>
                      </>
                    ) : (
                      <>
                        <div className="h-4 w-4 bg-amber-400 rounded-full mr-2" />
                        <span className="text-amber-600 font-medium">Setup Required</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2024 Portfolio KPI Copilot. Built with Next.js, AI, and modern web technologies.</p>
        </div>
      </footer>
    </div>
  )
}

// Force dynamic rendering for authentication checks
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  try {
    const session = await getServerSession(authOptions)

    // If user is authenticated, show dashboard
    if (session) {
      return <DashboardOverview />
    }

    // If not authenticated, show landing page
    return <LandingPage />
  } catch (error) {
    console.error('Error getting session:', error)
    // If there's an error with authentication, show landing page
    return <LandingPage />
  }
}
