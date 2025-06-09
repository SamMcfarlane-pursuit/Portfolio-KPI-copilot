'use client'

import React, { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  FileText, 
  Database, 
  BarChart3, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  Eye
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  extractedData?: any
}

export default function DataManagementPage() {
  const { data: session } = useSession()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('portfolio')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true)
    
    for (const file of acceptedFiles) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Add file to state with uploading status
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        status: 'uploading',
        progress: 0
      }
      
      setUploadedFiles(prev => [...prev, newFile])
      
      try {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileId ? { ...f, progress } : f)
          )
        }
        
        // Create FormData for file upload
        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', selectedCategory)
        formData.append('userId', session?.user?.id || 'demo')
        
        // Upload file to API
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          const result = await response.json()
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileId ? { 
              ...f, 
              status: 'completed',
              extractedData: result.extractedData 
            } : f)
          )
        } else {
          throw new Error('Upload failed')
        }
        
      } catch (error) {
        console.error('Upload error:', error)
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f)
        )
      }
    }
    
    setIsUploading(false)
  }, [selectedCategory, session])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'application/json': ['.json']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground">
            Upload and manage portfolio documents, KPI data, and financial reports
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Database className="h-4 w-4 mr-1" />
          {uploadedFiles.length} files uploaded
        </Badge>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          <TabsTrigger value="files">Manage Files</TabsTrigger>
          <TabsTrigger value="analytics">Data Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Document Upload
              </CardTitle>
              <CardDescription>
                Upload PDFs, Excel files, Word documents, and other data files for analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Document Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portfolio">Portfolio Data</SelectItem>
                      <SelectItem value="financial">Financial Reports</SelectItem>
                      <SelectItem value="kpi">KPI Metrics</SelectItem>
                      <SelectItem value="legal">Legal Documents</SelectItem>
                      <SelectItem value="presentation">Presentations</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-300 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                  <p className="text-lg">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
                    <p className="text-sm text-muted-foreground">
                      Supports PDF, Excel, Word, CSV, TXT, JSON (max 10MB each)
                    </p>
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Uploading files...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Uploaded Files
              </CardTitle>
              <CardDescription>
                Manage your uploaded documents and extracted data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg text-muted-foreground">No files uploaded yet</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your first document to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(file.status)}
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(file.status)}>
                            {file.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {file.status === 'uploading' && (
                        <div className="mt-3">
                          <Progress value={file.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {file.progress}% uploaded
                          </p>
                        </div>
                      )}
                      
                      {file.extractedData && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm font-medium mb-2">Extracted Data Preview:</p>
                          <pre className="text-xs text-muted-foreground overflow-x-auto">
                            {JSON.stringify(file.extractedData, null, 2).slice(0, 200)}...
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uploadedFiles.length}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Processed</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {uploadedFiles.filter(f => f.status === 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully processed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatFileSize(uploadedFiles.reduce((acc, f) => acc + f.size, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Of 1GB available
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
