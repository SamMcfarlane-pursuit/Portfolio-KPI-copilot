-- Portfolio KPI Copilot Database Schema
-- Run this in Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    website TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES public.organizations(id),
    user_id UUID REFERENCES auth.users(id),
    industry TEXT,
    stage TEXT CHECK (stage IN ('seed', 'series_a', 'series_b', 'series_c', 'growth', 'mature')),
    investment_amount DECIMAL(15,2),
    investment_date DATE,
    valuation DECIMAL(15,2),
    ownership_percentage DECIMAL(5,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exited', 'written_off', 'monitoring')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create KPIs table
CREATE TABLE IF NOT EXISTS public.kpis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('financial', 'operational', 'growth', 'efficiency', 'risk')),
    value DECIMAL(15,4),
    unit TEXT, -- e.g., 'USD', '%', 'count', 'ratio'
    target_value DECIMAL(15,4),
    period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    period_date DATE NOT NULL,
    description TEXT,
    calculation_method TEXT,
    data_source TEXT,
    confidence_level INTEGER DEFAULT 100 CHECK (confidence_level BETWEEN 0 AND 100),
    is_benchmark BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create KPI history table for tracking changes
CREATE TABLE IF NOT EXISTS public.kpi_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kpi_id UUID REFERENCES public.kpis(id) ON DELETE CASCADE,
    old_value DECIMAL(15,4),
    new_value DECIMAL(15,4),
    changed_by UUID REFERENCES auth.users(id),
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create companies table (portfolio companies)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    legal_name TEXT,
    website TEXT,
    industry TEXT,
    sub_industry TEXT,
    founded_date DATE,
    headquarters TEXT,
    employee_count INTEGER,
    business_model TEXT,
    revenue_model TEXT,
    description TEXT,
    logo_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acquired', 'closed', 'ipo')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table for RAG functionality
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    document_type TEXT CHECK (document_type IN ('report', 'presentation', 'financial', 'legal', 'memo', 'other')),
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    embedding VECTOR(1536), -- For Pinecone/pgvector integration
    metadata JSONB DEFAULT '{}',
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolios_organization_id ON public.portfolios(organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_kpis_portfolio_id ON public.kpis(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_kpis_period_date ON public.kpis(period_date);
CREATE INDEX IF NOT EXISTS idx_kpis_category ON public.kpis(category);
CREATE INDEX IF NOT EXISTS idx_companies_portfolio_id ON public.companies(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_documents_portfolio_id ON public.documents(portfolio_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Portfolios: Users can only see portfolios they own or are part of their organization
CREATE POLICY "Users can view own portfolios" ON public.portfolios
    FOR SELECT USING (
        auth.uid() = user_id OR 
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create portfolios" ON public.portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON public.portfolios
    FOR UPDATE USING (auth.uid() = user_id);

-- KPIs: Users can only see KPIs for portfolios they have access to
CREATE POLICY "Users can view accessible KPIs" ON public.kpis
    FOR SELECT USING (
        portfolio_id IN (
            SELECT id FROM public.portfolios 
            WHERE user_id = auth.uid() OR 
            organization_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.portfolios
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.kpis
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample data
INSERT INTO public.organizations (name, description, industry) VALUES
('Sample Venture Capital', 'A leading VC firm focused on early-stage startups', 'Venture Capital'),
('Growth Partners', 'Private equity firm specializing in growth investments', 'Private Equity');

-- Sample portfolios (you can customize these)
INSERT INTO public.portfolios (name, description, industry, stage, investment_amount, valuation, ownership_percentage) VALUES
('TechStart Inc', 'AI-powered SaaS platform for small businesses', 'Technology', 'series_a', 2000000, 10000000, 20.0),
('GreenEnergy Co', 'Renewable energy solutions provider', 'Energy', 'series_b', 5000000, 25000000, 15.0),
('HealthTech Solutions', 'Digital health platform for remote patient monitoring', 'Healthcare', 'seed', 500000, 3000000, 25.0);
