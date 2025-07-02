# Production OAuth Setup Guide
## Portfolio KPI Copilot Authentication Configuration

### 🎯 Overview
Configure production-ready OAuth authentication with multiple providers for enterprise-grade security.

### 🔐 Provider Setup

#### 1. Google OAuth Configuration

##### Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing: "Portfolio KPI Copilot"
3. Enable Google+ API and Google Identity API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"

##### OAuth Configuration
```bash
# Application Type: Web Application
# Name: Portfolio KPI Copilot Production

# Authorized JavaScript Origins:
https://portfolio-kpi-copilot.vercel.app
https://your-custom-domain.com

# Authorized Redirect URIs:
https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google
https://your-custom-domain.com/api/auth/callback/google
```

##### Environment Variables
```bash
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### 2. Microsoft Azure AD Configuration

##### Azure Portal Setup
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Name: "Portfolio KPI Copilot"
5. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"

##### Redirect URI Configuration
```bash
# Platform: Web
# Redirect URIs:
https://portfolio-kpi-copilot.vercel.app/api/auth/callback/azure-ad
https://your-custom-domain.com/api/auth/callback/azure-ad
```

##### API Permissions
- Microsoft Graph → User.Read (Delegated)
- Microsoft Graph → email (Delegated)
- Microsoft Graph → openid (Delegated)
- Microsoft Graph → profile (Delegated)

##### Environment Variables
```bash
AZURE_AD_CLIENT_ID="your-azure-application-id"
AZURE_AD_CLIENT_SECRET="your-azure-client-secret"
AZURE_AD_TENANT_ID="your-azure-tenant-id"
```

#### 3. LinkedIn OAuth Configuration

##### LinkedIn Developer Setup
1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com)
2. Create new app: "Portfolio KPI Copilot"
3. Add company page (required)
4. Verify app

##### OAuth Configuration
```bash
# Authorized Redirect URLs:
https://portfolio-kpi-copilot.vercel.app/api/auth/callback/linkedin
https://your-custom-domain.com/api/auth/callback/linkedin

# Scopes:
- r_liteprofile
- r_emailaddress
```

##### Environment Variables
```bash
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
```

#### 4. GitHub OAuth Configuration

##### GitHub OAuth App Setup
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Application name: "Portfolio KPI Copilot"
4. Homepage URL: https://portfolio-kpi-copilot.vercel.app

##### OAuth Configuration
```bash
# Authorization callback URL:
https://portfolio-kpi-copilot.vercel.app/api/auth/callback/github
https://your-custom-domain.com/api/auth/callback/github
```

##### Environment Variables
```bash
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"
```

### 🔧 NextAuth.js Configuration

#### Update Auth Configuration
```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import LinkedInProvider from 'next-auth/providers/linkedin'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'r_liteprofile r_emailaddress',
        },
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.userId = user.id
        token.role = user.role
        token.organizationId = user.organizationId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.userId = token.userId as string
        session.user.role = token.role as string
        session.user.organizationId = token.organizationId as string
      }
      return session
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Custom sign-in logic
      if (account?.provider === 'google') {
        // Verify Google domain restrictions if needed
        const allowedDomains = process.env.ALLOWED_GOOGLE_DOMAINS?.split(',') || []
        if (allowedDomains.length > 0) {
          const emailDomain = user.email?.split('@')[1]
          if (!allowedDomains.includes(emailDomain!)) {
            return false
          }
        }
      }
      
      // Auto-create organization for new users
      if (user && !user.organizationId) {
        await createDefaultOrganization(user)
      }
      
      return true
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after sign in
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Log sign-in events
      console.log(`User ${user.email} signed in with ${account?.provider}`)
      
      // Track analytics
      if (process.env.NODE_ENV === 'production') {
        // Send to analytics service
      }
    },
    async signOut({ session, token }) {
      // Log sign-out events
      console.log(`User signed out`)
    }
  },
  debug: process.env.NODE_ENV === 'development',
}

