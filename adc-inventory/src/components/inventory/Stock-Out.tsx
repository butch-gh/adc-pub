import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Eye, Package, AlertCircle, FileText, FileSpreadsheet } from 'lucide-react';
import { inventoryApi, StockOutCreateRequest, StockOutTransaction, AvailableBatch, invoiceApi, serviceApi } from '@/lib/inventory-api';
import { patientApi } from '@/lib/inventory-api';
import { useAuth } from '@repo/auth';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import StockOutHistoryPDFGenerator from './StockOutHistoryPDFGenerator';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface StockOutFormProps {
  onSuccess?: () => void;
}

// Patient Types
export interface Patient {
  patient_id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  medical_history?: string;
  created_at: string;
  updated_at: string;
}

interface StockOutItem {
  item_id: number;
  item_name: string;
  batch_id: number;
  batch_no: string;
  qty_available: number;
  qty_released: number;
  remarks?: string;
}

interface TreatmentInfo {
  treatment_id?: number;
  patient_name: string;
  service_id?: number;
  treatment_type: string;
}

export function StockOutForm({ onSuccess }: StockOutFormProps) {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    released_to: '',
    purpose: '',
    created_by: user?.full_name || user?.username || '',
    items: [] as StockOutItem[]
  });

  // Treatment usage state
  const [isTreatmentUsage, setIsTreatmentUsage] = useState(false);
  const [treatmentInfo, setTreatmentInfo] = useState<TreatmentInfo>({
    patient_name: '',
    treatment_type: ''
  });

  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<AvailableBatch | null>(null);
  const [itemFormData, setItemFormData] = useState({
    qty_released: 1,
    remarks: ''
  });
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedChargeId, setSelectedChargeId] = useState<number | null>(null);

  useEffect(() => {
    loadAvailableBatches();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        created_by: user.full_name || user.username
      }));
    }
  }, [user]);

  const loadAvailableBatches = async () => {
    try {
      const response = await inventoryApi.getAvailableBatches();
      setAvailableBatches(response.data);
    } catch (error) {
      console.error('Error loading available batches:', error);
    }
  };

  // Fetch patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientApi.getPatients({ limit: 100 }),
  });

  // Combine API patients with sample patients
  const allPatients = React.useMemo(() => {
    const apiPatients = patientsData?.data || [];
    // Map API response to frontend Patient type
    return apiPatients.map(patient => ({
      ...patient,
      name: patient.name, // API returns name, use it directly
      updated_at: patient.created_at // Use created_at as updated_at if not available
    }));
  }, [patientsData?.data]);

  // Fetch patient invoices (dependent on patient selection)
  const { data: patientInvoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['patient-invoices', selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const response = await invoiceApi.getInvoices(selectedPatientId);
      // Return the data array from the response
      if (response.success && response.data) {
        // Handle both single object and array responses
        return Array.isArray(response.data) ? response.data : [response.data];
      }
      return [];
    },
    enabled: !!selectedPatientId && isTreatmentUsage, // Only fetch when patient is selected and treatment usage is active
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch invoice charges (dependent on invoice selection)
  const { data: invoiceChargesData, isLoading: chargesLoading } = useQuery({
    queryKey: ['invoice-charges', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return [];
      const response = await invoiceApi.getInvoiceCharges(selectedInvoiceId);
      // Return the data array from the response
      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }
      return [];
    },
    enabled: !!selectedInvoiceId && isTreatmentUsage, // Only fetch when invoice is selected and treatment usage is active
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch services (treatment types)
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceApi.getServices(),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: (data) => {
      console.log('Services API Response:', data);
    },
    onError: (error) => {
      console.error('Services API Error:', error);
    }
  });

  // Update selected patient when patient_id changes
  useEffect(() => {
    if (selectedPatientId && allPatients) {
      const patient = allPatients.find(p => p.patient_id === selectedPatientId);
      setSelectedPatient(patient || null);
      // Reset invoice selection when patient changes
      setSelectedInvoiceId(null);
      // Auto-fill patient name in treatment info
      if (patient && isTreatmentUsage) {
        setTreatmentInfo(prev => ({
          ...prev,
          patient_name: patient.name
        }));
      }
    } else {
      setSelectedPatient(null);
      setSelectedInvoiceId(null);
      setSelectedChargeId(null);
      if (isTreatmentUsage) {
        setTreatmentInfo(prev => ({
          ...prev,
          patient_name: ''
        }));
      }
    }
  }, [selectedPatientId, allPatients, isTreatmentUsage]);

  // Handle invoice selection - reset charge when invoice changes
  const handleInvoiceSelection = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setSelectedChargeId(null); // Reset charge selection when invoice changes
    // Clear service selection when changing invoice
    setTreatmentInfo(prev => ({
      ...prev,
      service_id: undefined,
      treatment_type: ''
    }));
  };

  // Handle charge selection - auto-fill service from selected charge
  const handleChargeSelection = (chargeId: number) => {
    setSelectedChargeId(chargeId);
    const selectedCharge = invoiceChargesData?.find((charge: any) => charge.charge_id === chargeId);
    
    if (selectedCharge) {
      // Auto-fill service_id and service_name from charge
      setTreatmentInfo(prev => ({
        ...prev,
        service_id: selectedCharge.service_id,
        treatment_type: selectedCharge.service_name || ''
      }));
    }
  };

  // Helper functions
  const getSelectedService = () => {
    if (!treatmentInfo.service_id || !servicesData?.data || !Array.isArray(servicesData.data)) return null;
    return servicesData.data.find(s => s.service_id === treatmentInfo.service_id) || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.released_to.trim()) {
      setError('Released To field is required');
      return;
    }
    
    if (formData.items.length === 0) {
      setError('Please add at least one item to release');
      return;
    }

    // Validate treatment info if treatment usage is selected
    if (isTreatmentUsage) {
      if (!selectedPatient) {
        setError('Please select a patient for treatment usage');
        return;
      }
      if (!treatmentInfo.service_id) {
        setError('Please select a treatment type for treatment usage');
        return;
      }
    }

    if (!user) {
      setError('User authentication required. Please refresh the page and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedService = getSelectedService();
      
      const stockOutData: StockOutCreateRequest = {
        released_to: formData.released_to,
        purpose: isTreatmentUsage ? `Treatment Usage - ${selectedService?.service_name || treatmentInfo.treatment_type}` : formData.purpose || undefined,
        created_by: formData.created_by || user.full_name || user.username,
        items: formData.items.map(item => ({
          item_id: item.item_id,
          batch_id: item.batch_id,
          qty_released: item.qty_released,
          remarks: item.remarks || undefined
        })),
        // Treatment usage fields
        is_treatment_usage: isTreatmentUsage,
        //treatment_id: treatmentInfo.treatment_id,
        //patient_id: isTreatmentUsage ? selectedPatientId || undefined : undefined,
        //patient_name: isTreatmentUsage ? (selectedPatient?.name) : undefined,
        //treatment_type: isTreatmentUsage ? (selectedService?.service_name || treatmentInfo.treatment_type) : undefined,
        invoice_id: isTreatmentUsage ? (selectedInvoiceId || undefined) : undefined,
        charge_id: isTreatmentUsage ? (selectedChargeId || undefined) : undefined,
        //service_id: isTreatmentUsage ? treatmentInfo.service_id : undefined
      };

      console.log('Stock Out Data:', stockOutData);
      await inventoryApi.createStockOutTransaction(stockOutData);
      
      // Reset form
      setFormData({
        released_to: '',
        purpose: '',
        created_by: user?.full_name || user?.username || '',
        items: []
      });
      
      setIsTreatmentUsage(false);
      setSelectedPatientId(null);
      setSelectedPatient(null);
      setSelectedInvoiceId(null);
      setSelectedChargeId(null);
      setTreatmentInfo({
        patient_name: '',
        service_id: undefined,
        treatment_type: ''
      });
      
      // Reload available batches to update quantities
      await loadAvailableBatches();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error creating stock-out transaction');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setSelectedBatch(null);
    setItemFormData({
      qty_released: 1,
      remarks: ''
    });
    setShowItemDialog(true);
  };

  const selectBatch = (batchId: number) => {
    const batch = availableBatches.find(b => b.batch_id === batchId);
    if (batch) {
      setSelectedBatch(batch);
      setItemFormData({
        qty_released: 1,
        remarks: ''
      });
    }
  };

  const saveItem = () => {
    if (!selectedBatch) return;

    // Check if item already exists
    const existingIndex = formData.items.findIndex(
      item => item.batch_id === selectedBatch.batch_id
    );

    const newItem: StockOutItem = {
      item_id: selectedBatch.item_id,
      item_name: selectedBatch.item_name,
      batch_id: selectedBatch.batch_id,
      batch_no: selectedBatch.batch_no,
      qty_available: selectedBatch.qty_available,
      qty_released: itemFormData.qty_released,
      remarks: itemFormData.remarks
    };

    if (existingIndex >= 0) {
      // Update existing item
      const newItems = [...formData.items];
      newItems[existingIndex] = newItem;
      setFormData({ ...formData, items: newItems });
    } else {
      // Add new item
      setFormData({ ...formData, items: [...formData.items, newItem] });
    }

    setShowItemDialog(false);
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const getTotalQuantity = () => {
    return formData.items.reduce((total, item) => total + item.qty_released, 0);
  };

  // Filter available batches (exclude already selected ones, zero quantity, or expired items)
  const getFilteredBatches = () => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set to start of day for comparison
    
    return availableBatches.filter(batch => {
      const existingItem = formData.items.find(item => item.batch_id === batch.batch_id);
      
      // Check if item is expired
      const isExpired = batch.expiry_date ? new Date(batch.expiry_date) < currentDate : false;
      
      return !existingItem && batch.qty_available > 0 && !isExpired;
    });
  };

  // Get count of expired items for display
  const getExpiredItemsCount = () => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    return availableBatches.filter(batch => {
      const isExpired = batch.expiry_date ? new Date(batch.expiry_date) < currentDate : false;
      return isExpired && batch.qty_available > 0;
    }).length;
  };


  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Stock-Out Form</span>
            </CardTitle>
            <CardDescription>
              Release inventory items for usage, transfer, or consumption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Purpose Selection */}
            <div className="space-y-3">
              {/* <Label className="text-sm font-medium">Purpose</Label> */}
              <div className="flex space-x-4">
                {/* <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="purpose"
                    checked={!isTreatmentUsage}
                    onChange={() => {
                      setIsTreatmentUsage(false);
                      setFormData({ ...formData, purpose: '' });
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">General Usage</span>
                </label> */}
                {/* <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="purpose"
                    checked={isTreatmentUsage}
                    onChange={() => {
                      setIsTreatmentUsage(true);
                      setFormData({ ...formData, purpose: 'Treatment Usage' });
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Treatment Usage</span>
                </label> */}
              </div>
            </div>

            {/* Treatment Information - Show only when Treatment Usage is selected */}
            {isTreatmentUsage && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h4 className="font-medium text-blue-900">Treatment Information</h4>
                {/* <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patient_name">Patient Name *</Label>
                    <Input
                      id="patient_name"
                      value={treatmentInfo.patient_name}
                      onChange={(e) => setTreatmentInfo({ ...treatmentInfo, patient_name: e.target.value })}
                      placeholder="Enter patient name"
                      required={isTreatmentUsage}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dentist_name">Attending Dentist *</Label>
                    <Input
                      id="dentist_name"
                      value={treatmentInfo.dentist_name}
                      onChange={(e) => setTreatmentInfo({ ...treatmentInfo, dentist_name: e.target.value })}
                      placeholder="Dr. Smith"
                      required={isTreatmentUsage}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="treatment_type">Treatment Type *</Label>
                  <Input
                    id="treatment_type"
                    value={treatmentInfo.treatment_type}
                    onChange={(e) => setTreatmentInfo({ ...treatmentInfo, treatment_type: e.target.value })}
                    placeholder="e.g., Root Canal, Cleaning, Extraction"
                    required={isTreatmentUsage}
                  />
                </div>
                <div>
                  <Label htmlFor="treatment_id">Treatment ID (Optional)</Label>
                  <Input
                    id="treatment_id"
                    type="number"
                    value={treatmentInfo.treatment_id || ''}
                    onChange={(e) => setTreatmentInfo({ 
                      ...treatmentInfo, 
                      treatment_id: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    placeholder="Link to treatment plan ID"
                  />
                </div> */}

                {/* Patient Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient_id">Patient *</Label>
                    <Select
                      value={selectedPatientId?.toString() || ''}
                      onValueChange={(value) => setSelectedPatientId(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {allPatients?.map((patient) => (
                          <SelectItem key={patient.patient_id} value={patient.patient_id.toString()}>
                            {patient.name} (ID: {patient.patient_id})
                            {patient.phone ? ` - ${patient.phone}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPatient && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-green-900">{selectedPatient.name}</h4>
                        {selectedPatient.gender && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                            {selectedPatient.gender}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <p className="text-green-700">
                          <span className="font-medium">Phone:</span> {selectedPatient.phone || 'N/A'}
                        </p>
                        <p className="text-green-700">
                          <span className="font-medium">Email:</span> {selectedPatient.email || 'N/A'}
                        </p>
                        {selectedPatient.date_of_birth && (
                          <p className="text-green-700">
                            <span className="font-medium">DOB:</span> {new Date(selectedPatient.date_of_birth).toLocaleDateString()}
                          </p>
                        )}
                        <p className="text-green-700">
                          <span className="font-medium">Patient ID:</span> {selectedPatient.patient_id}
                        </p>
                      </div>
                      {selectedPatient.address && (
                        <p className="text-sm text-green-700">
                          <span className="font-medium">Address:</span> {selectedPatient.address}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Patient Invoices Dropdown - Only show when patient is selected */}
                  {selectedPatientId && (
                    <div className="space-y-2">
                      <Label htmlFor="invoice_id">Patient Invoices (Optional)</Label>
                      <Select
                        value={selectedInvoiceId?.toString() || ''}
                        onValueChange={(value) => handleInvoiceSelection(parseInt(value))}
                        disabled={invoicesLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={invoicesLoading ? "Loading invoices..." : "Select an invoice to auto-fill"} />
                        </SelectTrigger>
                        <SelectContent>
                          {patientInvoicesData && patientInvoicesData.length > 0 ? (
                            patientInvoicesData.map((invoice: any) => (
                              <SelectItem key={invoice.invoice_id} value={invoice.invoice_id.toString()}>
                                Invoice #{invoice.invoice_id} - Dentist: {invoice.dentist_name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No invoices found for this patient
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Select an invoice for reference tracking
                      </p>
                    </div>
                  )}

                  {/* Invoice Charges Dropdown - Only show when invoice is selected */}
                  {selectedInvoiceId && (
                    <div className="space-y-2">
                      <Label htmlFor="charge_id">Invoice Charges (Optional)</Label>
                      <Select
                        value={selectedChargeId?.toString() || ''}
                        onValueChange={(value) => handleChargeSelection(parseInt(value))}
                        disabled={chargesLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={chargesLoading ? "Loading charges..." : "Select a charge to auto-fill treatment"} />
                        </SelectTrigger>
                        <SelectContent>
                          {invoiceChargesData && invoiceChargesData.length > 0 ? (
                            invoiceChargesData.map((charge: any) => (
                              <SelectItem key={charge.charge_id} value={charge.charge_id.toString()}>
                                {charge.service_name} (Charge #{charge.charge_id})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No charges found for this invoice
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Select specific charge or leave blank to use general treatment type
                      </p>
                    </div>
                  )}

                  {/* Service/Treatment Type Selection */}
                  {/* <div className="space-y-2">
                    <Label htmlFor="service_id">Treatment Type *</Label>
                    <Select
                      value={treatmentInfo.service_id?.toString() || ''}
                      onValueChange={(value) => {
                        const serviceId = parseInt(value);
                        const service = servicesData?.data?.find((s: any) => s.service_id === serviceId);
                        setTreatmentInfo({
                          ...treatmentInfo,
                          service_id: serviceId,
                          treatment_type: service?.service_name || ''
                        });
                      }}
                      disabled={servicesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={servicesLoading ? "Loading services..." : "Select treatment type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {servicesData?.data && servicesData.data.length > 0 ? (
                          servicesData.data.map((service: any) => (
                            <SelectItem key={service.service_id} value={service.service_id.toString()}>
                              {service.service_name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No services available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div> */}
                </div>






              </div>

            )}

            <div className="grid grid-cols-2 gap-4">
              {/* <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="text"
                  value={new Date().toLocaleDateString()}
                  disabled
                  className="bg-gray-50"
                />
              </div> */}
              {/* <div>
                <Label>Reference No</Label>
                <Input
                  value="Auto-generated"
                  disabled
                  className="bg-gray-50"
                  placeholder="Will be generated automatically"
                />
              </div> */}
            </div>

            <div>
              <Label htmlFor="released_to">Released To *</Label>
              <Input
                id="released_to"
                value={formData.released_to}
                onChange={(e) => {
                  // Only allow alphanumeric characters, spaces, hyphens, and apostrophes
                  const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9\s\-']/g, '');
                  setFormData({ ...formData, released_to: sanitizedValue });
                }}
                placeholder={isTreatmentUsage ? "Treatment Room / Department" : "Person or department receiving the items"}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Only letters, numbers, spaces, hyphens, and apostrophes are allowed
              </p>
            </div>

            {/* Purpose/Remarks - Show only for general usage */}
            {!isTreatmentUsage && (
              <div>
                <Label htmlFor="purpose">Purpose</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Reason for stock-out (optional)"
                  rows={3}
                />
              </div>
            )}

            {/* <div>
              <Label>Created By</Label>
              <Input
                value={formData.created_by}
                disabled
                className="bg-gray-50"
                title="Automatically filled with logged-in user"
              />
            </div> */}
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Items to Release</CardTitle>
              <CardDescription>
                Select items and quantities to be released from stock
              </CardDescription>
            </div>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {formData.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items added yet. Click "Add Item" to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Batch No</TableHead>
                    <TableHead>Qty Available</TableHead>
                    <TableHead>Qty Released</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>{item.batch_no}</TableCell>
                      <TableCell>{item.qty_available}</TableCell>
                      <TableCell>
                        <Badge variant={item.qty_released > item.qty_available ? "destructive" : "default"}>
                          {item.qty_released}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.remarks || '-'}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {formData.items.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-end">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Total Items Released:</div>
                    <div className="text-xl font-bold">{getTotalQuantity()}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormData({
                released_to: '',
                purpose: '',
                created_by: user?.full_name || user?.username || '',
                items: []
              });
              setIsTreatmentUsage(false);
              setSelectedPatientId(null);
              setSelectedPatient(null);
              setSelectedInvoiceId(null);
              setSelectedChargeId(null);
              setTreatmentInfo({
                patient_name: '',
                service_id: undefined,
                treatment_type: ''
              });
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || formData.items.length === 0}>
            {loading ? 'Processing...' : 'Save Stock-Out'}
          </Button>
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Item to Release</DialogTitle>
            <DialogDescription>
              Select an item and specify the quantity to release
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="batch_selection">Select Item & Batch *</Label>
              <Select
                value={selectedBatch?.batch_id.toString() || ''}
                onValueChange={(value) => selectBatch(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item and batch" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredBatches().length === 0 ? (
                    <SelectItem value="none" disabled>
                      No available items found
                    </SelectItem>
                  ) : (
                    getFilteredBatches().map((batch) => (
                      <SelectItem key={batch.batch_id} value={batch.batch_id.toString()}>
                        {batch.item_name} - {batch.batch_no} (Available: {batch.qty_available})
                        {batch.expiry_date && ` - Exp: ${new Date(batch.expiry_date).toLocaleDateString()}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {getExpiredItemsCount() > 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  {getExpiredItemsCount()} expired item(s) are hidden from selection
                </p>
              )}
            </div>

            {selectedBatch && (
              <>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Item:</strong> {selectedBatch.item_name}</div>
                    <div><strong>Batch:</strong> {selectedBatch.batch_no}</div>
                    <div><strong>Available Qty:</strong> {selectedBatch.qty_available}</div>
                    <div><strong>Expiry:</strong> {selectedBatch.expiry_date ? new Date(selectedBatch.expiry_date).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="qty_released">Quantity to Release *</Label>
                  <Input
                    id="qty_released"
                    type="number"
                    min="1"
                    max={selectedBatch.qty_available}
                    value={itemFormData.qty_released}
                    onChange={(e) => setItemFormData({ 
                      ...itemFormData, 
                      qty_released: parseInt(e.target.value) || 1 
                    })}
                    required
                  />
                  {itemFormData.qty_released > selectedBatch.qty_available && (
                    <p className="text-sm text-red-600 mt-1">
                      Quantity exceeds available stock ({selectedBatch.qty_available})
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="item_remarks">Remarks</Label>
                  <Textarea
                    id="item_remarks"
                    value={itemFormData.remarks}
                    onChange={(e) => setItemFormData({ ...itemFormData, remarks: e.target.value })}
                    placeholder="Optional remarks for this item"
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={saveItem}
              disabled={!selectedBatch || itemFormData.qty_released > selectedBatch.qty_available || itemFormData.qty_released < 1}
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

// Stock-Out History Component
export function StockOutHistory() {
  const [transactions, setTransactions] = useState<StockOutTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<StockOutTransaction | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    released_to: ''
  });

  useEffect(() => {
    loadTransactions();
  }, [pagination.page, filters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getStockOutTransactions({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        released_to: filters.released_to || undefined
      });
      setTransactions(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading stock-out transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewTransaction = async (id: number) => {
    try {
      const transaction = await inventoryApi.getStockOutTransaction(id);
      setSelectedTransaction(transaction);
      setShowDetailDialog(true);
    } catch (error) {
      console.error('Error loading transaction details:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    loadTransactions();
  };

  // Export functions
  const exportToCSV = () => {
    const csvData = transactions.map(transaction => ({
      'Reference No': transaction.reference_no,
      'Date': new Date(transaction.stock_out_date).toLocaleDateString(),
      'Released To': transaction.released_to,
      'Items Count': transaction.items_count || 0,
      'Total Qty': transaction.total_qty_released || 0,
      'Created By': transaction.created_by,
      'Purpose': transaction.purpose || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock-out-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(transactions.map(transaction => ({
      'Reference No': transaction.reference_no,
      'Date': new Date(transaction.stock_out_date).toLocaleDateString(),
      'Released To': transaction.released_to,
      'Items Count': transaction.items_count || 0,
      'Total Qty': transaction.total_qty_released || 0,
      'Created By': transaction.created_by,
      'Purpose': transaction.purpose || ''
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock-Out History');
    XLSX.writeFile(workbook, `stock-out-history-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Stock-Out History</CardTitle>
              <CardDescription>View all stock-out transactions and releases</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={transactions.length === 0}
              >
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={transactions.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <StockOutHistoryPDFGenerator
                transactions={transactions}
                fileName={`stock-out-history-${new Date().toISOString().split('T')[0]}.pdf`}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search by reference number or released to..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No stock-out transactions found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Released To</TableHead>
                  <TableHead>Items Count</TableHead>
                  <TableHead>Total Qty</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.stock_out_id}>
                    <TableCell className="font-medium">{transaction.reference_no}</TableCell>
                    <TableCell>{new Date(transaction.stock_out_date).toLocaleDateString()}</TableCell>
                    <TableCell>{transaction.released_to}</TableCell>
                    <TableCell>{transaction.items_count || 0}</TableCell>
                    <TableCell>{transaction.total_qty_released || 0}</TableCell>
                    <TableCell>{transaction.created_by}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewTransaction(transaction.stock_out_id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 py-2">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Transaction Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Stock-Out Details</DialogTitle>
            <DialogDescription>
              {selectedTransaction?.reference_no}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reference Number</Label>
                  <Input value={selectedTransaction.reference_no} disabled />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input value={new Date(selectedTransaction.stock_out_date).toLocaleDateString()} disabled />
                </div>
                <div>
                  <Label>Released To</Label>
                  <Input value={selectedTransaction.released_to} disabled />
                </div>
                <div>
                  <Label>Created By</Label>
                  <Input value={selectedTransaction.created_by} disabled />
                </div>
              </div>

              {selectedTransaction.purpose && (
                <div>
                  <Label>Purpose</Label>
                  <Textarea value={selectedTransaction.purpose} disabled rows={2} />
                </div>
              )}

              {/* Items */}
              <div>
                <Label>Released Items</Label>
                {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Batch No</TableHead>
                        <TableHead>Qty Released</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransaction.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{item.batch_no}</TableCell>
                          <TableCell>{item.qty_released}</TableCell>
                          <TableCell>{item.remarks || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500">No items found</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetailDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main Stock-Out Component with Tabs
export default function StockOut() {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleStockOutSuccess = () => {
    setRefreshHistory(prev => prev + 1);
    setActiveTab('history');
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('form')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'form'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            New Stock-Out
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Stock-Out History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'form' && <StockOutForm onSuccess={handleStockOutSuccess} />}
      {activeTab === 'history' && <StockOutHistory key={refreshHistory} />}
    </div>
  );
}
