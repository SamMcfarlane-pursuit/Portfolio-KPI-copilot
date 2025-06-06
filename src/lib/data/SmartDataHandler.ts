/**
 * Smart Data Handler - Manages real and mock data seamlessly
 * Provides intelligent fallbacks and data validation
 */

import { prisma } from '@/lib/prisma'
import { realPortfolioCompanies } from './real-market-data'

export interface CompanyInput {
  name: string
  sector: string
  geography: string
  description?: string
  investment: number
  ownership?: number
  valuation?: number
  employees?: number
  founded?: number
  stage?: string
  website?: string
  ceo?: string
  organizationId: string
  status?: string
}

export interface KPIInput {
  name: string
  category: string
  value: number
  unit?: string
  period: Date
  periodType?: string
  source?: string
  confidence?: number
  notes?: string
  portfolioId?: string
  organizationId: string
}

export interface DataValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

class SmartDataHandler {
  private static instance: SmartDataHandler

  private constructor() {}

  public static getInstance(): SmartDataHandler {
    if (!SmartDataHandler.instance) {
      SmartDataHandler.instance = new SmartDataHandler()
    }
    return SmartDataHandler.instance
  }

  // Company Data Handling
  public async createCompany(input: CompanyInput): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Validate input
      const validation = this.validateCompanyInput(input)
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') }
      }

      // Check if organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: input.organizationId }
      })

      if (!organization) {
        return { success: false, error: 'Organization not found' }
      }

      // Get or create fund for the organization
      let fund = await prisma.fund.findFirst({
        where: { organizationId: input.organizationId, status: 'ACTIVE' }
      })

      if (!fund) {
        fund = await prisma.fund.create({
          data: {
            name: `${organization.name} Fund I`,
            strategy: 'Growth Equity',
            status: 'ACTIVE',
            currency: 'USD',
            organizationId: input.organizationId
          }
        })
      }

      // Create portfolio company
      const portfolio = await prisma.portfolio.create({
        data: {
          name: input.name,
          sector: input.sector,
          geography: input.geography,
          status: input.status || 'ACTIVE',
          investment: input.investment,
          ownership: input.ownership || 0,
          fundId: fund.id
        },
        include: {
          fund: {
            include: {
              organization: true
            }
          }
        }
      })

      // Create initial KPIs
      await this.createInitialKPIs(portfolio.id, input, fund.id, input.organizationId)

      // Enrich with mock data if needed
      if (this.shouldEnrichWithMockData(input)) {
        await this.enrichWithMockData(portfolio.id, input)
      }

      return { success: true, data: portfolio }

    } catch (error) {
      console.error('Failed to create company:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  public async createKPI(input: KPIInput): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Validate input
      const validation = this.validateKPIInput(input)
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') }
      }

      // Create KPI
      const kpi = await prisma.kPI.create({
        data: {
          name: input.name,
          category: input.category,
          value: input.value,
          unit: input.unit || 'USD',
          period: input.period,
          periodType: input.periodType || 'quarterly',
          source: input.source || 'Manual Entry',
          confidence: input.confidence || 1.0,
          notes: input.notes,
          portfolioId: input.portfolioId,
          organizationId: input.organizationId
        }
      })

      return { success: true, data: kpi }

    } catch (error) {
      console.error('Failed to create KPI:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  // Data Validation
  private validateCompanyInput(input: CompanyInput): DataValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Required fields
    if (!input.name?.trim()) errors.push('Company name is required')
    if (!input.sector?.trim()) errors.push('Sector is required')
    if (!input.organizationId?.trim()) errors.push('Organization ID is required')
    if (!input.investment || input.investment <= 0) errors.push('Investment amount must be greater than 0')

    // Data quality checks
    if (input.ownership && (input.ownership < 0 || input.ownership > 1)) {
      warnings.push('Ownership should be between 0 and 1 (as decimal)')
    }

    if (input.founded && (input.founded < 1800 || input.founded > new Date().getFullYear())) {
      warnings.push('Founded year seems unusual')
    }

    if (input.employees && input.employees < 0) {
      warnings.push('Employee count cannot be negative')
    }

    // Suggestions
    if (!input.description) {
      suggestions.push('Adding a description helps with AI analysis')
    }

    if (!input.website) {
      suggestions.push('Website URL helps with data enrichment')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  private validateKPIInput(input: KPIInput): DataValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Required fields
    if (!input.name?.trim()) errors.push('KPI name is required')
    if (!input.category?.trim()) errors.push('Category is required')
    if (input.value === undefined || input.value === null) errors.push('Value is required')
    if (!input.organizationId?.trim()) errors.push('Organization ID is required')

    // Data quality checks
    if (input.confidence && (input.confidence < 0 || input.confidence > 1)) {
      warnings.push('Confidence should be between 0 and 1')
    }

    if (input.period && input.period > new Date()) {
      warnings.push('Period date is in the future')
    }

    // Suggestions
    if (!input.notes) {
      suggestions.push('Adding notes helps with context and AI analysis')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  // Mock Data Integration
  private shouldEnrichWithMockData(input: CompanyInput): boolean {
    // Enrich if we have minimal data or if it's a test/demo scenario
    return !input.description || !input.valuation || input.name.toLowerCase().includes('test')
  }

  private async enrichWithMockData(portfolioId: string, input: CompanyInput): Promise<void> {
    try {
      // Find similar real market data
      const similarCompany = realPortfolioCompanies.find(
        company => company.sector === input.sector || 
        company.name.toLowerCase().includes(input.name.toLowerCase().split(' ')[0])
      ) || realPortfolioCompanies[0] // Fallback to first company

      if (similarCompany?.realData) {
        // Create realistic KPIs based on similar company
        const mockKPIs = [
          {
            name: 'Quarterly Revenue',
            category: 'revenue',
            value: input.investment * 4, // 4x revenue multiple
            unit: 'USD',
            period: new Date(),
            periodType: 'quarterly',
            source: 'Estimated',
            confidence: 0.7,
            notes: 'Estimated based on investment size and industry benchmarks'
          },
          {
            name: 'Employee Count',
            category: 'operations',
            value: Math.floor(input.investment / 200000), // $200k per employee estimate
            unit: 'count',
            period: new Date(),
            periodType: 'point_in_time',
            source: 'Estimated',
            confidence: 0.6,
            notes: 'Estimated based on investment and industry standards'
          },
          {
            name: 'Growth Rate',
            category: 'growth',
            value: Math.random() * 50 + 20, // 20-70% growth
            unit: '%',
            period: new Date(),
            periodType: 'annual',
            source: 'Estimated',
            confidence: 0.5,
            notes: 'Estimated growth rate for similar stage companies'
          }
        ]

        await prisma.kPI.createMany({
          data: mockKPIs.map(kpi => ({
            ...kpi,
            portfolioId,
            organizationId: input.organizationId
          }))
        })
      }
    } catch (error) {
      console.error('Failed to enrich with mock data:', error)
      // Don't throw - this is optional enrichment
    }
  }

  private async createInitialKPIs(
    portfolioId: string, 
    input: CompanyInput, 
    fundId: string, 
    organizationId: string
  ): Promise<void> {
    const initialKPIs = [
      {
        name: 'Initial Investment',
        category: 'financial',
        value: input.investment,
        unit: 'USD',
        period: new Date(),
        periodType: 'point_in_time',
        source: 'Investment Record',
        confidence: 1.0,
        notes: 'Initial investment amount',
        portfolioId,
        fundId,
        organizationId
      }
    ]

    if (input.ownership) {
      initialKPIs.push({
        name: 'Ownership Percentage',
        category: 'financial',
        value: input.ownership * 100,
        unit: '%',
        period: new Date(),
        periodType: 'point_in_time',
        source: 'Investment Record',
        confidence: 1.0,
        notes: 'Ownership percentage at investment',
        portfolioId,
        fundId,
        organizationId
      })
    }

    if (input.valuation) {
      initialKPIs.push({
        name: 'Company Valuation',
        category: 'financial',
        value: input.valuation,
        unit: 'USD',
        period: new Date(),
        periodType: 'point_in_time',
        source: 'Investment Record',
        confidence: 1.0,
        notes: 'Company valuation at investment',
        portfolioId,
        fundId,
        organizationId
      })
    }

    await prisma.kPI.createMany({
      data: initialKPIs
    })
  }

  // Data Retrieval with Smart Fallbacks
  public async getCompanyData(organizationId: string): Promise<any[]> {
    try {
      const portfolios = await prisma.portfolio.findMany({
        where: {
          fund: {
            organizationId
          }
        },
        include: {
          fund: {
            include: {
              organization: true
            }
          },
          kpis: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 5
          }
        }
      })

      return portfolios
    } catch (error) {
      console.error('Failed to get company data:', error)
      return []
    }
  }
}

export const smartDataHandler = SmartDataHandler.getInstance()
export default smartDataHandler
