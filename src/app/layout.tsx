import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Portfolio KPI Copilot | KPI Analytics',
  description: 'Enterprise AI-powered Portfolio KPI Analysis Assistant',
  keywords: ['portfolio', 'KPI', 'AI', 'analytics', 'operations', 'KPI Analytics'],
  authors: [{ name: 'KPI Analytics Team' }],
  robots: 'noindex, nofollow', // Private enterprise app
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
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
