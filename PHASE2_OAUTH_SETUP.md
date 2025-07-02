# Phase 2: OAuth & Authentication Setup Guide

## 🎯 **Objective**
Implement enterprise-grade OAuth authentication with Google, LinkedIn, and GitHub integration for the Portfolio KPI Copilot system.

## 📋 **Phase 2 Features**
- 🔐 **Multi-Provider OAuth** (Google, LinkedIn, GitHub)
- 👥 **Role-Based Access Control** (RBAC)
- 🛡️ **Security Hardening**
- 📊 **User Management Dashboard**
- 🔒 **Session Management**
- 📝 **Audit Logging**

## 🚀 **Quick Start**

### **Option 1: Automated Setup (Recommended)**
```bash
./scripts/phase2-oauth-setup.sh
```

### **Option 2: Manual Configuration**
Follow the step-by-step guide below.

---

## 📝 **Step 1: OAuth Provider Setup**

### **Google OAuth Setup**

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project or create a new one

2. **Enable Google+ API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "Portfolio KPI Copilot"

4. **Configure Authorized URLs**
   ```
   Authorized JavaScript origins:
   - https://portfolio-kpi-copilot.vercel.app
   - http://localhost:3000 (for development)

   Authorized redirect URIs:
   - https://portfolio-kpi-copilot-j19n6dxac-sams-projects-a99fd918.vercel.app/api/auth/callback/google
   - http://localhost:3000/api/auth/callback/google
   ```

5. **Save Credentials**
   - Copy `Client ID` and `Client Secret`

### **LinkedIn OAuth Setup**

1. **Go to LinkedIn Developer Portal**
   - Visit: https://www.linkedin.com/developers/
   - Sign in with your LinkedIn account

2. **Create New App**
   - Click "Create App"
   - App name: "Portfolio KPI Copilot"
   - LinkedIn Page: Your company page (or personal)
   - App logo: Upload your logo
   - Legal agreement: Accept terms

3. **Configure OAuth Settings**
   - Go to "Auth" tab
   - Add redirect URLs:
     ```
     https://portfolio-kpi-copilot.vercel.app/api/auth/callback/linkedin
     http://localhost:3000/api/auth/callback/linkedin
     ```

4. **Request Permissions**
   - Sign In with LinkedIn using OpenID Connect
   - Profile API (r_liteprofile)
   - Email Address (r_emailaddress)

5. **Save Credentials**
   - Copy `Client ID` and `Client Secret`

### **GitHub OAuth Setup**

1. **Go to GitHub Developer Settings**
   - Visit: https://github.com/settings/developers
   - Click "New OAuth App"

2. **Configure OAuth App**
   ```
   Application name: Portfolio KPI Copilot
   Homepage URL: https://portfolio-kpi-copilot.vercel.app
   Authorization callback URL: https://portfolio-kpi-copilot.vercel.app/api/auth/callback/github
   ```

3. **Save Credentials**
   - Copy `Client ID` and `Client Secret`

---

## 🔧 **Step 2: Environment Configuration**

Add these environment variables to your `.env.production`:

```bash
# OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"

GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"

# NextAuth Configuration
NEXTAUTH_URL="https://portfolio-kpi-copilot.vercel.app"
NEXTAUTH_SECRET="your-nextauth-secret-32-chars-minimum"

# RBAC Configuration
ENABLE_RBAC="true"
DEFAULT_USER_ROLE="user"
ADMIN_EMAILS="your-email@domain.com"

# Security Settings
SESSION_MAX_AGE="86400"
JWT_SIGNING_KEY="your-jwt-signing-key"
ENABLE_AUDIT_LOGGING="true"
```

---

## 🛡️ **Step 3: Security Configuration**

### **RBAC Roles & Permissions**

