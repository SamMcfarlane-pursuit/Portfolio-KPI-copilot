# 🐙 GitHub OAuth Setup Guide

## Overview
This guide walks you through setting up GitHub OAuth authentication for Portfolio KPI Copilot.

## Prerequisites
- GitHub account
- Access to Portfolio KPI Copilot Vercel project
- Admin access to the application

## Step-by-Step Setup

### 1. Create GitHub OAuth Application

1. **Navigate to GitHub Developer Settings:**
   - Go to: https://github.com/settings/developers
   - Click "OAuth Apps" in the left sidebar
   - Click "New OAuth App"

2. **Fill in Application Details:**
   ```
   Application name: Portfolio KPI Copilot
   Homepage URL: https://portfolio-kpi-copilot.vercel.app
   Application description: Enterprise AI-powered Portfolio KPI Analytics and Management Platform
   Authorization callback URL: https://portfolio-kpi-copilot.vercel.app/api/auth/callback/github
   ```

   **⚠️ CRITICAL: Ensure the callback URL matches EXACTLY:**
   ```
   https://portfolio-kpi-copilot.vercel.app/api/auth/callback/github
   ```

3. **Register the Application:**
   - Click "Register application"
   - You'll be redirected to your new OAuth app page

### 2. Get Your Credentials

1. **Copy Client ID:**
   - On your OAuth app page, copy the "Client ID"
   - It will look like: `Ov23liFHAgHrAStdWm6`

2. **Generate Client Secret:**
   - Click "Generate a new client secret"
   - Copy the secret immediately (you won't see it again)
   - It will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Configure Environment Variables

#### In Vercel Dashboard:
1. Go to your Portfolio KPI Copilot project
2. Navigate to Settings → Environment Variables
3. Add these variables for all environments (Production, Preview, Development):

```bash
GITHUB_ID=your_github_client_id_here
GITHUB_SECRET=your_github_client_secret_here
```

#### For Local Development:
Add to your `.env.local` file:
```bash
GITHUB_ID=your_github_client_id_here
GITHUB_SECRET=your_github_client_secret_here
```

### 4. Verify Configuration

1. **Check Authentication Status:**
   - Visit: https://portfolio-kpi-copilot.vercel.app/api/auth/verify-setup
   - Look for GitHub provider in the configured providers list

2. **Test GitHub Sign-In:**
   - Visit: https://portfolio-kpi-copilot.vercel.app/auth/test
   - Click "Test GitHub" button
   - Should redirect to GitHub for authorization

### 5. Troubleshooting

#### Common Issues:

**"Application not found" error:**
- Verify the callback URL is exactly: `https://portfolio-kpi-copilot.vercel.app/api/auth/callback/github`
- Check that the OAuth app is created under the correct GitHub account

**"Invalid client" error:**
- Verify GITHUB_ID and GITHUB_SECRET are correctly set in Vercel
- Ensure there are no extra spaces or characters in the environment variables

**"Redirect URI mismatch" error:**
- Double-check the Authorization callback URL in your GitHub OAuth app settings
- Ensure it matches exactly: `https://portfolio-kpi-copilot.vercel.app/api/auth/callback/github`

#### Verification Steps:
1. Check environment variables are set in Vercel
2. Verify OAuth app callback URL
3. Test with the auth test page
4. Check browser developer console for errors

### 6. Security Considerations

- **Keep Client Secret Secure:** Never commit it to version control
- **Use Environment Variables:** Always store credentials in environment variables
- **Regular Rotation:** Consider rotating the client secret periodically
- **Monitor Usage:** Check GitHub OAuth app usage in your GitHub settings

### 7. Testing Checklist

- [ ] OAuth app created in GitHub
- [ ] Client ID and Secret copied
- [ ] Environment variables added to Vercel
- [ ] Application redeployed (automatic with env var changes)
- [ ] GitHub provider shows as "configured" in auth status
- [ ] GitHub sign-in test successful
- [ ] User can sign in and access the application

## Support

If you encounter issues:
1. Check the auth test page: `/auth/test`
2. Review the auth verification API: `/api/auth/verify-setup`
3. Check Vercel deployment logs
4. Verify GitHub OAuth app settings

## Additional Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [NextAuth.js GitHub Provider](https://next-auth.js.org/providers/github)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
