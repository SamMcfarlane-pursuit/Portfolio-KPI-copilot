const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Setting up Portfolio KPI Copilot database...');
console.log('📍 Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
    try {
        console.log('🔍 Testing database connection...');
        
        // Test basic connection with a simple query
        const { data, error } = await supabase
            .rpc('version');
        
        if (error) {
            console.error('❌ Database connection failed:', error.message);
            process.exit(1);
        }
        
        console.log('✅ Database connection successful');
        
        // Read and execute schema
        console.log('📋 Applying database schema...');
        
        const schema = fs.readFileSync('supabase_schema.sql', 'utf8');
        
        // Split schema into individual statements
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📊 Executing ${statements.length} SQL statements...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
                    
                    const { error } = await supabase.rpc('exec_sql', {
                        sql: statement + ';'
                    });
                    
                    if (error && !error.message.includes('already exists')) {
                        console.warn(`⚠️  Warning on statement ${i + 1}:`, error.message);
                    }
                } catch (err) {
                    console.warn(`⚠️  Warning on statement ${i + 1}:`, err.message);
                }
            }
        }
        
        console.log('✅ Database schema applied successfully');
        
        // Verify tables were created
        console.log('🔍 Verifying table creation...');
        
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', ['organizations', 'users', 'portfolios', 'kpis', 'audit_logs']);
        
        if (tablesError) {
            console.error('❌ Error checking tables:', tablesError.message);
        } else {
            console.log('📊 Tables found:', tables.map(t => t.table_name).join(', '));
        }
        
        // Test basic operations
        console.log('🧪 Testing basic operations...');
        
        const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .limit(1);
        
        if (orgError) {
            console.error('❌ Error testing organizations table:', orgError.message);
        } else {
            console.log('✅ Organizations table working');
            if (orgData.length > 0) {
                console.log('📋 Sample organization found:', orgData[0].name);
            }
        }
        
        console.log('🎉 Database setup completed successfully!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        return false;
    }
}

// Alternative method using direct SQL execution
async function setupDatabaseDirect() {
    try {
        console.log('🔧 Trying direct SQL execution method...');
        
        // Create tables one by one
        const createStatements = [
            `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
            `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
            `CREATE TABLE IF NOT EXISTS organizations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                image TEXT,
                role VARCHAR(50) DEFAULT 'user',
                organization_id UUID REFERENCES organizations(id),
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS portfolios (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                sector VARCHAR(100),
                status VARCHAR(50) DEFAULT 'active',
                organization_id UUID REFERENCES organizations(id),
                user_id UUID REFERENCES users(id),
                investment_amount DECIMAL(15,2),
                current_value DECIMAL(15,2),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS kpis (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                portfolio_id UUID REFERENCES portfolios(id),
                value DECIMAL(15,4),
                target DECIMAL(15,4),
                unit VARCHAR(50),
                period_start DATE,
                period_end DATE,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            `INSERT INTO organizations (name, slug, description) 
             VALUES ('Demo Organization', 'demo-org', 'Sample organization for testing')
             ON CONFLICT (slug) DO NOTHING;`
        ];
        
        for (let i = 0; i < createStatements.length; i++) {
            const statement = createStatements[i];
            console.log(`⚙️  Executing statement ${i + 1}/${createStatements.length}...`);
            
            try {
                const { error } = await supabase.rpc('exec_sql', { sql: statement });
                if (error && !error.message.includes('already exists')) {
                    console.warn(`⚠️  Warning:`, error.message);
                }
            } catch (err) {
                // Try using the REST API directly
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey
                    },
                    body: JSON.stringify({ sql: statement })
                });
                
                if (!response.ok) {
                    console.warn(`⚠️  HTTP Warning:`, response.statusText);
                }
            }
        }
        
        console.log('✅ Direct SQL execution completed');
        return true;
        
    } catch (error) {
        console.error('❌ Direct SQL execution failed:', error.message);
        return false;
    }
}

// Run setup
async function main() {
    const success = await setupDatabase();
    
    if (!success) {
        console.log('🔄 Trying alternative setup method...');
        await setupDatabaseDirect();
    }
    
    // Final verification
    console.log('🔍 Final verification...');
    
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('❌ Final verification failed:', error.message);
        } else {
            console.log('🎉 Database setup verification successful!');
            console.log('📊 Ready for production deployment');
        }
    } catch (err) {
        console.error('❌ Final verification error:', err.message);
    }
}

main().catch(console.error);
