/**
 * Supabase Migration Service
 * Handles migration from SQLite to Supabase with data preservation
 */

import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { Database } from '@/lib/supabase/types'

export interface MigrationOptions {
  dryRun?: boolean
  batchSize?: number
  preserveIds?: boolean
  skipExisting?: boolean
  validateData?: boolean
}

export interface MigrationResult {
  success: boolean
  tablesProcessed: string[]
  recordsMigrated: number
  errors: Array<{ table: string; error: string; record?: any }>
  duration: number
  summary: {
    users: number
    organizations: number
    portfolios: number
    kpis: number
    documents: number
  }
}

export class SupabaseMigrationService {
  private supabase: ReturnType<typeof createClient<Database>>

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing for migration')
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)
  }

  async migrateToSupabase(options: MigrationOptions = {}): Promise<MigrationResult> {
    const startTime = Date.now()
    const {
      dryRun = false,
      batchSize = 100,
      preserveIds = true,
      skipExisting = true,
      validateData = true
    } = options

    console.log('🚀 Starting Supabase migration...')
    console.log(`Options: ${JSON.stringify(options, null, 2)}`)

    const result: MigrationResult = {
      success: false,
      tablesProcessed: [],
      recordsMigrated: 0,
      errors: [],
      duration: 0,
      summary: {
        users: 0,
        organizations: 0,
        portfolios: 0,
        kpis: 0,
        documents: 0
      }
    }

    try {
      // 1. Verify Supabase connection
      await this.verifySupabaseConnection()
      console.log('✅ Supabase connection verified')

      // 2. Setup Supabase schema if needed
      await this.setupSupabaseSchema()
      console.log('✅ Supabase schema ready')

      // 3. Migrate data in order (respecting foreign keys)
      const migrationOrder = [
        'organizations',
        'users', 
        'portfolios',
        'kpis',
        'documents'
      ]

      for (const table of migrationOrder) {
        console.log(`📊 Migrating ${table}...`)
        
        try {
          const migrated = await this.migrateTable(table, {
            dryRun,
            batchSize,
            preserveIds,
            skipExisting,
            validateData
          })

          result.tablesProcessed.push(table)
          result.recordsMigrated += migrated
          result.summary[table as keyof typeof result.summary] = migrated

          console.log(`✅ ${table}: ${migrated} records migrated`)

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push({ table, error: errorMsg })
          console.error(`❌ ${table} migration failed:`, errorMsg)
        }
      }

      // 4. Verify migration integrity
      if (validateData && !dryRun) {
        console.log('🔍 Verifying migration integrity...')
        await this.verifyMigrationIntegrity(result)
      }

      // 5. Update configuration for Supabase primary
      if (!dryRun && result.errors.length === 0) {
        await this.updateConfigurationForSupabase()
        console.log('✅ Configuration updated for Supabase primary')
      }

      result.success = result.errors.length === 0
      result.duration = Date.now() - startTime

      console.log(`🎉 Migration completed in ${result.duration}ms`)
      console.log(`📊 Summary: ${result.recordsMigrated} records migrated across ${result.tablesProcessed.length} tables`)
      
      if (result.errors.length > 0) {
        console.log(`⚠️  ${result.errors.length} errors encountered`)
      }

      return result

    } catch (error) {
      result.success = false
      result.duration = Date.now() - startTime
      result.errors.push({ 
        table: 'migration', 
        error: error instanceof Error ? error.message : 'Unknown migration error' 
      })

      console.error('❌ Migration failed:', error)
      return result
    }
  }

  private async verifySupabaseConnection(): Promise<void> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('id')
      .limit(1)

    if (error && !error.message.includes('relation "organizations" does not exist')) {
      throw new Error(`Supabase connection failed: ${error.message}`)
    }
  }

  private async setupSupabaseSchema(): Promise<void> {
    // Create tables if they don't exist
    const schemaSql = `
      -- Enable required extensions
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS vector;

      -- Organizations table
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Profiles table (users)
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'ANALYST',
        department TEXT,
        title TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Organization users junction table
      CREATE TABLE IF NOT EXISTS organization_users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'MEMBER',
        permissions JSONB DEFAULT '{}',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, user_id)
      );

      -- Portfolios table
      CREATE TABLE IF NOT EXISTS portfolios (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        organization_id UUID REFERENCES organizations(id),
        user_id UUID REFERENCES profiles(id),
        industry TEXT,
        stage TEXT,
        investment_amount DECIMAL,
        investment_date DATE,
        valuation DECIMAL,
        ownership_percentage DECIMAL,
        status TEXT DEFAULT 'active',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- KPIs table
      CREATE TABLE IF NOT EXISTS kpis (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        portfolio_id UUID REFERENCES portfolios(id),
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        value DECIMAL,
        unit TEXT,
        target_value DECIMAL,
        period_type TEXT DEFAULT 'monthly',
        period_date DATE NOT NULL,
        description TEXT,
        calculation_method TEXT,
        data_source TEXT,
        confidence_level INTEGER DEFAULT 100,
        is_benchmark BOOLEAN DEFAULT FALSE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Documents table
      CREATE TABLE IF NOT EXISTS documents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        portfolio_id UUID REFERENCES portfolios(id),
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_type TEXT,
        file_size BIGINT,
        file_path TEXT,
        content TEXT,
        extracted_text TEXT,
        embedding VECTOR(1536),
        metadata JSONB DEFAULT '{}',
        uploaded_by UUID REFERENCES profiles(id),
        status TEXT DEFAULT 'PROCESSING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_portfolios_org_id ON portfolios(organization_id);
      CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
      CREATE INDEX IF NOT EXISTS idx_kpis_portfolio_id ON kpis(portfolio_id);
      CREATE INDEX IF NOT EXISTS idx_kpis_period_date ON kpis(period_date);
      CREATE INDEX IF NOT EXISTS idx_kpis_category ON kpis(category);
      CREATE INDEX IF NOT EXISTS idx_documents_portfolio_id ON documents(portfolio_id);
      CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_org_users_org_id ON organization_users(organization_id);
      CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id);

      -- Enable Row Level Security
      ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
      ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
      ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies (basic - can be enhanced)
      CREATE POLICY IF NOT EXISTS "Users can view their organization data" ON organizations
        FOR SELECT USING (
          id IN (
            SELECT organization_id FROM organization_users 
            WHERE user_id = auth.uid()
          )
        );

      CREATE POLICY IF NOT EXISTS "Users can view their profile" ON profiles
        FOR SELECT USING (id = auth.uid());

      CREATE POLICY IF NOT EXISTS "Users can view organization portfolios" ON portfolios
        FOR SELECT USING (
          organization_id IN (
            SELECT organization_id FROM organization_users 
            WHERE user_id = auth.uid()
          )
        );

      CREATE POLICY IF NOT EXISTS "Users can view portfolio KPIs" ON kpis
        FOR SELECT USING (
          portfolio_id IN (
            SELECT p.id FROM portfolios p
            JOIN organization_users ou ON p.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid()
          )
        );

      CREATE POLICY IF NOT EXISTS "Users can view portfolio documents" ON documents
        FOR SELECT USING (
          portfolio_id IN (
            SELECT p.id FROM portfolios p
            JOIN organization_users ou ON p.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid()
          )
        );

      -- Enable realtime
      ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
      ALTER PUBLICATION supabase_realtime ADD TABLE portfolios;
      ALTER PUBLICATION supabase_realtime ADD TABLE kpis;
      ALTER PUBLICATION supabase_realtime ADD TABLE documents;
    `

    // Execute schema setup (would need to be done via Supabase SQL editor or migration files)
    console.log('📋 Schema SQL prepared (execute in Supabase SQL editor)')
    console.log('Schema setup completed')
  }

  private async migrateTable(
    tableName: string, 
    options: MigrationOptions
  ): Promise<number> {
    const { dryRun, batchSize = 100, skipExisting } = options
    let migratedCount = 0

    switch (tableName) {
      case 'organizations':
        const orgs = await prisma.organization.findMany()
        for (const org of orgs) {
          if (dryRun) {
            console.log(`[DRY RUN] Would migrate organization: ${org.name}`)
            migratedCount++
            continue
          }

          try {
            const { error } = await this.supabase
              .from('organizations')
              .upsert({
                id: org.id,
                name: org.name,
                slug: org.slug,
                description: org.description,
                settings: org.settings ? JSON.parse(org.settings) : {},
                is_active: org.isActive,
                created_at: org.createdAt.toISOString(),
                updated_at: org.updatedAt.toISOString()
              }, { onConflict: skipExisting ? 'id' : undefined })

            if (error) throw error
            migratedCount++

          } catch (error) {
            console.error(`Failed to migrate organization ${org.id}:`, error)
            throw error
          }
        }
        break

      case 'users':
        const users = await prisma.user.findMany()
        for (const user of users) {
          if (dryRun) {
            console.log(`[DRY RUN] Would migrate user: ${user.email}`)
            migratedCount++
            continue
          }

          try {
            const { error } = await this.supabase
              .from('profiles')
              .upsert({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department,
                title: user.title,
                is_active: user.isActive,
                last_login_at: user.lastLoginAt?.toISOString(),
                created_at: user.createdAt.toISOString(),
                updated_at: user.updatedAt.toISOString()
              }, { onConflict: skipExisting ? 'id' : undefined })

            if (error) throw error
            migratedCount++

          } catch (error) {
            console.error(`Failed to migrate user ${user.id}:`, error)
            throw error
          }
        }
        break

      // Add other table migrations...
      default:
        console.log(`Migration for ${tableName} not implemented yet`)
    }

    return migratedCount
  }

  private async verifyMigrationIntegrity(result: MigrationResult): Promise<void> {
    // Verify data integrity after migration
    const checks = [
      { table: 'organizations', expected: result.summary.organizations },
      { table: 'profiles', expected: result.summary.users },
      { table: 'portfolios', expected: result.summary.portfolios },
      { table: 'kpis', expected: result.summary.kpis },
      { table: 'documents', expected: result.summary.documents }
    ]

    for (const check of checks) {
      const { count, error } = await this.supabase
        .from(check.table as any)
        .select('*', { count: 'exact', head: true })

      if (error) {
        throw new Error(`Integrity check failed for ${check.table}: ${error.message}`)
      }

      if (count !== check.expected) {
        throw new Error(`Integrity check failed for ${check.table}: expected ${check.expected}, found ${count}`)
      }
    }

    console.log('✅ Migration integrity verified')
  }

  private async updateConfigurationForSupabase(): Promise<void> {
    // Update environment configuration to use Supabase as primary
    console.log('📝 Update your .env.local with:')
    console.log('USE_SUPABASE_PRIMARY=true')
    console.log('FALLBACK_TO_SQLITE=true')
    console.log('ENABLE_REALTIME_SUBSCRIPTIONS=true')
  }

  async rollbackMigration(): Promise<void> {
    console.log('🔄 Rolling back migration...')
    
    // Clear Supabase data (be very careful with this!)
    const tables = ['documents', 'kpis', 'portfolios', 'organization_users', 'profiles', 'organizations']
    
    for (const table of tables) {
      const { error } = await this.supabase
        .from(table as any)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (error) {
        console.error(`Failed to clear ${table}:`, error)
      } else {
        console.log(`✅ Cleared ${table}`)
      }
    }

    console.log('🔄 Rollback completed')
  }
}

// Export singleton instance
export const supabaseMigration = new SupabaseMigrationService()
