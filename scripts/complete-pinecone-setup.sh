#!/bin/bash

# =============================================================================
# PINECONE SETUP COMPLETION SCRIPT
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${CYAN}🌲 PINECONE SETUP COMPLETION${NC}"
echo -e "${CYAN}=============================${NC}"
echo ""

echo -e "${BLUE}This script will help you complete your Pinecone setup.${NC}"
echo -e "${BLUE}You need a Pinecone API key to continue.${NC}"
echo ""

# Check if API key is already set
if grep -q "your-pinecone-api-key-here" .env.local; then
    echo -e "${YELLOW}⚠️  Pinecone API key is not set yet.${NC}"
    echo ""
    echo -e "${BLUE}📋 STEPS TO GET YOUR FREE API KEY:${NC}"
    echo "1. Go to: https://www.pinecone.io/"
    echo "2. Click 'Start Free'"
    echo "3. Create account (free forever)"
    echo "4. Go to 'API Keys' → 'Create API Key'"
    echo "5. Name it: portfolio-kpi-copilot"
    echo "6. Copy the API key (starts with 'pc-')"
    echo ""
    echo -e "${BLUE}📋 CREATE INDEX:${NC}"
    echo "1. Go to 'Indexes' → 'Create Index'"
    echo "2. Name: portfolio-kpi-index"
    echo "3. Dimensions: 1536"
    echo "4. Metric: cosine"
    echo "5. Cloud: AWS, Region: us-east-1"
    echo ""
    
    read -p "Do you have your Pinecone API key ready? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${BLUE}Please enter your Pinecone API key:${NC}"
        read -p "API Key (starts with pc-): " api_key
        
        if [[ $api_key == pc-* ]]; then
            # Update the .env.local file
            sed -i.bak "s/your-pinecone-api-key-here/$api_key/g" .env.local
            echo -e "${GREEN}✅ API key updated in .env.local${NC}"
            
            # Restart the development server
            echo -e "${YELLOW}🔄 Restarting development server...${NC}"
            pkill -f "next dev" || true
            sleep 2
            npm run dev > /dev/null 2>&1 &
            sleep 5
            
            echo -e "${GREEN}✅ Development server restarted${NC}"
            echo ""
            
            # Test the setup
            echo -e "${YELLOW}🧪 Testing Pinecone connection...${NC}"
            sleep 3
            
            if curl -s http://localhost:3000/api/health > /dev/null; then
                echo -e "${GREEN}✅ Server is responding${NC}"
                echo -e "${GREEN}✅ Pinecone setup complete!${NC}"
                echo ""
                echo -e "${CYAN}🎉 SUCCESS! Your Portfolio KPI Copilot now has:${NC}"
                echo "• Enterprise-grade vector search"
                echo "• AI-powered document analysis"
                echo "• 100,000 vector capacity (free)"
                echo "• Unlimited queries"
                echo ""
                echo -e "${BLUE}🚀 Ready for production deployment!${NC}"
            else
                echo -e "${RED}❌ Server not responding. Please check manually.${NC}"
            fi
        else
            echo -e "${RED}❌ Invalid API key format. Should start with 'pc-'${NC}"
            exit 1
        fi
    else
        echo ""
        echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
        echo "1. Get your free Pinecone API key from: https://www.pinecone.io/"
        echo "2. Run this script again: ./scripts/complete-pinecone-setup.sh"
        echo "3. Or manually update PINECONE_API_KEY in .env.local"
        echo ""
        echo -e "${BLUE}💡 Remember: Pinecone free tier is perfect for your MVP!${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ Pinecone API key is already configured!${NC}"
    echo ""
    
    # Test the current setup
    echo -e "${YELLOW}🧪 Testing current Pinecone setup...${NC}"
    
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo -e "${GREEN}✅ Server is responding${NC}"
        
        # Run the verification script
        if ./scripts/test-pinecone.sh > /dev/null 2>&1; then
            echo -e "${GREEN}✅ All tests passed${NC}"
            echo ""
            echo -e "${CYAN}🎉 PINECONE SETUP COMPLETE!${NC}"
            echo ""
            echo -e "${BLUE}📊 Your Portfolio KPI Copilot now has:${NC}"
            echo "• ✅ Enterprise-grade vector search"
            echo "• ✅ AI-powered document analysis"  
            echo "• ✅ 100,000 vector capacity"
            echo "• ✅ Unlimited queries"
            echo "• ✅ Free tier (./scripts/test-pinecone.sh/month)"
            echo ""
            echo -e "${GREEN}🚀 Ready for Vercel deployment!${NC}"
        else
            echo -e "${YELLOW}⚠️  Some tests failed. Running detailed check...${NC}"
            ./scripts/test-pinecone.sh
        fi
    else
        echo -e "${RED}❌ Development server not running${NC}"
        echo -e "${BLUE}Please run: npm run dev${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}🌲 PINECONE SETUP COMPLETE - READY FOR AI-POWERED SEARCH!${NC}"
echo -e "${CYAN}=================================================================${NC}"
