import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Filter, Download, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/inventory-api';
import { InventoryItem } from '@/lib/inventory-api';
import { ProductForm } from './ProductForm';
import * as XLSX from 'xlsx';
import ItemsListPDFGenerator from './ItemsListPDFGenerator';

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

export interface categories {
  category_id: number;
  category_name: string;
}

interface SupplierOption {
    supplier_id: number;
    supplier_name: string;
  }

export function ItemsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');

  // Product form states
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormMode, setProductFormMode] = useState<'create' | 'edit'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [categoryOptions, setCategoryOptions] = useState<categories[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);


  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryApi.getInventory({ limit: 100 }); // Fetch more items
      console.log('[DATA] - API response:', response);
      // Map API response to component format
      const mappedProducts: Product[] = response.data.map((item: InventoryItem) => ({
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        category_id: item.category_id || 0,
        category_name: item.category_name || 'Uncategorized',
        supplier_id: item.supplier_id || 0,
        supplier_name: `Supplier ${item.supplier_name || 'N/A'}`, // Placeholder, could fetch supplier name separately
        unit_of_measure: item.unit_of_measure,        
        storage_location: item.storage_location,
        reorder_level: item.reorder_level,
        created_at: item.created_at || '', // Add created_at property, fallback to empty string if missing
      }));

      setProducts(mappedProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export filtered products to CSV
  const exportToCSV = () => {
    const headers = ['Product', 'Category', 'Supplier', 'Unit of Measure', 'Re-Order Level', 'Storage Location'];
    const csvData = filteredProducts.map(product => [
      product.item_name,
      product.category_name,      
      product.supplier_name,
      product.unit_of_measure,
      product.reorder_level,
      product.storage_location
    ]);

                  // <th className="text-left py-3 px-4 font-medium">Product</th>
                  // <th className="text-left py-3 px-4 font-medium">Category</th>                  
                  // <th className="text-left py-3 px-4 font-medium">Supplier</th>
                  // <th className="text-left py-3 px-4 font-medium">Unit of Measure</th>
                  // <th className="text-left py-3 px-4 font-medium">Re-Order Level</th>
                  // <th className="text-left py-3 px-4 font-medium">Storage Location</th> 

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredProducts.map(product => ({
      'Product Code': product.item_code,
      'Product Name': product.item_name,
      'Category': product.category_name,
      'Supplier': product.supplier_name,
      'Unit of Measure': product.unit_of_measure,
      'Re-Order Level': product.reorder_level,
      'Storage Location': product.storage_location,
      'Created Date': new Date(product.created_at).toLocaleDateString()
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Inventory');
    XLSX.writeFile(workbook, `product-inventory-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedSupplier('all');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || selectedCategory !== 'all' || selectedSupplier !== 'all';

  // Filter products based on search term, category, and supplier
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      (product.item_name && product.item_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      //(product.item_code && product.item_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.category_name && product.category_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.supplier_name && product.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.unit_of_measure && product.unit_of_measure.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || product.category_id === parseInt(selectedCategory);
    const matchesSupplier = selectedSupplier === 'all' || product.supplier_id === parseInt(selectedSupplier);
    
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  // Get unique categories from products
  // Get unique statuses from products
  //const uniqueStatuses = Array.from(new Set(products.map(product => product.status))).sort();

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





  // Handle opening the product form for creating
  const handleAddProduct = () => {
    setProductFormMode('create');
    setSelectedProduct(undefined);
    setIsProductFormOpen(true);
  };

  // Handle opening the product form for editing
  const handleEditProduct = (product: Product) => {
    setProductFormMode('edit');
    setSelectedProduct(product);
    setIsProductFormOpen(true);
  };

  // Handle successful form submission
  const handleProductFormSuccess = () => {
    fetchProducts(); // Refresh the product list
  };

  // Handle closing the product form
  const handleProductFormClose = () => {
    setIsProductFormOpen(false);
    setSelectedProduct(undefined);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600 mt-1">Loading products...</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">Loading inventory data...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600 mt-1">Manage your inventory products and stock levels</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-64">
              <div className="text-red-500">{error}</div>
              <Button onClick={fetchProducts} className="ml-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your inventory products and stock levels</p>
        </div>
        <div className="flex space-x-2">

        <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <ItemsListPDFGenerator
              products={filteredProducts}
              fileName={`product-inventory-${new Date().toISOString().split('T')[0]}.pdf`}
            />
        <Button onClick={handleAddProduct}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.category_id} value={category.category_id.toString()}>
                    {category.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {supplierOptions.map((supplier) => (
                  <SelectItem key={supplier.supplier_id} value={supplier.supplier_id.toString()}>
                    {supplier.supplier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters}>
              <Filter className="w-4 h-4 mr-2" />
              {hasActiveFilters ? 'Clear Filters' : 'Filter'}
            </Button>
            {/* <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <ItemsListPDFGenerator
              products={filteredProducts}
              fileName={`product-inventory-${new Date().toISOString().split('T')[0]}.pdf`}
            /> */}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
          <CardDescription>
            Current stock levels and product information
            {hasActiveFilters && (
              <span className="text-sm text-blue-600 ml-2">
                Showing {filteredProducts.length} of {products.length} products
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Product</th>
                  <th className="text-left py-3 px-4 font-medium">Category</th>                  
                  <th className="text-left py-3 px-4 font-medium">Supplier</th>
                  <th className="text-left py-3 px-4 font-medium">Unit of Measure</th>
                  <th className="text-left py-3 px-4 font-medium">Re-Order Level</th>
                  <th className="text-left py-3 px-4 font-medium">Storage Location</th>                  
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-gray-500">
                      {hasActiveFilters ? 'No products match your filters.' : 'No products found.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.item_id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{product.item_name}</td>
                      <td className="py-3 px-4">{product.category_name}</td>                                            
                      <td className="py-3 px-4">{product.supplier_name}</td>
                      <td className="py-3 px-4">{product.unit_of_measure}</td>
                      <td className="py-3 px-4">{product.reorder_level}</td>
                      <td className="py-3 px-4">{product.storage_location}</td>                                                                  
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Product Form Modal */}
      <ProductForm
        isOpen={isProductFormOpen}
        onClose={handleProductFormClose}
        onSuccess={handleProductFormSuccess}
        mode={productFormMode}
        product={selectedProduct}
        categories={categoryOptions.map(cat => cat.category_name)}
      />
    </div>
  );
}
