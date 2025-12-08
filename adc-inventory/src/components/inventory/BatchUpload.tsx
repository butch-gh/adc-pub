import React, { useState } from 'react'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { inventoryApi } from '@/lib/inventory-api'

interface BatchUploadItem {
  item_code: string
  item_name: string
  category_id: number
  unit_of_measure: string
  reorder_level: number
  supplier_id: number
  storage_location?: string
  batch_no?: string
  expiry_date?: string
  qty_available?: number
}

interface UploadResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    item_code: string
    error: string
  }>
}

interface ValidationError {
  row: number
  field: string
  message: string
}

export function BatchUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [preview, setPreview] = useState<BatchUploadItem[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const downloadTemplate = () => {
    const headers = [
      'item_code', 'item_name', 'category_id', 'unit_of_measure', 
      'reorder_level', 'supplier_id', 'storage_location',
      'batch_no', 'expiry_date', 'qty_available'
    ]
    
    const sampleData = [
      'ITEM001,Dental Cement,1,piece,10,1,Cabinet A,BATCH001,2025-12-31,50',
      'ITEM002,Syringe 5ml,2,piece,20,1,Cabinet B,BATCH002,2026-06-30,100',
      'ITEM003,Surgical Gloves,3,box,15,2,Storage Room,BATCH003,2025-11-15,25',
      'ITEM004,X-ray Film,4,sheet,30,3,X-ray Room,BATCH004,2026-03-20,75'
    ]
    
    const csvContent = headers.join(',') + '\n' + sampleData.join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory_batch_upload_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const validateItem = (item: BatchUploadItem, index: number): ValidationError[] => {
    const errors: ValidationError[] = []
    const row = index + 2 // Account for header row

    if (!item.item_code?.trim()) {
      errors.push({ row, field: 'item_code', message: 'Item code is required' })
    }

    if (!item.item_name?.trim()) {
      errors.push({ row, field: 'item_name', message: 'Item name is required' })
    }

    if (!item.category_id || item.category_id <= 0) {
      errors.push({ row, field: 'category_id', message: 'Valid category ID is required' })
    }

    if (!item.unit_of_measure?.trim()) {
      errors.push({ row, field: 'unit_of_measure', message: 'Unit of measure is required' })
    }

    if (item.reorder_level < 0) {
      errors.push({ row, field: 'reorder_level', message: 'Reorder level must be non-negative' })
    }

    if (!item.supplier_id || item.supplier_id <= 0) {
      errors.push({ row, field: 'supplier_id', message: 'Valid supplier ID is required' })
    }

    if (item.batch_no && item.qty_available && item.qty_available <= 0) {
      errors.push({ row, field: 'qty_available', message: 'Quantity must be positive when batch is specified' })
    }

    if (item.expiry_date && item.batch_no) {
      const expiryDate = new Date(item.expiry_date)
      if (isNaN(expiryDate.getTime())) {
        errors.push({ row, field: 'expiry_date', message: 'Invalid expiry date format. Use YYYY-MM-DD' })
      } else if (expiryDate < new Date()) {
        errors.push({ row, field: 'expiry_date', message: 'Expiry date cannot be in the past' })
      }
    }

    return errors
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)
    setValidationErrors([])
    
    try {
      const text = await selectedFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('File must contain at least a header row and one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim())
      
      // Validate headers
      const requiredHeaders = ['item_code', 'item_name', 'category_id', 'unit_of_measure', 'reorder_level', 'supplier_id']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        alert(`Missing required columns: ${missingHeaders.join(', ')}`)
        return
      }

      const parsedData: BatchUploadItem[] = []
      const allErrors: ValidationError[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        
        const item: BatchUploadItem = {
          item_code: values[headers.indexOf('item_code')] || '',
          item_name: values[headers.indexOf('item_name')] || '',
          category_id: parseInt(values[headers.indexOf('category_id')]) || 0,
          unit_of_measure: values[headers.indexOf('unit_of_measure')] || '',
          reorder_level: parseInt(values[headers.indexOf('reorder_level')]) || 0,
          supplier_id: parseInt(values[headers.indexOf('supplier_id')]) || 0,
          storage_location: values[headers.indexOf('storage_location')] || '',
          batch_no: values[headers.indexOf('batch_no')] || '',
          expiry_date: values[headers.indexOf('expiry_date')] || '',
          qty_available: parseInt(values[headers.indexOf('qty_available')]) || 0
        }

        const itemErrors = validateItem(item, i - 1)
        allErrors.push(...itemErrors)
        parsedData.push(item)
      }

      setPreview(parsedData)
      setValidationErrors(allErrors)
      setShowPreview(true)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      alert('Error parsing CSV file. Please check the file format.')
    }
  }

  const processBatchUpload = async () => {
    if (!preview.length || validationErrors.length > 0) return

    setUploading(true)
    
    try {
      const response = await inventoryApi.batchUploadItems(preview)
      setResult(response.data)
      
      if (response.data.failed === 0) {
        setFile(null)
        setPreview([])
        setShowPreview(false)
      }
    } catch (error) {
      console.error('Batch upload failed:', error)
      alert('Batch upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const clearUpload = () => {
    setFile(null)
    setPreview([])
    setValidationErrors([])
    setShowPreview(false)
    setResult(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Batch Upload Items</h1>
          <p className="text-gray-600">Upload multiple inventory items and stock batches at once</p>
        </div>
        <Button onClick={downloadTemplate} variant="outline" className="flex items-center gap-2">
          <Download size={16} />
          Download Template
        </Button>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" size={20} />
            Upload Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>1. Download the CSV template to see the required format</p>
            <p>2. Fill in your inventory data following the template structure</p>
            <p>3. Upload the completed CSV file for validation and preview</p>
            <p>4. Review the preview and fix any validation errors</p>
            <p>5. Click "Upload Items" to process the batch</p>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Required Fields:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
              <span>• item_code</span>
              <span>• item_name</span>
              <span>• category_id</span>
              <span>• unit_of_measure</span>
              <span>• reorder_level</span>
              <span>• supplier_id</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Upload CSV File</span>
            {file && (
              <Button onClick={clearUpload} variant="outline" size="sm">
                <X size={16} />
                Clear
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            {file ? `Selected: ${file.name}` : 'Select a CSV file with item data to upload'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              Validation Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium text-red-600">Please fix the following errors before uploading:</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {validationErrors.slice(0, 10).map((error, index) => (
                  <div key={index} className="text-sm text-red-600">
                    Row {error.row}: {error.message}
                  </div>
                ))}
                {validationErrors.length > 10 && (
                  <div className="text-sm text-gray-600">
                    ... and {validationErrors.length - 10} more errors
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Section */}
      {showPreview && preview.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={20} />
                <CardTitle>Preview ({preview.length} items)</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {validationErrors.length === 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Ready to upload
                  </Badge>
                )}
                {validationErrors.length > 0 && (
                  <Badge variant="destructive">
                    {validationErrors.length} errors
                  </Badge>
                )}
                <Button
                  onClick={processBatchUpload}
                  disabled={uploading || validationErrors.length > 0}
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  {uploading ? 'Uploading...' : 'Upload Items'}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reorder Lvl</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch No</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview.slice(0, 10).map((item, index) => {
                    const rowErrors = validationErrors.filter(e => e.row === index + 2)
                    const hasErrors = rowErrors.length > 0
                    
                    return (
                      <tr key={index} className={hasErrors ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-sm">{item.item_code}</td>
                        <td className="px-3 py-2 text-sm">{item.item_name}</td>
                        <td className="px-3 py-2 text-sm">{item.category_id}</td>
                        <td className="px-3 py-2 text-sm">{item.unit_of_measure}</td>
                        <td className="px-3 py-2 text-sm">{item.reorder_level}</td>
                        <td className="px-3 py-2 text-sm">{item.supplier_id}</td>
                        <td className="px-3 py-2 text-sm">{item.batch_no || '-'}</td>
                        <td className="px-3 py-2 text-sm">{item.qty_available || '-'}</td>
                        <td className="px-3 py-2 text-sm">{item.expiry_date || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {preview.length > 10 && (
              <div className="mt-3 text-center text-sm text-gray-500">
                Showing first 10 of {preview.length} items
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {result.failed === 0 ? (
                <CheckCircle className="text-green-600" size={24} />
              ) : (
                <AlertCircle className="text-yellow-600" size={24} />
              )}
              Upload Results
            </CardTitle>
            <CardDescription>
              {result.success} items uploaded successfully
              {result.failed > 0 && `, ${result.failed} failed`}
            </CardDescription>
          </CardHeader>

          {result.errors.length > 0 && (
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Errors:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                      <span className="font-medium">Row {error.row}:</span> {error.item_code} - {error.error}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          )}

          {result.success > 0 && (
            <CardContent>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-green-800 text-sm">
                  ✅ Successfully processed {result.success} items. You can now view them in the Items list.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}