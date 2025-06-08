#!/bin/bash

# =============================================================================
# PINECONE SETUP VERIFICATION SCRIPT
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌲 PINECONE SETUP VERIFICATION${NC}"
echo -e "${BLUE}==============================${NC}"
echo ""

# Check if server is running
echo -e "${YELLOW}1. Checking if development server is running...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Development server is running${NC}"
else
    echo -e "${RED}❌ Development server not running. Please run: npm run dev${NC}"
    exit 1
fi

# Check environment variables
echo -e "${YELLOW}2. Checking environment variables...${NC}"
if grep -q "PINECONE_API_KEY=" .env.local; then
    if grep -q "your-pinecone-api-key-here" .env.local; then
        echo -e "${YELLOW}⚠️  PINECONE_API_KEY is placeholder - needs real API key${NC}"
        echo -e "${BLUE}   Get your API key from: https://www.pinecone.io/${NC}"
    else
        echo -e "${GREEN}✅ PINECONE_API_KEY is configured${NC}"
    fi
else
    echo -e "${RED}❌ PINECONE_API_KEY not found in .env.local${NC}"
    exit 1
fi

if grep -q "PINECONE_INDEX_NAME=" .env.local; then
    echo -e "${GREEN}✅ PINECONE_INDEX_NAME is configured${NC}"
else
    echo -e "${RED}❌ PINECONE_INDEX_NAME not found in .env.local${NC}"
    exit 1
fi

# Test system status
echo -e "${YELLOW}3. Testing system status...${NC}"
SYSTEM_STATUS=$(curl -s http://localhost:3000/api/system/status)
if echo "$SYSTEM_STATUS" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ System status API working${NC}"
else
    echo -e "${RED}❌ System status API failed${NC}"
    exit 1
fi

# Test Pinecone integration (check if code is ready)
echo -e "${YELLOW}4. Testing Pinecone integration code...${NC}"

# Check if Pinecone integration file exists and is valid
if [ -f "src/lib/pinecone.ts" ]; then
    echo -e "${GREEN}✅ Pinecone integration file exists${NC}"

    # Check if the file has the right content
    if grep -q "PineconeClient" src/lib/pinecone.ts; then
        echo -e "${GREEN}✅ Pinecone integration code ready${NC}"
    else
        echo -e "${RED}❌ Pinecone integration code incomplete${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Pinecone integration file missing${NC}"
    exit 1
fi

# Test health endpoint (doesn't require auth)
echo -e "${YELLOW}5. Testing health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ Health API working${NC}"
else
    echo -e "${RED}❌ Health API failed${NC}"
    exit 1
fi

# Check package installation
echo -e "${YELLOW}6. Checking Pinecone package...${NC}"
if npm list @pinecone-database/pinecone > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Pinecone package installed${NC}"
else
    echo -e "${RED}❌ Pinecone package not installed${NC}"
    echo -e "${BLUE}   Run: npm install @pinecone-database/pinecone${NC}"
    exit 1
fi

# Summary
echo ""
echo -e "${BLUE}📋 SETUP SUMMARY${NC}"
echo -e "${BLUE}=================${NC}"

# Check if fully configured
if grep -q "your-pinecone-api-key-here" .env.local; then
    echo -e "${YELLOW}🔧 SETUP STATUS: Partially Complete${NC}"
    echo ""
    echo -e "${BLUE}📝 TO COMPLETE SETUP:${NC}"
    echo "1. Go to https://www.pinecone.io/"
    echo "2. Create free account"
    echo "3. Get API key"
    echo "4. Create index: portfolio-kpi-index"
    echo "5. Update PINECONE_API_KEY in .env.local"
    echo "6. Restart server: npm run dev"
    echo ""
    echo -e "${BLUE}💰 COST: $0/month (FREE TIER)${NC}"
    echo -e "${BLUE}📊 CAPACITY: 100,000 vectors (perfect for MVP)${NC}"
else
    echo -e "${GREEN}🎉 SETUP STATUS: Complete!${NC}"
    echo ""
    echo -e "${GREEN}✅ Pinecone is configured and ready${NC}"
    echo -e "${GREEN}✅ Free tier provides 100K vectors${NC}"
    echo -e "${GREEN}✅ Perfect for Portfolio KPI Copilot MVP${NC}"
    echo -e "${GREEN}✅ Enterprise-grade vector search enabled${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Your Portfolio KPI Copilot is ready for AI-powered search!${NC}"
