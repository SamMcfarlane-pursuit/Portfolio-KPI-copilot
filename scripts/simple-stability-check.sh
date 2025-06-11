#!/bin/bash

# ===================================================================
# PORTFOLIO KPI COPILOT - SIMPLE PRODUCTION STABILITY CHECK
# Quick assessment of production deployment status
# ===================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    esac
}

echo "🚀 Portfolio KPI Copilot - Production Stability Check"
echo "===================================================="
echo ""

BASE_URL="https://portfolio-kpi-copilot.vercel.app"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local test_name=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    print_status "INFO" "Testing: $test_name"
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BASE_URL$endpoint" 2>/dev/null || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        print_status "SUCCESS" "$test_name - Status: $status_code"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        print_status "ERROR" "$test_name - Expected: $expected_status, Got: $status_code"
    fi
    echo ""
}

# Test critical endpoints
print_status "INFO" "Testing critical endpoints..."
echo ""

test_endpoint "/api/health" "200" "Health Check"
test_endpoint "/api/system/status" "200" "System Status"
test_endpoint "/api/auth/verify-setup" "200" "Auth Setup"
test_endpoint "/api/docs" "200" "API Documentation"
test_endpoint "/api/portfolios" "401" "Portfolios API (Auth Required)"
test_endpoint "/api/companies" "401" "Companies API (Auth Required)"
test_endpoint "/api/kpis" "401" "KPIs API (Auth Required)"
test_endpoint "/auth/signin" "200" "Sign-in Page"

# Calculate success rate
success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo "📊 RESULTS SUMMARY"
echo "=================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Success Rate: $success_rate%"
echo ""

# Determine overall status
if [ $success_rate -ge 90 ]; then
    print_status "SUCCESS" "PRODUCTION READY - $success_rate% success rate"
    echo "🎉 System is stable and ready for production use"
elif [ $success_rate -ge 75 ]; then
    print_status "WARNING" "MOSTLY STABLE - $success_rate% success rate"
    echo "⚠️  System is mostly functional but needs attention"
else
    print_status "ERROR" "NOT PRODUCTION READY - $success_rate% success rate"
    echo "🚨 System has critical issues that need immediate attention"
fi

echo ""
echo "🔗 Next Steps:"
if [ $success_rate -ge 90 ]; then
    echo "   • System is ready for production deployment"
    echo "   • Set up monitoring and alerting"
    echo "   • Prepare rollback procedures"
else
    echo "   • Fix failing endpoints"
    echo "   • Check database configuration"
    echo "   • Verify environment variables"
    echo "   • Run detailed diagnostics"
fi

echo ""
echo "📋 Detailed Diagnostics Available:"
echo "   • Production Health: $BASE_URL/api/production-health"
echo "   • Production Readiness: $BASE_URL/api/production-readiness"
echo "   • Load Testing: $BASE_URL/api/load-test"
