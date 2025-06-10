/**
 * Feature Flags for Incremental Deployment
 * Controls which features are enabled in different environments
 */

export interface FeatureFlags {
  // Core Features (Always Enabled)
  enablePortfolioManagement: boolean
  enableKPITracking: boolean
  enableBasicAuth: boolean
  enableDashboard: boolean

  // Enhanced AI Features (Phase 1)
  enableAIInsights: boolean
  enableBasicAIExplanations: boolean
  enableOpenRouterIntegration: boolean

  // Advanced AI Features (Phase 2)
  enableNaturalLanguageQueries: boolean
  enableAdvancedAIOrchestrator: boolean
  enableStreamingResponses: boolean
  enableAIAnalytics: boolean

  // Financial Data Integration (Phase 3)
  enableFinancialDataAPI: boolean
  enableMarketDataIntegration: boolean
  enableEconomicIndicators: boolean
  enableIndustryBenchmarks: boolean

  // Database Features (Phase 4)
  enableSupabaseMigration: boolean
  enableRealtimeUpdates: boolean
  enableVectorSearch: boolean
  enableAdvancedQueries: boolean

  // Enterprise Features (Phase 5)
  enableRBAC: boolean
  enableAuditLogging: boolean
  enableAdvancedSecurity: boolean
  enablePerformanceMonitoring: boolean

  // Experimental Features (Phase 6)
  enableDocumentUpload: boolean
  enablePredictiveAnalytics: boolean
  enableCustomDashboards: boolean
  enableWebhooks: boolean
}

class FeatureFlagManager {
  private static instance: FeatureFlagManager
  private flags: FeatureFlags

