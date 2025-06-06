"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface KPI {
  id: string
  name: string
  category: string
  value: number
  unit: string
  period: string
  confidence: number
  notes?: string
}

interface KPIManagerProps {
  portfolioId: string
  portfolioName: string
}

export function KPIManager({ portfolioId, portfolioName }: KPIManagerProps) {
  const [kpis, setKpis] = useState<KPI[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newKPI, setNewKPI] = useState({
    name: '',
    category: 'revenue',
    value: '',
    unit: 'USD',
    period: new Date().toISOString().slice(0, 7), // YYYY-MM format
    confidence: '0.95',
    notes: ''
  })

  const categories = [
    { value: 'revenue', label: 'Revenue', color: 'bg-green-100 text-green-800' },
    { value: 'profitability', label: 'Profitability', color: 'bg-blue-100 text-blue-800' },
    { value: 'customers', label: 'Customers', color: 'bg-purple-100 text-purple-800' },
    { value: 'operational', label: 'Operational', color: 'bg-orange-100 text-orange-800' },
    { value: 'growth', label: 'Growth', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'financial', label: 'Financial', color: 'bg-indigo-100 text-indigo-800' }
  ]

  const units = [
    'USD', 'EUR', 'GBP', 'count', 'percent', 'number', 'ratio', 'days', 'hours'
  ]

  // Fetch KPIs
  const fetchKPIs = async () => {
    try {
      const response = await fetch(`/api/demo/kpis?portfolioId=${portfolioId}`)
      const data = await response.json()
      if (data.success) {
        setKpis(data.data)
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKPIs()
  }, [portfolioId])

  // Add new KPI
  const handleAddKPI = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/demo/kpis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newKPI,
          value: parseFloat(newKPI.value),
          confidence: parseFloat(newKPI.confidence),
          portfolioId,
          period: new Date(newKPI.period + '-01'), // Convert to full date
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setKpis(prev => [result.data, ...prev])
        setAddDialogOpen(false)
        setNewKPI({
          name: '',
          category: 'revenue',
          value: '',
          unit: 'USD',
          period: new Date().toISOString().slice(0, 7),
          confidence: '0.95',
          notes: ''
        })
      }
    } catch (error) {
      console.error('Error adding KPI:', error)
    }
  }

  // Delete KPI
  const handleDeleteKPI = async (kpiId: string) => {
    if (!confirm('Are you sure you want to delete this KPI?')) return

    try {
      const response = await fetch(`/api/demo/kpis?id=${kpiId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setKpis(prev => prev.filter(kpi => kpi.id !== kpiId))
      }
    } catch (error) {
      console.error('Error deleting KPI:', error)
    }
  }

  // Format value for display
  const formatValue = (value: number, unit: string, category: string) => {
    if (unit === 'USD' || unit === 'EUR' || unit === 'GBP') {
      if (value >= 1000000000) return `${unit === 'USD' ? '$' : unit === 'EUR' ? '€' : '£'}${(value / 1000000000).toFixed(1)}B`
      if (value >= 1000000) return `${unit === 'USD' ? '$' : unit === 'EUR' ? '€' : '£'}${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `${unit === 'USD' ? '$' : unit === 'EUR' ? '€' : '£'}${(value / 1000).toFixed(1)}K`
      return `${unit === 'USD' ? '$' : unit === 'EUR' ? '€' : '£'}${value.toLocaleString()}`
    }
    
    if (unit === 'percent') return `${value.toFixed(1)}%`
    if (unit === 'count' && value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (unit === 'count' && value >= 1000) return `${(value / 1000).toFixed(1)}K`
    
    return `${value.toLocaleString()} ${unit}`
  }

  // Group KPIs by category
  const groupedKPIs = kpis.reduce((acc, kpi) => {
    if (!acc[kpi.category]) acc[kpi.category] = []
    acc[kpi.category].push(kpi)
    return acc
  }, {} as Record<string, KPI[]>)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>📊 KPI Management - {portfolioName}</CardTitle>
            <CardDescription>Track and manage key performance indicators</CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M5 12h14"></path>
                  <path d="M12 5v14"></path>
                </svg>
                Add KPI
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New KPI</DialogTitle>
                <DialogDescription>
                  Add a new key performance indicator for {portfolioName}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddKPI} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">KPI Name</label>
                    <Input
                      placeholder="e.g., Monthly Revenue"
                      value={newKPI.name}
                      onChange={(e) => setNewKPI({ ...newKPI, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newKPI.category}
                      title="Select KPI Category"
                      aria-label="Select KPI Category"
                      onChange={(e) => setNewKPI({ ...newKPI, category: e.target.value })}
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Value</label>
                    <Input
                      type="number"
                      placeholder="1000000"
                      value={newKPI.value}
                      onChange={(e) => setNewKPI({ ...newKPI, value: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unit</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newKPI.unit}
                      title="Select Unit"
                      aria-label="Select Unit"
                      onChange={(e) => setNewKPI({ ...newKPI, unit: e.target.value })}
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Period</label>
                    <Input
                      type="month"
                      value={newKPI.period}
                      onChange={(e) => setNewKPI({ ...newKPI, period: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Confidence (0-1)</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={newKPI.confidence}
                    onChange={(e) => setNewKPI({ ...newKPI, confidence: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Additional notes about this KPI..."
                    value={newKPI.notes}
                    onChange={(e) => setNewKPI({ ...newKPI, notes: e.target.value })}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add KPI</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedKPIs).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No KPIs found for this portfolio company.</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              Add Your First KPI
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(category => {
              const categoryKPIs = groupedKPIs[category.value] || []
              if (categoryKPIs.length === 0) return null

              return (
                <div key={category.value}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={category.color}>{category.label}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {categoryKPIs.length} metric{categoryKPIs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryKPIs.map((kpi) => (
                      <Card key={kpi.id} className="border-2 hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{kpi.name}</CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteKPI(kpi.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              </svg>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="text-2xl font-bold">
                              {formatValue(kpi.value, kpi.unit, kpi.category)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(kpi.period).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short' 
                              })}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Confidence: {(kpi.confidence * 100).toFixed(0)}%
                              </span>
                              <div className="w-16 bg-muted rounded-full h-1">
                                <div 
                                  className="bg-primary h-1 rounded-full" 
                                  style={{ width: `${kpi.confidence * 100}%` }}
                                />
                              </div>
                            </div>
                            {kpi.notes && (
                              <div className="text-xs text-muted-foreground border-t pt-2">
                                {kpi.notes}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
