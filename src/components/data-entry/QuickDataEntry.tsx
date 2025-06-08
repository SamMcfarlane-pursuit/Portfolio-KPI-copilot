'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Upload, FileText } from 'lucide-react'

interface QuickDataEntryProps {
  onDataSubmit?: (data: any) => void
  className?: string
}

export function QuickDataEntry({ onDataSubmit, className }: QuickDataEntryProps) {
  const [formData, setFormData] = useState({
    type: '',
    value: '',
    description: '',
    category: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onDataSubmit) {
      onDataSubmit(formData)
    }
    // Reset form
    setFormData({
      type: '',
      value: '',
      description: '',
      category: ''
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Data Entry
        </CardTitle>
        <CardDescription>
          Quickly add KPI data, metrics, or portfolio information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Data Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kpi">KPI Metric</SelectItem>
                  <SelectItem value="financial">Financial Data</SelectItem>
                  <SelectItem value="operational">Operational Metric</SelectItem>
                  <SelectItem value="portfolio">Portfolio Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="efficiency">Efficiency</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              value={formData.value}
              onChange={(e) => handleInputChange('value', e.target.value)}
              placeholder="Enter value or metric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Add description or context"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Add Data
            </Button>
            <Button type="button" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button type="button" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default QuickDataEntry
