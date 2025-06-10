/**
 * RBAC Setup Script
 * Initializes the database with proper RBAC structure and test data
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function setupRBAC() {
  console.log('🚀 Setting up RBAC system...')

  try {
    // 1. Create test organizations
    console.log('📊 Creating test organizations...')
    
    const testOrg1 = await prisma.organization.upsert({
      where: { slug: 'blackstone-portfolio' },
      update: {},
      create: {
        name: 'Blackstone Portfolio Management',
        slug: 'blackstone-portfolio',
        description: 'Primary portfolio management organization',
        settings: JSON.stringify({
          currency: 'USD',
          fiscalYearEnd: '12-31',
          reportingFrequency: 'quarterly',
          aiEnabled: true,
          setupDate: new Date().toISOString()
        })
      }
    })

    const testOrg2 = await prisma.organization.upsert({
      where: { slug: 'demo-fund' },
      update: {},
      create: {
        name: 'Demo Investment Fund',
        slug: 'demo-fund',
        description: 'Demo organization for testing',
        settings: JSON.stringify({
          currency: 'USD',
          fiscalYearEnd: '12-31',
          reportingFrequency: 'quarterly',
          aiEnabled: true,
          setupDate: new Date().toISOString()
        })
      }
    })

    console.log(`✅ Created organizations: ${testOrg1.name}, ${testOrg2.name}`)

    // 2. Create test users with different roles
    console.log('👥 Creating test users...')

    const users = [
      {
        email: 'admin@blackstone.com',
        name: 'System Administrator',
        role: 'SUPER_ADMIN',
        password: 'admin123'
      },
      {
        email: 'manager@blackstone.com',
        name: 'Portfolio Manager',
        role: 'MANAGER',
        password: 'manager123'
      },
      {
        email: 'analyst@blackstone.com',
        name: 'Senior Analyst',
        role: 'ANALYST',
        password: 'analyst123'
      },
      {
        email: 'viewer@blackstone.com',
        name: 'Portfolio Viewer',
        role: 'VIEWER',
        password: 'viewer123'
      }
    ]

    const createdUsers = []
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12)
      
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          password: hashedPassword,
          isActive: true
        }
      })
      
      createdUsers.push(user)
      console.log(`✅ Created user: ${user.name} (${user.email}) - Role: ${user.role}`)
    }

    // 3. Assign users to organizations
    console.log('🔗 Assigning users to organizations...')

    // Admin gets access to both organizations
    await prisma.organizationUser.upsert({
      where: {
        userId_organizationId: {
          userId: createdUsers[0].id,
          organizationId: testOrg1.id
        }
      },
      update: {},
      create: {
        userId: createdUsers[0].id,
        organizationId: testOrg1.id,
        role: 'ORG_ADMIN',
        permissions: JSON.stringify([
          'CREATE_ORGANIZATION', 'UPDATE_ORGANIZATION', 'VIEW_ORGANIZATION',
          'INVITE_USERS', 'MANAGE_USERS', 'VIEW_USERS',
          'CREATE_PORTFOLIO', 'UPDATE_PORTFOLIO', 'DELETE_PORTFOLIO', 'VIEW_PORTFOLIO',
          'CREATE_KPI', 'UPDATE_KPI', 'DELETE_KPI', 'VIEW_KPI', 'ANALYZE_KPI',
          'VIEW_SENSITIVE_DATA', 'EXPORT_DATA', 'IMPORT_DATA', 'VIEW_AUDIT_LOGS'
        ])
      }
    })

    await prisma.organizationUser.upsert({
      where: {
        userId_organizationId: {
          userId: createdUsers[0].id,
          organizationId: testOrg2.id
        }
      },
      update: {},
      create: {
        userId: createdUsers[0].id,
        organizationId: testOrg2.id,
        role: 'ORG_ADMIN',
        permissions: JSON.stringify([
          'CREATE_ORGANIZATION', 'UPDATE_ORGANIZATION', 'VIEW_ORGANIZATION',
          'INVITE_USERS', 'MANAGE_USERS', 'VIEW_USERS',
          'CREATE_PORTFOLIO', 'UPDATE_PORTFOLIO', 'DELETE_PORTFOLIO', 'VIEW_PORTFOLIO',
          'CREATE_KPI', 'UPDATE_KPI', 'DELETE_KPI', 'VIEW_KPI', 'ANALYZE_KPI',
          'VIEW_SENSITIVE_DATA', 'EXPORT_DATA', 'IMPORT_DATA', 'VIEW_AUDIT_LOGS'
        ])
      }
    })

    // Manager gets access to primary organization
    await prisma.organizationUser.upsert({
      where: {
        userId_organizationId: {
          userId: createdUsers[1].id,
          organizationId: testOrg1.id
        }
      },
      update: {},
      create: {
        userId: createdUsers[1].id,
        organizationId: testOrg1.id,
        role: 'MANAGER',
        permissions: JSON.stringify([
          'VIEW_ORGANIZATION', 'VIEW_USERS',
          'CREATE_PORTFOLIO', 'UPDATE_PORTFOLIO', 'VIEW_PORTFOLIO',
          'CREATE_KPI', 'UPDATE_KPI', 'VIEW_KPI', 'ANALYZE_KPI',
          'EXPORT_DATA', 'IMPORT_DATA'
        ])
      }
    })

    // Analyst gets access to primary organization
    await prisma.organizationUser.upsert({
      where: {
        userId_organizationId: {
          userId: createdUsers[2].id,
          organizationId: testOrg1.id
        }
      },
      update: {},
      create: {
        userId: createdUsers[2].id,
        organizationId: testOrg1.id,
        role: 'ANALYST',
        permissions: JSON.stringify([
          'VIEW_ORGANIZATION', 'VIEW_USERS', 'VIEW_PORTFOLIO',
          'CREATE_KPI', 'UPDATE_KPI', 'VIEW_KPI', 'ANALYZE_KPI', 'EXPORT_DATA'
        ])
      }
    })

    // Viewer gets access to both organizations
    await prisma.organizationUser.upsert({
      where: {
        userId_organizationId: {
          userId: createdUsers[3].id,
          organizationId: testOrg1.id
        }
      },
      update: {},
      create: {
        userId: createdUsers[3].id,
        organizationId: testOrg1.id,
        role: 'VIEWER',
        permissions: JSON.stringify(['VIEW_ORGANIZATION', 'VIEW_PORTFOLIO', 'VIEW_KPI'])
      }
    })

    await prisma.organizationUser.upsert({
      where: {
        userId_organizationId: {
          userId: createdUsers[3].id,
          organizationId: testOrg2.id
        }
      },
      update: {},
      create: {
        userId: createdUsers[3].id,
        organizationId: testOrg2.id,
        role: 'VIEWER',
        permissions: JSON.stringify(['VIEW_ORGANIZATION', 'VIEW_PORTFOLIO', 'VIEW_KPI'])
      }
    })

    console.log('✅ User-organization assignments completed')

    // 4. Create sample funds and portfolios
    console.log('💼 Creating sample funds and portfolios...')

    // Check if fund already exists
    let fund1 = await prisma.fund.findFirst({
      where: {
        fundNumber: 'BX-GROWTH-I',
        organizationId: testOrg1.id
      }
    })

    if (!fund1) {
      fund1 = await prisma.fund.create({
        data: {
          name: 'Blackstone Growth Fund I',
          fundNumber: 'BX-GROWTH-I',
          vintage: 2023,
          strategy: 'Growth Equity',
          totalSize: 5000000000, // $5B
          currency: 'USD',
          organizationId: testOrg1.id
        }
      })
    }

    // Check if portfolio already exists
    let portfolio1 = await prisma.portfolio.findFirst({
      where: {
        name: 'TechCorp Solutions',
        fundId: fund1.id
      }
    })

    if (!portfolio1) {
      portfolio1 = await prisma.portfolio.create({
        data: {
          name: 'TechCorp Solutions',
          sector: 'Technology',
          geography: 'North America',
          status: 'Active',
          investment: 250000000, // $250M
          ownership: 35.5,
          fundId: fund1.id
        }
      })
    }

    console.log(`✅ Created fund: ${fund1.name} and portfolio: ${portfolio1.name}`)

    // 5. Create sample KPIs
    console.log('📈 Creating sample KPIs...')

    const sampleKPIs = [
      {
        name: 'Annual Revenue',
        category: 'revenue',
        subcategory: 'total_revenue',
        value: 150000000,
        unit: 'USD',
        period: new Date('2024-12-31'),
        periodType: 'annual',
        currency: 'USD',
        source: 'Financial Statements',
        confidence: 0.98,
        notes: 'Audited annual revenue',
        portfolioId: portfolio1.id,
        fundId: fund1.id,
        organizationId: testOrg1.id
      },
      {
        name: 'Customer Acquisition Cost',
        category: 'marketing',
        subcategory: 'cac',
        value: 125,
        unit: 'USD',
        period: new Date('2024-12-31'),
        periodType: 'annual',
        currency: 'USD',
        source: 'Marketing Analytics',
        confidence: 0.95,
        notes: 'Blended CAC across all channels',
        portfolioId: portfolio1.id,
        fundId: fund1.id,
        organizationId: testOrg1.id
      }
    ]

    for (const kpiData of sampleKPIs) {
      await prisma.kPI.create({ data: kpiData })
    }

    console.log(`✅ Created ${sampleKPIs.length} sample KPIs`)

    // 6. Create initial audit log entries
    console.log('📝 Creating initial audit log entries...')

    await prisma.auditLog.create({
      data: {
        userId: createdUsers[0].id,
        userEmail: createdUsers[0].email,
        action: 'CREATE',
        entityType: 'SYSTEM',
        entityId: 'rbac-setup',
        changes: JSON.stringify({
          setupDate: new Date().toISOString(),
          organizationsCreated: 2,
          usersCreated: 4,
          fundsCreated: 1,
          portfoliosCreated: 1,
          kpisCreated: 2
        }),
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'RBAC Setup Script'
      }
    })

    console.log('✅ Initial audit log created')

    console.log('\n🎉 RBAC setup completed successfully!')
    console.log('\n📋 Test Credentials:')
    console.log('Admin: admin@blackstone.com / admin123')
    console.log('Manager: manager@blackstone.com / manager123')
    console.log('Analyst: analyst@blackstone.com / analyst123')
    console.log('Viewer: viewer@blackstone.com / viewer123')
    console.log('\n🔗 Test Organizations:')
    console.log(`Primary: ${testOrg1.name} (${testOrg1.slug})`)
    console.log(`Demo: ${testOrg2.name} (${testOrg2.slug})`)
    console.log('\n🧪 Test RBAC at: /api/rbac/test')

  } catch (error) {
    console.error('❌ RBAC setup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the setup
if (require.main === module) {
  setupRBAC()
    .then(() => {
      console.log('✅ RBAC setup script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ RBAC setup script failed:', error)
      process.exit(1)
    })
}

export default setupRBAC
