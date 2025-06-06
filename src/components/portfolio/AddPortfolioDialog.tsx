"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface AddPortfolioDialogProps {
  onAdd: (portfolio: any) => void
}

export function AddPortfolioDialog({ onAdd }: AddPortfolioDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    sector: '',
    geography: 'North America',
    investment: '',
    ownership: '',
    description: ''
  })

  const sectors = [
    'Financial Technology',
    'Artificial Intelligence', 
    'Healthcare Technology',
    'Enterprise Software',
    'E-commerce & Marketplace',
    'Data & Analytics',
    'Cybersecurity',
    'Renewable Energy',
    'Aerospace & Defense',
    'Biotechnology'
  ]

  const geographies = [
    'North America',
    'Europe', 
    'Asia Pacific',
    'Latin America',
    'Middle East & Africa'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          investment: parseFloat(formData.investment) * 1000000, // Convert to actual value
          ownership: parseFloat(formData.ownership) / 100, // Convert to decimal
          status: 'ACTIVE'
        }),
      })

      if (response.ok) {
        const newPortfolio = await response.json()
        onAdd(newPortfolio)
        setOpen(false)
        setFormData({
          name: '',
          sector: '',
          geography: 'North America',
          investment: '',
          ownership: '',
          description: ''
        })
      } else {
        console.error('Failed to add portfolio company')
      }
    } catch (error) {
      console.error('Error adding portfolio company:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M5 12h14"></path>
            <path d="M12 5v14"></path>
          </svg>
          Add Portfolio Company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Portfolio Company</DialogTitle>
          <DialogDescription>
            Add a new portfolio company to track performance and generate AI insights.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <Input
                placeholder="e.g., TechCorp Inc."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sector</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.sector}
                title="Select Sector"
                aria-label="Select Sector"
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                required
              >
                <option value="">Select Sector</option>
                {sectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Geography</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.geography}
                title="Select Geography"
                aria-label="Select Geography"
                onChange={(e) => setFormData({ ...formData, geography: e.target.value })}
                required
              >
                {geographies.map(geo => (
                  <option key={geo} value={geo}>{geo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Investment ($ Millions)</label>
              <Input
                type="number"
                placeholder="e.g., 50"
                value={formData.investment}
                onChange={(e) => setFormData({ ...formData, investment: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Ownership (%)</label>
            <Input
              type="number"
              placeholder="e.g., 25"
              min="0"
              max="100"
              step="0.1"
              value={formData.ownership}
              onChange={(e) => setFormData({ ...formData, ownership: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Brief description of the company and its business model..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7,10 12,15 17,10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Export Data
      </Button>
      <Button variant="outline" size="sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10,9 9,9 8,9"></polyline>
        </svg>
        Generate Report
      </Button>
      <Button variant="outline" size="sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <path d="M12 17h.01"></path>
        </svg>
        Run AI Analysis
      </Button>
    </div>
  )
}
