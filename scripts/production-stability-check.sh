#!/bin/bash

# ===================================================================
# PORTFOLIO KPI COPILOT - PRODUCTION STABILITY & READINESS CHECK
# Comprehensive testing and validation for enterprise deployment
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

echo "🚀 Portfolio KPI Copilot - Production Stability Check"
echo "===================================================="
echo ""

# Configuration
BASE_URL="https://portfolio-kpi-copilot.vercel.app"
TIMEOUT=30
MAX_RETRIES=3

# Initialize results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
CRITICAL_ISSUES=0

# Function to test API endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local test_name=$3
    local method=${4:-GET}
    local data=${5:-""}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    print_status "INFO" "Testing: $test_name"
    
    local response_code
    local response_time
    local response_body
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}|%{time_total}" -X POST \
            -H "Content-Type: application/json" \
            -d "$data" \
            --max-time $TIMEOUT \
            "$BASE_URL$endpoint" 2>/dev/null || echo "000|0")
    else
        response=$(curl -s -w "%{http_code}|%{time_total}" \
            --max-time $TIMEOUT \
            "$BASE_URL$endpoint" 2>/dev/null || echo "000|0")
    fi
    
    response_code=$(echo "$response" | tail -1 | cut -d'|' -f1)
    response_time=$(echo "$response" | tail -1 | cut -d'|' -f2)
    response_body=$(echo "$response" | head -n -1)
    
    # Convert response time to milliseconds
    response_time_ms=$(echo "$response_time * 1000" | bc -l | cut -d'.' -f1)
    
    if [ "$response_code" = "$expected_status" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        print_status "SUCCESS" "$test_name - Status: $response_code, Time: ${response_time_ms}ms"
        
        # Check response time (should be < 2000ms for production)
        if [ "$response_time_ms" -gt 2000 ]; then
            print_status "WARNING" "Response time exceeds 2s threshold: ${response_time_ms}ms"
        fi
        
        # Check if response is JSON for API endpoints
        if [[ "$endpoint" == /api/* ]] && [[ "$response_body" == *"<html"* ]]; then
            print_status "ERROR" "API endpoint returning HTML instead of JSON"
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
        fi
        
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        print_status "ERROR" "$test_name - Expected: $expected_status, Got: $response_code"
        
        if [ "$expected_status" = "200" ]; then
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
        fi
    fi
    
    echo "   Response preview: $(echo "$response_body" | head -c 100)..."
    echo ""
}

# Function to test database operations
test_database_operations() {
    print_status "INFO" "Testing Database Operations..."
    
    # Test database health
    test_endpoint "/api/health" "200" "Database Health Check"
    
    # Test system status
    test_endpoint "/api/system/status" "200" "System Status Check"
    
    # Test authentication setup
    test_endpoint "/api/auth/verify-setup" "200" "Authentication Setup"
}

# Function to test API endpoints
test_api_endpoints() {
    print_status "INFO" "Testing API Endpoints..."
    
    # Core API endpoints (should require auth - expect 401)
    test_endpoint "/api/portfolios" "401" "Portfolios API (Auth Required)"
    test_endpoint "/api/companies" "401" "Companies API (Auth Required)"
    test_endpoint "/api/kpis" "401" "KPIs API (Auth Required)"
    
    # Public API endpoints
    test_endpoint "/api/docs" "200" "API Documentation"
    test_endpoint "/api/auth/providers" "200" "Auth Providers"
}

# Function to test authentication flows
test_authentication() {
    print_status "INFO" "Testing Authentication Flows..."
    
    # Test OAuth providers
    test_endpoint "/api/auth/test-oauth" "200" "OAuth Configuration Test"
    
    # Test sign-in page
    test_endpoint "/auth/signin" "200" "Sign-in Page"
}

# Function to test AI services
test_ai_services() {
    print_status "INFO" "Testing AI Services..."
    
    # Test AI endpoints (should require auth)
    test_endpoint "/api/chat" "401" "AI Chat API (Auth Required)"
    test_endpoint "/api/analyze-portfolio" "401" "Portfolio Analysis API (Auth Required)"
    test_endpoint "/api/explain-kpi" "401" "KPI Explanation API (Auth Required)"
}

# Function to test performance and reliability
test_performance() {
    print_status "INFO" "Testing Performance & Reliability..."
    
    # Test multiple requests to check consistency
    for i in {1..5}; do
        test_endpoint "/api/health" "200" "Health Check #$i"
        sleep 1
    done
    
    # Test concurrent requests (simplified)
    print_status "INFO" "Testing concurrent request handling..."
    for i in {1..3}; do
        test_endpoint "/api/system/status" "200" "Concurrent Status Check #$i" &
    done
    wait
}

# Function to test error handling
test_error_handling() {
    print_status "INFO" "Testing Error Handling..."
    
    # Test non-existent endpoints
    test_endpoint "/api/nonexistent" "404" "Non-existent Endpoint"
    
    # Test malformed requests
    test_endpoint "/api/portfolios" "401" "Malformed Request" "POST" '{"invalid": json}'
}

# Function to test security headers
test_security() {
    print_status "INFO" "Testing Security Configuration..."
    
    # Check security headers
    headers=$(curl -s -I "$BASE_URL" | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)")
    
    if echo "$headers" | grep -q "X-Frame-Options"; then
        print_status "SUCCESS" "X-Frame-Options header present"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_status "WARNING" "X-Frame-Options header missing"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to generate stability report
generate_report() {
    echo ""
    echo "📊 PRODUCTION STABILITY REPORT"
    echo "=============================="
    echo ""
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    echo "📈 Test Results:"
    echo "   Total Tests: $TOTAL_TESTS"
    echo "   Passed: $PASSED_TESTS"
    echo "   Failed: $FAILED_TESTS"
    echo "   Success Rate: $success_rate%"
    echo "   Critical Issues: $CRITICAL_ISSUES"
    echo ""
    
    # Determine overall status
    if [ $CRITICAL_ISSUES -eq 0 ] && [ $success_rate -ge 90 ]; then
        print_status "SUCCESS" "PRODUCTION READY - All critical systems operational"
        echo "🎉 Deployment Status: READY FOR PRODUCTION"
    elif [ $CRITICAL_ISSUES -eq 0 ] && [ $success_rate -ge 80 ]; then
        print_status "WARNING" "MOSTLY STABLE - Minor issues detected"
        echo "⚠️  Deployment Status: READY WITH MONITORING"
    elif [ $CRITICAL_ISSUES -le 2 ] && [ $success_rate -ge 70 ]; then
        print_status "WARNING" "NEEDS ATTENTION - Some critical issues"
        echo "🔧 Deployment Status: REQUIRES FIXES"
    else
        print_status "ERROR" "NOT PRODUCTION READY - Major issues detected"
        echo "🚨 Deployment Status: NOT READY"
    fi
    
    echo ""
    echo "📋 Recommendations:"
    
    if [ $CRITICAL_ISSUES -gt 0 ]; then
        echo "   • Fix $CRITICAL_ISSUES critical issues before production deployment"
    fi
    
    if [ $success_rate -lt 90 ]; then
        echo "   • Improve test success rate to 90%+ for production readiness"
    fi
    
    echo "   • Monitor system performance continuously"
    echo "   • Set up automated health checks"
    echo "   • Implement error tracking and alerting"
    echo "   • Regular backup and disaster recovery testing"
    
    echo ""
    echo "🔗 Next Steps:"
    echo "   1. Review failed tests and fix critical issues"
    echo "   2. Run load testing for expected traffic"
    echo "   3. Set up monitoring and alerting"
    echo "   4. Prepare rollback procedures"
    echo "   5. Schedule production deployment"
}

# Main execution
print_status "INFO" "Starting comprehensive production stability check..."
echo "Target URL: $BASE_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Run all test suites
test_database_operations
test_api_endpoints
test_authentication
test_ai_services
test_performance
test_error_handling
test_security

# Generate final report
generate_report

echo ""
print_status "INFO" "Production stability check completed"
echo "Report saved to: production-stability-report-$(date +%Y%m%d-%H%M%S).log"
