// const pdfParse = require('pdf-parse') // Temporarily disabled

export interface ProcessedDocument {
  extractedText: string
  metadata: {
    pageCount?: number
    wordCount: number
    characterCount: number
    language?: string
    fileType: string
    processingTime: number
  }
  kpiSuggestions: KPISuggestion[]
  structuredData?: any
}

export interface KPISuggestion {
  name: string
  category: 'financial' | 'operational' | 'growth' | 'efficiency' | 'risk'
  value?: number
  unit: string
  confidence: number
  source: string
  context: string
  period?: string
}

export class DocumentProcessor {
  private static readonly KPI_PATTERNS = [
    {
      pattern: /(?:revenue|sales|income).*?(\$?[\d,]+\.?\d*(?:\s*(?:million|billion|k|m|b))?)/gi,
      category: 'financial' as const,
      name: 'Revenue',
      unit: 'USD'
    },
    {
      pattern: /(?:profit|earnings|ebitda).*?(\$?[\d,]+\.?\d*(?:\s*(?:million|billion|k|m|b))?)/gi,
      category: 'financial' as const,
      name: 'Profit',
      unit: 'USD'
    },
    {
      pattern: /(?:growth|increase).*?(\d+\.?\d*%?)/gi,
      category: 'growth' as const,
      name: 'Growth Rate',
      unit: 'percentage'
    },
    {
      pattern: /(?:margin|profit margin).*?(\d+\.?\d*%?)/gi,
      category: 'financial' as const,
      name: 'Profit Margin',
      unit: 'percentage'
    },
    {
      pattern: /(?:customers?|clients?).*?(\d+(?:,\d{3})*)/gi,
      category: 'operational' as const,
      name: 'Customer Count',
      unit: 'count'
    },
    {
      pattern: /(?:users?|subscribers?).*?(\d+(?:,\d{3})*)/gi,
      category: 'operational' as const,
      name: 'User Count',
      unit: 'count'
    },
    {
      pattern: /(?:retention|retention rate).*?(\d+\.?\d*%?)/gi,
      category: 'operational' as const,
      name: 'Retention Rate',
      unit: 'percentage'
    },
    {
      pattern: /(?:churn|churn rate|attrition).*?(\d+\.?\d*%?)/gi,
      category: 'risk' as const,
      name: 'Churn Rate',
      unit: 'percentage'
    },
    {
      pattern: /(?:market share).*?(\d+\.?\d*%?)/gi,
      category: 'operational' as const,
      name: 'Market Share',
      unit: 'percentage'
    },
    {
      pattern: /(?:conversion rate).*?(\d+\.?\d*%?)/gi,
      category: 'efficiency' as const,
      name: 'Conversion Rate',
      unit: 'percentage'
    }
  ]

  static async processDocument(file: Buffer, fileType: string, fileName: string): Promise<ProcessedDocument> {
    const startTime = Date.now()
    let extractedText = ''
    let structuredData: any = {}

    try {
      switch (fileType) {
        case 'application/pdf':
          // PDF processing temporarily disabled
          extractedText = 'PDF file detected - processing not available yet'
          structuredData = { fileType: 'pdf', requiresSpecialProcessing: true }
          break

        case 'text/plain':
          extractedText = file.toString('utf-8')
          break

        case 'application/json':
          extractedText = file.toString('utf-8')
          try {
            structuredData = JSON.parse(extractedText)
          } catch {
            structuredData = { parseError: 'Invalid JSON format' }
          }
          break

        case 'text/csv':
          const csvResult = this.processCSV(file.toString('utf-8'))
          extractedText = csvResult.text
          structuredData = csvResult.data
          break

        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          // For Excel files, we'll treat them as binary for now
          extractedText = 'Excel file detected - binary content'
          structuredData = { fileType: 'excel', requiresSpecialProcessing: true }
          break

        default:
          extractedText = file.toString('utf-8')
          break
      }

      const processingTime = Date.now() - startTime
      const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length
      const characterCount = extractedText.length

      const kpiSuggestions = this.extractKPISuggestions(extractedText, structuredData)

      return {
        extractedText,
        metadata: {
          pageCount: structuredData.numpages,
          wordCount,
          characterCount,
          fileType,
          processingTime
        },
        kpiSuggestions,
        structuredData
      }

    } catch (error) {
      console.error('Document processing error:', error)
      return {
        extractedText: '',
        metadata: {
          wordCount: 0,
          characterCount: 0,
          fileType,
          processingTime: Date.now() - startTime
        },
        kpiSuggestions: [],
        structuredData: { error: error instanceof Error ? error.message : 'Processing failed' }
      }
    }
  }

