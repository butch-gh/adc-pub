import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { inventoryApi, Supplier } from '@/lib/inventory-api';

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
  mode: 'add' | 'edit';
}

export function SupplierForm({ isOpen, onClose, onSuccess, supplier, mode }: SupplierFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  // Reset form when dialog opens/closes or supplier changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && supplier) {
        setFormData({
          supplier_name: supplier.supplier_name,
          contact_person: supplier.contact_person || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
          address: supplier.address || ''
        });
      } else {
        setFormData({
          supplier_name: '',
          contact_person: '',
          phone: '',
          email: '',
          address: ''
        });
      }
      setError(null);
    }
  }, [isOpen, supplier, mode]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'add') {
        await inventoryApi.createSupplier(formData);
      } else if (mode === 'edit' && supplier) {
        await inventoryApi.updateSupplier(supplier.supplier_id, formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${mode} supplier`);
      console.error(`Error ${mode}ing supplier:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add New Supplier' : 'Edit Supplier'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Add a new supplier to the system.'
              : 'Update supplier information.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_name">Supplier Name *</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => {
                  // Only allow alphanumeric characters, spaces, hyphens, apostrophes, and periods
                  const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9\s\-'.]/g, '');
                  handleInputChange('supplier_name', sanitizedValue);
                }}
                placeholder="Enter supplier name"
                required
                disabled={loading}
              />
              {/* <p className="text-xs text-gray-500">
                Only letters, numbers, spaces, hyphens, apostrophes, and periods are allowed
              </p> */}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person *</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => {
                  // Only allow alphanumeric characters, spaces, hyphens, apostrophes, and periods
                  const sanitizedValue = e.target.value.replace(/[^a-zA-Z\s\-'.]/g, '');
                  handleInputChange('contact_person', sanitizedValue);
                }}
                placeholder="Enter contact person"
                required
                disabled={loading}
              />
              {/* <p className="text-xs text-gray-500">
                Only letters, numbers, spaces, hyphens, apostrophes, and periods are allowed
              </p> */}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">+63</span>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    // Only allow 10 digits, cannot start with 0
                    let sanitizedValue = e.target.value.replace(/[^0-9]/g, '');
                    
                    // Remove leading zeros and limit to 10 digits
                    if (sanitizedValue.startsWith('0')) {
                      sanitizedValue = sanitizedValue.substring(1);
                    }
                    sanitizedValue = sanitizedValue.substring(0, 10);
                    
                    handleInputChange('phone', sanitizedValue);
                  }}
                  placeholder="9123456789"
                  required
                  disabled={loading}
                  minLength={10}
                  maxLength={10}
                  className="pl-12"
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter 10-digit mobile number (cannot start with 0)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  // Basic email validation - allow common email characters
                  const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9@._\-]/g, '');
                  handleInputChange('email', sanitizedValue);
                }}
                placeholder="Enter email address"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Enter a valid email address (e.g., name@company.com)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => {
                // Allow alphanumeric characters, spaces, and common address punctuation
                const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9\s\-.,#&()/]/g, '');
                handleInputChange('address', sanitizedValue);
              }}
              placeholder="Enter full address"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Address can include letters, numbers, spaces, and common punctuation (.,-#&()/)</p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (mode === 'add' ? 'Add Supplier' : 'Update Supplier')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}