import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Portfolio KPI Copilot | Enterprise AI Analytics',
  description: 'Enterprise AI-powered Portfolio KPI Analysis and Management Platform',
  keywords: ['portfolio', 'KPI', 'AI', 'analytics', 'operations', 'enterprise', 'dashboard'],
  authors: [{ name: 'Portfolio KPI Copilot Team' }],
  robots: 'noindex, nofollow', // Private enterprise app
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Portfolio KPI Copilot',
    description: 'Enterprise AI-powered Portfolio KPI Analysis Platform',
    type: 'website',
    locale: 'en_US',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <DashboardLayout>
            {children}
          </DashboardLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
