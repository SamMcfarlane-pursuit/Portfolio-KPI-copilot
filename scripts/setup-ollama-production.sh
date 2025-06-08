#!/bin/bash

# Portfolio KPI Copilot - Ollama Production Setup
# This script sets up Ollama for production deployment

set -e

echo "🚀 Portfolio KPI Copilot - Ollama Production Setup"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if running on supported platform
check_platform() {
    print_status "Checking platform compatibility..."
    
    case "$(uname -s)" in
        Linux*)     PLATFORM=Linux;;
        Darwin*)    PLATFORM=Mac;;
        *)          PLATFORM="UNKNOWN";;
    esac
    
    if [ "$PLATFORM" = "UNKNOWN" ]; then
        print_error "Unsupported platform. This script supports Linux and macOS only."
        exit 1
    fi
    
    print_success "Platform: $PLATFORM"
}

# Install Ollama if not present
install_ollama() {
    print_status "Checking Ollama installation..."
    
    if command -v ollama &> /dev/null; then
        print_success "Ollama is already installed"
        ollama --version
        return 0
    fi
    
    print_status "Installing Ollama..."
    
    if [ "$PLATFORM" = "Linux" ]; then
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [ "$PLATFORM" = "Mac" ]; then
        if command -v brew &> /dev/null; then
            brew install ollama
        else
            print_warning "Homebrew not found. Please install Ollama manually from https://ollama.ai"
            return 1
        fi
    fi
    
    if command -v ollama &> /dev/null; then
        print_success "Ollama installed successfully"
        ollama --version
    else
        print_error "Failed to install Ollama"
        return 1
    fi
}

# Start Ollama service
start_ollama_service() {
    print_status "Starting Ollama service..."
    
    # Check if Ollama is already running
    if curl -s http://localhost:11434/api/tags &> /dev/null; then
        print_success "Ollama service is already running"
        return 0
    fi
    
    # Start Ollama in background
    if [ "$PLATFORM" = "Linux" ]; then
        # On Linux, try systemd first
        if systemctl is-active --quiet ollama 2>/dev/null; then
            print_success "Ollama service is running via systemd"
        else
            print_status "Starting Ollama manually..."
            nohup ollama serve > /tmp/ollama.log 2>&1 &
            sleep 3
        fi
    elif [ "$PLATFORM" = "Mac" ]; then
        # On macOS, start manually
        print_status "Starting Ollama manually..."
        nohup ollama serve > /tmp/ollama.log 2>&1 &
        sleep 3
    fi
    
    # Verify service is running
    for i in {1..10}; do
        if curl -s http://localhost:11434/api/tags &> /dev/null; then
            print_success "Ollama service is running on port 11434"
            return 0
        fi
        print_status "Waiting for Ollama service... ($i/10)"
        sleep 2
    done
    
    print_error "Failed to start Ollama service"
    return 1
}

# Download required models
download_models() {
    print_status "Downloading required AI models..."
    
    # Models to download (lightweight for production)
    MODELS=(
        "llama3.2:3b"
        "llama3.2:latest"
    )
    
    for model in "${MODELS[@]}"; do
        print_status "Downloading model: $model"
        
        if ollama list | grep -q "$model"; then
            print_success "Model $model is already available"
        else
            print_status "Pulling model $model..."
            if ollama pull "$model"; then
                print_success "Successfully downloaded $model"
            else
                print_warning "Failed to download $model (continuing anyway)"
            fi
        fi
    done
}

# Test Ollama functionality
test_ollama() {
    print_status "Testing Ollama functionality..."
    
    # Test API endpoint
    if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
        print_error "Ollama API is not responding"
        return 1
    fi
    
    # Test model inference
    print_status "Testing model inference..."
    
    RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
        -H "Content-Type: application/json" \
        -d '{
            "model": "llama3.2:3b",
            "prompt": "What is EBITDA?",
            "stream": false
        }' | jq -r '.response' 2>/dev/null)
    
    if [ -n "$RESPONSE" ] && [ "$RESPONSE" != "null" ]; then
        print_success "Model inference test passed"
        print_status "Sample response: ${RESPONSE:0:100}..."
    else
        print_warning "Model inference test failed, but API is responding"
    fi
}

# Configure environment variables
configure_environment() {
    print_status "Configuring environment variables..."
    
    ENV_FILE=".env.local"
    
    # Create or update environment file
    if [ ! -f "$ENV_FILE" ]; then
        print_status "Creating $ENV_FILE..."
        cp .env.example "$ENV_FILE"
    fi
    
    # Update Ollama configuration
    print_status "Updating Ollama configuration in $ENV_FILE..."
    
    # Use sed to update or add environment variables
    update_env_var() {
        local key=$1
        local value=$2
        local file=$3
        
        if grep -q "^$key=" "$file"; then
            sed -i.bak "s|^$key=.*|$key=\"$value\"|" "$file"
        else
            echo "$key=\"$value\"" >> "$file"
        fi
    }
    
    update_env_var "OLLAMA_BASE_URL" "http://localhost:11434" "$ENV_FILE"
    update_env_var "LLAMA_MODEL" "llama3.2:3b" "$ENV_FILE"
    update_env_var "LLAMA_TEMPERATURE" "0.1" "$ENV_FILE"
    update_env_var "LLAMA_MAX_TOKENS" "2000" "$ENV_FILE"
    update_env_var "LLAMA_TIMEOUT" "30000" "$ENV_FILE"
    update_env_var "USE_OLLAMA_PRIMARY" "true" "$ENV_FILE"
    update_env_var "ENABLE_LLAMA_FALLBACK" "true" "$ENV_FILE"
    
    print_success "Environment configuration updated"
}

# Display status and next steps
show_status() {
    print_success "Ollama Production Setup Complete!"
    echo ""
    echo "📊 System Status:"
    echo "  • Ollama Service: Running on http://localhost:11434"
    echo "  • Available Models: $(ollama list | wc -l) models"
    echo "  • Configuration: Updated in .env.local"
    echo ""
    echo "🚀 Next Steps:"
    echo "  1. Start your application: npm run dev"
    echo "  2. Test AI functionality at: http://localhost:3000"
    echo "  3. Check system status: http://localhost:3000/api/system/comprehensive-status"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  • Check Ollama status: ollama list"
    echo "  • View Ollama logs: tail -f /tmp/ollama.log"
    echo "  • Stop Ollama: pkill ollama"
    echo ""
}

# Main execution
main() {
    echo ""
    print_status "Starting Ollama production setup..."
    echo ""
    
    check_platform
    install_ollama
    start_ollama_service
    download_models
    test_ollama
    configure_environment
    show_status
    
    print_success "Setup completed successfully! 🎉"
}

# Run main function
main "$@"
