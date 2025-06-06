# 🚀 Vercel Deployment Setup - Portfolio KPI Copilot

## Step-by-Step Vercel Deployment

### 1. Get OpenAI API Key (Required for Full AI)

1. **Visit OpenAI Platform**: https://platform.openai.com
2. **Sign up/Login** to your account
3. **Go to API Keys**: https://platform.openai.com/api-keys
4. **Create New Secret Key**:
   - Click "Create new secret key"
   - Name: "Portfolio KPI Copilot Production"
   - Copy the key (starts with `sk-...`)
   - **⚠️ SAVE IMMEDIATELY** - you can't see it again!

### 2. Vercel Environment Variables

In your Vercel deployment page, add these environment variables:

#### **Required Variables:**
```env
NEXTAUTH_URL=https://portfolio-kpi-copilot.vercel.app
NEXTAUTH_SECRET=your-super-secret-production-key-32-chars-minimum-random
DATABASE_URL=file:./dev.db
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

#### **Optional Optimization Variables:**
```env
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.1
```

### 3. How to Add Environment Variables in Vercel

1. **In Vercel deployment page**, scroll to "Environment Variables"
2. **Click to expand** the section
3. **For each variable**:
   - **Name**: Enter variable name (e.g., `NEXTAUTH_URL`)
   - **Value**: Enter the value
   - **Environment**: Select "All" (Production, Preview, Development)
   - **Click "Add"**

### 4. Generate Secure NEXTAUTH_SECRET

Use one of these methods to generate a secure secret:

**Option A - Online Generator:**
```
Visit: https://generate-secret.vercel.app/32
Copy the generated string
```

**Option B - Command Line:**
```bash
openssl rand -base64 32
```

**Option C - Node.js:**
```javascript
require('crypto').randomBytes(32).toString('base64')
```

### 5. Complete Environment Variable List

Copy and paste these into Vercel (replace values):

```env
# Authentication (Required)
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-generated-32-char-secret

# Database (Required)
DATABASE_URL=file:./dev.db

# AI Integration (Required for full functionality)
OPENAI_API_KEY=sk-your-openai-api-key

# AI Configuration (Optional)
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.1

# Development Only (Don't add to Vercel)
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3.2:latest
```

### 6. Deploy Steps

1. **Import Project**: Select your GitHub repo
2. **Add Environment Variables**: Use the list above
3. **Click Deploy**: Wait 2-3 minutes
4. **Test**: Visit your live app!

### 7. Post-Deployment Testing

#### Test Health Endpoint:
```
https://your-app.vercel.app/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "database": { "status": "healthy" },
    "openai": { "status": "healthy", "configured": true },
    "llama": { "status": "not_configured" }
  }
}
```

#### Test AI Functionality:
1. Visit: `https://your-app.vercel.app/dashboard`
2. Try the AI insights panel
3. Ask a KPI question like "What is EBITDA?"

### 8. Troubleshooting

#### Common Issues:

**❌ OpenAI "not_configured":**
- Check API key is correct
- Ensure no extra spaces in environment variable
- Verify API key has credits

**❌ Authentication errors:**
- Check NEXTAUTH_URL matches your domain
- Ensure NEXTAUTH_SECRET is 32+ characters
- Verify no typos in variable names

**❌ Database errors:**
- SQLite works automatically on Vercel
- No additional setup needed for MVP

### 9. Upgrade to Production Database (Optional)

For production scale, consider upgrading:

#### Vercel Postgres:
```env
DATABASE_URL=postgres://username:password@host:port/database
```

#### Supabase:
```env
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

### 10. Cost Estimation

#### OpenAI API Costs:
- **GPT-4o-mini**: ~$0.15 per 1M input tokens
- **Typical KPI query**: ~500 tokens = $0.000075
- **1000 queries/month**: ~$0.075

#### Vercel Hosting:
- **Hobby Plan**: Free (perfect for MVP)
- **Pro Plan**: $20/month (for production)

### 🎉 You're Ready to Deploy!

Your Portfolio KPI Copilot will have:
- ✅ Full AI functionality with OpenAI
- ✅ Secure authentication
- ✅ Modern dashboard
- ✅ KPI analysis capabilities
- ✅ Production-ready architecture

**Click Deploy and revolutionize portfolio management!** 🚀
