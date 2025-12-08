import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package } from 'lucide-react';
import { inventoryApi, StockInRecord } from '@/lib/inventory-api';

export function StockIn() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stockInRecords, setStockInRecords] = useState<StockInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for items and suppliers (should be fetched from API in production)
  const items = [
    { item_id: 1, item_name: 'Surgical Gloves', item_code: 'GLV001' },
    { item_id: 2, item_name: 'Dental Anesthetic', item_code: 'ANE001' },
    { item_id: 3, item_name: 'X-ray Film', item_code: 'XRY001' },
  ];

  const suppliers = [
    { supplier_id: 1, supplier_name: 'MediCorp' },
    { supplier_id: 2, supplier_name: 'PharmaPlus' },
    { supplier_id: 3, supplier_name: 'DentalTech' },
  ];

  // Mock batches data (should be fetched from API)
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Fetch stock in records on component mount
  useEffect(() => {
    fetchStockInRecords();
  }, []);

  // Fetch batches when item is selected
  useEffect(() => {
    if (selectedItemId) {
      fetchBatchesForItem(parseInt(selectedItemId));
    }
  }, [selectedItemId]);

  const fetchStockInRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryApi.getStockInRecords();
      setStockInRecords(response.data);
    } catch (err) {
      setError('Failed to fetch stock in records');
      console.error('Error fetching stock in records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchesForItem = async (itemId: number) => {
    try {
      const response = await inventoryApi.getStockBatches({ item_id: itemId });
      setBatches(response.data);
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const batchId = formData.get('batch_id') as string;
    const batchNo = formData.get('batch_no') as string;

    const data = {
      item_id: parseInt(formData.get('item') as string),
      batch_id: batchId ? parseInt(batchId) : undefined,
      batch_no: batchNo || undefined,
      qty_added: parseInt(formData.get('qty') as string),
      supplier_id: formData.get('supplier') ? parseInt(formData.get('supplier') as string) : undefined,
      date_in: formData.get('date_in') as string,
      expiry_date: formData.get('expiry_date') as string || undefined,
      remarks: formData.get('remarks') as string || undefined
    };

    try {
      await inventoryApi.createStockInRecord(data);
      setIsDialogOpen(false);
      // Refresh the stock in records
      fetchStockInRecords();
    } catch (err) {
      console.error('Error creating stock in record:', err);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock In Management</h1>
          <p className="text-gray-600 mt-1">Record incoming stock deliveries and purchases</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Stock In
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Add New Stock In</DialogTitle>
              <DialogDescription>
                Record a new stock delivery or purchase entry.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item">Item</Label>
                  <Select name="item" required onValueChange={(value) => setSelectedItemId(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.item_id} value={item.item_id.toString()}>
                          {item.item_name} ({item.item_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select name="supplier">
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
                </div>
              </div>

              <Tabs defaultValue="existing-batch" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing-batch">Use Existing Batch</TabsTrigger>
                  <TabsTrigger value="new-batch">Create New Batch</TabsTrigger>
                </TabsList>

                <TabsContent value="existing-batch" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="batch_id">Select Batch</Label>
                    <Select name="batch_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Select existing batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.batch_id} value={batch.batch_id.toString()}>
                            {batch.batch_no} - Qty: {batch.qty_available}
                            {batch.expiry_date && ` - Expires: ${new Date(batch.expiry_date).toLocaleDateString()}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="new-batch" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch_no">Batch Number</Label>
                      <Input name="batch_no" placeholder="Enter batch number" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry_date">Expiry Date</Label>
                      <Input name="expiry_date" type="date" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity Added</Label>
                  <Input name="qty" type="number" placeholder="Enter quantity" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_in">Date In</Label>
                  <Input name="date_in" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea name="remarks" placeholder="Additional notes..." />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Stock In</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stock In Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Recent Stock In Records
          </CardTitle>
          <CardDescription>
            View and manage stock in transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading stock in records...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-600">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockInRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No stock in records found
                    </TableCell>
                  </TableRow>
                ) : (
                  stockInRecords.map((record) => (
                    <TableRow key={record.stock_in_id}>
                      <TableCell className="font-medium">{record.item_name}</TableCell>
                      <TableCell>{record.batch_no || '-'}</TableCell>
                      <TableCell>{record.qty_added}</TableCell>
                      <TableCell>{record.supplier_name || '-'}</TableCell>
                      <TableCell>{record.date_in}</TableCell>
                      <TableCell>{record.remarks || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
