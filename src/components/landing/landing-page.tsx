'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Shield, Zap, Users, FileText, TrendingUp, Brain, MessageSquare, Database, Activity, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function LandingPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const features = [
    {
      icon: BarChart3,
      title: 'KPI Analytics',
      description: 'Natural language queries on portfolio KPIs with auto-generated visualizations',
    },
    {
      icon: FileText,
      title: 'Document Intelligence',
      description: 'AI-powered analysis of board decks, memos, and financial reports',
    },
    {
      icon: TrendingUp,
      title: 'Performance Insights',
      description: 'Automated trend analysis and anomaly detection across portfolios',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'SOC2 compliant with role-based access control and audit trails',
    },
    {
      icon: Zap,
      title: 'Real-time Sync',
      description: 'Connect to Snowflake, BigQuery, and other data warehouses',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Share insights, create board materials, and collaborate seamlessly',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Enhanced Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-soft">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-glow">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Portfolio Ops Copilot
              </h1>
              <p className="text-sm text-muted-foreground font-medium">Enterprise AI Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link href="/ai-dashboard">
                <Button variant="ghost" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-950">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/ai-assistant">
                <Button variant="ghost" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-950">
                  <Brain className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
              </Link>
              <Link href="/real-data">
                <Button variant="ghost" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-950">
                  <Database className="w-4 h-4 mr-2" />
                  Data
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <Button variant="outline" onClick={() => signIn()}>
                Sign In
              </Button>
              <Button onClick={() => router.push('/summary')} className="btn-primary-enhanced">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4 space-y-2">
            <Link href="/ai-dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/ai-assistant" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <Brain className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
            </Link>
            <Link href="/real-data" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <Database className="w-4 h-4 mr-2" />
                Data
              </Button>
            </Link>
            <div className="pt-2 border-t">
              <Button variant="outline" className="w-full mb-2" onClick={() => signIn()}>
                Sign In
              </Button>
              <Button className="w-full btn-primary-enhanced" onClick={() => router.push('/ai-dashboard')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-emerald-600/5 rounded-3xl"></div>
        <div className="max-w-5xl mx-auto relative">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-3 glass-effect rounded-full px-6 py-3 mb-8 shadow-glow">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Production Ready • Enterprise Grade
              </span>
            </div>
          </div>

          <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-8 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
              AI-Powered Portfolio
            </span>
            <br />
            <span className="text-foreground">Operations for</span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">KPI</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-6 max-w-3xl mx-auto font-medium leading-relaxed">
            Transform your portfolio operations with natural language KPI queries,
            intelligent document analysis, and automated insights generation.
          </p>

          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            🤖 MiniLLM AI Engine • 📊 Real-time Analytics • 🔒 Enterprise Security
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button size="lg" onClick={() => router.push('/ai-dashboard')} className="text-lg px-10 py-6 h-auto btn-primary-enhanced">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🚀</span>
                <div className="text-left">
                  <div className="font-bold">Get Started</div>
                  <div className="text-sm opacity-90">Explore the platform</div>
                </div>
              </div>
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/demo')} className="text-lg px-10 py-6 h-auto btn-secondary-enhanced">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🎬</span>
                <div className="text-left">
                  <div className="font-bold">Watch Demo</div>
                  <div className="text-sm opacity-70">See it in action</div>
                </div>
              </div>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-4 glass-effect rounded-xl hover:shadow-md smooth-transition">
              <div className="text-3xl font-bold text-blue-600">16+</div>
              <div className="text-sm text-muted-foreground">Portfolio Companies</div>
            </div>
            <div className="text-center p-4 glass-effect rounded-xl hover:shadow-md smooth-transition">
              <div className="text-3xl font-bold text-green-600">100+</div>
              <div className="text-sm text-muted-foreground">KPI Data Points</div>
            </div>
            <div className="text-center p-4 glass-effect rounded-xl hover:shadow-md smooth-transition">
              <div className="text-3xl font-bold text-purple-600">$2B+</div>
              <div className="text-sm text-muted-foreground">Total AUM</div>
            </div>
            <div className="text-center p-4 glass-effect rounded-xl hover:shadow-md smooth-transition">
              <div className="text-3xl font-bold text-orange-600">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Workshop Features - Direct Access */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Explore Live Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Try our fully functional Portfolio Operations platform with real data and AI capabilities
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Link href="/summary">
            <Card className="border-2 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl flex items-center justify-between">
                  System Summary
                  <Badge variant="default" className="bg-green-600">Live</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Complete overview of all features, deployment status, and system capabilities with real-time metrics
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/ai-assistant">
            <Card className="border-2 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl flex items-center justify-between">
                  AI Assistant
                  <Badge variant="default" className="bg-blue-600">🤖 Unified</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Unified MiniLLM + Prompt interface for portfolio operations with chat, analysis, and quick actions
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/ai-dashboard">
            <Card className="border-2 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl flex items-center justify-between">
                  AI Analytics
                  <Badge variant="default" className="bg-orange-600">📊 Data</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Real-time sentiment analysis, performance insights, and AI-powered investment recommendations
                </CardDescription>
              </CardContent>
            </Card>
          </Link>



          <Link href="/real-data">
            <Card className="border-2 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl flex items-center justify-between">
                  Real Data Explorer
                  <Badge variant="default" className="bg-blue-600">🔴 Live</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Explore real portfolio companies including Stripe, OpenAI, and Revolut with actual financial data
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/status">
            <Card className="border-2 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl flex items-center justify-between">
                  System Status
                  <Badge variant="default" className="bg-green-600">⚡ Monitor</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Real-time system health monitoring, performance metrics, and service status dashboard
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Traditional Features Grid */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold mb-4">Core Capabilities</h3>
          <p className="text-muted-foreground">
            Built on enterprise-grade technology stack
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Use Cases</h2>
            <p className="text-lg text-muted-foreground">
              See how Portfolio Ops Copilot transforms daily workflows
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">Natural Language Queries</h3>
                <p className="text-muted-foreground">
                  Ask questions like &quot;What&apos;s the IRR for Fund IV?&quot; or &quot;Show me underperforming
                  portfolio companies this quarter&quot; and get instant, accurate answers with
                  source citations.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">Board Preparation</h3>
                <p className="text-muted-foreground">
                  Generate board deck summaries, create talking points, and export 
                  performance data to PowerPoint with one click.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">Document Analysis</h3>
                <p className="text-muted-foreground">
                  Upload Excel files, PDFs, and presentations to automatically extract 
                  KPIs and generate insights across your entire document library.
                </p>
              </div>
            </div>
            
            <div className="bg-background rounded-lg p-8 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>AI Assistant</span>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm">
                    "                    {`"What's the EBITDA trend for our real estate portfolio over the last 4 quarters?"`}"
                  </p>
                </div>
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-sm">
                    Based on the latest data, your real estate portfolio shows:
                    <br />• Q4 EBITDA: $45.2M (+12% QoQ)
                    <br />• Q3 EBITDA: $40.3M (+8% QoQ)
                    <br />• Strong upward trend with 15% YoY growth
                    <br />
                    <br />Sources: Q4 Portfolio Report, Real Estate KPI Dashboard
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Portfolio Operations?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join the future of portfolio management with AI-powered insights and automation.
          </p>
          <Button size="lg" onClick={() => signIn()}>
            Start Your Journey
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Portfolio Ops Copilot</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 KPI Analytics. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
