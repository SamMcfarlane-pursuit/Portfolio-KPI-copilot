import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // If user is authenticated, show dashboard
  if (session) {
    return <DashboardOverview />
  }

  // If not authenticated, the DashboardLayout will handle showing the landing page
  return null
}
