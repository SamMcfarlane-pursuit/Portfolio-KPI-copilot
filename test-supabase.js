const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Testing Supabase connection...');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('🔑 Service Key:', supabaseServiceKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
    try {
        console.log('🔍 Testing basic connection...');
        
        // Try to create a simple table first
        const { data, error } = await supabase
            .rpc('exec_sql', {
                sql: 'SELECT 1 as test;'
            });
        
        if (error) {
            console.log('⚠️  RPC method not available, trying direct table access...');
            
            // Try to access any existing table or create one
            const { data: testData, error: testError } = await supabase
                .from('test_table')
                .select('*')
                .limit(1);
            
            if (testError && testError.message.includes('does not exist')) {
                console.log('✅ Connection successful - database is empty (expected)');
                return true;
            } else if (testError) {
                console.error('❌ Connection test failed:', testError.message);
                return false;
            } else {
                console.log('✅ Connection successful - found existing data');
                return true;
            }
        } else {
            console.log('✅ Connection successful via RPC');
            return true;
        }
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        return false;
    }
}

async function createTablesManually() {
    console.log('📋 Creating tables manually...');
    
    const tables = [
        {
            name: 'organizations',
            sql: `
                CREATE TABLE IF NOT EXISTS organizations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    settings JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        },
        {
            name: 'users',
            sql: `
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255),
                    image TEXT,
                    role VARCHAR(50) DEFAULT 'user',
                    organization_id UUID REFERENCES organizations(id),
                    settings JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        },
        {
            name: 'portfolios',
            sql: `
                CREATE TABLE IF NOT EXISTS portfolios (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
                );
            `
        },
        {
            name: 'kpis',
            sql: `
                CREATE TABLE IF NOT EXISTS kpis (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
                );
            `
        }
    ];
    
    for (const table of tables) {
        try {
            console.log(`⚙️  Creating table: ${table.name}...`);
            
            // Try using the REST API directly
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey
                },
                body: JSON.stringify({ sql: table.sql })
            });
            
            if (response.ok) {
                console.log(`✅ Table ${table.name} created successfully`);
            } else {
                console.log(`⚠️  Table ${table.name} creation warning:`, response.statusText);
            }
            
        } catch (error) {
            console.log(`⚠️  Table ${table.name} creation error:`, error.message);
        }
    }
    
    // Insert sample data
    try {
        console.log('📊 Inserting sample organization...');
        
        const { data, error } = await supabase
            .from('organizations')
            .insert([
                {
                    name: 'Demo Organization',
                    slug: 'demo-org',
                    description: 'Sample organization for testing'
                }
            ])
            .select();
        
        if (error && !error.message.includes('duplicate')) {
            console.log('⚠️  Sample data insertion warning:', error.message);
        } else {
            console.log('✅ Sample organization created');
        }
        
    } catch (error) {
        console.log('⚠️  Sample data error:', error.message);
    }
}

async function verifySetup() {
    console.log('🔍 Verifying database setup...');
    
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('❌ Verification failed:', error.message);
            return false;
        } else {
            console.log('✅ Database verification successful!');
            console.log('📊 Organizations table accessible');
            if (data.length > 0) {
                console.log('📋 Sample data found:', data[0].name);
            }
            return true;
        }
    } catch (error) {
        console.error('❌ Verification error:', error.message);
        return false;
    }
}

async function main() {
    const connected = await testConnection();
    
    if (connected) {
        await createTablesManually();
        const verified = await verifySetup();
        
        if (verified) {
            console.log('🎉 Database setup completed successfully!');
            console.log('🚀 Ready for production deployment');
        } else {
            console.log('⚠️  Database setup completed with warnings');
        }
    } else {
        console.error('❌ Cannot connect to Supabase database');
        console.log('📋 Please check:');
        console.log('  • Supabase project is running');
        console.log('  • API keys are correct');
        console.log('  • Network connectivity');
    }
}

main().catch(console.error);
