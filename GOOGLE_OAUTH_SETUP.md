# Google OAuth Setup Guide for Portfolio KPI Copilot

## Current Configuration Status

**Google Client ID:** `952865856234-p2ub78oa1udq8ng89146lri5pj1mdc7m.apps.googleusercontent.com`
**Redirect URI:** `https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google`

## Required Google Console Configuration

### 1. OAuth Consent Screen
- **Application name:** Portfolio KPI Copilot
- **User support email:** Your email
- **Application homepage:** `https://portfolio-kpi-copilot.vercel.app`
- **Privacy policy URL:** `https://portfolio-kpi-copilot.vercel.app/privacy`
- **Terms of service URL:** `https://portfolio-kpi-copilot.vercel.app/terms`

### 2. Authorized Domains
Add these domains to your OAuth consent screen:
- `portfolio-kpi-copilot.vercel.app`
- `vercel.app`

### 3. Authorized Redirect URIs
In your Google OAuth client configuration, add:
- `https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google`

### 4. Scopes
Ensure these scopes are configured:
- `openid`
- `profile`
- `email`

## Publishing Status

**IMPORTANT:** If your OAuth app is in "Testing" mode, it will only work for test users you've explicitly added. For production use, you need to:

1. **Publish your OAuth app** in Google Console
2. Or add specific test users in the "Test users" section

## Troubleshooting Steps

### Step 1: Verify OAuth App Status
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > OAuth consent screen
3. Check if status is "In production" or "Testing"
4. If "Testing", either publish the app or add test users

### Step 2: Check Redirect URIs
1. Go to APIs & Services > Credentials
2. Click on your OAuth 2.0 Client ID
3. Verify redirect URI: `https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google`

### Step 3: Verify Domain Authorization
1. In OAuth consent screen, check "Authorized domains"
2. Ensure `portfolio-kpi-copilot.vercel.app` is listed

### Step 4: Test OAuth Configuration
Visit: `https://portfolio-kpi-copilot.vercel.app/api/auth/test-oauth`

## Common Error Messages and Solutions

### "Error 400: redirect_uri_mismatch"
- **Cause:** Redirect URI in Google Console doesn't match the one being used
- **Solution:** Add exact URI: `https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google`

### "Error 403: access_denied"
- **Cause:** OAuth app is in testing mode and user is not a test user
- **Solution:** Publish the app or add user as test user

### "Error 400: invalid_request"
- **Cause:** Missing or invalid OAuth parameters
- **Solution:** Check environment variables are correctly set

## Quick Fix Commands

If you need to update the Google OAuth configuration:

```bash
# Update Google Client ID
npx vercel env add GOOGLE_CLIENT_ID

# Update Google Client Secret  
npx vercel env add GOOGLE_CLIENT_SECRET

# Redeploy
npx vercel --prod
```

## Current Environment Variables

The following are currently configured in Vercel:
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET  
- ✅ NEXTAUTH_URL
- ✅ NEXTAUTH_SECRET

## Next Steps

1. **Check OAuth app publishing status** in Google Console
2. **Verify redirect URIs** match exactly
3. **Test the OAuth flow** using the test endpoint
4. **Add test users** if keeping app in testing mode

For immediate testing, you can also use the demo mode by visiting:
`https://portfolio-kpi-copilot.vercel.app/dashboard`
