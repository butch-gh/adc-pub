import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { invoiceApi, serviceApi, patientApi, treatmentPlansApi, dentistApi } from '@/lib/billing-api';
import { Patient } from '@/types';
import { Plus, Minus, Save } from 'lucide-react';
import { toast } from 'sonner';

const invoiceSchema = z.object({
  patient_id: z.number().min(1, 'Patient is required'),
  plan_id: z.number().optional(),
  charges: z.array(z.object({
    service_id: z.number().min(1, 'Service is required'),
    estimated_amount: z.number().min(0, 'Amount must be positive').optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
    entry_id: z.number().optional(), // For treatment plan entries
    dentist_id: z.number().optional(),
    
  })).min(0),
  plan_mode: z.enum(['no-plan', 'with-plan']).optional()
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface CreateInvoiceProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateInvoice({ }: CreateInvoiceProps) {
  const navigate = useNavigate();
  const { patient_id: patientIdParam } = useParams<{ patient_id?: string }>();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [mode, setMode] = useState<'no-plan' | 'with-plan'>('no-plan');
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>(undefined);
  const [planEntries, setPlanEntries] = useState<{[planId: number]: any[]}>({});
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    shouldUnregister: true,
    defaultValues: {
      charges: [{ service_id: 0, estimated_amount: undefined, notes: '', dentist_id: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'charges',
  });

  // Fetch services
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceApi.getServices(),
  });

  // Fetch dentists
  const { data: dentistsData } = useQuery({
    queryKey: ['dentists'],
    queryFn: () => dentistApi.getDentists(),
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


const { data: plansData } = useQuery({
    queryKey: ['treatmentplans/getall', selectedPatient?.patient_id],
    queryFn: () => {
      // Guard against undefined patient_id
      if (!selectedPatient?.patient_id) {      
        throw new Error('Patient ID is required to fetch treatment plans');
      }
            
      return treatmentPlansApi.getTreatmentPlansByPatient(selectedPatient.patient_id);
    },
    enabled: !!selectedPatient?.patient_id, // Only fetch when patient is selected
  });

  // Debug the enabled condition
  console.log('🎛️ Treatment plans query enabled?', !!selectedPatient?.patient_id, 'for patient_id:', selectedPatient?.patient_id);


  // Fetch treatment plan headers for selected patient
  // const { data: plansData } = useGet({
  //   endpoint: 'treatmentplan/getall',
  //   param: { patient_id: selectedPatient?.patient_id },
  //   querykey: `get-treatment-plan-headers-${selectedPatient?.patient_id || 'none'}`,
  //   onErrorCallback: handleError,
  //   enabled: !!selectedPatient?.patient_id, // Only fetch when patient is selected
  // });

  // Fetch plan entries using useQuery
  const { data: planEntriesData } = useQuery({
    queryKey: ['treatmentplans/getall-entries', selectedPlanId],
    queryFn: () => {
      // Guard against undefined plan_id
      if (!selectedPlanId) {
        throw new Error('Plan ID is required to fetch treatment plan entries');
      }
      
      console.log('🔍 Fetching plan entries for plan_id:', selectedPlanId);
      return treatmentPlansApi.getTreatmentPlansEntries(selectedPlanId);
    },
    enabled: !!selectedPlanId, // Only fetch when a plan is selected
    onError: (error) => {
      toast.error('Failed to load plan entries');
      console.error('Plan entries fetch error:', error);
    }
  });

  // Update planEntries state when query data changes
  useEffect(() => {
    if (selectedPlanId && planEntriesData) {
      // Handle different API response structures - the API returns an array directly
      const entries = planEntriesData?.data || planEntriesData;
      const entriesArray = Array.isArray(entries) ? entries : [];
      
      console.log('🎯 Setting plan entries for plan_id:', selectedPlanId, 'entries:', entriesArray);
      
      setPlanEntries(prev => ({
        ...prev,
        [selectedPlanId]: entriesArray,
      }));
    }
  }, [selectedPlanId, planEntriesData]);

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (data: InvoiceFormData) => invoiceApi.createInvoice(data),
    onSuccess: () => {
      toast.success('Invoice created successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/billing/invoices');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    },
  });

  const watchedPatientId = watch('patient_id');
  const watchedCharges = watch('charges');

  // Auto-select patient from URL parameter
  useEffect(() => {
    if (patientIdParam && allPatients && allPatients.length > 0 && !watchedPatientId) {
      const patientId = parseInt(patientIdParam);
      if (!isNaN(patientId)) {
        const patient = allPatients.find(p => p.patient_id === patientId);
        if (patient) {
          console.log('🔗 Auto-selecting patient from URL:', patient);
          setValue('patient_id', patientId);
          toast.success(`Patient ${patient.name} automatically selected`);
        } else {
          toast.error(`Patient with ID ${patientId} not found`);
        }
      }
    }
  }, [patientIdParam, allPatients, watchedPatientId, setValue]);

  // Update selected patient when patient_id changes
  useEffect(() => {
    if (watchedPatientId && allPatients) {
      const patient = allPatients.find(p => p.patient_id === watchedPatientId);
      
      setSelectedPatient(patient || null);
      setValue('plan_id', undefined);
      setSelectedPlanId(undefined);
      setSelectedEntries([]);
      setPlanEntries({});
    } else {
      console.log('❌ No patient ID or patients list not ready');
      setSelectedPatient(null);
    }
  }, [watchedPatientId, allPatients, setValue]);

  // Auto-populate estimated amount when service is selected
  React.useEffect(() => {
    if (mode === 'no-plan' && watchedCharges && servicesData?.data) {
      watchedCharges.forEach((charge, index) => {
        if (charge.service_id && charge.service_id > 0) {
          const service = getServiceById(charge.service_id);
          if (service) {
            // If fixed_price exists, use it; otherwise use base_price_min
            const defaultAmount = service.fixed_price ?? service.base_price_min ?? 0;
            
            // Get current value
            const currentAmount = watch(`charges.${index}.estimated_amount`);
            
            // Only set if current estimated_amount is empty, undefined, 0, or NaN
            if (!currentAmount || currentAmount === 0 || isNaN(currentAmount)) {
              setValue(`charges.${index}.estimated_amount`, defaultAmount);
            }
          }
        }
      });
    }
  }, [watchedCharges, mode, servicesData?.data]);

  // When switching modes, reset fields
  useEffect(() => {
    if (mode === 'with-plan') {
      // Clear manual charges
      setValue('charges', []);
      setSelectedEntries([]);
      setPlanEntries({});
    } else {
      // Ensure at least one charge row exists for manual entry
      const charges = watch('charges');
      if (!charges || charges.length === 0) {
        setValue('charges', [{ service_id: 0, estimated_amount: undefined, notes: '', dentist_id: undefined }]);
      }
      // Clear selected plan in no-plan mode
      setValue('plan_id', undefined);
      setSelectedPlanId(undefined);
      setSelectedEntries([]);
      setPlanEntries({});
    }
  }, [mode, setValue, watch]);

  const onSubmit = (data: InvoiceFormData) => {
    console.log('=== ON SUBMIT CALLED ===');
    console.log('Mode:', mode);
    console.log('Saving data:', data);
    
    // Validate price ranges for no-plan mode
    if (mode === 'no-plan') {
      for (let i = 0; i < data.charges.length; i++) {
        const charge = data.charges[i];
        const service = getServiceById(charge.service_id);

        // Skip validation for fixed-price services
        if (!service || service.fixed_price) continue;

        // Only validate when min and max are defined and estimated_amount is present
        if (service.base_price_min !== undefined && service.base_price_max !== undefined && charge.estimated_amount != null) {
          if (charge.estimated_amount < service.base_price_min) {
            toast.error(`Charge #${i + 1}: Amount must be at least ${formatCurrency(service.base_price_min)}`);
            return;
          }
          if (charge.estimated_amount > service.base_price_max) {
            toast.error(`Charge #${i + 1}: Amount must not exceed ${formatCurrency(service.base_price_max)}`);
            return;
          }
        }
      }
    }
    
    if (mode === 'with-plan') {
      if (selectedEntries.length === 0) {
        toast.error('Please select at least one treatment plan entry.');
        return;
      }
      
      // Build charges from selected plan entries
      const planCharges: { service_id: number; estimated_amount?: number; entry_id?: number; status?: string; notes?: string }[] = [];
      
      selectedEntries.forEach(entryId => {
        // Find the entry in planEntries
        for (const planId in planEntries) {
          const entry = planEntries[planId].find((e: any) => e.entry_id === entryId);
          if (entry) {
            planCharges.push({
              service_id: entry.procedure_id, // Use procedure_id as service_id
              estimated_amount: parseFloat(entry.estimated_cost), // Convert string to number
              entry_id: entry.entry_id,
              status: entry.status || undefined,
              notes: entry.notes || undefined,
            });
            break;
          }
        }
      });

      const submittingData: InvoiceFormData = {
        ...data,
        plan_id: selectedPlanId,
        charges: planCharges,
        plan_mode: 'with-plan',
      };

      console.log('Submitting invoice data (with plan):', submittingData);
      createInvoiceMutation.mutate(submittingData);
    } else {
      // No plan mode - use manual charges
      const submittingData: InvoiceFormData = {
        ...data,
        plan_id: undefined,
        charges: data.charges,
        plan_mode: 'no-plan',
      };

      console.log('Submitting invoice data (no plan):', submittingData);
      createInvoiceMutation.mutate(submittingData);
    }
  };

  const addCharge = () => {
    append({ service_id: 0, estimated_amount: undefined, notes: '', dentist_id: undefined });
  };

  const removeCharge = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const getServiceById = (serviceId: number) => {
    return servicesData?.data?.find(s => s.service_id === serviceId);
  };

  const calculateSubtotal = () => {
    if (mode === 'with-plan') {
      // Calculate total from selected plan entries
      let total = 0;
      selectedEntries.forEach(entryId => {
        for (const planId in planEntries) {
          const entry = planEntries[planId].find((e: any) => e.entry_id === entryId);
          if (entry) {
            total += parseFloat(entry.estimated_cost) || 0; // Convert string to number
            break;
          }
        }
      });
      return total;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // console.log('🎛️ Current state:');
  // console.log('  - watchedPatientId:', watchedPatientId);
  // console.log('  - selectedPatient:', selectedPatient);
  // console.log('  - selectedPatient?.patient_id:', selectedPatient?.patient_id);
  // console.log('  - mode:', mode);
  // console.log('  - selectedPlanId:', selectedPlanId);
  // console.log('servicesData:', servicesData);

  //console.log('plansData:', plansData);
  console.log('🎛️ watchedCharges:', watchedCharges, planEntriesData, plansData);
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
            <CardDescription>
              Select the patient for this invoice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient</Label>
              <Select
                value={watchedPatientId?.toString() || ''}
                onValueChange={(value) => setValue('patient_id', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
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
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                      {selectedPatient.gender}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium">Phone:</span> {selectedPatient.phone || 'N/A'}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Email:</span> {selectedPatient.email || 'N/A'}
                  </p>
                  {selectedPatient.date_of_birth && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">DOB:</span> {new Date(selectedPatient.date_of_birth).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <span className="font-medium">Patient ID:</span> {selectedPatient.patient_id}
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
                <Button type="button" variant={mode === 'no-plan' ? 'default' : 'outline'} onClick={() => setMode('no-plan')}>
                  No Treatment Plan
                </Button>
                <Button type="button" variant={mode === 'with-plan' ? 'default' : 'outline'} onClick={() => setMode('with-plan')}>
                  With Treatment Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content based on selected mode */}
        {mode === 'no-plan' && selectedPatient && (
            <Card>
              <CardHeader>
                <CardTitle>Treatment Charges</CardTitle>
                <CardDescription>
                  Add services and their estimated costs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Charge #{index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCharge(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Dentist</Label>
                        <Select
                          value={watch(`charges.${index}.dentist_id`)?.toString() || ''}
                          onValueChange={(value) => {
                            const dentistId = parseInt(value);
                            setValue(`charges.${index}.dentist_id`, dentistId);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a dentist" />
                          </SelectTrigger>
                          <SelectContent>
                            {dentistsData?.map((dentist) => (
                              <SelectItem 
                                key={dentist.dentist_id || dentist.id} 
                                value={(dentist.dentist_id || dentist.id)?.toString() || ''}
                              >
                                {dentist.full_name}
                                {dentist.specialization && ` - ${dentist.specialization}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Service</Label>
                        <Select
                          value={watch(`charges.${index}.service_id`)?.toString() || ''}
                          onValueChange={(value) => {
                            const serviceId = parseInt(value);
                            setValue(`charges.${index}.service_id`, serviceId);
                            
                            // Auto-populate estimated amount when service is selected
                            const service = getServiceById(serviceId);
                            if (service) {
                              const defaultAmount = service.fixed_price ?? service.base_price_min ?? 0;
                              setValue(`charges.${index}.estimated_amount`, defaultAmount);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                          <SelectContent>
                            {servicesData?.data?.map((service) => (
                              <SelectItem key={service.service_id} value={service.service_id.toString()}>
                                {service.service_name}
                                {service.fixed_price && ` - ${formatCurrency(service.fixed_price)}`}
                                {service.base_price_min && service.base_price_max &&
                                  ` - ${formatCurrency(service.base_price_min)} - ${formatCurrency(service.base_price_max)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.charges?.[index]?.service_id && (
                          <p className="text-sm text-red-600">{errors.charges[index].service_id.message}</p>
                        )}
                      </div>
                    </div>
                    {/* Estimated Amount */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Estimated Amount</Label>
                        <Input
                          type="number"
                          step="10"
                          placeholder="Enter amount"
                          disabled={(() => {
                            const service = getServiceById(watch(`charges.${index}.service_id`));
                            return !!service?.fixed_price;
                          })()}
                          min={(() => {
                            const service = getServiceById(watch(`charges.${index}.service_id`));
                            return service?.base_price_min ?? undefined;
                          })()}
                          max={(() => {
                            const service = getServiceById(watch(`charges.${index}.service_id`));
                            return service?.base_price_max ?? undefined;
                          })()}
                          onWheel={(e) => e.currentTarget.blur()}
                          {...register(`charges.${index}.estimated_amount`, { valueAsNumber: true })}
                        />
                        {(() => {
                          const service = getServiceById(watch(`charges.${index}.service_id`));
                          const amount = watch(`charges.${index}.estimated_amount`);
                          // Do not validate min/max for fixed-price services
                          if (service && !service.fixed_price && amount !== undefined && amount !== null) {
                            if (service.base_price_min !== undefined && amount < service.base_price_min) {
                              return (
                                <p className="text-sm text-red-600">
                                  Amount is below minimum ({formatCurrency(service.base_price_min)})
                                </p>
                              );
                            }
                            if (service.base_price_max !== undefined && amount > service.base_price_max) {
                              return (
                                <p className="text-sm text-red-600">
                                  Amount exceeds maximum ({formatCurrency(service.base_price_max)})
                                </p>
                              );
                            }
                          }
                          return null;
                        })()}
                        {(() => {
                          const service = getServiceById(watch(`charges.${index}.service_id`));
                          // Only show range info for services that are not fixed-price
                          if (service && !service.fixed_price && service.base_price_min !== undefined && service.base_price_max !== undefined) {
                            return (
                              <p className="text-xs text-muted-foreground">
                                Range: {formatCurrency(service.base_price_min)} - {formatCurrency(service.base_price_max)}
                              </p>
                            );
                          }
                          return null;
                        })()}
                        {errors.charges?.[index]?.estimated_amount && (
                          <p className="text-sm text-red-600">{errors.charges[index].estimated_amount.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Additional notes for this charge"
                        {...register(`charges.${index}.notes`)}
                      />
                    </div>

                    {/* Service Info */}
                    {watch(`charges.${index}.service_id`) && (
                      <div className="p-3 bg-muted rounded">
                        {(() => {
                          const service = getServiceById(watch(`charges.${index}.service_id`));
                          return service ? (
                            <div className="text-sm">
                              <p className="font-medium">{service.service_name}</p>
                              {service.fixed_price && (
                                <p>Fixed Price: {formatCurrency(service.fixed_price)}</p>
                              )}
                              {service.base_price_min && service.base_price_max && (
                                <p>Price Range: {formatCurrency(service.base_price_min)} - {formatCurrency(service.base_price_max)}</p>
                              )}
                              {service.default_notes && (
                                <p>Notes: {service.default_notes}</p>
                              )}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addCharge} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Charge
                </Button>

                {errors.charges && (
                  <p className="text-sm text-red-600">{errors.charges.message}</p>
                )}
              </CardContent>
            </Card>
        )}

        {/* With Treatment Plan */}
        {mode === 'with-plan' && selectedPatient && (
          <Card>
            <CardHeader>
              <CardTitle>Treatment Plan</CardTitle>
              <CardDescription>Select a treatment plan and choose entries to include in the invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Plans</Label>
                <Select
                  value={selectedPlanId?.toString() || ''}
                  onValueChange={(value) => {
                    const planId = parseInt(value);
                    setSelectedPlanId(planId);
                    setValue('plan_id', planId);
                    
                    // Clear previous selections
                    setSelectedEntries([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a treatment plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      // Handle different API response structures
                      const plans = plansData?.data || plansData;
                      return Array.isArray(plans) && plans.map((plan: any) => (
                        <SelectItem key={plan.plan_id} value={plan.plan_id.toString()}>
                          {plan.plan_name} (Total: {formatCurrency(plan.total_estimated_cost || 0)})
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlanId && planEntries[selectedPlanId] && planEntries[selectedPlanId].length > 0 && (
                <div className="space-y-2">
                  <Label>Plan Entries</Label>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          {/* <TableHead>Entry ID</TableHead> */}
                          <TableHead>Tooth Code</TableHead>
                          <TableHead>Procedure</TableHead>
                          <TableHead>Dentist</TableHead>
                          <TableHead>Estimated Cost</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planEntries[selectedPlanId].map((entry: any) => (
                          <TableRow key={entry.entry_id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedEntries.includes(entry.entry_id)}
                                disabled={!['planned', 'on-going', 'performed'].includes(entry.status?.toLowerCase())}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedEntries(prev => [...prev, entry.entry_id]);
                                  } else {
                                    setSelectedEntries(prev => prev.filter(id => id !== entry.entry_id));
                                  }
                                }}
                              />
                            </TableCell>
                            {/* <TableCell>{entry.entry_id}</TableCell> */}
                            <TableCell>{entry.tooth_code || 'N/A'}</TableCell>
                            <TableCell>{entry.procedure_name || 'Unknown Procedure'}</TableCell>
                            <TableCell>{entry.dentist_name || 'Unknown Dentist'}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(entry.estimated_cost) || 0)}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                entry.status?.toLowerCase() === 'planned' ? 'bg-blue-100 text-blue-700' :
                                entry.status?.toLowerCase() === 'on-going' ? 'bg-yellow-100 text-yellow-700' :
                                entry.status?.toLowerCase() === 'performed' ? 'bg-green-100 text-green-700' :                                 
                                entry.status?.toLowerCase() === 'invoiced' ? 'bg-gray-100 text-gray-700': 'bg-blue-100 text-red-700'
                                
                              }`}>
                                {entry.status || 'planned'}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={entry.notes}>
                              {entry.notes || 'No notes'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {selectedEntries.length > 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        Selected {selectedEntries.length} entries with total estimated cost: 
                        <span className="ml-2 text-primary font-bold">
                          {formatCurrency(calculateSubtotal())}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedPlanId && planEntries[selectedPlanId] && planEntries[selectedPlanId].length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  No entries found for this treatment plan.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary */}
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

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/billing/invoices')}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createInvoiceMutation.isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {createInvoiceMutation.isLoading ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