```typescript
// Role Hierarchy
const ROLES = {
  SUPER_ADMIN: 'super_admin',    // Full system access
  ADMIN: 'admin',                // Organization admin
  MANAGER: 'manager',            // Portfolio manager
  ANALYST: 'analyst',            // Data analyst
  USER: 'user'                   // Basic user
};

// Permissions Matrix
const PERMISSIONS = {
  // Portfolio Management
  'portfolio:create': ['super_admin', 'admin', 'manager'],
  'portfolio:read': ['super_admin', 'admin', 'manager', 'analyst', 'user'],
  'portfolio:update': ['super_admin', 'admin', 'manager'],
  'portfolio:delete': ['super_admin', 'admin'],

  // KPI Management
  'kpi:create': ['super_admin', 'admin', 'manager', 'analyst'],
  'kpi:read': ['super_admin', 'admin', 'manager', 'analyst', 'user'],
  'kpi:update': ['super_admin', 'admin', 'manager', 'analyst'],
  'kpi:delete': ['super_admin', 'admin', 'manager'],

  // User Management
  'user:create': ['super_admin', 'admin'],
  'user:read': ['super_admin', 'admin', 'manager'],
  'user:update': ['super_admin', 'admin'],
  'user:delete': ['super_admin'],

  // System Administration
  'system:admin': ['super_admin'],
  'system:monitor': ['super_admin', 'admin'],
  'system:audit': ['super_admin', 'admin']
};
```

---

## 📊 **Step 4: Database Schema Updates**

The following tables will be created/updated:

### **Users Table Enhancement**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
```

### **Sessions Table**
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Roles & Permissions Tables**
```sql
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id, organization_id)
);
```

---

## 🔒 **Step 5: Security Features**

### **Session Security**
- JWT tokens with 24-hour expiration
- Secure HTTP-only cookies
- CSRF protection
- Session rotation on login

### **Password Security**
- bcrypt hashing (12 rounds)
- Password complexity requirements
- Account lockout after failed attempts
- Password reset with secure tokens

### **Audit Logging**
- All authentication events
- Permission changes
- Data access logging
- Failed login attempts

---

## 🧪 **Step 6: Testing OAuth Integration**

### **Test Endpoints**
```bash
# Test OAuth providers
curl https://portfolio-kpi-copilot.vercel.app/api/auth/providers

# Test authentication status
curl https://portfolio-kpi-copilot.vercel.app/api/auth/session

# Test RBAC permissions
curl https://portfolio-kpi-copilot.vercel.app/api/auth/permissions
```

### **Manual Testing**
1. Visit: https://portfolio-kpi-copilot.vercel.app/auth/signin
2. Test each OAuth provider
3. Verify user creation in database
4. Test role assignment
5. Verify permissions enforcement

---

## 📈 **Step 7: Monitoring & Analytics**

### **Authentication Metrics**
- Login success/failure rates
- OAuth provider usage
- Session duration analytics
- Security event tracking

### **User Analytics**
- User registration trends
- Active user metrics
- Role distribution
- Permission usage patterns

---

## 🚨 **Security Checklist**

- [ ] OAuth providers configured with HTTPS only
- [ ] Secure session management implemented
- [ ] RBAC permissions properly enforced
- [ ] Audit logging capturing all events
- [ ] Rate limiting on authentication endpoints
- [ ] CSRF protection enabled
- [ ] Secure headers configured
- [ ] Environment variables encrypted

---

## 🔧 **Troubleshooting**

### **Common OAuth Issues**
1. **Invalid redirect URI**: Check OAuth app configuration
2. **Scope permissions**: Verify requested scopes are approved
3. **CORS errors**: Ensure proper domain configuration
4. **Token expiration**: Check session management settings

### **RBAC Issues**
1. **Permission denied**: Verify user role assignments
2. **Role not found**: Check role creation in database
3. **Organization access**: Verify multi-tenant isolation

---

## 📞 **Support Resources**

- **Google OAuth**: https://developers.google.com/identity/protocols/oauth2
- **LinkedIn OAuth**: https://docs.microsoft.com/en-us/linkedin/shared/authentication/
- **GitHub OAuth**: https://docs.github.com/en/developers/apps/building-oauth-apps
- **NextAuth.js**: https://next-auth.js.org/configuration/providers

---

## ✅ **Phase 2 Success Criteria**

- [ ] All OAuth providers working
- [ ] User registration and login functional
- [ ] RBAC permissions enforced
- [ ] Security audit logging active
- [ ] Session management secure
- [ ] Multi-tenant isolation verified
- [ ] Performance targets met (<500ms auth)

**Ready to execute Phase 2? Run the setup script to begin!**
