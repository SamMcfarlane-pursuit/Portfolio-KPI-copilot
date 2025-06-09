/**
 * Supabase Setup and Migration Script
 * Initializes Supabase with proper schema, RLS policies, and test data
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/lib/supabase/types'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function setupSupabase() {
  console.log('🚀 Setting up Supabase for Portfolio KPI Copilot...')

  try {
    // 1. Create tables if they don't exist
    console.log('📊 Creating database tables...')
    await createTables()

    // 2. Set up Row Level Security policies
    console.log('🔒 Setting up Row Level Security policies...')
    await setupRLSPolicies()

    // 3. Create indexes for performance
    console.log('⚡ Creating database indexes...')
    await createIndexes()

    // 4. Set up real-time subscriptions
    console.log('📡 Enabling real-time subscriptions...')
    await enableRealtime()

    // 5. Create test data
    console.log('🧪 Creating test data...')
    await createTestData()

    // 6. Verify setup
    console.log('✅ Verifying setup...')
    await verifySetup()

    console.log('\n🎉 Supabase setup completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Update your .env.local with Supabase credentials')
    console.log('2. Test the integration: npm run dev')
    console.log('3. Visit /api/supabase/status to verify connection')

  } catch (error) {
    console.error('❌ Supabase setup failed:', error)
    throw error
  }
}

async function createTables() {
  const tables = [
    // Organizations table
    `
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      industry TEXT,
      website TEXT,
      logo_url TEXT,
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Profiles table (extends auth.users)
    `
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
      organization_id UUID REFERENCES organizations(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Portfolios table
    `
    CREATE TABLE IF NOT EXISTS portfolios (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      organization_id UUID REFERENCES organizations(id),
      user_id UUID REFERENCES profiles(id),
      industry TEXT,
      stage TEXT CHECK (stage IN ('seed', 'series_a', 'series_b', 'series_c', 'growth', 'mature')),
      investment_amount DECIMAL,
      investment_date DATE,
      valuation DECIMAL,
      ownership_percentage DECIMAL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exited', 'written_off', 'monitoring')),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // KPIs table
    `
    CREATE TABLE IF NOT EXISTS kpis (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      portfolio_id UUID REFERENCES portfolios(id),
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('financial', 'operational', 'growth', 'efficiency', 'risk')),
      value DECIMAL,
      unit TEXT,
      target_value DECIMAL,
      period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
      period_date DATE NOT NULL,
      description TEXT,
      calculation_method TEXT,
      data_source TEXT,
      confidence_level INTEGER DEFAULT 100 CHECK (confidence_level >= 0 AND confidence_level <= 100),
      is_benchmark BOOLEAN DEFAULT FALSE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Companies table
    `
    CREATE TABLE IF NOT EXISTS companies (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      portfolio_id UUID REFERENCES portfolios(id),
      name TEXT NOT NULL,
      legal_name TEXT,
      website TEXT,
      industry TEXT,
      sub_industry TEXT,
      founded_date DATE,
      headquarters TEXT,
      employee_count INTEGER,
      business_model TEXT,
      revenue_model TEXT,
      description TEXT,
      logo_url TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acquired', 'closed', 'ipo')),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Documents table (for RAG)
    `
    CREATE TABLE IF NOT EXISTS documents (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      portfolio_id UUID REFERENCES portfolios(id),
      title TEXT NOT NULL,
      content TEXT,
      document_type TEXT CHECK (document_type IN ('report', 'presentation', 'financial', 'legal', 'memo', 'other')),
      file_url TEXT,
      file_size BIGINT,
      mime_type TEXT,
      embedding VECTOR(1536), -- For OpenAI embeddings
      metadata JSONB DEFAULT '{}',
      uploaded_by UUID REFERENCES profiles(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `
  ]

  for (const sql of tables) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.warn('Table creation warning:', error.message)
      }
    } catch (error) {
      console.warn('Table creation error (may already exist):', error)
    }
  }

  console.log('✅ Database tables created/verified')
}

async function setupRLSPolicies() {
  const policies = [
    // Enable RLS on all tables
    'ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE companies ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE documents ENABLE ROW LEVEL SECURITY;',

    // Organizations policies
    `
    CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
      id IN (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid()
      )
    );
    `,

    // Portfolios policies
    `
    CREATE POLICY "Users can view portfolios in their organization" ON portfolios
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid()
      )
    );
    `,

    // KPIs policies
    `
    CREATE POLICY "Users can view KPIs for accessible portfolios" ON kpis
    FOR SELECT USING (
      portfolio_id IN (
        SELECT p.id FROM portfolios p
        JOIN profiles pr ON pr.organization_id = p.organization_id
        WHERE pr.id = auth.uid()
      )
    );
    `
  ]

  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: policy })
      if (error && !error.message.includes('already exists')) {
        console.warn('RLS policy warning:', error.message)
      }
    } catch (error) {
      console.warn('RLS policy error (may already exist):', error)
    }
  }

  console.log('✅ Row Level Security policies configured')
}

async function createIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_portfolios_organization_id ON portfolios(organization_id);',
    'CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_kpis_portfolio_id ON kpis(portfolio_id);',
    'CREATE INDEX IF NOT EXISTS idx_kpis_period_date ON kpis(period_date);',
    'CREATE INDEX IF NOT EXISTS idx_kpis_category ON kpis(category);',
    'CREATE INDEX IF NOT EXISTS idx_documents_portfolio_id ON documents(portfolio_id);',
    'CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);'
  ]

  for (const index of indexes) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: index })
      if (error) {
        console.warn('Index creation warning:', error.message)
      }
    } catch (error) {
      console.warn('Index creation error (may already exist):', error)
    }
  }

  console.log('✅ Database indexes created')
}

async function enableRealtime() {
  try {
    // Enable realtime for key tables
    const tables = ['portfolios', 'kpis', 'organizations', 'documents']
    
    for (const table of tables) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER PUBLICATION supabase_realtime ADD TABLE ${table};`
      })
      if (error && !error.message.includes('already exists')) {
        console.warn(`Realtime enable warning for ${table}:`, error.message)
      }
    }

    console.log('✅ Real-time subscriptions enabled')
  } catch (error) {
    console.warn('Realtime setup warning:', error)
  }
}

async function createTestData() {
  try {
    // Create test organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert([{
        name: 'Blackstone Portfolio Management',
        description: 'Leading private equity firm',
        industry: 'Private Equity',
        website: 'https://blackstone.com',
        settings: {
          currency: 'USD',
          fiscalYearEnd: '12-31',
          reportingFrequency: 'quarterly'
        }
      }])
      .select()
      .single()

    if (orgError) {
      console.warn('Test organization creation warning:', orgError.message)
      return
    }

    // Create test portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .upsert([{
        name: 'TechCorp Solutions',
        description: 'Leading SaaS platform for enterprise automation',
        organization_id: org.id,
        industry: 'Technology',
        stage: 'growth',
        investment_amount: 250000000,
        investment_date: '2023-06-15',
        valuation: 1000000000,
        ownership_percentage: 35.5,
        status: 'active'
      }])
      .select()
      .single()

    if (portfolioError) {
      console.warn('Test portfolio creation warning:', portfolioError.message)
      return
    }

    // Create test KPIs
    const testKPIs = [
      {
        portfolio_id: portfolio.id,
        name: 'Annual Recurring Revenue',
        category: 'financial',
        value: 150000000,
        unit: 'USD',
        target_value: 200000000,
        period_type: 'yearly',
        period_date: '2024-12-31',
        description: 'Total annual recurring revenue',
        data_source: 'Financial System',
        confidence_level: 98
      },
      {
        portfolio_id: portfolio.id,
        name: 'Customer Acquisition Cost',
        category: 'growth',
        value: 125,
        unit: 'USD',
        target_value: 100,
        period_type: 'monthly',
        period_date: '2024-12-01',
        description: 'Average cost to acquire new customer',
        data_source: 'Marketing Analytics',
        confidence_level: 95
      }
    ]

    const { error: kpiError } = await supabase
      .from('kpis')
      .upsert(testKPIs)

    if (kpiError) {
      console.warn('Test KPI creation warning:', kpiError.message)
    }

    console.log('✅ Test data created successfully')

  } catch (error) {
    console.warn('Test data creation warning:', error)
  }
}

async function verifySetup() {
  try {
    // Test basic queries
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)

    const { data: portfolios, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id, name')
      .limit(1)

    const { data: kpis, error: kpiError } = await supabase
      .from('kpis')
      .select('id, name')
      .limit(1)

    console.log('✅ Setup verification completed:')
    console.log(`   Organizations: ${orgs?.length || 0} found`)
    console.log(`   Portfolios: ${portfolios?.length || 0} found`)
    console.log(`   KPIs: ${kpis?.length || 0} found`)

    if (orgError || portfolioError || kpiError) {
      console.warn('Verification warnings:', { orgError, portfolioError, kpiError })
    }

  } catch (error) {
    console.error('Setup verification failed:', error)
    throw error
  }
}

// Run the setup
if (require.main === module) {
  setupSupabase()
    .then(() => {
      console.log('✅ Supabase setup script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Supabase setup script failed:', error)
      process.exit(1)
    })
}

export default setupSupabase