  private static async processPDF(buffer: Buffer): Promise<{ text: string; metadata: any }> {
    // PDF processing temporarily disabled
    return {
      text: 'PDF processing not available',
      metadata: { error: 'PDF processing temporarily disabled' }
    }
  }

  private static processCSV(csvText: string): { text: string; data: any } {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      return { text: '', data: { error: 'Empty CSV file' } }
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const dataRows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    )

    // Extract numeric data for potential KPIs
    const numericColumns: { [key: string]: number[] } = {}
    headers.forEach((header, index) => {
      const values = dataRows
        .map(row => row[index])
        .map(val => parseFloat(val))
        .filter(val => !isNaN(val))
      
      if (values.length > 0) {
        numericColumns[header] = values
      }
    })

    return {
      text: csvText,
      data: {
        headers,
        rowCount: dataRows.length,
        columnCount: headers.length,
        numericColumns,
        sampleData: dataRows.slice(0, 5) // First 5 rows as sample
      }
    }
  }

  private static extractKPISuggestions(text: string, structuredData: any): KPISuggestion[] {
    const suggestions: KPISuggestion[] = []

    // Extract from text patterns
    for (const { pattern, category, name, unit } of this.KPI_PATTERNS) {
      const matches = Array.from(text.matchAll(pattern))
      
      for (const match of matches.slice(0, 3)) { // Limit to 3 matches per pattern
        const valueStr = match[1]
        const numericValue = this.parseNumericValue(valueStr)
        
        if (numericValue !== null) {
          suggestions.push({
            name,
            category,
            value: numericValue,
            unit,
            confidence: 0.7,
            source: 'text_pattern',
            context: match[0].slice(0, 100),
            period: this.extractPeriod(match[0])
          })
        }
      }
    }

    // Extract from CSV headers and data
    if (structuredData.headers && structuredData.numericColumns) {
      for (const header of structuredData.headers) {
        const lowerHeader = header.toLowerCase()
        const numericData = structuredData.numericColumns[header]
        
        if (numericData && numericData.length > 0) {
          const avgValue = numericData.reduce((a: number, b: number) => a + b, 0) / numericData.length
          
          let category: KPISuggestion['category'] = 'operational'
          let unit = 'count'
          
          if (lowerHeader.includes('revenue') || lowerHeader.includes('sales') || lowerHeader.includes('income')) {
            category = 'financial'
            unit = 'USD'
          } else if (lowerHeader.includes('profit') || lowerHeader.includes('margin')) {
            category = 'financial'
            unit = lowerHeader.includes('%') ? 'percentage' : 'USD'
          } else if (lowerHeader.includes('growth') || lowerHeader.includes('rate')) {
            category = 'growth'
            unit = 'percentage'
          } else if (lowerHeader.includes('customer') || lowerHeader.includes('user')) {
            category = 'operational'
            unit = 'count'
          }

          suggestions.push({
            name: header,
            category,
            value: Math.round(avgValue * 100) / 100,
            unit,
            confidence: 0.9,
            source: 'csv_data',
            context: `Column: ${header}, Average: ${avgValue.toFixed(2)}`
          })
        }
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.name === suggestion.name && s.category === suggestion.category)
    )

    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10) // Limit to top 10 suggestions
  }

  private static parseNumericValue(valueStr: string): number | null {
    // Remove currency symbols and clean up
    let cleaned = valueStr.replace(/[$,]/g, '').trim()
    
    // Handle percentage
    if (cleaned.includes('%')) {
      const num = parseFloat(cleaned.replace('%', ''))
      return isNaN(num) ? null : num
    }
    
    // Handle multipliers (million, billion, etc.)
    const multipliers: { [key: string]: number } = {
      'k': 1000,
      'm': 1000000,
      'million': 1000000,
      'b': 1000000000,
      'billion': 1000000000
    }
    
    for (const [suffix, multiplier] of Object.entries(multipliers)) {
      if (cleaned.toLowerCase().includes(suffix)) {
        const num = parseFloat(cleaned.toLowerCase().replace(suffix, '').trim())
        return isNaN(num) ? null : num * multiplier
      }
    }
    
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  private static extractPeriod(context: string): string | undefined {
    const periodPatterns = [
      /(?:q[1-4]|quarter [1-4])/gi,
      /(?:fy|fiscal year) ?\d{2,4}/gi,
      /(?:20\d{2})/g,
      /(?:january|february|march|april|may|june|july|august|september|october|november|december)/gi,
      /(?:monthly|quarterly|annually|yearly)/gi
    ]

    for (const pattern of periodPatterns) {
      const match = context.match(pattern)
      if (match) {
        return match[0]
      }
    }

    return undefined
  }
}
