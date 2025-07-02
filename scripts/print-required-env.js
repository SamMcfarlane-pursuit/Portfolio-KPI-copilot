// Print all required environment variables for Vercel deployment
// Usage: node scripts/print-required-env.js

const requiredEnv = [
  // Core Application
  'NODE_ENV',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',

  // Database
  'DATABASE_URL',

  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',

  // AI Providers
  'OPENROUTER_API_KEY',
  'OPENROUTER_BASE_URL',
  'OPENROUTER_DEFAULT_MODEL',
  'OPENROUTER_FALLBACK_MODEL',
  'OPENAI_API_KEY',
  'DISABLE_OPENAI',
  'OLLAMA_BASE_URL',
  'OLLAMA_MODEL',
  'ENABLE_OLLAMA',

  // AI Feature Flags
  'ENABLE_ADVANCED_ANALYTICS',
  'ENABLE_PREDICTIVE_MODELING',
  'ENABLE_AI_ORCHESTRATION',
  'DEFAULT_AI_PROVIDER',

  // OAuth Providers
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET',
  'AZURE_AD_TENANT_ID',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',

  // Redis (optional)
  'REDIS_URL',
  'REDIS_PASSWORD',

  // Email (optional)
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',

  // Monitoring & Logging (optional)
  'ENABLE_MONITORING',
  'ENABLE_PERFORMANCE_TRACKING',
  'ENABLE_ERROR_TRACKING',
  'LOG_LEVEL',
  'ENABLE_DEBUG_LOGS',

  // Security (optional)
  'ENABLE_RATE_LIMITING',
  'RATE_LIMIT_MAX_REQUESTS',
  'RATE_LIMIT_WINDOW_MS',
  'CORS_ORIGIN',
  'ENABLE_CORS',
  'ENABLE_SECURITY_HEADERS',
  'ENABLE_CSP',

  // File Storage (optional)
  'UPLOAD_DIR',
  'MAX_FILE_SIZE',

  // AWS S3 (optional)
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET',

  // Feature Flags (optional)
  'ENABLE_PORTFOLIO_MANAGEMENT',
  'ENABLE_KPI_TRACKING',
  'ENABLE_ANALYTICS_DASHBOARD',
  'ENABLE_AI_INSIGHTS',
  'ENABLE_PREDICTIVE_ANALYTICS',
  'ENABLE_REAL_TIME_UPDATES',
  'ENABLE_COLLABORATION',
  'ENABLE_BETA_FEATURES',
  'ENABLE_EXPERIMENTAL_AI',

  // Performance (optional)
  'ENABLE_CACHING',
  'CACHE_TTL',
  'ENABLE_REDIS_CACHE',
  'DB_POOL_SIZE',
];

console.log('--- Required Environment Variables for Vercel Deployment ---');
requiredEnv.forEach((key) => {
  console.log(`${key}="your-value-here"`);
});
console.log('\nCopy these to your Vercel dashboard (Project Settings > Environment Variables).'); 