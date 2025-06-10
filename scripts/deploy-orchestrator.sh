#!/bin/bash

# ===================================================================
# Portfolio KPI Copilot - Deployment Orchestrator
# Manages incremental deployment across all phases
# ===================================================================

set -e  # Exit on any error

echo "🚀 Portfolio KPI Copilot - Deployment Orchestrator"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_phase() {
    echo -e "${PURPLE}[PHASE]${NC} $1"
}

print_feature() {
    echo -e "${CYAN}[FEATURE]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Function to display phase information
show_phase_info() {
    echo ""
    echo "📋 Available Deployment Phases:"
    echo "=================================================="
    
    print_phase "Phase 1: Core AI Features"
    echo "  ✅ Basic AI explanations and insights"
    echo "  ✅ OpenRouter/OpenAI integration"
    echo "  ✅ Core portfolio and KPI management"
    echo "  ✅ SQLite database with demo data"
    echo "  ✅ Mock financial data (no API dependencies)"
    echo "  📋 Requirements: Basic OAuth credentials"
    echo ""
    
    print_phase "Phase 2: Advanced AI Features"
    echo "  ✅ Natural language KPI queries"
    echo "  ✅ Advanced AI orchestrator"
    echo "  ✅ Streaming AI responses"
    echo "  ✅ AI analytics and performance tracking"
    echo "  📋 Requirements: Phase 1 + Enhanced AI configuration"
    echo ""
    
    print_phase "Phase 3: Financial Data Integration"
    echo "  ✅ Real-time market data integration"
    echo "  ✅ Economic indicators and benchmarks"
    echo "  ✅ Financial news sentiment analysis"
    echo "  ✅ REIT and commodity data"
    echo "  📋 Requirements: Phase 2 + Financial API keys"
    echo ""
    
    print_phase "Phase 4: Supabase Database Migration"
    echo "  ✅ Supabase PostgreSQL as primary database"
    echo "  ✅ Real-time subscriptions and live updates"
    echo "  ✅ Vector search and RAG integration"
    echo "  ✅ Row Level Security (RLS)"
    echo "  📋 Requirements: Phase 3 + Supabase configuration"
    echo ""
    
    print_phase "Phase 5: Enterprise Features"
    echo "  ✅ Role-Based Access Control (RBAC)"
    echo "  ✅ Comprehensive audit logging"
    echo "  ✅ Advanced security features"
    echo "  ✅ Performance monitoring"
    echo "  📋 Requirements: Phase 4 + Enterprise setup"
    echo ""
    
    print_phase "Phase 6: Experimental Features"
    echo "  ✅ Document upload and processing"
    echo "  ✅ Predictive analytics"
    echo "  ✅ Custom dashboards"
    echo "  ✅ Webhook integrations"
    echo "  📋 Requirements: Phase 5 + Advanced configuration"
    echo ""
}

# Function to check current deployment status
check_current_status() {
    print_status "Checking current deployment status..."
    
    # Try to get current phase from Vercel
    CURRENT_PHASE=$(vercel env ls production 2>/dev/null | grep DEPLOYMENT_PHASE | awk '{print $2}' || echo "0")
    
    if [ "$CURRENT_PHASE" = "0" ] || [ -z "$CURRENT_PHASE" ]; then
        print_warning "No current deployment detected or Phase 0 (initial setup)"
        CURRENT_PHASE=0
    else
        print_success "Current deployment: Phase $CURRENT_PHASE"
    fi
    
    echo "Current Phase: $CURRENT_PHASE"
    return $CURRENT_PHASE
}

# Function to validate phase requirements
validate_phase_requirements() {
    local phase=$1
    local missing_reqs=()
    
    print_status "Validating Phase $phase requirements..."
    
    case $phase in
        1)
            # Check basic requirements
            if [ ! -f ".env.production.phase1" ]; then
                missing_reqs+=("Phase 1 environment configuration")
            fi
            ;;
        2)
            # Check Phase 2 requirements
            if [ ! -f ".env.production.phase2" ]; then
                missing_reqs+=("Phase 2 environment configuration")
            fi
            ;;
        3)
            # Check Phase 3 requirements (API keys)
            if [ ! -f ".env.production.phase3" ]; then
                missing_reqs+=("Phase 3 environment configuration")
            fi
            
            # Check for API key placeholders
            if grep -q "your-alpha-vantage-api-key" .env.production.phase3 2>/dev/null; then
                missing_reqs+=("Alpha Vantage API key")
            fi
            if grep -q "your-iex-cloud-api-key" .env.production.phase3 2>/dev/null; then
                missing_reqs+=("IEX Cloud API key")
            fi
            ;;
        4)
            # Check Phase 4 requirements (Supabase)
            if [ ! -f ".env.production.phase4" ]; then
                missing_reqs+=("Phase 4 environment configuration")
            fi
            
            if grep -q "your-project.supabase.co" .env.production.phase4 2>/dev/null; then
                missing_reqs+=("Supabase project configuration")
            fi
            ;;
    esac
    
    if [ ${#missing_reqs[@]} -ne 0 ]; then
        print_error "Missing requirements for Phase $phase:"
        for req in "${missing_reqs[@]}"; do
            echo "  - $req"
        done
        return 1
    fi
    
    print_success "Phase $phase requirements validated"
    return 0
}

# Function to deploy specific phase
deploy_phase() {
    local phase=$1
    
    print_phase "Deploying Phase $phase..."
    
    # Make sure deployment script is executable
    chmod +x "scripts/deploy-phase${phase}.sh" 2>/dev/null || true
    
    # Check if deployment script exists
    if [ ! -f "scripts/deploy-phase${phase}.sh" ]; then
        print_error "Deployment script for Phase $phase not found!"
        return 1
    fi
    
    # Execute phase deployment
    if ./scripts/deploy-phase${phase}.sh; then
        print_success "Phase $phase deployment completed successfully!"
        return 0
    else
        print_error "Phase $phase deployment failed!"
        return 1
    fi
}

# Function to show deployment menu
show_deployment_menu() {
    echo ""
    echo "🎯 Deployment Options:"
    echo "=================================================="
    echo "1. Deploy Phase 1 (Core AI Features)"
    echo "2. Deploy Phase 2 (Advanced AI Features)"
    echo "3. Deploy Phase 3 (Financial Data Integration)"
    echo "4. Deploy Phase 4 (Supabase Database Migration)"
    echo "5. Deploy Phase 5 (Enterprise Features) [Coming Soon]"
    echo "6. Deploy Phase 6 (Experimental Features) [Coming Soon]"
    echo "7. Show current status"
    echo "8. Show phase information"
    echo "9. Exit"
    echo ""
}

# Main deployment loop
main() {
    show_phase_info
    
    while true; do
        check_current_status
        current_phase=$?
        
        show_deployment_menu
        
        read -p "Select deployment option (1-9): " choice
        
        case $choice in
            1)
                print_phase "Starting Phase 1 Deployment..."
                if validate_phase_requirements 1; then
                    deploy_phase 1
                else
                    print_warning "Please fix requirements and try again."
                fi
                ;;
            2)
                print_phase "Starting Phase 2 Deployment..."
                if [ $current_phase -lt 1 ]; then
                    print_warning "Phase 1 must be deployed first!"
                elif validate_phase_requirements 2; then
                    deploy_phase 2
                else
                    print_warning "Please fix requirements and try again."
                fi
                ;;
            3)
                print_phase "Starting Phase 3 Deployment..."
                if [ $current_phase -lt 2 ]; then
                    print_warning "Phase 2 must be deployed first!"
                elif validate_phase_requirements 3; then
                    deploy_phase 3
                else
                    print_warning "Please fix requirements and try again."
                    print_status "See docs/FINANCIAL_API_SETUP.md for API key setup."
                fi
                ;;
            4)
                print_phase "Starting Phase 4 Deployment..."
                if [ $current_phase -lt 3 ]; then
                    print_warning "Phase 3 must be deployed first!"
                elif validate_phase_requirements 4; then
                    print_warning "Phase 4 deployment script not yet implemented."
                    print_status "Please use manual Supabase setup for now."
                else
                    print_warning "Please fix requirements and try again."
                fi
                ;;
            5)
                print_warning "Phase 5 (Enterprise Features) coming soon!"
                ;;
            6)
                print_warning "Phase 6 (Experimental Features) coming soon!"
                ;;
            7)
                check_current_status
                ;;
            8)
                show_phase_info
                ;;
            9)
                print_success "Deployment orchestrator exiting. Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-9."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
        clear
    done
}

# Check for help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_phase_info
    echo ""
    echo "Usage: $0 [--help]"
    echo ""
    echo "This script provides an interactive menu for deploying"
    echo "Portfolio KPI Copilot across multiple phases."
    echo ""
    echo "Each phase builds upon the previous one:"
    echo "  Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6"
    echo ""
    echo "Requirements and setup instructions are provided for each phase."
    exit 0
fi

# Start main deployment orchestrator
clear
main
