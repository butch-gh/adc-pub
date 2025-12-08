import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { inventoryApi } from '@/lib/inventory-api';


interface Product {
  item_id: number;
  item_code: string;
  item_name: string;
  category_id: number;
  category_name: string;
  supplier_id: number;
  supplier_name: string;
  unit_of_measure: string;
  reorder_level: number;  
  storage_location: string;
  created_at: string;
}

interface ProductFormData {
  item_code?: string;
  item_name: string;    
  category_id: string;
  supplier_id: string;
  unit_of_measure: string;
  reorder_level: string;
  storage_location?: string;
  created_at?: string;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  product?: Product;
  categories?: string[];
}

export interface categories {
  category_id: number;
  category_name: string;
}

interface SupplierOption {
    supplier_id: number;
    supplier_name: string;
  }

export function ProductForm({ isOpen, onClose, onSuccess, mode, product }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<categories[]>([]);
  
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    item_code: '',
    item_name: '',    
    category_id: '',
    supplier_id: '',
    unit_of_measure: '',
    reorder_level: '',    
    storage_location: '',    
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Initialize form data when editing or opening
  useEffect(() => {
    if (mode === 'edit' && product) {
      setFormData({
        item_code: product.item_code,
        item_name: product.item_name,        
        category_id: product.category_id.toString(),
        supplier_id: product.supplier_id.toString(),
        unit_of_measure: product.unit_of_measure,
        storage_location: product.storage_location?.toString() || '',
        reorder_level: product.reorder_level.toString(),        
      });
    } else if (mode === 'create') {
      setFormData({
        item_code: '',
        item_name: '',        
        category_id: '',
        supplier_id: '',
        unit_of_measure: '',
        reorder_level: '',
        storage_location: '',        
      });
    }
    setFormErrors({});
  }, [mode, product, isOpen]);



  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.item_name.trim()) {
      errors.item_name = 'Product name is required';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.item_name.trim())) {
      errors.item_name = 'Product name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    if (!formData.item_code?.trim()) {
      errors.item_code = 'Product code is required';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.item_code.trim())) {
      errors.item_code = 'Product code can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    if (!formData.category_id.trim()) {
      errors.category_id = 'Category is required';
    }

    if (!formData.unit_of_measure.trim()) {
      errors.unit_of_measure = 'Unit of measure is required';
    }
    

    if (!formData.reorder_level || isNaN(Number(formData.reorder_level)) || Number(formData.reorder_level) < 0) {
      errors.reorder_level = 'Valid reorder level is required';
    }

    if (!formData.storage_location?.trim()) {
      errors.storage_location = 'Storage location is required';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.storage_location.trim())) {
      errors.storage_location = 'Storage location can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const productData: any = {
        item_id: product?.item_id,
        item_code: (formData.item_code ?? '').trim(),
        item_name: formData.item_name.trim(),        
        category_id: Number(formData.category_id),
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : undefined,
        unit_of_measure: formData.unit_of_measure,
        reorder_level: Number(formData.reorder_level),        
        storage_location: formData.storage_location,
      };
      if (formData.supplier_id) {
        productData.supplier_id = Number(formData.supplier_id);
      }

      if (mode === 'create') {
        await inventoryApi.createInventoryItem(productData);
      } else if (mode === 'edit' && product) {
        await inventoryApi.updateInventoryItem(product.item_id, productData);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      setFormErrors({ submit: `Failed to ${mode === 'create' ? 'create' : 'update'} product. Please try again.` });
    } finally {
      setIsSubmitting(false);
    }
  };


      // get categories options from API
      useEffect(() => {
        async function fetchCategories() {
          try {
            const categories = await inventoryApi.getCategories();
            if (categories) {
              setCategoryOptions(categories);
            }
          } catch (error) {
            console.error('Error fetching categories:', error);
          }
        }
        fetchCategories();
      }, []);

      // get supplier options from API
      useEffect(() => {
        async function fetchSupplierOptions() {
          try {
            const suppliers = await inventoryApi.getSupplierOptions();
            if (suppliers) {
              setSupplierOptions(suppliers);
            }
          } catch (error) {
            console.error('Error fetching suppliers:', error);
          }
        }
        fetchSupplierOptions();
      }, []);


  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    // Sanitize input for fields that should not allow special characters
    if (field === 'item_name' || field === 'item_code' || field === 'storage_location') {
      // Remove any characters that are not letters, numbers, spaces, hyphens, or underscores
      value = value.replace(/[^a-zA-Z0-9\s\-_]/g, '');
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Product' : 'Edit Product'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Enter the details for the new product. All fields marked with * are required.'
              : 'Update the product details. All fields marked with * are required.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Product Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item_name" className="text-right">
                Product Name *
              </Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => handleInputChange('item_name', e.target.value)}
                className="col-span-3"
                placeholder="Enter product name"
              />
              {formErrors.item_name && (
                <div className="col-span-3 col-start-2 text-sm text-red-600">
                  {formErrors.item_name}
                </div>
              )}
            </div>

              {/* Product Code */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item_code" className="text-right">
                Code *
              </Label>
              <Input
                id="item_code"
                value={formData.item_code}
                onChange={(e) => handleInputChange('item_code', e.target.value)}
                className="col-span-3"
                placeholder="Enter product code"
              />
              {formErrors.item_code && (
                <div className="col-span-3 col-start-2 text-sm text-red-600">
                  {formErrors.item_code}
                </div>
              )}
            </div>

              {/* Categories Options */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category *
              </Label>
              <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.category_id} value={category.category_id.toString()}>
                      {category.category_name}
                    </SelectItem>
                  ))}                  
                </SelectContent>
              </Select>
              {formErrors.category && (
                <div className="col-span-3 col-start-2 text-sm text-red-600">
                  {formErrors.category}
                </div>
              )}
            </div>

            {/* Supplier Options */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier" className="text-right">
                Supplier
              </Label>
              <Select value={formData.supplier_id} onValueChange={(value) => handleInputChange('supplier_id', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {supplierOptions.map((supplier) => (
                    <SelectItem key={supplier.supplier_id} value={supplier.supplier_id.toString()}>
                      {supplier.supplier_name}
                    </SelectItem>
                  ))}                  
                </SelectContent>
              </Select>
              {formErrors.supplier && (
                <div className="col-span-3 col-start-2 text-sm text-red-600">
                  {formErrors.supplier}
                </div>
              )}
            </div>

            {/* Unit of Measure */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit_of_measure" className="text-right">
                Unit of Measure *
              </Label>
              <Select value={formData.unit_of_measure} onValueChange={(value) => handleInputChange('unit_of_measure', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select unit of measure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pieces</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="bottle">Bottle</SelectItem>
                  <SelectItem value="pack">Pack</SelectItem>
                  <SelectItem value="ml">Milliliters</SelectItem>
                  <SelectItem value="L">Liters</SelectItem>
                  <SelectItem value="g">Grams</SelectItem>
                  <SelectItem value="kg">Kilograms</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.unit_of_measure && (
                <div className="col-span-3 col-start-2 text-sm text-red-600">
                  {formErrors.unit_of_measure}
                </div>
              )}
            </div>

            {/* Reorder Level */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reorder_level" className="text-right">
                Reorder Level *
              </Label>
              <Input
                id="reorder_level"
                type="number"
                min="0"
                value={formData.reorder_level}
                onChange={(e) => handleInputChange('reorder_level', e.target.value)}
                className="col-span-3"
                placeholder="0"
              />
              {formErrors.reorder_level && (
                <div className="col-span-3 col-start-2 text-sm text-red-600">
                  {formErrors.reorder_level}
                </div>
              )}
            </div>

            

            {/* Storage Location */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="storage_location" className="text-right">
                Storage Location *
              </Label>
              <Input
                id="storage_location"
                type="text"
                value={formData.storage_location}
                onChange={(e) => handleInputChange('storage_location', e.target.value)}
                className="col-span-3"
                placeholder="Enter storage location"
              />
              {formErrors.storage_location && (
                <div className="col-span-3 col-start-2 text-sm text-red-600">
                  {formErrors.storage_location}
                </div>
              )}
            </div>

            {formErrors.submit && (
              <div className="col-span-4 text-sm text-red-600 text-center">
                {formErrors.submit}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? (mode === 'create' ? 'Adding...' : 'Updating...')
                : (mode === 'create' ? 'Add Product' : 'Update Product')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}