  private constructor() {
    this.flags = this.initializeFlags()
  }

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager()
    }
    return FeatureFlagManager.instance
  }

  private initializeFlags(): FeatureFlags {
    const env = process.env.NODE_ENV
    const deploymentPhase = parseInt(process.env.DEPLOYMENT_PHASE || '1')

    // Base configuration - always enabled core features
    const baseFlags: FeatureFlags = {
      // Core Features (Always Enabled)
      enablePortfolioManagement: true,
      enableKPITracking: true,
      enableBasicAuth: true,
      enableDashboard: true,

      // Enhanced AI Features (Phase 1)
      enableAIInsights: deploymentPhase >= 1,
      enableBasicAIExplanations: deploymentPhase >= 1,
      enableOpenRouterIntegration: deploymentPhase >= 1,

      // Advanced AI Features (Phase 2)
      enableNaturalLanguageQueries: deploymentPhase >= 2,
      enableAdvancedAIOrchestrator: deploymentPhase >= 2,
      enableStreamingResponses: deploymentPhase >= 2,
      enableAIAnalytics: deploymentPhase >= 2,

      // Financial Data Integration (Phase 3)
      enableFinancialDataAPI: deploymentPhase >= 3,
      enableMarketDataIntegration: deploymentPhase >= 3,
      enableEconomicIndicators: deploymentPhase >= 3,
      enableIndustryBenchmarks: deploymentPhase >= 3,

      // Database Features (Phase 4)
      enableSupabaseMigration: deploymentPhase >= 4,
      enableRealtimeUpdates: deploymentPhase >= 4,
      enableVectorSearch: deploymentPhase >= 4,
      enableAdvancedQueries: deploymentPhase >= 4,

      // Enterprise Features (Phase 5)
      enableRBAC: deploymentPhase >= 5,
      enableAuditLogging: deploymentPhase >= 5,
      enableAdvancedSecurity: deploymentPhase >= 5,
      enablePerformanceMonitoring: deploymentPhase >= 5,

      // Experimental Features (Phase 6)
      enableDocumentUpload: deploymentPhase >= 6,
      enablePredictiveAnalytics: deploymentPhase >= 6,
      enableCustomDashboards: deploymentPhase >= 6,
      enableWebhooks: deploymentPhase >= 6
    }

    // Environment-specific overrides
    if (env === 'development') {
      // Enable all features in development
      Object.keys(baseFlags).forEach(key => {
        baseFlags[key as keyof FeatureFlags] = true
      })
    }

    // Individual feature overrides from environment variables
    return {
      ...baseFlags,
      enableAIInsights: this.getEnvFlag('ENABLE_AI_INSIGHTS', baseFlags.enableAIInsights),
      enableNaturalLanguageQueries: this.getEnvFlag('ENABLE_NATURAL_LANGUAGE_QUERIES', baseFlags.enableNaturalLanguageQueries),
      enableFinancialDataAPI: this.getEnvFlag('ENABLE_FINANCIAL_DATA_API', baseFlags.enableFinancialDataAPI),
      enableSupabaseMigration: this.getEnvFlag('ENABLE_SUPABASE_MIGRATION', baseFlags.enableSupabaseMigration),
      enableRealtimeUpdates: this.getEnvFlag('ENABLE_REALTIME_UPDATES', baseFlags.enableRealtimeUpdates),
      enableDocumentUpload: this.getEnvFlag('ENABLE_DOCUMENT_UPLOAD', baseFlags.enableDocumentUpload),
      enableRBAC: this.getEnvFlag('ENABLE_RBAC', baseFlags.enableRBAC),
      enableAuditLogging: this.getEnvFlag('ENABLE_AUDIT_LOGGING', baseFlags.enableAuditLogging),
      enablePerformanceMonitoring: this.getEnvFlag('ENABLE_PERFORMANCE_MONITORING', baseFlags.enablePerformanceMonitoring)
    }
  }

  private getEnvFlag(envVar: string, defaultValue: boolean): boolean {
    const value = process.env[envVar]
    if (value === undefined) return defaultValue
    return value.toLowerCase() === 'true'
  }

  getFlags(): FeatureFlags {
    return { ...this.flags }
  }

  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature]
  }

  getEnabledFeatures(): string[] {
    return Object.entries(this.flags)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature)
  }

  getDisabledFeatures(): string[] {
    return Object.entries(this.flags)
      .filter(([_, enabled]) => !enabled)
      .map(([feature, _]) => feature)
  }

  getCurrentPhase(): number {
    const phases = [
      { phase: 1, features: ['enableAIInsights', 'enableBasicAIExplanations'] },
      { phase: 2, features: ['enableNaturalLanguageQueries', 'enableAdvancedAIOrchestrator'] },
      { phase: 3, features: ['enableFinancialDataAPI', 'enableMarketDataIntegration'] },
      { phase: 4, features: ['enableSupabaseMigration', 'enableRealtimeUpdates'] },
      { phase: 5, features: ['enableRBAC', 'enableAuditLogging'] },
      { phase: 6, features: ['enableDocumentUpload', 'enablePredictiveAnalytics'] }
    ]

    for (let i = phases.length - 1; i >= 0; i--) {
      const phase = phases[i]
      const allEnabled = phase.features.every(feature => 
        this.flags[feature as keyof FeatureFlags]
      )
      if (allEnabled) {
        return phase.phase
      }
    }

    return 1 // Default to phase 1
  }

  getPhaseInfo() {
    return {
      currentPhase: this.getCurrentPhase(),
      enabledFeatures: this.getEnabledFeatures().length,
      totalFeatures: Object.keys(this.flags).length,
      deploymentProgress: (this.getEnabledFeatures().length / Object.keys(this.flags).length) * 100
    }
  }

  // Method to safely check features in API routes
  checkFeatureOrThrow(feature: keyof FeatureFlags, featureName: string) {
    if (!this.isEnabled(feature)) {
      throw new Error(`Feature '${featureName}' is not enabled in current deployment phase`)
    }
  }

  // Method to get feature status for API responses
  getFeatureStatus() {
    return {
      phase: this.getCurrentPhase(),
      flags: this.getFlags(),
      enabled: this.getEnabledFeatures(),
      disabled: this.getDisabledFeatures(),
      progress: this.getPhaseInfo()
    }
  }
}

// Export singleton instance
export const featureFlags = FeatureFlagManager.getInstance()

// Helper function for API routes
export function requireFeature(feature: keyof FeatureFlags, featureName: string) {
  featureFlags.checkFeatureOrThrow(feature, featureName)
}

// Helper function for conditional rendering
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags.isEnabled(feature)
}

// Export deployment phases for reference
export const DEPLOYMENT_PHASES = {
  PHASE_1_CORE_AI: 1,
  PHASE_2_ADVANCED_AI: 2,
  PHASE_3_FINANCIAL_DATA: 3,
  PHASE_4_DATABASE: 4,
  PHASE_5_ENTERPRISE: 5,
  PHASE_6_EXPERIMENTAL: 6
} as const
