import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { serviceApi } from '@/lib/billing-api';
import { Service } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export function ServicesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add service form state
  const [newService, setNewService] = useState({
    service_name: '',
    default_notes: '',
    pricing_type: 'range', // 'range' or 'fixed'
    base_price_min: 0,
    base_price_max: 0,
    fixed_price: 0,
    service_time: 30, // Default to 30 minutes
    tooth_options: [] as { id: number; description: string }[] // Multiple tooth options selection
  });

  // Edit service form state
  const [editService, setEditService] = useState({
    service_name: '',
    default_notes: '',
    pricing_type: 'range', // 'range' or 'fixed'
    base_price_min: 0,
    base_price_max: 0,
    fixed_price: 0,
    service_time: 30, // Default to 30 minutes
    tooth_options: [] as { id: number; description: string }[] // Multiple tooth options selection
  });

  // Validation state for add form
  const [addValidationErrors, setAddValidationErrors] = useState({
    service_name: '',
    base_price_min: '',
    base_price_max: '',
    fixed_price: '',
    service_time: '',
    general: ''
  });

  // Validation state for edit form
  const [editValidationErrors, setEditValidationErrors] = useState({
    service_name: '',
    base_price_min: '',
    base_price_max: '',
    fixed_price: '',
    service_time: '',
    general: ''
  });

  // Validation functions
  const validateServiceName = (name: string): string => {
    if (!name.trim()) {
      return 'Service name is required';
    }
    if (name.trim().length < 2) {
      return 'Service name must be at least 2 characters long';
    }
    if (name.trim().length > 100) {
      return 'Service name must be less than 100 characters';
    }
    // Check for invalid characters (only allow letters, spaces, hyphens, apostrophes)
    const validNameRegex = /^[a-zA-Z\s\-']+$/;
    if (!validNameRegex.test(name.trim())) {
      return 'Service name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return '';
  };

  const validateServiceTime = (time: number): string => {
    if (!time || time < 5) {
      return 'Service duration must be at least 5 minutes';
    }
    if (time > 480) {
      return 'Service duration cannot exceed 8 hours (480 minutes)';
    }
    return '';
  };

  const validatePricing = (pricingType: string, minPrice?: number, maxPrice?: number, fixedPrice?: number): { base_price_min: string, base_price_max: string, fixed_price: string } => {
    const errors = { base_price_min: '', base_price_max: '', fixed_price: '' };

    if (pricingType === 'range') {
      if (minPrice === undefined || minPrice < 0) {
        errors.base_price_min = 'Minimum price must be 0 or greater';
      }
      if (maxPrice === undefined || maxPrice < 0) {
        errors.base_price_max = 'Maximum price must be 0 or greater';
      }
      if (minPrice !== undefined && maxPrice !== undefined && minPrice >= maxPrice) {
        errors.base_price_max = 'Maximum price must be greater than minimum price';
      }
    } else if (pricingType === 'fixed') {
      if (fixedPrice === undefined || fixedPrice < 0) {
        errors.fixed_price = 'Fixed price must be 0 or greater';
      }
    }

    return errors;
  };

  const validateAddForm = (): boolean => {
    const errors = {
      service_name: validateServiceName(newService.service_name),
      service_time: validateServiceTime(newService.service_time),
      ...validatePricing(newService.pricing_type, newService.base_price_min, newService.base_price_max, newService.fixed_price),
      general: ''
    };

    setAddValidationErrors(errors);

    // Return true if no errors
    return !Object.values(errors).some(error => error !== '');
  };

  const validateEditForm = (): boolean => {
    const errors = {
      service_name: validateServiceName(editService.service_name),
      service_time: validateServiceTime(editService.service_time),
      ...validatePricing(editService.pricing_type, editService.base_price_min, editService.base_price_max, editService.fixed_price),
      general: ''
    };

    setEditValidationErrors(errors);

    // Return true if no errors
    return !Object.values(errors).some(error => error !== '');
  };

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await serviceApi.getServices();
        if (response.success && response.data) {
          //console.log('Fetched services:', response.data);
          // Check if all services have service_id
          const servicesWithoutId = response.data.filter((service: Service) => !service.service_id);
          if (servicesWithoutId.length > 0) {
            console.error('Services missing service_id:', servicesWithoutId);
          }
          setServices(response.data);
        } else {
          setError('Failed to fetch services');
        }
      } catch (err) {
        setError('Error fetching services');
        console.error('Error fetching services:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Handle add service
  const handleAddService = async () => {
    // Validate form before submission
    if (!validateAddForm()) {
      return;
    }

    try {
      const serviceData = {
        service_name: newService.service_name,
        default_notes: newService.default_notes || undefined,
        fixed_price: newService.pricing_type === 'fixed' ? newService.fixed_price : undefined,
        base_price_min: newService.pricing_type === 'range' ? newService.base_price_min : undefined,
        base_price_max: newService.pricing_type === 'range' ? newService.base_price_max : undefined,
        service_time: newService.service_time,
        tooth_options: newService.tooth_options
      };
      //console.log('Adding service with data:', serviceData);
      const response = await serviceApi.createService(serviceData);
      console.log('Create service response:', response);
      if (response.success && response.data) {
        setServices(prev => [...prev, response.data as Service]);
        
        // Reset form
        setNewService({
          service_name: '',
          default_notes: '',
          pricing_type: 'range',
          base_price_min: 0,
          base_price_max: 0,
          fixed_price: 0,
          service_time: 30,
          tooth_options: []
        });

        setIsAddModalOpen(false);
        toast.success('Service created successfully!');
      } else {
        toast.error('Failed to create service');
      }
    } catch (err) {
      console.error('Error creating service:', err);
      toast.error('Error creating service');
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    if (field === 'service_name') {
      // Only allow letters, spaces, hyphens, and apostrophes
      const sanitizedValue = value.replace(/[^a-zA-Z\s\-']/g, '');
      setNewService(prev => ({
        ...prev,
        [field]: sanitizedValue
      }));
      // Clear validation error if user starts typing
      if (addValidationErrors.service_name) {
        setAddValidationErrors(prev => ({
          ...prev,
          service_name: ''
        }));
      }
    } else {
      setNewService(prev => ({
        ...prev,
        [field]: value
      }));
      // Clear validation errors for the field being changed
      if (addValidationErrors[field as keyof typeof addValidationErrors]) {
        setAddValidationErrors(prev => ({
          ...prev,
          [field]: ''
        }));
      }
    }
  };

  // Handle edit service
  const handleEditService = (service: Service) => {
    
    if (!service.service_id) {
      console.error('Service missing service_id:', service);
      toast.error('Error: Service ID is missing. Please refresh the page and try again.');
      return;
    }

    setEditingService(service);
    setEditService({
      service_name: service.service_name,
      default_notes: service.default_notes || '',
      pricing_type: service.fixed_price ? 'fixed' : 'range',
      base_price_min: service.base_price_min || 0,
      base_price_max: service.base_price_max || 0,
      fixed_price: service.fixed_price || 0,
      service_time: service.service_time || 30,
      tooth_options: service.tooth_options || [] // Initialize as empty array since we don't have this field in the current data model
    });
    setIsEditModalOpen(true);
  };

  // Handle update service
  const handleUpdateService = async () => {
    // Validate form before submission
    if (!validateEditForm()) {
      return;
    }

    if (!editingService || !editService.service_name.trim()) {
      toast.error('Please fill in service name');
      return;
    }

    if (!editingService.service_id) {
      console.error('Editing service missing service_id:', editingService);
      toast.error('Error: Service ID is missing. Please try editing the service again.');
      return;
    }

    try {
      const serviceData = {
        service_name: editService.service_name,
        default_notes: editService.default_notes || undefined,
        fixed_price: editService.pricing_type === 'fixed' ? editService.fixed_price : undefined,
        base_price_min: editService.pricing_type === 'range' ? editService.base_price_min : undefined,
        base_price_max: editService.pricing_type === 'range' ? editService.base_price_max : undefined,
        service_time: editService.service_time,
        tooth_options: editService.tooth_options
      };

      const response = await serviceApi.updateService(editingService.service_id, serviceData);

      if (response.success && response.data) {
        setServices(prev => prev.map(s =>
          s.service_id === editingService.service_id ? response.data as Service : s
        ));

        // Reset form and close modal
        setEditService({
          service_name: '',
          default_notes: '',
          pricing_type: 'range',
          base_price_min: 0,
          base_price_max: 0,
          fixed_price: 0,
          service_time: 30,
          tooth_options: []
        });
        setEditingService(null);
        setIsEditModalOpen(false);
        toast.success('Service updated successfully!');
      } else {
        toast.error('Failed to update service');
      }
    } catch (err) {
      console.error('Error updating service:', err);
      toast.error('Error updating service');
    }
  };

  // Handle edit form input changes
  const handleEditInputChange = (field: string, value: any) => {
    if (field === 'service_name') {
      // Only allow letters, spaces, hyphens, and apostrophes
      const sanitizedValue = value.replace(/[^a-zA-Z\s\-']/g, '');
      setEditService(prev => ({
        ...prev,
        [field]: sanitizedValue
      }));
      // Clear validation error if user starts typing
      if (editValidationErrors.service_name) {
        setEditValidationErrors(prev => ({
          ...prev,
          service_name: ''
        }));
      }
    } else {
      setEditService(prev => ({
        ...prev,
        [field]: value
      }));
      // Clear validation errors for the field being changed
      if (editValidationErrors[field as keyof typeof editValidationErrors]) {
        setEditValidationErrors(prev => ({
          ...prev,
          [field]: ''
        }));
      }
    }
  };

  // Handle delete service
  const handleDeleteService = (service: Service) => {
    setServiceToDelete(service);
    setIsDeleteModalOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;

    if (!serviceToDelete.service_id) {
      console.error('Service to delete missing service_id:', serviceToDelete);
      toast.error('Error: Service ID is missing. Please try deleting the service again.');
      return;
    }

    try {
      const response = await serviceApi.deleteService(serviceToDelete.service_id);

      if (response.success) {
        setServices(prev => prev.filter(s => s.service_id !== serviceToDelete.service_id));
        setIsDeleteModalOpen(false);
        setServiceToDelete(null);
        toast.success('Service deleted successfully!');
      } else {
        toast.error('Failed to delete service');
      }
    } catch (err) {
      console.error('Error deleting service:', err);
      toast.error('Error deleting service');
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setServiceToDelete(null);
  };

  // Get category from service name (simplified categorization)
  const getServiceCategory = (serviceName: string): string => {
    const name = serviceName.toLowerCase();
    if (name.includes('consultation') || name.includes('checkup')) return 'Consultation';
    if (name.includes('cleaning') || name.includes('prophylaxis')) return 'Dental Care';
    if (name.includes('x-ray') || name.includes('examination')) return 'Diagnostic';
    if (name.includes('whitening') || name.includes('cosmetic')) return 'Cosmetic';
    return 'Treatment';
  };

  // Filtered services based on search and filters
  const filteredServices = useMemo(() => {
    
    return services.filter((service) => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.default_notes && service.default_notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter - simplified since we don't have categories in DB
      const serviceCategory = getServiceCategory(service.service_name);
      const matchesCategory = selectedCategory === 'all' ||
        serviceCategory.toLowerCase().replace(' ', '-') === selectedCategory;

      // Status filter - all services are considered active since we don't have is_active field
      const matchesStatus = true; // All services are active by default

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [services, searchTerm, selectedCategory]);

  const getCategoryBadge = (category: string) => {
    const colors = {
      'Consultation': 'bg-blue-100 text-blue-800',
      'Dental Care': 'bg-green-100 text-green-800',
      'Diagnostic': 'bg-purple-100 text-purple-800',
      'Treatment': 'bg-orange-100 text-orange-800',
      'Cosmetic': 'bg-pink-100 text-pink-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const toothOptions = [
    { id: 1, description: 'Full Mouth' },
    { id: 2, description: 'Arch' },
    { id: 3, description: 'Quadrant' },
    { id: 4, description: 'Single Tooth Number' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading services...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services</h2>
          <p className="text-muted-foreground">
            Manage dental services and pricing
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="dental-care">Dental Care</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="cosmetic">Cosmetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* Add Service Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New Service</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Create a new dental service with pricing and details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="service-name">Service Name *</Label>
                  <Input
                    id="service-name"
                    placeholder="e.g., Dental Filling"
                    value={newService.service_name}
                    onChange={(e) => handleInputChange('service_name', e.target.value)}
                    onBlur={() => {
                      const error = validateServiceName(newService.service_name);
                      setAddValidationErrors(prev => ({
                        ...prev,
                        service_name: error
                      }));
                    }}
                    className={addValidationErrors.service_name ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {addValidationErrors.service_name && (
                    <p className="text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {addValidationErrors.service_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Only letters, spaces, hyphens, and apostrophes are allowed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-description">Description/Notes</Label>
                  <Textarea
                    id="service-description"
                    placeholder="Describe the service..."
                    value={newService.default_notes}
                    onChange={(e) => handleInputChange('default_notes', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-time">Service Duration (minutes)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="service-time"
                      type="number"
                      min="5"
                      max="480"
                      step="5"
                      placeholder="30"
                      value={newService.service_time || ''}
                      onChange={(e) => handleInputChange('service_time', parseInt(e.target.value) || 30)}
                      onBlur={() => {
                        const error = validateServiceTime(newService.service_time);
                        setAddValidationErrors(prev => ({
                          ...prev,
                          service_time: error
                        }));
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={`w-32 ${addValidationErrors.service_time ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {newService.service_time >= 60 
                        ? `${Math.floor(newService.service_time / 60)}h ${newService.service_time % 60}m`
                        : `${newService.service_time}m`
                      }
                    </span>
                  </div>
                  {addValidationErrors.service_time && (
                    <p className="text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {addValidationErrors.service_time}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter the typical duration for this service (5-480 minutes)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Tooth Options</Label>
                  <div className="space-y-2">
                    {toothOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <input
                          key={`checkbox-${option.id}`}
                          type="checkbox"
                          id={`tooth-${option.id}`}
                          checked={newService.tooth_options.some(opt => opt.id === option.id)}
                          onChange={(e) => {
                            const updatedOptions = e.target.checked
                              ? [...newService.tooth_options, option]
                              : newService.tooth_options.filter(opt => opt.id !== option.id);
                            handleInputChange('tooth_options', updatedOptions);
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label
                          htmlFor={`tooth-${option.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.description}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select applicable tooth options for this service
                  </p>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Pricing</h3>
                <div className="space-y-2">
                  <Label>Pricing Type</Label>
                  <Select
                    value={newService.pricing_type}
                    onValueChange={(value) => handleInputChange('pricing_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="range">Price Range</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newService.pricing_type === 'range' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-price">Minimum Price (PHP)</Label>
                      <Input
                        id="min-price"
                        type="number"
                        placeholder="0.00"
                        value={newService.base_price_min || ''}
                        onChange={(e) => handleInputChange('base_price_min', parseFloat(e.target.value) || 0)}
                        onBlur={() => {
                          const pricingErrors = validatePricing(newService.pricing_type, newService.base_price_min, newService.base_price_max, newService.fixed_price);
                          setAddValidationErrors(prev => ({
                            ...prev,
                            base_price_min: pricingErrors.base_price_min,
                            base_price_max: pricingErrors.base_price_max
                          }));
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className={addValidationErrors.base_price_min ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {addValidationErrors.base_price_min && (
                        <p className="text-xs text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {addValidationErrors.base_price_min}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-price">Maximum Price (PHP)</Label>
                      <Input
                        id="max-price"
                        type="number"
                        placeholder="0.00"
                        value={newService.base_price_max || ''}
                        onChange={(e) => handleInputChange('base_price_max', parseFloat(e.target.value) || 0)}
                        onBlur={() => {
                          const pricingErrors = validatePricing(newService.pricing_type, newService.base_price_min, newService.base_price_max, newService.fixed_price);
                          setAddValidationErrors(prev => ({
                            ...prev,
                            base_price_min: pricingErrors.base_price_min,
                            base_price_max: pricingErrors.base_price_max
                          }));
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className={addValidationErrors.base_price_max ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {addValidationErrors.base_price_max && (
                        <p className="text-xs text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {addValidationErrors.base_price_max}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="fixed-price">Fixed Price (PHP)</Label>
                    <Input
                      id="fixed-price"
                      type="number"
                      placeholder="0.00"
                      value={newService.fixed_price || ''}
                      onChange={(e) => handleInputChange('fixed_price', parseFloat(e.target.value) || 0)}
                      onBlur={() => {
                        const pricingErrors = validatePricing(newService.pricing_type, newService.base_price_min, newService.base_price_max, newService.fixed_price);
                        setAddValidationErrors(prev => ({
                          ...prev,
                          fixed_price: pricingErrors.fixed_price
                        }));
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={addValidationErrors.fixed_price ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {addValidationErrors.fixed_price && (
                      <p className="text-xs text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {addValidationErrors.fixed_price}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Duration and Status */}
              {/* <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Details</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Duration and status settings are not available in the current database schema.
                    All services are considered active by default.
                  </p>
                </div>
              </div> */}
            </CardContent>
            <div className="flex items-center justify-end space-x-2 p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddService}>
                Add Service
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Service Modal */}
      {isEditModalOpen && editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Service</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Update the service details and pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-service-name">Service Name *</Label>
                  <Input
                    id="edit-service-name"
                    placeholder="e.g., Dental Filling"
                    value={editService.service_name}
                    onChange={(e) => handleEditInputChange('service_name', e.target.value)}
                    onBlur={() => {
                      const error = validateServiceName(editService.service_name);
                      setEditValidationErrors(prev => ({
                        ...prev,
                        service_name: error
                      }));
                    }}
                    className={editValidationErrors.service_name ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {editValidationErrors.service_name && (
                    <p className="text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {editValidationErrors.service_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Only letters, spaces, hyphens, and apostrophes are allowed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-service-description">Description/Notes</Label>
                  <Textarea
                    id="edit-service-description"
                    placeholder="Describe the service..."
                    value={editService.default_notes}
                    onChange={(e) => handleEditInputChange('default_notes', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-service-time">Service Duration (minutes)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="edit-service-time"
                      type="number"
                      min="5"
                      max="480"
                      step="5"
                      placeholder="30"
                      value={editService.service_time || ''}
                      onChange={(e) => handleEditInputChange('service_time', parseInt(e.target.value) || 30)}
                      onBlur={() => {
                        const error = validateServiceTime(editService.service_time);
                        setEditValidationErrors(prev => ({
                          ...prev,
                          service_time: error
                        }));
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={`w-32 ${editValidationErrors.service_time ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {editService.service_time >= 60 
                        ? `${Math.floor(editService.service_time / 60)}h ${editService.service_time % 60}m`
                        : `${editService.service_time}m`
                      }
                    </span>
                  </div>
                  {editValidationErrors.service_time && (
                    <p className="text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {editValidationErrors.service_time}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter the typical duration for this service (5-480 minutes)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Tooth Options</Label>
                  <div className="space-y-2">
                    {toothOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <input
                          key={`edit-checkbox-${option.id}`}
                          type="checkbox"
                          id={`edit-tooth-${option.id}`}
                          checked={editService.tooth_options.some(opt => opt.id === option.id)}
                          onChange={(e) => {
                            const updatedOptions = e.target.checked
                              ? [...editService.tooth_options, option]
                              : editService.tooth_options.filter(opt => opt.id !== option.id);
                            handleEditInputChange('tooth_options', updatedOptions);
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label
                          htmlFor={`edit-tooth-${option.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.description}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select applicable tooth options for this service
                  </p>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Pricing</h3>
                <div className="space-y-2">
                  <Label>Pricing Type</Label>
                  <Select
                    value={editService.pricing_type}
                    onValueChange={(value) => handleEditInputChange('pricing_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="range">Price Range</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editService.pricing_type === 'range' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-min-price">Minimum Price (PHP)</Label>
                      <Input
                        id="edit-min-price"
                        type="number"
                        placeholder="0.00"
                        value={editService.base_price_min || ''}
                        onChange={(e) => handleEditInputChange('base_price_min', parseFloat(e.target.value) || 0)}
                        onBlur={() => {
                          const pricingErrors = validatePricing(editService.pricing_type, editService.base_price_min, editService.base_price_max, editService.fixed_price);
                          setEditValidationErrors(prev => ({
                            ...prev,
                            base_price_min: pricingErrors.base_price_min,
                            base_price_max: pricingErrors.base_price_max
                          }));
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className={editValidationErrors.base_price_min ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {editValidationErrors.base_price_min && (
                        <p className="text-xs text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {editValidationErrors.base_price_min}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-max-price">Maximum Price (PHP)</Label>
                      <Input
                        id="edit-max-price"
                        type="number"
                        placeholder="0.00"
                        value={editService.base_price_max || ''}
                        onChange={(e) => handleEditInputChange('base_price_max', parseFloat(e.target.value) || 0)}
                        onBlur={() => {
                          const pricingErrors = validatePricing(editService.pricing_type, editService.base_price_min, editService.base_price_max, editService.fixed_price);
                          setEditValidationErrors(prev => ({
                            ...prev,
                            base_price_min: pricingErrors.base_price_min,
                            base_price_max: pricingErrors.base_price_max
                          }));
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className={editValidationErrors.base_price_max ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {editValidationErrors.base_price_max && (
                        <p className="text-xs text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {editValidationErrors.base_price_max}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="edit-fixed-price">Fixed Price (PHP)</Label>
                    <Input
                      id="edit-fixed-price"
                      type="number"
                      placeholder="0.00"
                      value={editService.fixed_price || ''}
                      onChange={(e) => handleEditInputChange('fixed_price', parseFloat(e.target.value) || 0)}
                      onBlur={() => {
                        const pricingErrors = validatePricing(editService.pricing_type, editService.base_price_min, editService.base_price_max, editService.fixed_price);
                        setEditValidationErrors(prev => ({
                          ...prev,
                          fixed_price: pricingErrors.fixed_price
                        }));
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={editValidationErrors.fixed_price ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {editValidationErrors.fixed_price && (
                      <p className="text-xs text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {editValidationErrors.fixed_price}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Duration and Status */}
              {/* <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Details</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Duration and status settings are not available in the current database schema.
                    All services are considered active by default.
                  </p>
                </div>
              </div> */}
            </CardContent>
            <div className="flex items-center justify-end space-x-2 p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateService}>
                Update Service
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && serviceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Delete Service</CardTitle>
              <CardDescription>
                Are you sure you want to delete this service? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">{serviceToDelete.service_name}</h4>
                      <p className="text-sm text-red-700 mt-1">
                        {serviceToDelete.default_notes || 'No description'}
                      </p>
                      <p className="text-sm text-red-600 mt-2">
                        {serviceToDelete.fixed_price ? (
                          <span>Price: {formatCurrency(serviceToDelete.fixed_price)}</span>
                        ) : (
                          <span>
                            Price Range: {formatCurrency(serviceToDelete.base_price_min || 0)} - {formatCurrency(serviceToDelete.base_price_max || 0)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>• This will permanently remove the service from the catalog</p>
                  <p>• Any existing invoices using this service will not be affected</p>
                  <p>• You can always create a new service with the same details</p>
                </div>
              </div>
            </CardContent>
            <div className="flex items-center justify-end space-x-2 p-6 pt-0">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Service
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Catalog</CardTitle>
          <CardDescription>
            A list of all available dental services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Service</th>
                  <th className="text-left py-3 px-4 font-medium">Category</th>
                  <th className="text-left py-3 px-4 font-medium">Duration</th>
                  <th className="text-left py-3 px-4 font-medium">Pricing</th>
                  <th className="text-left py-3 px-4 font-medium">Created</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => {
                  const category = getServiceCategory(service.service_name);
                  return (
                    <tr key={service.service_id || `service-${service.service_name}-${Math.random()}`} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{service.service_name}</div>
                          <div className="text-sm text-muted-foreground">{service.default_notes || 'No description'}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getCategoryBadge(category)}>
                          {category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {service.service_time ? (
                            service.service_time >= 60 
                              ? `${Math.floor(service.service_time / 60)}h ${service.service_time % 60}m`
                              : `${service.service_time}m`
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {service.fixed_price ? (
                          <div className="font-medium">{formatCurrency(service.fixed_price)}</div>
                        ) : (
                          <div>
                            <div className="font-medium">{formatCurrency(service.base_price_min || 0)}</div>
                            <div className="text-sm text-muted-foreground">to {formatCurrency(service.base_price_max || 0)}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {new Date(service.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditService(service)}
                            disabled={!service.service_id}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteService(service)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={!service.service_id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredServices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No services found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredServices.length}</div>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredServices.length}
            </div>
            <p className="text-xs text-muted-foreground">All services are active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredServices.map(s => getServiceCategory(s.service_name))).size}
            </div>
            <p className="text-xs text-muted-foreground">Service categories</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
