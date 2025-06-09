# 🔧 Google OAuth Authentication Fix Guide

## Current Status
- ✅ Environment variables are properly configured in Vercel
- ✅ Google Client ID: `952865856234-p2ub78oa1udq8ng89146lri5pj1mdc7m.apps.googleusercontent.com`
- ✅ Google Client Secret: Configured in Vercel
- ✅ Redirect URI: `https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google`

## 🎯 Required Google Console Configuration

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**

### Step 2: Configure OAuth 2.0 Client
1. Find your OAuth 2.0 Client ID: `952865856234-p2ub78oa1udq8ng89146lri5pj1mdc7m.apps.googleusercontent.com`
2. Click on it to edit
3. **Authorized redirect URIs** - Add exactly:
   ```
   https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google
   ```

### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. **Application name**: Portfolio KPI Copilot
3. **User support email**: Your email address
4. **Application homepage**: `https://portfolio-kpi-copilot.vercel.app`
5. **Authorized domains**: Add these domains:
   ```
   portfolio-kpi-copilot.vercel.app
   vercel.app
   ```

### Step 4: Publishing Status (CRITICAL)
**This is the most common issue!**

#### Option A: Publish the App (Recommended for Production)
1. In OAuth consent screen, click **"PUBLISH APP"**
2. Submit for verification if required
3. Once published, any Google user can sign in

#### Option B: Add Test Users (Quick Fix)
1. In OAuth consent screen, go to **"Test users"**
2. Click **"ADD USERS"**
3. Add your email address and any other users who need access
4. Save changes

### Step 5: Required Scopes
Ensure these scopes are configured:
- `openid`
- `profile` 
- `email`

## 🔍 Testing the Fix

### Test 1: Check OAuth Configuration
Visit: `https://portfolio-kpi-copilot.vercel.app/api/auth/test-oauth`

### Test 2: Try Google Sign-in
1. Go to: `https://portfolio-kpi-copilot.vercel.app/auth/signin`
2. Click "Continue with Google"
3. Should redirect to Google OAuth flow

## 🚨 Common Error Messages & Solutions

### "Error 400: redirect_uri_mismatch"
**Solution**: Verify redirect URI in Google Console matches exactly:
`https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google`

### "Error 403: access_denied" 
**Solution**: 
- App is in testing mode → Publish the app OR add your email as test user
- Check authorized domains include `portfolio-kpi-copilot.vercel.app`

### "Error 400: invalid_request"
**Solution**: Check environment variables in Vercel dashboard

### "This app isn't verified"
**Solution**: 
- Click "Advanced" → "Go to Portfolio KPI Copilot (unsafe)"
- Or complete Google's verification process

## ⚡ Quick Fix Commands

If you need to update environment variables:

```bash
# Check current values
npx vercel env ls

# Update if needed
npx vercel env add GOOGLE_CLIENT_ID production
npx vercel env add GOOGLE_CLIENT_SECRET production

# Redeploy
npx vercel --prod
```

## 🎯 Most Likely Solution

**The #1 most common issue is that your Google OAuth app is in "Testing" mode.**

**Quick Fix:**
1. Go to Google Console → OAuth consent screen
2. Either:
   - Click **"PUBLISH APP"** (recommended)
   - Or add your email to **"Test users"**

This should immediately fix the Google OAuth authentication!

## 📞 Support

If you're still having issues:
1. Check the test endpoint: `/api/auth/test-oauth`
2. Review browser console for error messages
3. Check Vercel function logs for detailed errors

The application is fully functional in demo mode while you configure OAuth!
