import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { invoiceApi, serviceApi, patientApi, treatmentPlanApi } from '@/lib/billing-api';
import { Patient } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { TreatmentCharges } from './TreatmentCharges';
import { TreatmentPlan } from './TreatmentPlan';

const invoiceSchema = z.object({
  patient_id: z.number().min(1, 'Patient is required'),
  plan_mode: z.enum(['no-plan', 'with-plan']).optional(),
  charges: z.array(z.object({
    service_id: z.number().min(1, 'Service is required'),
    plan_id: z.number().optional(),
    estimated_amount: z.number().min(0, 'Amount must be positive').optional(),
    notes: z.string().optional(),
  })).min(0),
}).refine((data) => {
  // In with-plan mode, charges validation is handled separately via planServices
  // In no-plan mode, ensure at least one charge with valid service_id
  if (data.plan_mode === 'with-plan') {
    return true; // Skip charges validation for with-plan mode
  }
  return data.charges.length > 0 && data.charges.some(charge => charge.service_id > 0);
}, {
  message: "At least one charge with a valid service is required in no-plan mode",
  path: ["charges"]
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;



export function EditInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invoiceId = parseInt(id || '0');

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [mode, setMode] = useState<'no-plan' | 'with-plan'>('no-plan');

  const [planServices, setPlanServices] = useState<Array<{ 
    id?: string; // Unique identifier for the UI
    plan_id?: number;
    service_id?: number;
    service_name?: string;
    fixed_price?: number;
    base_price_min?: number;
    base_price_max?: number;
    service_notes?: string;
    final_amount?: number;
    plan_notes?: string;
    plan_status?: string;
   }>>([{ id: 'initial', plan_id: undefined }]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    shouldUnregister: true,
    defaultValues: {
      patient_id: undefined,
      plan_mode: 'no-plan',
      charges: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'charges',
  });



  // Fetch invoice details
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceApi.getInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  // Fetch available services
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceApi.getServices(),
  });

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

  // Fetch treatment plans for selected patient
  const { data: plansData } = useQuery({
    queryKey: ['treatment-plans', selectedPatient?.patient_id],
    queryFn: () => selectedPatient ? treatmentPlanApi.getPatientPlans(selectedPatient.patient_id) : null,
    enabled: !!selectedPatient,
  });



  // Update invoice mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return await invoiceApi.updateInvoice(invoiceId, data);
    },
    onSuccess: () => {
      toast.success('Invoice updated successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      navigate(`/billing/invoices/${invoiceId}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update invoice');
    },
  });

  // Load invoice data when it becomes available
  useEffect(() => {
    if (invoice?.data && allPatients.length > 0 && servicesData?.data) {
      const data = invoice.data;
      console.log('Loading invoice data:', data);
      console.log('Invoice plan_id:', data.plan_id);
      console.log('Invoice plan_mode:', data.plan_mode);
      console.log('Invoice treatments:', data.treatments);

      // Set selected patient based on patient_id from invoice FIRST
      const patient = allPatients.find(p => p.patient_id === data.patient_id);
      console.log('Found patient for ID', data.patient_id, ':', patient);
      if (patient) {
        setSelectedPatient(patient);
      }
      console.log('Selected patient after load:', selectedPatient);
      // Then set form values with explicit type coercion to ensure proper rendering
      setValue('patient_id', data.patient_id, { shouldValidate: true, shouldDirty: true });
      
      
      if (data.plan_mode === 'with-plan') {
        // If invoice has a plan_id, switch to with-plan mode
        setMode('with-plan');
        setValue('plan_mode', 'with-plan');
        
        // Load plan service data from treatments
        if (data.treatments && data.treatments.length > 0) {
          //const treatment = data.treatments[0]; // Use first treatment for plan mode
          //console.log('Loading plan service from treatment:', treatment);
          
          // Get service details to populate service pricing information
          //const service = servicesData?.data?.find(s => s.service_id === treatment.service_id);
          
          // Set plan services state with available treatment and service data
          const planServiceData = data.treatments.map((treatment: any, index: number) => {
            const service = servicesData?.data?.find(s => s.service_id === treatment.service_id);
            console.log('Mapping treatment to plan service:', treatment, 'with service:', service);
            return {
              id: `existing-${index}`,
              plan_id: treatment.plan_id,
              service_id: treatment.service_id,
              service_name: treatment.service_name,
              fixed_price: service?.fixed_price,
              base_price_min: service?.base_price_min,
              base_price_max: service?.base_price_max,
              service_notes: service?.default_notes,
              final_amount: treatment.final_amount || treatment.estimated_amount,
              plan_notes: treatment.notes,
              plan_status: treatment.status,
            };
          });
          
          setPlanServices(planServiceData.length > 0 ? planServiceData : [{ id: 'initial', plan_id: data.plan_id }]);
          
          // For with-plan mode, charges are handled separately via planServices
          // Don't set charges in the form for with-plan mode
          setValue('charges', []);
        }
      } else {
        // No plan mode - load charges from treatments
        setMode('no-plan');
        setValue('plan_mode', 'no-plan');
        if (data.treatments && data.treatments.length > 0) {
          const charges = data.treatments.map((treatment: any) => {
            // Safely parse numeric values
            const finalAmount = parseFloat(treatment.final_amount);
            const estimatedAmount = parseFloat(treatment.estimated_amount);
            
            return {
              service_id: parseInt(treatment.service_id) || 0,
              estimated_amount: !isNaN(finalAmount) ? finalAmount : 
                               !isNaN(estimatedAmount) ? estimatedAmount : 
                               undefined,
              notes: treatment.notes || ''
            };
          });
          console.log('Loading charges for no-plan mode:', charges);
          console.log('Raw treatments from backend:', data.treatments);
          setValue('charges', charges, { shouldValidate: true, shouldDirty: true });
        } else {
          // Ensure at least one empty charge field if no existing charges
          setValue('charges', [{ service_id: 0, plan_id: undefined, estimated_amount: undefined, notes: '' }]);
        }
      }
    }
  }, [invoice, setValue, allPatients, servicesData]);



  const calculateSubtotal = () => {
    if (mode === 'with-plan') {
      return planServices.reduce((total, service) => {
        if (service.service_id) {
          const amount = service.final_amount ?? service.fixed_price ?? ((service.base_price_min || 0) + (service.base_price_max || 0)) / 2;
          return total + (amount || 0);
        }
        return total;
      }, 0);
    }

    return watchedCharges?.reduce((total, charge) => {
      const service = getServiceById(charge.service_id);
      const amount = charge.estimated_amount ||
        (service?.fixed_price) ||
        ((service?.base_price_min || 0) + (service?.base_price_max || 0)) / 2;
      return total + (amount || 0);
    }, 0) || 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const watchedPatientId = watch('patient_id');
  const watchedCharges = watch('charges');

  //console.log('Current watchedPatientId:', watchedPatientId);
  //console.log('Current selectedPatient:', selectedPatient?.name);
  console.log('Current mode:', mode);
  console.log('Current watchedCharges:', watchedCharges);
  console.log('Plan services:', planServices);
  console.log('Plans data:', plansData?.data);
  
  // Debug individual charge values
  watchedCharges?.forEach((charge, index) => {
    console.log(`Charge ${index}:`, {
      service_id: charge.service_id,
      estimated_amount: charge.estimated_amount,
      notes: charge.notes,
      estimated_amount_type: typeof charge.estimated_amount
    });
  });
  
  // Update selected patient when patient_id changes
  // React.useEffect(() => {
  //   if (watchedPatientId && allPatients && !isInitialLoad) {
  //     const patient = allPatients.find(p => p.patient_id === watchedPatientId);
  //     setSelectedPatient(patient || null);
  //     //setValue('plan_id', undefined);
  //     setValue('charges', [{ service_id: 0, plan_id: undefined, estimated_amount: undefined, notes: '' }]);
  //     setSelectedPlanId(undefined);
  //   }
  // }, [watchedPatientId, mode]);

  // When switching modes, reset fields to enforce the single-mode rule
  // React.useEffect(() => {
  //   // Only reset fields if we're manually switching modes after the invoice data has been loaded
  //   // Don't interfere with the initial data loading process
  //   if (invoice?.data && !isInitialLoad) {
  //     if (mode === 'with-plan') {
  //       // Clear manual charges; plan will drive charges
  //       setValue('charges', []);
  //       setValue('plan_mode', 'with-plan');
  //     } else {
  //       setValue('plan_mode', 'no-plan');
  //       setSelectedPlanId(undefined);
  //       // Only ensure a default charge if switching from with-plan and there are no charges
  //       const charges = watch('charges');
  //       if (!charges || charges.length === 0) {
  //         setValue('charges', [{ service_id: 0, plan_id: undefined, estimated_amount: undefined, notes: '' }]);
  //       }
  //     }
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [mode]);

  const addCharge = () => {
    append({ service_id: 0, estimated_amount: undefined, notes: '' });
  };

  const removeCharge = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const addPlanService = () => {
    const newId = Date.now().toString();
    setPlanServices(prev => [...prev, { id: newId, plan_id: undefined }]);
  };

  const removePlanService = (id: string) => {
    setPlanServices(prev => prev.filter(service => service.id !== id));
  };

  const updatePlanService = (id: string, updates: any) => {
    setPlanServices(prev => prev.map(service => 
      service.id === id ? { ...service, ...updates } : service
    ));
  };

  const getServiceById = (serviceId: number) => {
    return servicesData?.data?.find(s => s.service_id === serviceId);
  };

  const onSubmit = (data: InvoiceFormData) => {
    console.log('=== EDIT INVOICE ON SUBMIT CALLED ===');
    console.log('Mode:', mode);
    console.log('Updating data:', data);
    console.log('Plan services:', planServices);
    
    if (mode === 'with-plan') {
      // Check if we have at least one valid plan service
      const validServices = planServices.filter(service => service.service_id);
      if (validServices.length === 0) {
        toast.error('Please select at least one treatment plan service.');
        return;
      }
      
      // Build charges from all plan services
      const planCharges = validServices.map(service => ({
        service_id: service.service_id!,
        plan_id: service.plan_id,
        estimated_amount: service.final_amount ?? service.fixed_price ?? ((service.base_price_min || 0) + (service.base_price_max || 0)) / 2,
        notes: service.plan_notes || undefined,
      }));
      
      const updateData = {
        patient_id: data.patient_id,        
        plan_mode: 'with-plan',
        charges: planCharges,        
      };

      console.log('Submitting invoice update (with plan):', updateData);
      updateInvoiceMutation.mutate(updateData);
    } else {
      // No plan mode - use manual charges
      const updateData = {
        patient_id: data.patient_id,        
        plan_mode: 'no-plan',
        charges: data.charges,        
      };

      console.log('Submitting invoice update (no plan):', updateData);
      updateInvoiceMutation.mutate(updateData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  if (invoiceLoading || !allPatients.length) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">
          {invoiceLoading ? 'Loading invoice...' : 'Loading patients...'}
        </p>
      </div>
    );
  }

  if (!invoice?.data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/billing/invoices')}
        >
          Back to Invoices
        </Button>
      </div>
    );
  }



  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/billing/invoices/${invoiceId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Invoice #{invoiceId}</h1>
          <p className="text-muted-foreground">
            Update invoice details and items
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>
              Basic information about this invoice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient</Label>
              <Select
                key={`patient-select-${watchedPatientId}`}
                value={watchedPatientId ? watchedPatientId.toString() : ''}
                onValueChange={(value) => {
                  console.log('Patient selection changed to:', value);
                  setValue('patient_id', parseInt(value));
                }}
              >
                <SelectTrigger>
                  <SelectValue 
                    placeholder="Select a patient"
                  >
                    {watchedPatientId && selectedPatient ? (
                      `${selectedPatient.name} (ID: ${selectedPatient.patient_id})${selectedPatient.phone ? ` - ${selectedPatient.phone}` : ''}`
                    ) : (
                      "Select a patient"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allPatients.map((patient) => (
                    <SelectItem key={patient.patient_id} value={patient.patient_id.toString()}>
                      {patient.name} (ID: {patient.patient_id})
                      {patient.phone ? ` - ${patient.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.patient_id && (
                <p className="text-sm text-red-600">{errors.patient_id.message}</p>
              )}
            </div>

            {selectedPatient && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{selectedPatient.name}</h4>
                  {selectedPatient.gender && (
                    <span className="text-sm text-muted-foreground capitalize">{selectedPatient.gender}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium">ID:</span> {selectedPatient.patient_id}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Phone:</span> {selectedPatient.phone || 'N/A'}
                  </p>
                  {selectedPatient.date_of_birth && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">DOB:</span> {new Date(selectedPatient.date_of_birth).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <span className="font-medium">Email:</span> {selectedPatient.email || 'N/A'}
                  </p>
                </div>
                {selectedPatient.address && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Address:</span> {selectedPatient.address}
                  </p>
                )}
              </div>
            )}

            {/* Mode toggle */}
            <div className="space-y-2">
              <Label>Mode</Label>
              <div className="flex gap-2">
                <Button type="button" variant={mode === 'no-plan' ? 'default' : 'outline'} onClick={() => {
                  setMode('no-plan');
                  setValue('plan_mode', 'no-plan');
                  // Ensure at least one empty charge for no-plan mode
                  const currentCharges = watch('charges');
                  if (!currentCharges || currentCharges.length === 0) {
                    setValue('charges', [{ service_id: 0, plan_id: undefined, estimated_amount: undefined, notes: '' }]);
                  }
                }}>
                  No Treatment Plan
                </Button>
                <Button type="button" variant={mode === 'with-plan' ? 'default' : 'outline'} onClick={() => {
                  setMode('with-plan');
                  setValue('plan_mode', 'with-plan');
                  // Clear charges for with-plan mode
                  setValue('charges', []);
                }}>
                  With Treatment Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content based on selected mode */}
        {mode === 'no-plan' && (
          <TreatmentCharges
            fields={fields}
            watch={watch}
            setValue={setValue}
            servicesData={servicesData}
            addCharge={addCharge}
            removeCharge={removeCharge}
            getServiceById={getServiceById}
            errors={errors}
          />
        )}

        {/* With Treatment Plan */}
        {mode === 'with-plan' && selectedPatient && (
          <TreatmentPlan
            planServices={planServices}
            plansData={plansData}
            addPlanService={addPlanService}
            removePlanService={removePlanService}
            updatePlanService={updatePlanService}
          />
        )}

        {/* Invoice Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Subtotal:</span>
              <span className="font-medium">
                {formatCurrency(calculateSubtotal())}
              </span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/billing/invoices/${invoiceId}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateInvoiceMutation.isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateInvoiceMutation.isLoading ? 'Updating...' : 'Update Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
