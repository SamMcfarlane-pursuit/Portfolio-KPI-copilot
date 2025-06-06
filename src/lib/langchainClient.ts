// src/lib/langchainClient.ts
import { Ollama } from "@langchain/community/llms/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { BaseOutputParser } from "@langchain/core/output_parsers";

// Custom output parser for KPI explanations
class KPIExplanationParser extends BaseOutputParser<{
  explanation: string;
  keyPoints: string[];
  formula?: string;
  sources: string[];
  followUpQuestions: string[];
}> {
  lc_namespace = ["custom", "parsers"];
  async parse(text: string) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(text);
      return parsed;
    } catch {
      // Fallback to text parsing - extract key information
      const lines = text.split('\n').filter(line => line.trim());
      const keyPoints = lines.filter(line =>
        line.includes('•') || line.includes('-') || line.includes('*')
      ).map(line => line.replace(/[•\-*]\s*/, '').trim());

      return {
        explanation: text,
        keyPoints: keyPoints.slice(0, 5), // Limit to 5 key points
        sources: ["Financial analysis best practices", "Portfolio management standards"],
        followUpQuestions: [
          "How does this KPI relate to other financial metrics?",
          "What are industry benchmarks for this KPI?"
        ]
      };
    }
  }

  getFormatInstructions(): string {
    return `Please provide a clear explanation with:
1. Definition and importance
2. Key points (use bullet points with • or -)
3. Calculation method if applicable
4. Industry context and benchmarks
5. Actionable insights`;
  }
}

// Initialize Ollama client
const initializeOllamaClient = () => {
  return new Ollama({
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.LLAMA_MODEL || "llama3.2:latest",
    temperature: parseFloat(process.env.LLAMA_TEMPERATURE || "0.1"),
  });
};

// Role-based prompt templates
const createRoleBasedPrompt = (userRole: string) => {
  const rolePrompts = {
    "executive": `You are explaining KPIs to a senior executive. Focus on:
- High-level strategic implications
- Business impact and decision-making relevance
- Concise, actionable insights
- Avoid technical jargon`,

    "portfolio_manager": `You are explaining KPIs to a portfolio manager. Focus on:
- Investment performance implications
- Comparative analysis context
- Risk and return considerations
- Operational insights`,

    "analyst": `You are explaining KPIs to a financial analyst. Include:
- Detailed calculation methodologies
- Technical nuances and assumptions
- Industry benchmarking context
- Data quality considerations`,

    "operations": `You are explaining KPIs to an operations team member. Focus on:
- Operational drivers and levers
- Process improvement opportunities
- Data collection and reporting aspects
- Practical implementation details`
  };

  return rolePrompts[userRole as keyof typeof rolePrompts] || rolePrompts.analyst;
};

// Main KPI explanation prompt template
const createKPIPromptTemplate = () => {
  return new PromptTemplate({
    template: `
You are a senior financial advisor specializing in private equity and portfolio management KPIs.

Context:
- User Role: {userRole}
- KPI Question: {question}
- Portfolio Context: {portfolioContext}
- Time Period: {timePeriod}

Role-Specific Instructions:
{roleInstructions}

Please provide a comprehensive explanation that includes:
1. Clear definition of the KPI
2. Why it matters for portfolio management
3. How it's calculated (if applicable)
4. Industry context and benchmarks
5. Key insights for decision-making

{formatInstructions}

Remember to:
- Use appropriate technical depth for the user role
- Include relevant examples from private equity/portfolio management
- Suggest actionable next steps
- Cite authoritative sources when possible
`,
    inputVariables: [
      "userRole",
      "question", 
      "portfolioContext",
      "timePeriod",
      "roleInstructions",
      "formatInstructions"
    ]
  });
};

// LangChain orchestrator class
export class KPIExplanationChain {
  private llm: Ollama;
  private promptTemplate: PromptTemplate;
  private outputParser: KPIExplanationParser;
  private chain: LLMChain;

  constructor() {
    this.llm = initializeOllamaClient();
    this.promptTemplate = createKPIPromptTemplate();
    this.outputParser = new KPIExplanationParser();

    this.chain = new LLMChain({
      llm: this.llm,
      prompt: this.promptTemplate
    });
  }

  async explainKPI(input: {
    question: string;
    userRole: string;
    portfolioContext?: string;
    timePeriod?: string;
  }) {
    try {
      const roleInstructions = createRoleBasedPrompt(input.userRole);
      const formatInstructions = this.outputParser.getFormatInstructions();

      const result = await this.chain.call({
        question: input.question,
        userRole: input.userRole,
        portfolioContext: input.portfolioContext || "General portfolio management",
        timePeriod: input.timePeriod || "Current period",
        roleInstructions,
        formatInstructions
      });

      // Parse the output using our custom parser
      const parsedResult = await this.outputParser.parse(result.text);

      return {
        success: true,
        data: parsedResult,
        metadata: {
          model: "llama3.2:latest",
          userRole: input.userRole,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("KPI Explanation Chain Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: this.generateFallbackResponse(input.question)
      };
    }
  }

  private generateFallbackResponse(question: string) {
    return {
      explanation: `I apologize, but I'm currently unable to provide a detailed explanation for "${question}". This could be due to a temporary service issue.`,
      keyPoints: [
        "Please try again in a moment",
        "Check your internet connection",
        "Contact support if the issue persists"
      ],
      sources: [],
      followUpQuestions: [
        "Would you like to try a different KPI question?",
        "Do you need help with basic financial metrics?"
      ]
    };
  }
}

// Utility functions for context enhancement
export const extractKPIContext = async (portfolioData: any) => {
  // Extract relevant context from portfolio data
  const context = {
    totalCompanies: portfolioData?.companies?.length || 0,
    sectors: portfolioData?.companies?.map((c: any) => c.sector) || [],
    totalAUM: portfolioData?.totalAUM || 0,
    performanceMetrics: portfolioData?.performanceMetrics || {}
  };

  return `Portfolio includes ${context.totalCompanies} companies across sectors: ${context.sectors.join(", ")}. Total AUM: $${context.totalAUM}B.`;
};

export const suggestFollowUpQuestions = (originalQuestion: string, userRole: string) => {
  const suggestions = {
    "EBITDA": [
      "How does EBITDA compare to EBIT?",
      "What are typical EBITDA margins by sector?",
      "How do you adjust EBITDA for one-time items?"
    ],
    "IRR": [
      "What's the difference between gross and net IRR?",
      "How do you calculate IRR for ongoing investments?",
      "What are benchmark IRR targets by vintage year?"
    ],
    "MOIC": [
      "How does MOIC relate to IRR?",
      "What's a good MOIC for different hold periods?",
      "How do you calculate unrealized MOIC?"
    ]
  };

  // Simple keyword matching for suggestions
  for (const [kpi, questions] of Object.entries(suggestions)) {
    if (originalQuestion.toLowerCase().includes(kpi.toLowerCase())) {
      return questions;
    }
  }

  return [
    "What other KPIs should I track for this portfolio?",
    "How do these metrics compare to industry benchmarks?",
    "What are the key drivers of this KPI?"
  ];
};

// Export singleton instance
export const kpiExplanationChain = new KPIExplanationChain();
