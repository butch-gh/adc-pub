import { useState, useEffect } from 'react';
import { useAuth } from '@repo/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Package, FileCheck, X, Mail } from 'lucide-react';
import { inventoryApi, PurchaseOrder, supplierOptions } from '@/lib/inventory-api';
import StockInPDFGenerator from './StockInPDFGenerator';
import { generateStockInEmailHTML } from './StockInEmailTemplate';

interface StockInItem {
  id: string;
  item_id: number;
  item_name: string;
  batch_no: string;
  expiry_date: string;
  qty_received: number;
  unit_cost: number;
  total_cost: number;
  remarks: string;
}

interface ReceiveDeliveryForm {
  stock_in_no: string;
  date_received: string;
  po_id: number | null;
  po_number?: string;
  supplier_id: number | null;
  supplier_name: string;
  received_by: string;
  remarks: string;
  items: StockInItem[];
}

export function ReceiveDelivery() {
  const { user } = useAuth();
  const [form, setForm] = useState<ReceiveDeliveryForm>({
    stock_in_no: '',
    date_received: new Date().toISOString().split('T')[0],
    po_id: null,
    po_number: undefined,
    supplier_id: null,
    supplier_name: '',
    received_by: user?.username || 'Unknown User',
    remarks: '',
    items: []
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<supplierOptions[]>([]);
  const [itemOptions, setItemOptions] = useState<{ item_id: number; item_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    generateStockInNumber();
  }, []);

  // Update received_by when user loads
  useEffect(() => {
    if (user?.username) {
      setForm(prev => ({ ...prev, received_by: user.username }));
    }
  }, [user?.username]);

  const loadInitialData = async () => {
    try {
      const [poResponse, suppliersResponse, itemsResponse] = await Promise.all([
        inventoryApi.getPurchaseOrders({ status: 'Pending' }),
        inventoryApi.getSupplierOptions(),
        inventoryApi.getItemOptions()
      ]);

      setPurchaseOrders(poResponse.data);
      setSuppliers(suppliersResponse);
      setItemOptions(itemsResponse);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load initial data');
    }
  };

  const generateStockInNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    setForm(prev => ({
      ...prev,
      stock_in_no: `SI-${year}${month}${day}-${sequence}`
    }));
  };

  const handlePOSelection = async (poId: string) => {
    if (!poId || poId === 'none') {
      setForm(prev => ({ ...prev, po_id: null, po_number: undefined, supplier_id: null, supplier_name: '', items: [] }));
      return;
    }

    try {
      const po = await inventoryApi.getPurchaseOrder(parseInt(poId));
      setForm(prev => ({
        ...prev,
        po_id: po.po_id,
        po_number: po.po_number,
        supplier_id: po.supplier_id,
        supplier_name: po.supplier_name || '',
        items: po.items?.map((item) => ({
          id: `item-${item.item_id}-${Date.now()}`,
          item_id: item.item_id,
          item_name: item.item_name || '',
          batch_no: (() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            //const sequence = String(index + 1).padStart(4, '0');
            const sequence = String(Math.floor(Math.random() * 1000)).padStart(4, '0');
            return `SB-${year}${month}${day}-${sequence}`;
          })(),
          expiry_date: '',
          qty_received: item.quantity_ordered,
          unit_cost: item.unit_cost,
          total_cost: item.quantity_ordered * item.unit_cost,
          remarks: item.remarks || ''
        })) || []
      }));
    } catch (err) {
      console.error('Error loading purchase order:', err);
      setError('Failed to load purchase order details');
    }
  };

  const handleSupplierSelection = (supplierId: string) => {
    if (supplierId === 'none') {
      setForm(prev => ({
        ...prev,
        supplier_id: null,
        supplier_name: ''
      }));
      return;
    }

    const supplier = suppliers.find(s => s.supplier_id === parseInt(supplierId));
    setForm(prev => ({
      ...prev,
      supplier_id: parseInt(supplierId),
      supplier_name: supplier?.supplier_name || ''
    }));
  };

  const generateBatchNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Generate a sequence number based on current items count + 1
    //const sequence = String(form.items.length + 1).padStart(4, '0');
    const sequence = String(Math.floor(Math.random() * 1000)).padStart(4, '0');
    
    return `SB-${year}${month}${day}-${sequence}`;
  };

  const addNewItem = () => {
    const newItem: StockInItem = {
      id: `item-new-${Date.now()}`,
      item_id: 0,
      item_name: '',
      batch_no: generateBatchNumber(),
      expiry_date: '',
      qty_received: 0,
      unit_cost: 0,
      total_cost: 0,
      remarks: ''
    };

    setForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (itemId: string) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const updateItem = (itemId: string, field: keyof StockInItem, value: any) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // Update item name when item_id changes
          if (field === 'item_id') {
            const selectedItem = itemOptions.find(opt => opt.item_id === parseInt(value));
            updatedItem.item_name = selectedItem?.item_name || '';
          }
          
          // Recalculate total cost when quantity or unit cost changes
          if (field === 'qty_received' || field === 'unit_cost') {
            updatedItem.total_cost = updatedItem.qty_received * updatedItem.unit_cost;
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const calculateTotals = () => {
    const totalItems = form.items.length;
    const totalQuantity = form.items.reduce((sum, item) => sum + item.qty_received, 0);
    const totalAmount = form.items.reduce((sum, item) => sum + item.total_cost, 0);
    
    return { totalItems, totalQuantity, totalAmount };
  };

  const handleSave = async () => {
    console.log('handleSave called'); // Debug log
    console.log('Form state:', form); // Debug log
    
    if (!form.items.length) {
      setError('Please add at least one item');
      return;
    }

    // More detailed validation
    const invalidItems = form.items.filter(item => !item.item_id || !item.qty_received || !item.batch_no);
    if (invalidItems.length > 0) {
      console.log('Invalid items found:', invalidItems); // Debug log
      setError('Please fill in all required fields for each item (Item, Batch No., and Quantity)');
      return;
    }

    // Check for zero quantities
    const zeroQtyItems = form.items.filter(item => item.qty_received <= 0);
    if (zeroQtyItems.length > 0) {
      console.log('Zero quantity items found:', zeroQtyItems); // Debug log
      setError('All items must have a quantity greater than 0');
      return;
    }

    console.log('Validation passed, starting save process'); // Debug log
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Try to use the enhanced API first
      console.log('Attempting enhanced API call'); // Debug log
      
      const deliveryData = {
        stock_in_no: form.stock_in_no,
        po_id: form.po_id || undefined,
        supplier_id: form.supplier_id || undefined,
        date_received: form.date_received,
        received_by: form.received_by,
        remarks: form.remarks || undefined,
        items: form.items.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          batch_no: item.batch_no,
          expiry_date: item.expiry_date || undefined,
          qty_received: item.qty_received,
          unit_cost: item.unit_cost,
          remarks: item.remarks || undefined
        }))
      };
      
      console.log('Submitting delivery data:', deliveryData);
      
      try {
        const result = await inventoryApi.receiveDelivery(deliveryData);
        console.log('Enhanced API success:', result); // Debug log
        setSuccess(`Delivery received successfully! Stock-In No: ${form.stock_in_no}`);
      } catch (enhancedApiError) {
        console.log('Enhanced API failed, falling back to individual records:', enhancedApiError);
        
        // Fallback: Create individual stock-in records for each item
        let successCount = 0;
        const errors = [];
        
        for (let i = 0; i < form.items.length; i++) {
          const item = form.items[i];
          try {
            console.log(`Creating individual record for item ${i + 1}:`, item);
            await inventoryApi.createStockInRecord({
              item_id: item.item_id,
              batch_no: item.batch_no,
              qty_added: item.qty_received,
              supplier_id: form.supplier_id || undefined,
              date_in: form.date_received,
              expiry_date: item.expiry_date || undefined,
              remarks: `${form.stock_in_no} | ${form.remarks ? form.remarks + ' | ' : ''}${item.remarks || ''}`
            });
            successCount++;
            console.log(`Successfully created record for item ${i + 1}`);
          } catch (itemError) {
            console.error(`Failed to create record for item ${i + 1}:`, itemError);
            errors.push(`Item ${i + 1}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
          }
        }
        
        if (successCount > 0) {
          setSuccess(`Stock-in records saved successfully (${successCount} items processed${errors.length > 0 ? `, ${errors.length} failed` : ''})`);
          if (errors.length > 0) {
            console.error('Some items failed:', errors);
          }
        } else {
          throw new Error('All items failed to save: ' + errors.join(', '));
        }
      }

      // Reset form only if successful
      console.log('Resetting form after successful save');
      setForm({
        stock_in_no: '',
        date_received: new Date().toISOString().split('T')[0],
        po_id: null,
        po_number: undefined,
        supplier_id: null,
        supplier_name: '',
        received_by: user?.username || 'Unknown User',
        remarks: '',
        items: []
      });
      generateStockInNumber();
      
    } catch (err) {
      console.error('Error saving stock-in:', err);
      setError(`Failed to save stock-in record: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      console.log('handleSave completed'); // Debug log
    }
  };

  const handleSendEmail = async () => {
    if (!form.supplier_id) {
      setError('Please select a supplier before sending email');
      return;
    }

    try {
      // Get full supplier details to access email
      const supplier = await inventoryApi.getSupplier(form.supplier_id);
      if (!supplier.email) {
        setError('Supplier email address not available');
        return;
      }

      const emailHTML = generateStockInEmailHTML(form);

      const apiEmailParam = {
        to: supplier.email,
        subject: `Stock-In Delivery Receipt - ${form.stock_in_no} - ADC Dental Clinic`,
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
        setSuccess('Stock-in delivery receipt sent to supplier via email successfully');
      } else {
        const errorData = await emailResponse.json();
        throw new Error(errorData.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setError('Failed to send email. Please try again.');
    }
  };

  const { totalItems, totalQuantity, totalAmount } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Receive Delivery (Stock-In)
          </h1>
          <p className="text-gray-600">Record incoming inventory deliveries</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Basic Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="stock_in_no">Stock-In No.</Label>
              <Input
                id="stock_in_no"
                value={form.stock_in_no}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="date_received">Date Received</Label>
              <Input
                id="date_received"
                type="date"
                value={form.date_received}
                onChange={(e) => setForm(prev => ({ ...prev, date_received: e.target.value }))}
              />
            </div>
            {/* <div>
              <Label htmlFor="received_by">Received By</Label>
              <Input
                id="received_by"
                value={form.received_by}
                readOnly
                className="bg-gray-50"
                title="Automatically filled with logged-in username"
              />
            </div> */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="po_number">Reference PO No.</Label>
              <Select value={form.po_id?.toString() || 'none'} onValueChange={handlePOSelection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Purchase Order (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No PO Reference</SelectItem>
                  {purchaseOrders.map(po => (
                    <SelectItem key={po.po_id} value={po.po_id.toString()}>
                      {po.po_number} - {po.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Select 
                value={form.supplier_id?.toString() || 'none'} 
                onValueChange={handleSupplierSelection}
                // disabled={!!form.po_id}
                disabled={true} 
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Supplier</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.supplier_id} value={supplier.supplier_id.toString()}>
                      {supplier.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Optional remarks about this delivery"
              value={form.remarks}
              onChange={(e) => setForm(prev => ({ ...prev, remarks: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Received Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Items Received</CardTitle>
            <Button onClick={addNewItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
          <CardDescription>
            Record the items being received. Each row corresponds to 1 batch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Item</TableHead>                  
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Qty Received</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Batch No.</TableHead>
                  <TableHead className="w-[50px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      No items added yet. Click "Add Item" to start.
                    </TableCell>
                  </TableRow>
                ) : (
                  form.items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Select
                          value={item.item_id ? item.item_id.toString() : 'none'}
                          onValueChange={(value) => updateItem(item.id, 'item_id', value === 'none' ? 0 : parseInt(value))}                          
                        >
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Select Item" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select Item</SelectItem>
                            {itemOptions.map(option => (
                              <SelectItem key={option.item_id} value={option.item_id.toString()}>
                                {option.item_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
                      <TableCell>
                        <Input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => updateItem(item.id, 'expiry_date', e.target.value)}
                          className="w-[140px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={item.qty_received}
                          onChange={(e) => updateItem(item.id, 'qty_received', parseInt(e.target.value) || 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-[80px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unit_cost}
                          onChange={(e) => updateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          ₱{item.total_cost.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Optional notes"
                          value={item.remarks}
                          onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className='nowrap w-[150px]'>
                          {item.batch_no}
                        </Badge>
                      </TableCell>
                      {/* <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="BATCH-2025-1006-0001"
                            value={item.batch_no}
                            onChange={(e) => updateItem(item.id, 'batch_no', e.target.value)}
                            className="w-[165px]"
                            readOnly
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const today = new Date();
                              const year = today.getFullYear();
                              const month = String(today.getMonth() + 1).padStart(2, '0');
                              const day = String(today.getDate()).padStart(2, '0');
                              const sequence = String(index + 1).padStart(4, '0');
                              const newBatch = `BATCH-${year}-${month}${day}-${sequence}`;
                              updateItem(item.id, 'batch_no', newBatch);
                            }}
                            title="Generate new batch number"
                            className="h-8 w-8 p-0"
                          >
                            🔄
                          </Button>
                        </div>
                      </TableCell> */}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">Total Items</div>
              <div className="text-2xl font-bold text-blue-800">{totalItems}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">Total Quantity</div>
              <div className="text-2xl font-bold text-green-800">{totalQuantity}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600">Total Amount</div>
              <div className="text-2xl font-bold text-purple-800">₱{totalAmount.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button 
          onClick={() => {
            console.log('Save button clicked!');
            handleSave();
          }} 
          disabled={loading} 
          className="bg-green-600 hover:bg-green-700"
        >
          <FileCheck className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Stock-In'}
        </Button>
        
        <Button
          onClick={handleSendEmail}
          disabled={!form.supplier_id || !form.items.length}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <Mail className="w-4 h-4 mr-2" />
          <span>Send Email to Supplier</span>
        </Button>
        
        {/* Debug button - remove in production */}
        {/* <Button 
          variant="secondary" 
          onClick={() => {
            console.log('=== DEBUG INFO ===');
            console.log('Form state:', form);
            console.log('Items count:', form.items.length);
            console.log('Items valid:', form.items.every(item => item.item_id && item.qty_received && item.batch_no));
            console.log('Loading state:', loading);
            console.log('Error state:', error);
            console.log('Success state:', success);
          }}
        >
          🐛 Debug Info
        </Button> */}
        
        <StockInPDFGenerator stockInData={form} />
        <Button variant="outline" onClick={() => {
          setForm({
            stock_in_no: '',
            date_received: new Date().toISOString().split('T')[0],
            po_id: null,
            po_number: undefined,
            supplier_id: null,
            supplier_name: '',
            received_by: user?.username || 'Unknown User',
            remarks: '',
            items: []
          });
          generateStockInNumber();
          setError(null);
          setSuccess(null);
        }}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
