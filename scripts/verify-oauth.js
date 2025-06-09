#!/usr/bin/env node

/**
 * OAuth Verification Script
 * Automated testing of Google OAuth configuration
 */

const https = require('https')
const { URL } = require('url')

const BASE_URL = 'https://portfolio-kpi-copilot.vercel.app'

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data)
          })
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          })
        }
      })
    }).on('error', reject)
  })
}

async function testOAuthConfiguration() {
  log('\n🔧 OAuth Configuration Verification', 'bold')
  log('=' .repeat(50), 'blue')

  try {
    // Test 1: OAuth Configuration Endpoint
    log('\n📋 Test 1: OAuth Configuration Check', 'blue')
    const configResponse = await makeRequest(`${BASE_URL}/api/auth/test-oauth`)
    
    if (configResponse.statusCode === 200) {
      const config = configResponse.data
      log('✅ OAuth test endpoint accessible', 'green')
      
      // Check environment variables
      if (config.validation?.environment_variables?.status === 'PASS') {
        log('✅ Environment variables configured', 'green')
      } else {
        log('❌ Environment variables missing or incomplete', 'red')
        return false
      }

      // Check OAuth configuration
      if (config.validation?.oauth_configuration?.status === 'READY') {
        log('✅ OAuth configuration ready', 'green')
      } else {
        log('⚠️  OAuth configuration needs attention', 'yellow')
      }

      // Check session status
      if (config.validation?.session_status?.authenticated) {
        log('✅ User currently authenticated', 'green')
      } else {
        log('ℹ️  No active session (expected for automated test)', 'blue')
      }

      log(`\n📊 Overall Status: ${config.overall_status}`, 'bold')
      
    } else {
      log('❌ OAuth test endpoint failed', 'red')
      return false
    }

    // Test 2: NextAuth Providers Endpoint
    log('\n📋 Test 2: NextAuth Providers Check', 'blue')
    const providersResponse = await makeRequest(`${BASE_URL}/api/auth/providers`)
    
    if (providersResponse.statusCode === 200) {
      const providers = providersResponse.data
      log('✅ NextAuth providers endpoint accessible', 'green')
      
      if (providers.google) {
        log('✅ Google provider configured', 'green')
        log(`   Provider ID: ${providers.google.id}`, 'blue')
        log(`   Provider Name: ${providers.google.name}`, 'blue')
      } else {
        log('❌ Google provider not found', 'red')
        return false
      }
    } else {
      log('❌ NextAuth providers endpoint failed', 'red')
      return false
    }

    // Test 3: Sign-in Page Accessibility
    log('\n📋 Test 3: Sign-in Page Check', 'blue')
    const signinResponse = await makeRequest(`${BASE_URL}/auth/signin`)
    
    if (signinResponse.statusCode === 200) {
      log('✅ Sign-in page accessible', 'green')
    } else {
      log('❌ Sign-in page not accessible', 'red')
      return false
    }

    // Test 4: Demo Mode Check
    log('\n📋 Test 4: Demo Mode Check', 'blue')
    const dashboardResponse = await makeRequest(`${BASE_URL}/dashboard`)
    
    if (dashboardResponse.statusCode === 200) {
      log('✅ Dashboard accessible in demo mode', 'green')
    } else {
      log('❌ Dashboard not accessible', 'red')
      return false
    }

    return true

  } catch (error) {
    log(`❌ Test failed with error: ${error.message}`, 'red')
    return false
  }
}

async function generateReport() {
  log('\n📊 Generating OAuth Status Report', 'bold')
  log('=' .repeat(50), 'blue')

  try {
    const configResponse = await makeRequest(`${BASE_URL}/api/auth/test-oauth`)
    
    if (configResponse.statusCode === 200) {
      const config = configResponse.data
      
      log('\n🔧 Configuration Summary:', 'bold')
      log(`   Overall Status: ${config.overall_status}`, 'blue')
      log(`   Environment Variables: ${config.validation?.environment_variables?.status || 'Unknown'}`, 'blue')
      log(`   OAuth Ready: ${config.validation?.oauth_configuration?.status || 'Unknown'}`, 'blue')
      log(`   Session Active: ${config.validation?.session_status?.authenticated ? 'Yes' : 'No'}`, 'blue')

      log('\n🔗 Important URLs:', 'bold')
      log(`   Test OAuth: ${BASE_URL}/api/auth/test-oauth`, 'blue')
      log(`   Verification Dashboard: ${BASE_URL}/verify/oauth`, 'blue')
      log(`   Setup Guide: ${BASE_URL}/setup/oauth`, 'blue')
      log(`   Sign In: ${BASE_URL}/auth/signin`, 'blue')

      if (config.next_steps && config.next_steps.length > 0) {
        log('\n📋 Next Steps:', 'bold')
        config.next_steps.forEach((step, index) => {
          log(`   ${index + 1}. ${step}`, 'yellow')
        })
      }

      if (config.google_console_requirements) {
        log('\n🔧 Google Console Requirements:', 'bold')
        log(`   Redirect URI: ${config.google_console_requirements.redirect_uri}`, 'blue')
        log(`   Publishing Status: ${config.google_console_requirements.publishing_status}`, 'yellow')
      }

    } else {
      log('❌ Could not generate report - OAuth endpoint not accessible', 'red')
    }

  } catch (error) {
    log(`❌ Report generation failed: ${error.message}`, 'red')
  }
}

async function main() {
  log('🚀 Portfolio KPI Copilot - OAuth Verification', 'bold')
  log(`🌐 Testing: ${BASE_URL}`, 'blue')
  log(`⏰ Started: ${new Date().toISOString()}`, 'blue')

  const success = await testOAuthConfiguration()
  await generateReport()

  log('\n' + '=' .repeat(50), 'blue')
  if (success) {
    log('🎉 OAuth verification completed successfully!', 'green')
    log('✅ Your application is ready for Google OAuth authentication', 'green')
    log('📋 Check the verification dashboard for detailed status', 'blue')
  } else {
    log('⚠️  OAuth verification found issues', 'yellow')
    log('🔧 Please review the configuration and try again', 'yellow')
  }
  
  log(`\n🔗 Visit ${BASE_URL}/verify/oauth for real-time status`, 'blue')
  log(`⏰ Completed: ${new Date().toISOString()}`, 'blue')
}

// Run the verification
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { testOAuthConfiguration, generateReport }
