import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import MicrosoftProvider from 'next-auth/providers/azure-ad'
import LinkedInProvider from 'next-auth/providers/linkedin'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Helper function to check if environment variable exists and is not empty
const hasEnvVar = (name: string): boolean => {
  const value = process.env[name]
  return Boolean(value && value.trim() !== '')
}

// Create providers array dynamically based on available environment variables
const createProviders = () => {
  const providers: any[] = []

  // Google OAuth Provider (only if credentials are available)
  if (hasEnvVar('GOOGLE_CLIENT_ID') && hasEnvVar('GOOGLE_CLIENT_SECRET')) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: 'openid email profile',
            prompt: 'consent',
            access_type: 'offline',
            response_type: 'code',
          },
        },
      })
    )
  }

  // GitHub OAuth Provider (only if credentials are available)
  if (hasEnvVar('GITHUB_ID') && hasEnvVar('GITHUB_SECRET')) {
    providers.push(
      GitHubProvider({
        clientId: process.env.GITHUB_ID!,
        clientSecret: process.env.GITHUB_SECRET!,
        authorization: {
          params: {
            scope: 'read:user user:email',
          },
        },
      })
    )
  }

  // Microsoft/Azure AD Provider (only if credentials are available)
  if (hasEnvVar('AZURE_AD_CLIENT_ID') && hasEnvVar('AZURE_AD_CLIENT_SECRET')) {
    providers.push(
      MicrosoftProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        tenantId: process.env.AZURE_AD_TENANT_ID,
        authorization: {
          params: {
            scope: 'openid profile email User.Read',
          },
        },
      })
    )
  }

  // LinkedIn Provider (only if credentials are available)
  if (hasEnvVar('LINKEDIN_CLIENT_ID') && hasEnvVar('LINKEDIN_CLIENT_SECRET')) {
    providers.push(
      LinkedInProvider({
        clientId: process.env.LINKEDIN_CLIENT_ID!,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: 'r_liteprofile r_emailaddress',
          },
        },
      })
    )
  }

  // Okta provider for enterprise SSO (only if credentials are available)
  if (hasEnvVar('OKTA_CLIENT_ID') && hasEnvVar('OKTA_CLIENT_SECRET') && hasEnvVar('OKTA_DOMAIN')) {
    providers.push({
      id: 'okta',
      name: 'Okta',
      type: 'oauth' as const,
      wellKnown: `https://${process.env.OKTA_DOMAIN}/.well-known/openid_configuration`,
      authorization: { params: { scope: 'openid email profile' } },
      idToken: true,
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: 'VIEWER' as const,
        }
      },
      clientId: process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
    })
  }

  return providers
}

export const authOptions: NextAuthOptions = {
  // Only use Prisma adapter if database is available
  ...(hasEnvVar('DATABASE_URL') ? { adapter: PrismaAdapter(prisma) } : {}),
  providers: [
    ...createProviders(),
    // Add Email/Password Credentials Provider only if database is available
    ...(hasEnvVar('DATABASE_URL') ? [
      CredentialsProvider({
        id: 'credentials',
        name: 'Email and Password',
        credentials: {
          email: {
            label: 'Email',
            type: 'email',
            placeholder: 'your@email.com'
          },
          password: {
            label: 'Password',
            type: 'password',
            placeholder: 'Your password'
          },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Email and password are required')
          }

          try {
            const user = await prisma.user.findUnique({
              where: { email: credentials.email },
            })

            if (!user || !user.password) {
              throw new Error('Invalid email or password')
            }

            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.password
            )

            if (!isPasswordValid) {
              throw new Error('Invalid email or password')
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
            }
          } catch (error) {
            console.error('Authentication error:', error)
            throw new Error('Authentication failed')
          }
        },
      })
    ] : [])
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role || 'VIEWER'
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      try {
        // Only interact with database if it's available
        if (hasEnvVar('DATABASE_URL')) {
          // Check if user exists in database
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          })

          // If user doesn't exist, create them with default role
          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                image: user.image,
                role: 'VIEWER', // Default role for new users
              },
            })
          }
        }

        return true
      } catch (error) {
        console.error('Error during sign in:', error)
        // Don't fail authentication if database is unavailable
        return true
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Log sign-in event for audit trail (only if database is available)
      if (user.id && hasEnvVar('DATABASE_URL')) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'SIGN_IN',
              resourceType: 'AUTH',
              resourceId: user.id,
              metadata: JSON.stringify({
                provider: account?.provider,
                isNewUser,
              }),
            },
          })
        } catch (error) {
          console.error('Failed to log sign-in event:', error)
        }
      }
    },
    async signOut({ session, token }) {
      // Log sign-out event (only if database is available)
      if (token?.userId && hasEnvVar('DATABASE_URL')) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: token.userId as string,
              action: 'SIGN_OUT',
              resourceType: 'AUTH',
              resourceId: token.userId as string,
            },
          })
        } catch (error) {
          console.error('Failed to log sign-out event:', error)
        }
      }
    },
  },
}
