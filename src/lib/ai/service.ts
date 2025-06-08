import { generateWithLlama } from './llama'
import { generateWithOpenAI } from './openai'

export async function generateKPIExplanation(question: string): Promise<string> {
  try {
    // Try Llama first (prioritized for KPI analysis)
    if (process.env.OLLAMA_BASE_URL && process.env.USE_OLLAMA_PRIMARY === 'true') {
      try {
        const response = await generateWithLlama(question)
        return response
      } catch (llamaError) {
        console.log('Llama unavailable, checking OpenAI fallback')
      }
    }

    // Use OpenAI only if not disabled and available
    if (process.env.OPENAI_API_KEY && process.env.DISABLE_OPENAI !== 'true') {
      const response = await generateWithOpenAI(question)
      return response
    }

    // If OpenAI is disabled, provide a fallback response
    if (process.env.DISABLE_OPENAI === 'true') {
      return `KPI Analysis: ${question}

This is a placeholder response as AI services are currently being configured.
The system is set up to use local Llama AI for enhanced privacy and performance.

Key Points:
• KPI analysis functionality is available
• Local AI processing ensures data privacy
• Real-time insights and recommendations
• Integration with portfolio data

Please ensure Ollama is running locally for full AI capabilities.`
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
