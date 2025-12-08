import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, FileDown, Mail } from 'lucide-react';
import { inventoryApi, PurchaseOrder, Supplier } from '@/lib/inventory-api';
import { useAuth } from '@repo/auth';
import { generatePurchaseOrderEmailHTML } from './PurchaseOrderEmailTemplate';
import { toast } from 'sonner';

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  mode: 'create' | 'edit' | 'view';
}

interface PurchaseOrderFormData {
  supplier_id: number;
  expected_delivery_date?: string;
  status: string;
  remarks?: string;
  created_by: string;
  items: Array<{
    item_id: number;
    item_name?: string;
    quantity_ordered: number;
    unit_cost: number;
    remarks?: string;
  }>;
}

export function PurchaseOrderForm({ purchaseOrder, isOpen, onClose, onSave, mode }: PurchaseOrderFormProps) {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplier_id: 0,
    expected_delivery_date: '',
    status: 'Pending',
    remarks: '',
    created_by: user?.full_name || user?.username || '',
    items: []
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [availableItems, setAvailableItems] = useState<Array<{item_id: number, item_name: string, item_code: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);``
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemFormData, setItemFormData] = useState({
    item_id: 0,
    quantity_ordered: 1,
    unit_cost: 0,
    item_name: '',
    remarks: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      loadAvailableItems();

      if ((mode === 'edit' || mode === 'view') && purchaseOrder) {
        setFormData({
          supplier_id: purchaseOrder.supplier_id,
          expected_delivery_date: purchaseOrder.expected_delivery_date || '',
          status: purchaseOrder.status,
          remarks: purchaseOrder.remarks || '',
          created_by: purchaseOrder.created_by || user?.full_name || user?.username || '',
          items: purchaseOrder.items?.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity_ordered: item.quantity_ordered,
            unit_cost: Number(item.unit_cost) || 0,
            remarks: item.remarks || ''
          })) || []
        });
      } else if (mode === 'create') {
        setFormData({
          supplier_id: 0,
          expected_delivery_date: '',
          status: 'Pending',
          remarks: '',
          created_by: user?.full_name || user?.username || '',
          items: []
        });
      }
    }
  }, [isOpen, mode, purchaseOrder, user]);

  const loadSuppliers = async () => {
    try {
      const response = await inventoryApi.getSuppliers({ limit: 100 });
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadAvailableItems = async () => {
    try {
      // Get all items from catalog for selection
      const response = await inventoryApi.getItemOptions();
      setAvailableItems(response.map((item: any) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        item_code: item.item_code        
      })));
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      setError('Please add at least one item to the purchase order');
      return;
    }

    if (!user) {
      setError('User authentication required. Please refresh the page and try again.');
      return;
    }

    // Ensure created_by is set
    const finalFormData = {
      ...formData,
      created_by: formData.created_by || user.full_name || user.username
    };

    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        await inventoryApi.createPurchaseOrder(finalFormData);
      } else if (mode === 'edit' && purchaseOrder) {
        await inventoryApi.updatePurchaseOrder(purchaseOrder.po_id, finalFormData);
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Purchase order save error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        setError('Purchase order number conflict detected. Please try again.');
      } else if (error.response?.status === 500 && error.response?.data?.message?.includes('unique')) {
        setError('A purchase order with this number already exists. Please try again.');
      } else {
        setError(error.response?.data?.message || 'Error saving purchase order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItemFormData({
      item_id: 0,
      quantity_ordered: 1,
      unit_cost: 0,
      item_name: '',
      remarks: ''
    });
    setEditingItemIndex(null);
    setShowItemDialog(true);
  };

  const editItem = (index: number) => {
    const item = formData.items[index];
    setItemFormData({
      item_id: item.item_id,
      quantity_ordered: item.quantity_ordered,
      unit_cost: Number(item.unit_cost) || 0,
      item_name: item.item_name ?? '',
      remarks: item.remarks || ''
    });
    setEditingItemIndex(index);
    setShowItemDialog(true);
  };

  const saveItem = () => {
    const selectedItem = availableItems.find(item => item.item_id === itemFormData.item_id);
    if (!selectedItem) return;

    const itemData = {
      item_id: itemFormData.item_id,
      item_name: selectedItem.item_name,
      quantity_ordered: itemFormData.quantity_ordered,
      unit_cost: itemFormData.unit_cost,
      remarks: itemFormData.remarks
    };

    if (editingItemIndex !== null) {
      // Update existing item
      const newItems = [...formData.items];
      newItems[editingItemIndex] = itemData;
      setFormData({ ...formData, items: newItems });
    } else {
      // Add new item
      setFormData({ ...formData, items: [...formData.items, itemData] });
    }

    setShowItemDialog(false);
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const generatePDF = () => {
    if (!purchaseOrder) return;
    
    // Create a new window for the PDF content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const supplier = suppliers.find(s => s.supplier_id === formData.supplier_id);
    const totalAmount = formData.items.reduce((total, item) => total + (item.quantity_ordered * (Number(item.unit_cost) || 0)), 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order ${purchaseOrder.po_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .details { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .details div { flex: 1; }
          .items table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items th { background-color: #f2f2f2; }
          .total { text-align: right; font-weight: bold; font-size: 18px; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .status.pending { background-color: #fef3c7; color: #92400e; }
          .status.approved { background-color: #dbeafe; color: #1e40af; }
          .status.received { background-color: #dcfce7; color: #166534; }
          .status.cancelled { background-color: #fee2e2; color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PURCHASE ORDER</h1>
          <h2>${purchaseOrder.po_number}</h2>
        </div>
        
        <div class="details">
          <div>
            <h3>Supplier Details:</h3>
            <p><strong>${supplier?.supplier_name || 'Unknown Supplier'}</strong></p>
            ${supplier?.contact_person ? `<p>Contact: ${supplier.contact_person}</p>` : ''}
            ${supplier?.phone ? `<p>Phone: ${supplier.phone}</p>` : ''}
            ${supplier?.email ? `<p>Email: ${supplier.email}</p>` : ''}
          </div>
          <div>
            <h3>Order Details:</h3>
            <p><strong>Order Date:</strong> ${new Date(purchaseOrder.order_date).toLocaleDateString()}</p>
            <p><strong>Expected Delivery:</strong> ${formData.expected_delivery_date ? new Date(formData.expected_delivery_date).toLocaleDateString() : 'Not specified'}</p>
            <p><strong>Status:</strong> <span class="status ${formData.status.toLowerCase()}">${formData.status}</span></p>
            <p><strong>Created By:</strong> ${formData.created_by}</p>
          </div>
        </div>

        ${formData.remarks ? `<div style="margin-bottom: 20px;"><strong>Remarks:</strong> ${formData.remarks}</div>` : ''}
        
        <div class="items">
          <h3>Items Ordered:</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Subtotal</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${formData.items.map(item => `
                <tr>
                  <td>${item.item_name || ''}</td>
                  <td>${item.quantity_ordered}</td>
                  <td>₱${(Number(item.unit_cost) || 0).toFixed(2)}</td>
                  <td>₱${((item.quantity_ordered || 0) * (Number(item.unit_cost) || 0)).toFixed(2)}</td>
                  <td>${item.remarks || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="total">
          <p>Total Amount: ₱${totalAmount.toFixed(2)}</p>
        </div>
        
        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
          Generated on ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleSendEmail = async () => {
    if (!purchaseOrder) return;

    const supplier = suppliers.find(s => s.supplier_id === formData.supplier_id);
    //console.log('[TRACE] - Supplier for Email:', supplier);
    if (!supplier?.email) {
      toast.error('Supplier email address not available');
      return;
    }

    try {
      const emailHTML = generatePurchaseOrderEmailHTML(purchaseOrder, supplier, formData);

      const apiEmailParam = {
        to: supplier.email,
        subject: `Purchase Order ${purchaseOrder.po_number} - ADC Dental Clinic`,
        html: emailHTML,
      };

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const emailResponse = await fetch(`${import.meta.env.VITE_API_URL}/appointment/email/send`, {
        method: 'POST',
        body: JSON.stringify(apiEmailParam),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (emailResponse.ok) {
        toast.success('Purchase order sent to supplier via email successfully');
      } else {
        const errorData = await emailResponse.json();
        throw new Error(errorData.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please try again.');
    }
  };

  // Removed total calculation and unit price logic

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

  const isViewMode = mode === 'view';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {mode === 'create' && 'Create Purchase Order'}
                  {mode === 'edit' && 'Edit Purchase Order'}
                  {mode === 'view' && 'View Purchase Order'}
                </DialogTitle>
                <DialogDescription>
                  {mode === 'create' && 'Create a new purchase order with items and supplier details.'}
                  {mode === 'edit' && 'Edit the purchase order details and items.'}
                  {mode === 'view' && 'View purchase order details.'}
                </DialogDescription>
              </div>
              {mode === 'view' && purchaseOrder && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePDF}
                    className="flex items-center space-x-2"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Generate PDF</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendEmail}
                    disabled={!suppliers.find(s => s.supplier_id === formData.supplier_id)?.email}
                    className="flex items-center space-x-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send Email to Supplier</span>
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Purchase Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Purchase Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* First Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplier_id">Supplier *</Label>
                      {isViewMode ? (
                        <Input
                          value={suppliers.find(s => s.supplier_id === formData.supplier_id)?.supplier_name || 'Loading...'}
                          disabled
                          className="bg-gray-50"
                        />
                      ) : (
                        <Select
                          value={formData.supplier_id.toString()}
                          onValueChange={(value) => setFormData({ ...formData, supplier_id: parseInt(value) })}
                          disabled={isViewMode}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.supplier_id} value={supplier.supplier_id.toString()}>
                                {supplier.supplier_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                      <Input
                        id="expected_delivery_date"
                        type="date"
                        value={formData.expected_delivery_date || ''}
                        onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        disabled={isViewMode}
                      />
                    </div>
                  </div>

                  {/* Second Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      {mode === 'view' ? (
                        <Input
                          value={formData.status}
                          disabled
                          className="bg-gray-50"
                        />
                      ) : (
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData({ ...formData, status: value })}
                          disabled={mode === 'create'}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Received">Received</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {mode === 'view' && (
                      <div>
                        <Label>Created By</Label>
                        <Input
                          value={formData.created_by}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Remarks Row - Full Width */}
                  <div>
                    <Label htmlFor="remarks">Remarks</Label>
                    <Input
                      id="remarks"
                      value={formData.remarks || ''}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      disabled={isViewMode}
                      placeholder="Optional remarks or notes"
                    />
                  </div>

                  {mode === 'view' && purchaseOrder && (
                    <div className="flex items-center space-x-2">
                      <Label>Status:</Label>
                      {getStatusBadge(purchaseOrder.status)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Items Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Items</CardTitle>
                    <CardDescription>
                      Items to be ordered from the supplier
                    </CardDescription>
                  </div>
                  {!isViewMode && (
                    <Button type="button" onClick={addItem} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {formData.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No items added yet. {!isViewMode && 'Click "Add Item" to get started.'}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead>Remarks</TableHead>
                          {!isViewMode && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.item_name}</TableCell>
                            <TableCell>{item.quantity_ordered}</TableCell>
                            <TableCell>₱{(Number(item.unit_cost) || 0).toFixed(2)}</TableCell>
                            <TableCell>₱{((item.quantity_ordered || 0) * (Number(item.unit_cost) || 0)).toFixed(2)}</TableCell>
                            <TableCell>{item.remarks || '-'}</TableCell>
                            {!isViewMode && (
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => editItem(index)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeItem(index)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {formData.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-end">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Total Amount:</div>
                          <div className="text-xl font-bold">
                            ₱{formData.items.reduce((total, item) => total + (item.quantity_ordered * (item.unit_cost || 0)), 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800">{error}</p>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                {isViewMode ? 'Close' : 'Cancel'}
              </Button>
              {!isViewMode && (
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : mode === 'create' ? 'Create Purchase Order' : 'Update Purchase Order'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItemIndex !== null ? 'Edit Item' : 'Add Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItemIndex !== null ? 'Update the item details.' : 'Add an item to the purchase order.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="item_id">Item *</Label>
              <Select
                value={itemFormData.item_id.toString()}
                onValueChange={(value) => {
                  const itemId = parseInt(value);
                  const selectedItem = availableItems.find(item => item.item_id === itemId);
                  setItemFormData({
                    ...itemFormData,
                    item_id: itemId,
                    item_name: selectedItem ? selectedItem.item_name : ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map((item) => (
                    <SelectItem key={item.item_id} value={item.item_id.toString()}>
                      {item.item_name} {item.item_code && `(${item.item_code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity_ordered">Quantity *</Label>
                <Input
                  id="quantity_ordered"
                  type="number"
                  min="1"
                  value={itemFormData.quantity_ordered}
                  onChange={(e) => setItemFormData({ ...itemFormData, quantity_ordered: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_cost">Unit Cost *</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemFormData.unit_cost}
                  onChange={(e) => setItemFormData({ ...itemFormData, unit_cost: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Subtotal</Label>
                <Input
                  value={`₱${((itemFormData.quantity_ordered || 0) * (itemFormData.unit_cost || 0)).toFixed(2)}`}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="item_remarks">Remarks</Label>
              <Input
                id="item_remarks"
                value={itemFormData.remarks}
                onChange={(e) => setItemFormData({ ...itemFormData, remarks: e.target.value })}
                placeholder="Optional remarks for this item"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveItem}>
              {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}