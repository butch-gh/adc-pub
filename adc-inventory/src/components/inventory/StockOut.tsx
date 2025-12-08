import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Minus, Package } from 'lucide-react';
import { inventoryApi, StockOutRecord, StockBatch } from '@/lib/inventory-api';

export function StockOut() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stockOutRecords, setStockOutRecords] = useState<StockOutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for items (should be fetched from API in production)
  const items = [
    { item_id: 1, item_name: 'Surgical Gloves', item_code: 'GLV001' },
    { item_id: 2, item_name: 'Dental Anesthetic', item_code: 'ANE001' },
    { item_id: 3, item_name: 'X-ray Film', item_code: 'XRY001' },
  ];

  // Batch state
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Fetch stock out records on component mount
  useEffect(() => {
    fetchStockOutRecords();
  }, []);

  // Fetch batches when item is selected
  useEffect(() => {
    if (selectedItemId) {
      fetchBatchesForItem(parseInt(selectedItemId));
    }
  }, [selectedItemId]);

  const fetchStockOutRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryApi.getStockOutRecords();
      setStockOutRecords(response.data);
    } catch (err) {
      setError('Failed to fetch stock out records');
      console.error('Error fetching stock out records:', err);
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
    const data = {
      item_id: parseInt(formData.get('item') as string),
      batch_id: formData.get('batch_id') ? parseInt(formData.get('batch_id') as string) : undefined,
      qty_used: parseInt(formData.get('qty') as string),
      usage_type: formData.get('usage_type') as string || 'treatment',
      date_out: formData.get('date_out') as string,
      remarks: formData.get('remarks') as string || undefined
    };

    try {
      await inventoryApi.createStockOutRecord(data);
      setIsDialogOpen(false);
      // Refresh the stock out records
      fetchStockOutRecords();
    } catch (err) {
      console.error('Error creating stock out record:', err);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Out Management</h1>
          <p className="text-gray-600 mt-1">Record stock usage, wastage, and adjustments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Minus className="w-4 h-4 mr-2" />
              Add Stock Out
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Stock Out</DialogTitle>
              <DialogDescription>
                Record stock usage or deduction.
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
                  <Label htmlFor="usage_type">Usage Type</Label>
                  <Select name="usage_type">
                    <SelectTrigger>
                      <SelectValue placeholder="Select usage type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="treatment">Treatment</SelectItem>
                      <SelectItem value="waste">Wastage</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch_id">Select Batch</Label>
                  <Select name="batch_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((batch) => (
                        <SelectItem key={batch.batch_id} value={batch.batch_id.toString()}>
                          {batch.batch_no} - Available: {batch.qty_available}
                          {batch.expiry_date && ` - Expires: ${new Date(batch.expiry_date).toLocaleDateString()}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity Used</Label>
                  <Input name="qty" type="number" placeholder="Enter quantity" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_out">Date Out</Label>
                <Input name="date_out" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea name="remarks" placeholder="Additional notes..." />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Stock Out</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stock Out Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Recent Stock Out Records
          </CardTitle>
          <CardDescription>
            View and manage stock out transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading stock out records...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-600">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Quantity Used</TableHead>
                  <TableHead>Usage Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockOutRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No stock out records found
                    </TableCell>
                  </TableRow>
                ) : (
                  stockOutRecords.map((record) => (
                    <TableRow key={record.stock_out_id}>
                      <TableCell className="font-medium">{record.item_name}</TableCell>
                      <TableCell>{record.batch_no || '-'}</TableCell>
                      <TableCell>{record.qty_used}</TableCell>
                      <TableCell className="capitalize">{record.usage_type}</TableCell>
                      <TableCell>{record.date_out}</TableCell>
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
