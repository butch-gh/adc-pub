import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Truck, Phone, Mail, MapPin, Search, Edit, Trash2, Download, AlertTriangle } from 'lucide-react';
import { inventoryApi, Supplier } from '@/lib/inventory-api';
import { SupplierForm } from './SupplierForm';
import * as XLSX from 'xlsx';
import SuppliersPDFGenerator from './SuppliersPDFGenerator';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Fetch suppliers on component mount and when search changes
  useEffect(() => {
    fetchSuppliers();
  }, [searchTerm]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryApi.getSuppliers({
        search: searchTerm || undefined,
        limit: 100 // Get all suppliers for now
      });
      setSuppliers(response.data);
    } catch (err) {
      setError('Failed to fetch suppliers');
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setFormMode('add');
    setIsFormOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    try {
      await inventoryApi.deleteSupplier(supplierToDelete.supplier_id);
      fetchSuppliers(); // Refresh the list
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete supplier');
      console.error('Error deleting supplier:', err);
    }
  };

  const handleFormSuccess = () => {
    fetchSuppliers(); // Refresh the list
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingSupplier(null);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Supplier Name', 'Contact Person', 'Phone', 'Email', 'Address'];
    const csvData = suppliers.map(supplier => [
      supplier.supplier_name,
      supplier.contact_person || '',
      supplier.phone || '',
      supplier.email || '',
      supplier.address || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `suppliers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(suppliers.map(supplier => ({
      'Supplier Name': supplier.supplier_name,
      'Contact Person': supplier.contact_person || '',
      'Phone': supplier.phone || '',
      'Email': supplier.email || '',
      'Address': supplier.address || '',
      'Created Date': supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : ''
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
    XLSX.writeFile(workbook, `suppliers-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Suppliers Management</h1>
          <p className="text-gray-600 mt-1">Manage supplier information and contacts</p>
        </div>
        <Button onClick={handleAddSupplier}>
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Search/Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Suppliers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, contact person, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Suppliers List
              </CardTitle>
              <CardDescription>
                View and manage all suppliers
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={suppliers.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={suppliers.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <SuppliersPDFGenerator suppliers={suppliers} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading suppliers...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-600">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      {searchTerm ? 'No suppliers found matching your search.' : 'No suppliers found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.supplier_id}>
                      <TableCell className="font-medium">{supplier.supplier_name}</TableCell>
                      <TableCell>{supplier.contact_person || '-'}</TableCell>
                      <TableCell>
                        {supplier.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-1 text-gray-500" />
                            {supplier.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.email && (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1 text-gray-500" />
                            {supplier.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.address && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                            {supplier.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSupplier(supplier)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSupplier(supplier)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Supplier Form Dialog */}
      <SupplierForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        supplier={editingSupplier}
        mode={formMode}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
              Delete Supplier
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{supplierToDelete?.supplier_name}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSupplierToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteSupplier}
            >
              Delete Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}