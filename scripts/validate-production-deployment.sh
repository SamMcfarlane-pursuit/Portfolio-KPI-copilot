#!/bin/bash

# ===================================================================
# PORTFOLIO KPI COPILOT - PRODUCTION DEPLOYMENT VALIDATION
# Comprehensive validation after database migration
# ===================================================================

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

echo "🚀 Portfolio KPI Copilot - Production Deployment Validation"
echo "=========================================================="
echo ""

BASE_URL="https://portfolio-kpi-copilot.vercel.app"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
CRITICAL_ISSUES=0

# Function to test endpoint with detailed analysis
test_endpoint_detailed() {
    local endpoint=$1
    local expected_status=$2
    local test_name=$3
    local is_critical=${4:-false}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    print_status "INFO" "Testing: $test_name"
    
    # Get response with timing
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code}|%{content_type}|%{time_total}" \
        --max-time 30 "$BASE_URL$endpoint" 2>/dev/null || echo "000||0")
    local end_time=$(date +%s%3N)
    
    local status_code=$(echo "$response" | tail -1 | cut -d'|' -f1)
    local content_type=$(echo "$response" | tail -1 | cut -d'|' -f2)
    local response_time=$(echo "$response" | tail -1 | cut -d'|' -f3)
    local response_body=$(echo "$response" | head -n -1)
    
    # Convert response time to milliseconds
    local response_time_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null | cut -d'.' -f1 2>/dev/null || echo "0")
    
    # Analyze response
    local is_json=false
    local is_html=false
    
    if [[ "$content_type" == *"application/json"* ]]; then
        is_json=true
    elif [[ "$content_type" == *"text/html"* ]] || [[ "$response_body" == *"<html"* ]]; then
        is_html=true
    fi
    
    # Check if test passed
    if [ "$status_code" = "$expected_status" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        print_status "SUCCESS" "$test_name - Status: $status_code, Time: ${response_time_ms}ms"
        
        # Additional checks for API endpoints
        if [[ "$endpoint" == /api/* ]] && [ "$is_html" = true ]; then
            print_status "WARNING" "API endpoint returning HTML instead of JSON"
        fi
        
        if [ "$response_time_ms" -gt 2000 ]; then
            print_status "WARNING" "Response time exceeds 2s threshold"
        fi
        
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        print_status "ERROR" "$test_name - Expected: $expected_status, Got: $status_code"
        
        if [ "$is_critical" = true ]; then
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
            print_status "CRITICAL" "Critical system component failing"
        fi
        
        # Show response preview for debugging
        if [ ${#response_body} -gt 0 ]; then
            echo "   Response preview: $(echo "$response_body" | head -c 150)..."
        fi
    fi
    
    echo ""
}

# Function to test database connectivity
test_database() {
    print_status "INFO" "Testing Database Connectivity..."
    
    # Test system status for database info
    local response=$(curl -s "$BASE_URL/api/system/status" 2>/dev/null)
    
    if echo "$response" | grep -q '"database"'; then
        local db_status=$(echo "$response" | grep -o '"database":{[^}]*}' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$db_status" = "healthy" ]; then
            print_status "SUCCESS" "Database connection healthy"
            return 0
        elif [ "$db_status" = "error" ]; then
            print_status "ERROR" "Database connection failed"
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
            return 1
        else
            print_status "WARNING" "Database status: $db_status"
            return 1
        fi
    else
        print_status "ERROR" "Unable to determine database status"
        return 1
    fi
}

# Function to test authentication system
test_authentication() {
    print_status "INFO" "Testing Authentication System..."
    
    # Test auth setup endpoint
    local response=$(curl -s "$BASE_URL/api/auth/verify-setup" 2>/dev/null)
    
    if echo "$response" | grep -q '"success":true'; then
        print_status "SUCCESS" "Authentication system configured"
        
        # Check OAuth providers
        local oauth_count=$(echo "$response" | grep -o '"oauth_count":[0-9]*' | cut -d':' -f2)
        if [ "$oauth_count" -gt 0 ]; then
            print_status "SUCCESS" "OAuth providers configured: $oauth_count"
        else
            print_status "WARNING" "No OAuth providers configured"
        fi
        
        return 0
    else
        print_status "ERROR" "Authentication system not properly configured"
        return 1
    fi
}

# Function to analyze API routing
analyze_api_routing() {
    print_status "INFO" "Analyzing API Routing..."
    
    local api_endpoints=(
        "/api/portfolios"
        "/api/companies"
        "/api/kpis"
    )
    
    local routing_issues=0
    
    for endpoint in "${api_endpoints[@]}"; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time 10 "$BASE_URL$endpoint" 2>/dev/null || echo "000")
        
        if [ "$status_code" = "401" ]; then
            print_status "SUCCESS" "$endpoint - Properly requires authentication"
        elif [ "$status_code" = "307" ]; then
            print_status "ERROR" "$endpoint - Unexpected redirect (307)"
            routing_issues=$((routing_issues + 1))
        else
            print_status "WARNING" "$endpoint - Unexpected status: $status_code"
            routing_issues=$((routing_issues + 1))
        fi
    done
    
    if [ $routing_issues -eq 0 ]; then
        print_status "SUCCESS" "API routing working correctly"
        return 0
    else
        print_status "ERROR" "API routing issues detected: $routing_issues endpoints"
        return 1
    fi
}

# Main validation sequence
print_status "INFO" "Starting comprehensive production validation..."
echo "Target URL: $BASE_URL"
echo ""

# Phase 1: Core System Tests
print_status "INFO" "Phase 1: Core System Validation"
test_endpoint_detailed "/api/health" "200" "Health Check" true
test_endpoint_detailed "/api/system/status" "200" "System Status" true
test_endpoint_detailed "/api/auth/verify-setup" "200" "Auth Setup" true

# Phase 2: Database Tests
print_status "INFO" "Phase 2: Database Validation"
test_database

# Phase 3: Authentication Tests
print_status "INFO" "Phase 3: Authentication Validation"
test_authentication

# Phase 4: API Routing Tests
print_status "INFO" "Phase 4: API Routing Validation"
analyze_api_routing
test_endpoint_detailed "/api/portfolios" "401" "Portfolios API (Auth Required)" false
test_endpoint_detailed "/api/companies" "401" "Companies API (Auth Required)" false
test_endpoint_detailed "/api/kpis" "401" "KPIs API (Auth Required)" false

# Phase 5: Frontend Tests
print_status "INFO" "Phase 5: Frontend Validation"
test_endpoint_detailed "/" "200" "Dashboard Landing Page" false
test_endpoint_detailed "/auth/signin" "200" "Sign-in Page" false
test_endpoint_detailed "/api/docs" "200" "API Documentation" false

# Calculate final results
success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo ""
echo "📊 COMPREHENSIVE VALIDATION RESULTS"
echo "==================================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Critical Issues: $CRITICAL_ISSUES"
echo "Success Rate: $success_rate%"
echo ""

# Determine production readiness
if [ $CRITICAL_ISSUES -eq 0 ] && [ $success_rate -ge 90 ]; then
    print_status "SUCCESS" "🎉 PRODUCTION READY - System is stable and operational"
    echo ""
    echo "✅ All critical systems are functioning properly"
    echo "✅ Database connectivity established"
    echo "✅ Authentication system operational"
    echo "✅ API routing working correctly"
    echo ""
    echo "🚀 Ready for production traffic!"
    
elif [ $CRITICAL_ISSUES -eq 0 ] && [ $success_rate -ge 75 ]; then
    print_status "WARNING" "⚠️ MOSTLY READY - Minor issues detected"
    echo ""
    echo "✅ Critical systems are functioning"
    echo "⚠️ Some non-critical issues need attention"
    echo ""
    echo "🔧 Recommended: Address minor issues before full production load"
    
elif [ $CRITICAL_ISSUES -le 2 ] && [ $success_rate -ge 60 ]; then
    print_status "WARNING" "🔧 NEEDS ATTENTION - Some critical issues remain"
    echo ""
    echo "⚠️ Critical issues need to be resolved"
    echo "⚠️ Database migration may be incomplete"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Complete database migration to Supabase"
    echo "   2. Verify environment variables in Vercel"
    echo "   3. Re-run validation after fixes"
    
else
    print_status "ERROR" "🚨 NOT PRODUCTION READY - Major issues detected"
    echo ""
    echo "❌ Critical systems are failing"
    echo "❌ Database migration required"
    echo "❌ System not ready for production traffic"
    echo ""
    echo "🚨 IMMEDIATE ACTION REQUIRED:"
    echo "   1. Follow CRITICAL_DATABASE_MIGRATION.md"
    echo "   2. Complete Supabase setup"
    echo "   3. Update Vercel environment variables"
    echo "   4. Re-run this validation"
fi

echo ""
echo "📋 Detailed Reports Available:"
echo "   • Migration Guide: ./CRITICAL_DATABASE_MIGRATION.md"
echo "   • Stability Report: ./PRODUCTION_STABILITY_REPORT.md"
echo "   • Production Health: $BASE_URL/api/production-health"
echo ""

# Save results to file
cat > validation-results-$(date +%Y%m%d-%H%M%S).json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_tests": $TOTAL_TESTS,
  "passed_tests": $PASSED_TESTS,
  "failed_tests": $FAILED_TESTS,
  "critical_issues": $CRITICAL_ISSUES,
  "success_rate": $success_rate,
  "production_ready": $([ $CRITICAL_ISSUES -eq 0 ] && [ $success_rate -ge 90 ] && echo "true" || echo "false"),
  "database_migration_needed": $([ $CRITICAL_ISSUES -gt 0 ] && echo "true" || echo "false")
}
EOF

print_status "INFO" "Validation results saved to validation-results-$(date +%Y%m%d-%H%M%S).json"
