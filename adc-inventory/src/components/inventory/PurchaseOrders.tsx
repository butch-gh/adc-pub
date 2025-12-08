import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { inventoryApi, PurchaseOrder, PurchaseOrderResponse, Supplier } from '@/lib/inventory-api';
import { PurchaseOrderForm } from './PurchaseOrderForm';

export function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | undefined>();
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  useEffect(() => {
    loadPurchaseOrders();
    loadSuppliers();
  }, [currentPage, searchTerm, statusFilter, supplierFilter]);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        supplier_id: supplierFilter !== 'all' ? parseInt(supplierFilter) : undefined
      };

      const response: PurchaseOrderResponse = await inventoryApi.getPurchaseOrders(params);
      setPurchaseOrders(response.data);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      setError('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await inventoryApi.getSuppliers({ limit: 100 });
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Approved':
        return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
      case 'Received':
        return <Badge className="bg-green-100 text-green-800">Received</Badge>;
      case 'Cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreate = () => {
    setSelectedPurchaseOrder(undefined);
    setFormMode('create');
    setShowForm(true);
  };

  const handleEdit = async (purchaseOrder: PurchaseOrder) => {
    try {
      // Load full purchase order with items
      const fullPurchaseOrder = await inventoryApi.getPurchaseOrder(purchaseOrder.po_id);
      setSelectedPurchaseOrder(fullPurchaseOrder);
      setFormMode('edit');
      setShowForm(true);
    } catch (error) {
      console.error('Error loading purchase order for edit:', error);
      setError('Failed to load purchase order details');
    }
  };

  const handleView = async (purchaseOrder: PurchaseOrder) => {
    try {
      // Load full purchase order with items
      const fullPurchaseOrder = await inventoryApi.getPurchaseOrder(purchaseOrder.po_id);
      setSelectedPurchaseOrder(fullPurchaseOrder);
      setFormMode('view');
      setShowForm(true);
    } catch (error) {
      console.error('Error loading purchase order for view:', error);
      setError('Failed to load purchase order details');
    }
  };

  const handleDelete = async (purchaseOrder: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to delete purchase order ${purchaseOrder.po_number}?`)) {
      return;
    }

    try {
      await inventoryApi.deletePurchaseOrder(purchaseOrder.po_id);
      loadPurchaseOrders();
    } catch (error: any) {
      console.error('Error deleting purchase order:', error);
      setError(error.response?.data?.message || 'Failed to delete purchase order');
    }
  };

  const handleFormSave = () => {
    loadPurchaseOrders();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedPurchaseOrder(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage purchase orders and track deliveries</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Purchase Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search by PO number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.supplier_id} value={supplier.supplier_id.toString()}>
                      {supplier.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSupplierFilter('all');
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Purchase Orders List
          </CardTitle>
          <CardDescription>
            View and manage all purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading purchase orders...</div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No purchase orders found.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>                    
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow key={po.po_id}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{po.supplier_name}</TableCell>
                      <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell>{po.items_count || 0} items</TableCell>
                      {/* <TableCell>${po.total_amount ? parseFloat(po.total_amount.toString()).toFixed(2) : '0.00'}</TableCell> */}
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(po)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(po)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(po)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4 space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Purchase Order Form Dialog */}
      <PurchaseOrderForm
        purchaseOrder={selectedPurchaseOrder}
        isOpen={showForm}
        onClose={handleFormClose}
        onSave={handleFormSave}
        mode={formMode}
      />
    </div>
  );
}