async function createDefaultOrganization(user: any) {
  // Auto-create organization for new users
  const orgName = user.email?.split('@')[1]?.split('.')[0] || 'Personal'
  
  const organization = await prisma.organization.create({
    data: {
      name: `${orgName} Organization`,
      industry: 'Technology',
      size: 'SMALL',
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        features: ['basic']
      }
    }
  })
  
  // Update user with organization
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      organizationId: organization.id,
      role: 'ORG_ADMIN' // First user becomes admin
    }
  })
}
```

#### Custom Sign-in Page
```typescript
// src/app/auth/signin/page.tsx
'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignInPage() {
  const [providers, setProviders] = useState<any>(null)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    getProviders().then(setProviders)
  }, [])

  const handleSignIn = async (providerId: string) => {
    setLoading(providerId)
    try {
      await signIn(providerId, { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setLoading(null)
    }
  }

  const providerConfig = {
    google: {
      name: 'Google',
      icon: '🔍',
      description: 'Sign in with your Google account'
    },
    'azure-ad': {
      name: 'Microsoft',
      icon: '🏢',
      description: 'Sign in with your Microsoft account'
    },
    linkedin: {
      name: 'LinkedIn',
      icon: '💼',
      description: 'Sign in with your LinkedIn account'
    },
    github: {
      name: 'GitHub',
      icon: '🐙',
      description: 'Sign in with your GitHub account'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Portfolio KPI Copilot</CardTitle>
          <CardDescription>
            Choose your preferred sign-in method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers && Object.values(providers).map((provider: any) => {
            const config = providerConfig[provider.id as keyof typeof providerConfig]
            if (!config) return null
            
            return (
              <Button
                key={provider.id}
                variant="outline"
                className="w-full h-12 text-left justify-start"
                onClick={() => handleSignIn(provider.id)}
                disabled={loading === provider.id}
              >
                <span className="text-xl mr-3">{config.icon}</span>
                <div>
                  <div className="font-medium">{config.name}</div>
                  <div className="text-xs text-muted-foreground">{config.description}</div>
                </div>
              </Button>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
```

### 🔒 Security Configuration

#### Environment Variables
```bash
# .env.local (Production)
NEXTAUTH_URL="https://portfolio-kpi-copilot.vercel.app"
NEXTAUTH_SECRET="your-super-secure-secret-key-min-32-chars"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
AZURE_AD_CLIENT_ID="your-azure-client-id"
AZURE_AD_CLIENT_SECRET="your-azure-client-secret"
AZURE_AD_TENANT_ID="your-azure-tenant-id"
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"

# Security Settings
ALLOWED_GOOGLE_DOMAINS="company.com,partner.com"
SESSION_MAX_AGE="2592000" # 30 days
JWT_MAX_AGE="2592000" # 30 days
```

#### Security Headers
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

### ✅ Testing Checklist

#### OAuth Testing
- [ ] Google OAuth flow complete
- [ ] Microsoft OAuth flow complete
- [ ] LinkedIn OAuth flow complete
- [ ] GitHub OAuth flow complete
- [ ] Session persistence working
- [ ] Sign-out functionality working
- [ ] Redirect after sign-in working

#### Security Testing
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] Session security validated
- [ ] CSRF protection working
- [ ] Domain restrictions enforced (if configured)

### 🚀 Deployment

#### Vercel Environment Variables
```bash
# Set production environment variables
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
# ... add all OAuth variables

# Deploy
vercel --prod
```

#### Domain Configuration
```bash
# Add custom domain in Vercel dashboard
# Update OAuth redirect URIs to include custom domain
# Configure DNS records
# Enable SSL certificate
```

### 📊 Monitoring

#### Authentication Analytics
- Sign-in success/failure rates
- Provider usage statistics
- Session duration analytics
- User retention metrics

#### Security Monitoring
- Failed authentication attempts
- Suspicious activity detection
- Session hijacking prevention
- Rate limiting on auth endpoints
