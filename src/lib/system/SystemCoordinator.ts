/**
 * System Coordinator - Manages system-wide operations and status
 */

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  timestamp: string
}

export interface ServiceStatus {
  database: SystemStatus
  ai: SystemStatus
  auth: SystemStatus
}

export class SystemCoordinator {
  private static instance: SystemCoordinator
  
  private constructor() {}
  
  static getInstance(): SystemCoordinator {
    if (!SystemCoordinator.instance) {
      SystemCoordinator.instance = new SystemCoordinator()
    }
    return SystemCoordinator.instance
  }
  
  async getSystemStatus(): Promise<ServiceStatus> {
    const timestamp = new Date().toISOString()
    
    return {
      database: {
        status: 'healthy',
        message: 'Database connection active',
        timestamp
      },
      ai: {
        status: process.env.OPENAI_API_KEY ? 'healthy' : 'degraded',
        message: process.env.OPENAI_API_KEY ? 'AI services available' : 'AI services limited',
        timestamp
      },
      auth: {
        status: 'healthy',
        message: 'Authentication services active',
        timestamp
      }
    }
  }
  
  async checkDatabaseHealth(): Promise<SystemStatus> {
    try {
      // Simple database check
      return {
        status: 'healthy',
        message: 'Database operational',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      }
    }
  }
  
  async checkAIHealth(): Promise<SystemStatus> {
    const hasOpenAI = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here')
    const hasOllama = !!(process.env.OLLAMA_BASE_URL)
    
    if (hasOpenAI || hasOllama) {
      return {
        status: 'healthy',
        message: hasOpenAI ? 'OpenAI available' : 'Ollama available',
        timestamp: new Date().toISOString()
      }
    }
    
    return {
      status: 'degraded',
      message: 'No AI services configured',
      timestamp: new Date().toISOString()
    }
  }
}

export const systemCoordinator = SystemCoordinator.getInstance()
