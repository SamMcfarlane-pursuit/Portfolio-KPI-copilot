# Portfolio KPI Copilot

A comprehensive KPI analysis and portfolio management system with AI-powered insights using local Llama AI models.

## 🚀 Features

- **🤖 AI-Powered KPI Analysis**: Local Llama 3.2 model for intelligent explanations
- **📊 Real-time Dashboard**: Interactive KPI tracking and visualization
- **🏢 Multi-tenant Architecture**: Support for multiple organizations
- **📈 Portfolio Management**: Comprehensive portfolio tracking and analysis
- **🔒 Secure Authentication**: NextAuth.js with multiple providers
- **🎨 Modern UI**: Clean, responsive interface with Tailwind CSS
- **⚡ High Performance**: Optimized for speed and scalability

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Type-safe database access
- **SQLite** - Local development database
- **NextAuth.js** - Authentication solution

### AI Integration
- **LangChain** - AI orchestration framework
- **Ollama** - Local LLM runtime
- **Llama 3.2** - Meta's latest language model (3.2B parameters)

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **npm** or **yarn**
- **Ollama** (for AI features)

### 1. Install Ollama and Llama Model

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama service
ollama serve

# Pull Llama 3.2 model
ollama pull llama3.2:latest
```

### 2. Setup Project

```bash
# Clone repository
git clone <repository-url>
cd portfolio-kpi-copilot

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Initialize database
npx prisma db push

# Seed with sample data
npm run db:seed

# Start development server
npm run dev
```

### 3. Access Application

- **Application**: http://localhost:3002
- **Ollama API**: http://localhost:11434

## ⚙️ Configuration

### Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="your-super-secret-key-here"

# AI Integration
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2:latest"

# Optional: External AI APIs
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"
```

### Ollama Configuration

Verify Ollama setup:

```bash
# Check available models
ollama list

# Test model
ollama run llama3.2:latest "What is EBITDA?"
```

## 📁 Project Structure

```
portfolio-kpi-copilot/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API endpoints
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard pages
│   │   └── real-data/         # Data management
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── data/             # Data components
│   │   └── auth/             # Auth components
│   ├── lib/                   # Utilities & configurations
│   │   ├── auth.ts           # NextAuth config
│   │   ├── langchainClient.ts # AI integration
│   │   └── prisma.ts         # Database client
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript definitions
├── prisma/                    # Database schema
├── scripts/                   # Utility scripts
└── public/                    # Static assets
```

## 🎯 Key Features

### AI-Powered KPI Analysis
- **Local Processing**: All AI runs locally via Ollama
- **Contextual Responses**: Industry-specific KPI explanations
- **Structured Output**: Consistent, actionable insights
- **Real-time Analysis**: Instant responses to KPI queries

### Dashboard Capabilities
- **Multi-Organization Support**: Switch between companies
- **Real-time Data**: Live KPI tracking and updates
- **Interactive Charts**: Responsive data visualizations
- **Export Functionality**: Download reports and data

### Security & Performance
- **Authentication**: Secure user management
- **Data Privacy**: Local AI processing
- **Optimized Performance**: Fast loading and responses
- **Scalable Architecture**: Ready for production deployment

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:push         # Push schema changes
npm run db:seed         # Seed sample data
npm run db:studio       # Open Prisma Studio

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript checking
```

### Database Management

```bash
# Reset database
npx prisma db push --force-reset

# Generate Prisma client
npx prisma generate

# View data
npx prisma studio
```

## 🚀 Production Deployment

### Build Optimization

```bash
# Production build
npm run build

# Test production build locally
npm run start
```

### Environment Setup

For production, update environment variables:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="production-secret-key"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include environment details and error logs

## 🔄 Updates

Stay updated with the latest features:
- Follow the repository for updates
- Check release notes for new features
- Update Ollama models regularly for improved AI performance
# Portfolio-KPI-copilot
