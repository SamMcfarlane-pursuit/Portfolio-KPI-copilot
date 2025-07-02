'use client'

/**
 * Comprehensive CRUD Manager Component
 * Provides Create, Read, Update, Delete operations for all entities
 */

import React, { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  RefreshCw, 
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Entity types
type EntityType = 'portfolios' | 'companies' | 'kpis'

// Entity interfaces
interface Portfolio {
  id: string
  name: string
  description?: string
  totalValue?: number
  currency: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Company {
  id: string
  name: string
  symbol: string
  sector?: string
  industry?: string
  marketCap?: number
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface KPI {
  id: string
  name: string
  value: number
  unit?: string
  category?: string
  description?: string
  targetValue?: number
  portfolioId?: string
  companyId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type Entity = Portfolio | Company | KPI

interface CRUDManagerProps {
  entityType: EntityType
  title: string
}

export default function CRUDManager({ entityType, title }: CRUDManagerProps) {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Entity>>({})
  const { toast } = useToast()

  // Load entities on component mount
  useEffect(() => {
    loadEntities()
  }, [entityType])

  // Load entities from API
  const loadEntities = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/crud/${entityType}`)
      if (response.ok) {
        const result = await response.json()
        setEntities(result.data || [])
      } else {
        throw new Error('Failed to load entities')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to load ${entityType}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Create new entity
  const createEntity = async () => {
    try {
      const response = await fetch(`/api/crud/${entityType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        setEntities([result.data, ...entities])
        setIsCreateDialogOpen(false)
        setFormData({})
        toast({
          title: 'Success',
          description: `${entityType.slice(0, -1)} created successfully`,
          variant: 'default'
        })
      } else {
        const error = await response.json()
        throw new Error(error.details || 'Failed to create entity')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create entity',
        variant: 'destructive'
      })
    }
  }

  // Update entity
  const updateEntity = async () => {
    if (!selectedEntity) return

    try {
      const response = await fetch(`/api/crud/${entityType}?id=${selectedEntity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        setEntities(entities.map(e => e.id === selectedEntity.id ? result.data : e))
        setIsEditDialogOpen(false)
        setSelectedEntity(null)
        setFormData({})
        toast({
          title: 'Success',
          description: `${entityType.slice(0, -1)} updated successfully`,
          variant: 'default'
        })
      } else {
        const error = await response.json()
        throw new Error(error.details || 'Failed to update entity')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update entity',
        variant: 'destructive'
      })
    }
  }

  // Delete entity
  const deleteEntity = async (id: string, hardDelete: boolean = false) => {
    try {
      const response = await fetch(`/api/crud/${entityType}?id=${id}&hardDelete=${hardDelete}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        if (hardDelete) {
          setEntities(entities.filter(e => e.id !== id))
        } else {
          setEntities(entities.map(e => e.id === id ? { ...e, isActive: false } : e))
        }
        toast({
          title: 'Success',
          description: `${entityType.slice(0, -1)} ${hardDelete ? 'permanently deleted' : 'deactivated'}`,
          variant: 'default'
        })
      } else {
        const error = await response.json()
        throw new Error(error.details || 'Failed to delete entity')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete entity',
        variant: 'destructive'
      })
    }
  }

  // Filter entities based on search term
  const filteredEntities = entities.filter(entity => {
    const searchLower = searchTerm.toLowerCase()
    return (
      entity.name?.toLowerCase().includes(searchLower) ||
      ('symbol' in entity && entity.symbol?.toLowerCase().includes(searchLower)) ||
      ('category' in entity && entity.category?.toLowerCase().includes(searchLower))
    )
  })

  // Open edit dialog
  const openEditDialog = (entity: Entity) => {
    setSelectedEntity(entity)
    setFormData(entity)
    setIsEditDialogOpen(true)
  }

  // Render form fields based on entity type
  const renderFormFields = () => {
    switch (entityType) {
      case 'portfolios':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Portfolio Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter portfolio name"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={(formData as any).currency || 'USD'}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter portfolio description"
              />
            </div>
            <div>
              <Label htmlFor="totalValue">Total Value</Label>
              <Input
                id="totalValue"
                type="number"
                value={(formData as any).totalValue || ''}
                onChange={(e) => setFormData({ ...formData, totalValue: parseFloat(e.target.value) })}
                placeholder="Enter total value"
              />
            </div>
          </>
        )

      case 'companies':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  value={('symbol' in formData ? formData.symbol : '') || ''}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  placeholder="Enter stock symbol"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sector">Sector</Label>
                <Input
                  id="sector"
                  value={('sector' in formData ? formData.sector : '') || ''}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  placeholder="Enter sector"
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={('industry' in formData ? formData.industry : '') || ''}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Enter industry"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter company description"
              />
            </div>
            <div>
              <Label htmlFor="marketCap">Market Cap</Label>
              <Input
                id="marketCap"
                type="number"
                value={('marketCap' in formData ? formData.marketCap : '') || ''}
                onChange={(e) => setFormData({ ...formData, marketCap: parseFloat(e.target.value) })}
                placeholder="Enter market cap"
              />
            </div>
          </>
        )

      case 'kpis':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">KPI Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter KPI name"
                />
              </div>
              <div>
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  type="number"
                  value={('value' in formData ? formData.value : '') || ''}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                  placeholder="Enter KPI value"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={('unit' in formData ? formData.unit : '') || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Enter unit (e.g., %, $, ratio)"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={('category' in formData ? formData.category : '') || ''}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Operational">Operational</SelectItem>
                    <SelectItem value="Strategic">Strategic</SelectItem>
                    <SelectItem value="Risk">Risk</SelectItem>
                    <SelectItem value="ESG">ESG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter KPI description"
              />
            </div>
            <div>
              <Label htmlFor="targetValue">Target Value</Label>
              <Input
                id="targetValue"
                type="number"
                value={('targetValue' in formData ? formData.targetValue : '') || ''}
                onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) })}
                placeholder="Enter target value"
              />
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={loadEntities}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New {entityType.slice(0, -1)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {renderFormFields()}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false)
                      setFormData({})
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createEntity}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${entityType}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {entityType === 'companies' && <TableHead>Symbol</TableHead>}
                {entityType === 'kpis' && <TableHead>Value</TableHead>}
                {entityType === 'kpis' && <TableHead>Category</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities.map((entity) => (
                <TableRow key={entity.id}>
                  <TableCell className="font-medium">{entity.name}</TableCell>
                  {entityType === 'companies' && (
                    <TableCell>{'symbol' in entity ? entity.symbol : ''}</TableCell>
                  )}
                  {entityType === 'kpis' && (
                    <TableCell>
                      {'value' in entity ? entity.value : ''} {'unit' in entity ? entity.unit : ''}
                    </TableCell>
                  )}
                  {entityType === 'kpis' && (
                    <TableCell>
                      <Badge variant="outline">
                        {'category' in entity ? entity.category : ''}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={entity.isActive ? 'default' : 'secondary'}>
                      {entity.isActive ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(entity.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(entity)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              <AlertTriangle className="h-5 w-5 text-yellow-500 inline mr-2" />
                              Confirm Deletion
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{entity.name}&quot;?
                              This will deactivate the {entityType.slice(0, -1)} but keep it for audit purposes.
                              Data will be backed up before deletion.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteEntity(entity.id, false)}
                              className="bg-yellow-600 hover:bg-yellow-700"
                            >
                              Deactivate
                            </AlertDialogAction>
                            <AlertDialogAction
                              onClick={() => deleteEntity(entity.id, true)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Permanently Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit {entityType.slice(0, -1)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {renderFormFields()}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedEntity(null)
                  setFormData({})
                }}
              >
                Cancel
              </Button>
              <Button onClick={updateEntity}>
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {filteredEntities.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No {entityType} found</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first {entityType.slice(0, -1)}
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Loading {entityType}...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
