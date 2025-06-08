import { LandingPage } from '@/components/landing/landing-page'

export default async function HomePage() {
  // Temporarily bypass auth for testing
  // const session = await getServerSession(authOptions)
  // if (session) {
  //   redirect('/ai-dashboard')
  // }

  // Show landing page for all users (testing mode)
  return <LandingPage />
}
