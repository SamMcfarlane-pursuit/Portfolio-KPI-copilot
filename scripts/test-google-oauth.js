#!/usr/bin/env node

/**
 * Google OAuth Configuration Test Script
 * Tests if Google OAuth is properly configured
 */

const https = require('https');

// Test Google OAuth configuration
async function testGoogleOAuth() {
  console.log('🔍 Testing Google OAuth Configuration...\n');

  // Check environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const enableOAuth = process.env.ENABLE_GOOGLE_OAUTH;

  console.log('📋 Environment Variables Check:');
  console.log(`✅ GOOGLE_CLIENT_ID: ${clientId ? '✓ Set' : '❌ Missing'}`);
  console.log(`✅ GOOGLE_CLIENT_SECRET: ${clientSecret ? '✓ Set' : '❌ Missing'}`);
  console.log(`✅ ENABLE_GOOGLE_OAUTH: ${enableOAuth ? '✓ Set' : '❌ Missing'}\n`);

  if (!clientId || !clientSecret) {
    console.log('❌ Google OAuth not configured. Please set environment variables.\n');
    console.log('📋 Required Environment Variables:');
    console.log('GOOGLE_CLIENT_ID=your-client-id-from-google-console');
    console.log('GOOGLE_CLIENT_SECRET=your-client-secret-from-google-console');
    console.log('ENABLE_GOOGLE_OAUTH=true\n');
    return false;
  }

  // Test Google OAuth discovery endpoint
  try {
    console.log('🌐 Testing Google OAuth Discovery Endpoint...');
    const discoveryUrl = 'https://accounts.google.com/.well-known/openid_configuration';
    
    const response = await fetch(discoveryUrl);
    const data = await response.json();
    
    if (data.authorization_endpoint && data.token_endpoint) {
      console.log('✅ Google OAuth Discovery: Working');
      console.log(`   Authorization Endpoint: ${data.authorization_endpoint}`);
      console.log(`   Token Endpoint: ${data.token_endpoint}\n`);
    } else {
      console.log('❌ Google OAuth Discovery: Failed\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Google OAuth Discovery: Error -', error.message, '\n');
    return false;
  }

  // Test client ID format
  if (clientId.includes('googleusercontent.com')) {
    console.log('✅ Client ID Format: Valid Google format');
  } else {
    console.log('⚠️  Client ID Format: May be invalid (should end with .googleusercontent.com)');
  }

  console.log('\n🎯 Google OAuth Configuration Status:');
  if (clientId && clientSecret && enableOAuth === 'true') {
    console.log('✅ Google OAuth is properly configured and ready to use!');
    console.log('\n📋 Next Steps:');
    console.log('1. Deploy to Vercel with these environment variables');
    console.log('2. Test sign-in at: https://portfolio-kpi-copilot.vercel.app/auth/signin');
    console.log('3. Users will see "Continue with Google" option');
    return true;
  } else {
    console.log('❌ Google OAuth configuration incomplete');
    return false;
  }
}

// Run the test
testGoogleOAuth()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Google OAuth test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Google OAuth test failed. Please check configuration.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
