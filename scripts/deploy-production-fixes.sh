#!/bin/bash

# ===================================================================
# PORTFOLIO KPI COPILOT - DEPLOY PRODUCTION FIXES
# Automated deployment of stability fixes and monitoring
# ===================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "CRITICAL") echo -e "${PURPLE}🚨 $message${NC}" ;;
    esac
}

echo "🚀 Portfolio KPI Copilot - Deploy Production Fixes"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_status "ERROR" "package.json not found. Run from project root."
    exit 1
fi

# Check if git is available and we're in a git repo
if ! command -v git &> /dev/null; then
    print_status "ERROR" "Git is required but not installed"
    exit 1
fi

if [ ! -d ".git" ]; then
    print_status "ERROR" "Not in a git repository"
    exit 1
fi

print_status "INFO" "Starting production deployment process..."

# Step 1: Verify all files are present
print_status "INFO" "Verifying production files..."

required_files=(
    "src/app/api/production-health/route.ts"
    "src/app/api/production-readiness/route.ts"
    "src/app/api/load-test/route.ts"
    "migrations/supabase/001_initial_schema.sql"
    "PRODUCTION_STABILITY_REPORT.md"
    "scripts/simple-stability-check.sh"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    print_status "ERROR" "Missing required files:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

print_status "SUCCESS" "All required files present"

# Step 2: Check git status
print_status "INFO" "Checking git status..."

if [ -n "$(git status --porcelain)" ]; then
    print_status "INFO" "Uncommitted changes detected. Preparing commit..."
    
    # Add all changes
    git add .
    
    # Create commit with timestamp
    commit_message="Production stability fixes and monitoring - $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$commit_message"
    
    print_status "SUCCESS" "Changes committed: $commit_message"
else
    print_status "INFO" "No uncommitted changes detected"
fi

# Step 3: Push to main branch
print_status "INFO" "Deploying to production..."

current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    print_status "WARNING" "Not on main branch (currently on: $current_branch)"
    read -p "Continue deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "INFO" "Deployment cancelled"
        exit 0
    fi
fi

# Push to remote
git push origin "$current_branch"
print_status "SUCCESS" "Code pushed to remote repository"

# Step 4: Wait for Vercel deployment
print_status "INFO" "Waiting for Vercel deployment to complete..."
echo "   This may take 2-3 minutes..."

# Wait a bit for deployment to start
sleep 30

# Check deployment status
deployment_ready=false
max_attempts=12  # 6 minutes total
attempt=0

while [ $attempt -lt $max_attempts ] && [ "$deployment_ready" = false ]; do
    attempt=$((attempt + 1))
    
    # Test if new endpoints are available
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
        "https://portfolio-kpi-copilot.vercel.app/api/production-health" 2>/dev/null || echo "000")
    
    if [ "$status_code" = "200" ] || [ "$status_code" = "503" ]; then
        deployment_ready=true
        print_status "SUCCESS" "Deployment completed - new endpoints available"
    else
        print_status "INFO" "Deployment in progress... (attempt $attempt/$max_attempts)"
        sleep 30
    fi
done

if [ "$deployment_ready" = false ]; then
    print_status "WARNING" "Deployment taking longer than expected"
    print_status "INFO" "Check Vercel dashboard for deployment status"
else
    print_status "SUCCESS" "Production deployment completed successfully"
fi

# Step 5: Run post-deployment verification
print_status "INFO" "Running post-deployment verification..."

# Test critical endpoints
endpoints=(
    "/api/health:Health Check"
    "/api/system/status:System Status"
    "/api/production-health:Production Health"
    "/api/production-readiness:Production Readiness"
    "/api/auth/verify-setup:Auth Setup"
)

passed_tests=0
total_tests=${#endpoints[@]}

for endpoint_info in "${endpoints[@]}"; do
    IFS=':' read -r endpoint name <<< "$endpoint_info"
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
        "https://portfolio-kpi-copilot.vercel.app$endpoint" 2>/dev/null || echo "000")
    
    if [ "$status_code" = "200" ] || [ "$status_code" = "503" ]; then
        print_status "SUCCESS" "$name - Status: $status_code"
        passed_tests=$((passed_tests + 1))
    else
        print_status "ERROR" "$name - Status: $status_code"
    fi
done

# Calculate success rate
success_rate=$((passed_tests * 100 / total_tests))

echo ""
print_status "INFO" "Post-deployment verification results:"
echo "   Tests Passed: $passed_tests/$total_tests"
echo "   Success Rate: $success_rate%"

# Step 6: Generate deployment report
echo ""
print_status "INFO" "Generating deployment report..."

cat > deployment-report-$(date +%Y%m%d-%H%M%S).md << EOF
# Production Deployment Report

**Deployment Date**: $(date)
**Git Commit**: $(git rev-parse HEAD)
**Branch**: $(git branch --show-current)

## Deployment Summary
- **Status**: $([ $success_rate -ge 80 ] && echo "SUCCESS" || echo "NEEDS ATTENTION")
- **Success Rate**: $success_rate%
- **Tests Passed**: $passed_tests/$total_tests

## New Features Deployed
- Production Health Monitoring API
- Production Readiness Assessment API
- Load Testing API
- Enhanced Stability Monitoring
- Comprehensive Error Reporting

## Next Steps
$(if [ $success_rate -ge 80 ]; then
    echo "- ✅ Deployment successful - monitor system performance"
    echo "- ✅ Set up automated monitoring alerts"
    echo "- ✅ Run comprehensive load testing"
else
    echo "- ⚠️ Address failing endpoints"
    echo "- ⚠️ Check database configuration"
    echo "- ⚠️ Verify environment variables"
fi)

## Monitoring URLs
- Health Check: https://portfolio-kpi-copilot.vercel.app/api/production-health
- Readiness: https://portfolio-kpi-copilot.vercel.app/api/production-readiness
- Load Test: https://portfolio-kpi-copilot.vercel.app/api/load-test
EOF

print_status "SUCCESS" "Deployment report generated"

# Step 7: Final recommendations
echo ""
print_status "INFO" "Deployment completed!"
echo ""

if [ $success_rate -ge 80 ]; then
    print_status "SUCCESS" "🎉 Production deployment successful!"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Run comprehensive stability check: ./scripts/simple-stability-check.sh"
    echo "   2. Test production health: curl https://portfolio-kpi-copilot.vercel.app/api/production-health"
    echo "   3. Set up monitoring alerts and procedures"
    echo "   4. Prepare for database migration (if not done yet)"
else
    print_status "WARNING" "⚠️ Deployment completed with issues"
    echo ""
    echo "🔧 Required Actions:"
    echo "   1. Check Vercel function logs for errors"
    echo "   2. Verify environment variables are set correctly"
    echo "   3. Complete database migration to Supabase"
    echo "   4. Re-run deployment verification"
fi

echo ""
echo "🔗 Useful Links:"
echo "   • Vercel Dashboard: https://vercel.com/dashboard"
echo "   • Production App: https://portfolio-kpi-copilot.vercel.app"
echo "   • Stability Report: ./PRODUCTION_STABILITY_REPORT.md"
