"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuickDataEntry } from '@/components/data-entry/QuickDataEntry'
import { OriginalDataView } from '@/components/data/OriginalDataView'
import {
  Plus,
  Eye
} from 'lucide-react'

interface DataTabsProps {
  portfolios: any[]
  totalInvestment: number
  totalKPIs: number
  latestKPIs: any[]
  portfolioPerformance: any[]
}

export function DataTabs({ 
  portfolios, 
  totalInvestment, 
  totalKPIs, 
  latestKPIs, 
  portfolioPerformance 
}: DataTabsProps) {
  const [activeTab, setActiveTab] = useState('view')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="view" className="flex items-center space-x-2">
          <Eye className="w-4 h-4" />
          <span>View Data</span>
        </TabsTrigger>
        <TabsTrigger value="entry" className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Data</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="view" className="space-y-6">
        <OriginalDataView
          portfolios={portfolios}
          totalInvestment={totalInvestment}
          totalKPIs={totalKPIs}
          latestKPIs={latestKPIs}
          portfolioPerformance={portfolioPerformance}
        />
      </TabsContent>

      <TabsContent value="entry" className="space-y-6">
        <QuickDataEntry />
      </TabsContent>
    </Tabs>
  )
}
