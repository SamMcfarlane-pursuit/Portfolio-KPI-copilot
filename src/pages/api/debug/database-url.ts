import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const databaseUrl = process.env.DATABASE_URL
  
  return res.json({
    hasDatabaseUrl: !!databaseUrl,
    databaseType: databaseUrl?.startsWith('postgresql') ? 'PostgreSQL' : 
                  databaseUrl?.startsWith('file:') ? 'SQLite' : 'Unknown',
    urlPrefix: databaseUrl?.substring(0, 30) + '...',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString(),
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('DATABASE')).sort()
  })
}
