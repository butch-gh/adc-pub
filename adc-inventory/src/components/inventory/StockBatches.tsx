import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Eye,
  Edit
} from 'lucide-react';
import { inventoryApi, ItemCatalogItem, StockBatch } from '@/lib/inventory-api';

interface BatchWithItem extends StockBatch {
  item?: ItemCatalogItem;
  item_name?: string;
  item_code?: string;
}

export function StockBatches() {
  const [batches, setBatches] = useState<BatchWithItem[]>([]);
  const [items, setItems] = useState<ItemCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchWithItem | null>(null);

  useEffect(() => {
    fetchBatches();
    fetchItems();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryApi.getStockBatches();
      setBatches(response.data);
    } catch (err) {
      setError('Failed to fetch stock batches');
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await inventoryApi.getItemCatalog({ limit: 1000 });
      setItems(response.data);
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return { status: 'no-expiry', label: 'No Expiry', color: 'bg-gray-100 text-gray-800' };

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring-soon', label: `Expires in ${daysUntilExpiry} days`, color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    } else {
      return { status: 'good', label: 'Good', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batch_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.item_code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesItem = selectedItem === 'all' || batch.item_id.toString() === selectedItem;

    const expiryStatus = getExpiryStatus(batch.expiry_date).status;
    const matchesExpiry = expiryFilter === 'all' || expiryStatus === expiryFilter;

    return matchesSearch && matchesItem && matchesExpiry;
  });

  const groupedBatches = filteredBatches.reduce((acc, batch) => {
    const itemId = batch.item_id;
    if (!acc[itemId]) {
      acc[itemId] = {
        item: items.find(item => item.item_id === itemId),
        batches: []
      };
    }
    acc[itemId].batches.push(batch);
    return acc;
  }, {} as Record<number, { item?: ItemCatalogItem; batches: BatchWithItem[] }>);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      item_id: parseInt(formData.get('item_id') as string),
      batch_no: formData.get('batch_no') as string,
      expiry_date: formData.get('expiry_date') as string || undefined,
      qty_available: parseInt(formData.get('qty_available') as string) || 0
    };

    try {
      await inventoryApi.createStockBatch(data);
      setIsCreateDialogOpen(false);
      fetchBatches();
    } catch (err) {
      console.error('Error creating batch:', err);
    }
  };

  const handleViewBatch = (batch: BatchWithItem) => {
    setSelectedBatch(batch);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Batch Management</h1>
          <p className="text-gray-600 mt-1">Track and manage inventory batches with expiry monitoring</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
              <DialogDescription>
                Add a new stock batch for inventory tracking.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="item_id">Item</Label>
                <Select name="item_id" required>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch_no">Batch Number</Label>
                  <Input name="batch_no" placeholder="Enter batch number" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty_available">Initial Quantity</Label>
                  <Input name="qty_available" type="number" placeholder="0" min="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input name="expiry_date" type="date" />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Batch</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Batches</p>
                <p className="text-2xl font-bold text-gray-900">{batches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-gray-900">
                  {batches.filter(b => getExpiryStatus(b.expiry_date).status === 'expired').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900">
                  {batches.filter(b => getExpiryStatus(b.expiry_date).status === 'expiring-soon').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {batches.reduce((sum, b) => sum + b.qty_available, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search batches or items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {items.map((item) => (
                  <SelectItem key={item.item_id} value={item.item_id.toString()}>
                    {item.item_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Expiry status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="no-expiry">No Expiry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Batch Groups */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8">Loading batches...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : Object.keys(groupedBatches).length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No batches found</h3>
                <p className="text-gray-600">Create your first stock batch to get started.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedBatches).map(([itemId, { item, batches }]) => (
            <Card key={itemId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      {item?.item_name || `Item ${itemId}`}
                      {item?.item_code && <span className="text-sm text-gray-500 ml-2">({item.item_code})</span>}
                    </CardTitle>
                    <CardDescription>
                      {batches.length} batch{batches.length !== 1 ? 'es' : ''} • Total quantity: {batches.reduce((sum, b) => sum + b.qty_available, 0)}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {item?.category_name || 'Uncategorized'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Quantity Available</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      const expiryInfo = getExpiryStatus(batch.expiry_date);
                      const ExpiryIcon = expiryInfo.icon;

                      return (
                        <TableRow key={batch.batch_id}>
                          <TableCell className="font-medium">{batch.batch_no}</TableCell>
                          <TableCell>{batch.qty_available}</TableCell>
                          <TableCell>
                            {batch.expiry_date ? (
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                {new Date(batch.expiry_date).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-gray-500">No expiry</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={expiryInfo.color}>
                              {ExpiryIcon && <ExpiryIcon className="w-3 h-3 mr-1" />}
                              {expiryInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(batch.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewBatch(batch)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Batch Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Batch Details</DialogTitle>
            <DialogDescription>
              Detailed information about batch {selectedBatch?.batch_no}
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Batch Number</Label>
                  <p className="text-sm text-gray-600">{selectedBatch.batch_no}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Item</Label>
                  <p className="text-sm text-gray-600">
                    {selectedBatch.item?.item_name || `Item ${selectedBatch.item_id}`}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quantity Available</Label>
                  <p className="text-sm text-gray-600">{selectedBatch.qty_available}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expiry Date</Label>
                  <p className="text-sm text-gray-600">
                    {selectedBatch.expiry_date
                      ? new Date(selectedBatch.expiry_date).toLocaleDateString()
                      : 'No expiry'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getExpiryStatus(selectedBatch.expiry_date).color}>
                    {getExpiryStatus(selectedBatch.expiry_date).label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedBatch.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}