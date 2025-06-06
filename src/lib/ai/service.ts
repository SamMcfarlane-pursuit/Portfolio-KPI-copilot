import { generateWithLlama } from './llama'
import { generateWithOpenAI } from './openai'

export async function generateKPIExplanation(question: string): Promise<string> {
  try {
    // Try Llama first (for local development)
    if (process.env.OLLAMA_BASE_URL && process.env.NODE_ENV === 'development') {
      try {
        const response = await generateWithLlama(question)
        return response
      } catch (llamaError) {
        console.log('Llama unavailable, falling back to OpenAI')
      }
    }

    // Use OpenAI (for production or when Llama fails)
    if (process.env.OPENAI_API_KEY) {
      const response = await generateWithOpenAI(question)
      return response
    }

    throw new Error('No AI service configured')
  } catch (error) {
    console.error('AI generation failed:', error)
    throw new Error('AI service temporarily unavailable')
  }
}

export async function generatePortfolioInsights(portfolioData: any): Promise<string> {
  const prompt = `Analyze this portfolio data and provide key insights:
  
Portfolio Summary:
- Total Value: ${portfolioData.totalValue || 'N/A'}
- Number of Holdings: ${portfolioData.holdings?.length || 0}
- Performance: ${portfolioData.performance || 'N/A'}

Please provide:
1. Overall portfolio health assessment
2. Key performance indicators
3. Risk analysis
4. Recommendations for optimization

Keep the analysis concise but actionable.`

  return generateKPIExplanation(prompt)
}

export async function generateKPIRecommendations(kpiType: string, currentValue?: number): Promise<string> {
  const prompt = `Provide detailed analysis and recommendations for the KPI: ${kpiType}
  
${currentValue ? `Current Value: ${currentValue}` : ''}

Please include:
1. What this KPI measures
2. Industry benchmarks
3. Factors that influence this metric
4. Actionable improvement strategies
5. Warning signs to watch for

Focus on practical, implementable advice.`

  return generateKPIExplanation(prompt)
}
