import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import MicrosoftProvider from 'next-auth/providers/azure-ad'
import LinkedInProvider from 'next-auth/providers/linkedin'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    // GitHub OAuth Provider
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email',
        },
      },
    }),

    // Microsoft/Azure AD Provider
    MicrosoftProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: 'openid profile email User.Read',
        },
      },
    }),

    // LinkedIn Provider
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'r_liteprofile r_emailaddress',
        },
      },
    }),

    // Email/Password Credentials Provider
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
    }),
    // Add Okta provider for enterprise SSO
    ...(process.env.OKTA_CLIENT_ID
      ? [
          {
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
          },
        ]
      : []),
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

        return true
      } catch (error) {
        console.error('Error during sign in:', error)
        return false
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Log sign-in event for audit trail
      if (user.id) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'SIGN_IN',
            resource: 'AUTH',
            details: JSON.stringify({
              provider: account?.provider,
              isNewUser,
            }),
          },
        })
      }
    },
    async signOut({ session, token }) {
      // Log sign-out event
      if (token?.userId) {
        await prisma.auditLog.create({
          data: {
            userId: token.userId as string,
            action: 'SIGN_OUT',
            resource: 'AUTH',
          },
        })
      }
    },
  },
}
