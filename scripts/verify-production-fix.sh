#!/bin/bash

echo "🔍 Verifying Production Deployment Fix..."

# Test API endpoints
echo "Testing API endpoints..."

# Health check
HEALTH_RESPONSE=$(curl -s "https://portfolio-kpi-copilot.vercel.app/api/health")
echo "Health API: $HEALTH_RESPONSE"

# System status
STATUS_RESPONSE=$(curl -s "https://portfolio-kpi-copilot.vercel.app/api/system/status")
echo "System Status: $STATUS_RESPONSE"

# Auth verification
AUTH_RESPONSE=$(curl -s "https://portfolio-kpi-copilot.vercel.app/api/auth/verify-setup")
echo "Auth Setup: $AUTH_RESPONSE"

echo "✅ Verification complete"
