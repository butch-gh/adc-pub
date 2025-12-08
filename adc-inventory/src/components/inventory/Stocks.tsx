import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Filter, Download, AlertTriangle, CheckCircle, Clock, XCircle, Settings } from 'lucide-react';
import { inventoryApi, StockBatch, StockAdjustment as StockAdjustmentAPI } from '../../lib/inventory-api';
import { useAuth } from '@repo/auth';
import * as XLSX from 'xlsx';
import StocksPDFGenerator from './StocksPDFGenerator';
import StocksAdjustmentHistoryPDFGenerator from './StocksAdjustmentHistoryPDFGenerator';

interface StockFilters {
  search: string;
  category: string;
  status: string;
  expiryFilter: string;
}

interface StockAdjustment {
  batchId: number;
  itemName: string;
  batchNo: string;
  expiryDate: string | undefined;
  currentQuantity: number;
  newQuantity: string;
  reason: string;
  adjustmentType: string;
  adjustedBy: string;
  adjustedDate: string;
}

export function Stocks() {
  // Auth context
  const { user } = useAuth();
  const currentUser = user?.username || user?.full_name || 'Unknown User';

  const [stocks, setStocks] = useState<StockBatch[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [adjustmentModal, setAdjustmentModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null);
  const [adjustmentHistory, setAdjustmentHistory] = useState<StockAdjustmentAPI[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<StockAdjustment>({
    batchId: 0,
    itemName: '',
    batchNo: '',
    expiryDate: undefined,
    currentQuantity: 0,
    newQuantity: '',
    reason: '',
    adjustmentType: 'Correction',
    adjustedBy: currentUser,
    adjustedDate: new Date().toLocaleString()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchesWithHistory, setBatchesWithHistory] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<StockFilters>({
    search: '',
    category: 'all',
    status: 'all',
    expiryFilter: 'all'
  });

  const itemsPerPage = 20;

  const [searchTerm, setSearchTerm] = useState('');

  // Status determination logic
  const getStockStatus = (batch: StockBatch) => {
    const today = new Date();
    const expiryDate = batch.expiry_date ? new Date(batch.expiry_date) : null;
    const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
    
    if (batch.qty_available === 0) {
      return { status: 'out-of-stock', label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    }
    
    if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-800' };
    }
    
    if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
      return { status: 'expiring-soon', label: 'Expiring Soon', color: 'bg-orange-100 text-orange-800' };
    }
    
    if (batch.qty_available <= 10) {
      return { status: 'low-stock', label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    }
    
    return { status: 'in-stock', label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'out-of-stock':
        return <XCircle className="h-4 w-4" />;
      case 'expired':
        return <XCircle className="h-4 w-4" />;
      case 'expiring-soon':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low-stock':
        return <Clock className="h-4 w-4" />;
      case 'in-stock':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Fetch stocks data and check for adjustment history
  const fetchStocks = async () => {
    try {
      //setLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...(filters.search && { search: filters.search }),
        ...(filters.category !== 'all' && { category_id: filters.category }),
        ...(filters.expiryFilter !== 'all' && { expiry_filter: filters.expiryFilter })
      };

      const response = await inventoryApi.getStockBatches(params);
      
      if (response.success && response.data) {
        setStocks(response.data);
        setTotalPages(response.pagination?.pages || 1);
        
        // Check for adjustment history for all batches
        await checkBatchesForHistory(response.data);
      } else {
        throw new Error('Failed to fetch stocks');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching stocks');
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  // Check which batches have adjustment history
  const checkBatchesForHistory = async (batches: StockBatch[]) => {
    const batchIds = batches.map(batch => batch.batch_id);
    
    try {
      // Get adjustments for all batches (last 365 days, limit to check existence)
      const response = await inventoryApi.getStockAdjustments({
        days: 365,
        limit: 1000 // Get enough to cover all batches
      });
      
      if (response.success && response.data) {
        // Group adjustments by batch_id and update the set
        const batchesWithAdjustments = new Set<number>();
        response.data.forEach((adjustment: StockAdjustmentAPI) => {
          if (batchIds.includes(adjustment.batch_id)) {
            batchesWithAdjustments.add(adjustment.batch_id);
          }
        });
        
        // Update the state with batches that have history
        setBatchesWithHistory(prev => new Set([...prev, ...batchesWithAdjustments]));
      }
    } catch (error) {
      console.warn('Failed to check adjustment history:', error);
      // Don't show error to user, just keep buttons hidden
    }
  };

  // Apply local filters for status
  const applyFilters = () => {
    let filtered = [...stocks];

    if (filters.status !== 'all') {
      filtered = filtered.filter(batch => {
        const { status } = getStockStatus(batch);
        return status === filters.status;
      });
    }

    setFilteredStocks(filtered);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof StockFilters, value: string) => {
    if (key === 'search') {
      // For search, update the input state and filters immediately
      setSearchTerm(value);
      setFilters(prev => ({ ...prev, search: value }));
      setCurrentPage(1); // Reset to first page for search
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
      if (key !== 'status') {
        setCurrentPage(1); // Reset to first page for server-side filters
      }
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Batch Number',
      'Item Name',
      'Available Quantity',
      'Expiry Date',
      'Status'
    ];

    const csvData = filteredStocks.map(batch => {
      const { label: statusLabel } = getStockStatus(batch);
      return [
        batch.batch_no,
        batch.item_name || 'N/A',
        batch.qty_available.toString(),
        batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A',
        statusLabel
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stocks-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredStocks.map(batch => {
      const { label: statusLabel } = getStockStatus(batch);
      return {
        'Batch Number': batch.batch_no,
        'Item Name': batch.item_name || 'N/A',
        'Available Quantity': batch.qty_available,
        'Expiry Date': batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A',
        'Status': statusLabel,
        'Created Date': new Date(batch.created_at).toLocaleDateString()
      };
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Inventory');
    XLSX.writeFile(workbook, `stocks-inventory-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Handle view adjustment history
  const handleViewHistory = async (batch: StockBatch) => {
    try {
      setLoadingHistory(true);
      setSelectedBatch(batch);
      setHistoryModal(true);
      
      const response = await inventoryApi.getStockAdjustments({
        batch_id: batch.batch_id,
        days: 365, // Get last year of adjustments
        limit: 50
      });
      console.log('Adjustment history response:', response);
      if (response.success) {
        setAdjustmentHistory(response.data);
        // Update the set of batches with history
        if (response.data && response.data.length > 0) {
          setBatchesWithHistory(prev => new Set([...prev, batch.batch_id]));
        }
      } else {
        toast.error('Failed to load adjustment history');
        setAdjustmentHistory([]);
      }
    } catch (error) {
      toast.error('Error loading adjustment history');
      setAdjustmentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle stock adjustment
  const handleAdjustStock = (batch: StockBatch) => {
    const stockStatus = getStockStatus(batch);
    const isExpired = stockStatus.status === 'expired';
    
    // Use the current user from auth context
    const loggedInUser = currentUser;
    
    setSelectedBatch(batch);
    setAdjustmentForm({
      batchId: batch.batch_id,
      itemName: batch.item_name || 'N/A',
      batchNo: batch.batch_no,
      expiryDate: batch.expiry_date || undefined,
      currentQuantity: batch.qty_available,
      newQuantity: isExpired ? '0' : '',
      reason: isExpired ? 'Expired items' : '',
      adjustmentType: isExpired ? 'Disposal' : 'Correction',
      adjustedBy: loggedInUser,
      adjustedDate: new Date().toLocaleString()
    });
    setAdjustmentModal(true);
  };

  // Submit stock adjustment
  const submitStockAdjustment = async () => {
    if (!adjustmentForm.newQuantity || adjustmentForm.newQuantity === '') {
      toast.error("New quantity cannot be empty.");
      return;
    }

    const newQty = parseInt(adjustmentForm.newQuantity);
    if (isNaN(newQty) || newQty < 0) {
      toast.error("New quantity cannot be negative.");
      return;
    }

    if (!adjustmentForm.reason.trim()) {
      toast.error("Reason is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Call dedicated stock adjustment API
      await inventoryApi.createStockAdjustment({
        batch_id: adjustmentForm.batchId,
        new_qty: newQty,
        reason: adjustmentForm.reason,
        adjustment_type: adjustmentForm.adjustmentType
      });

      // Show success toast
      toast.success(`✔ Stock Adjustment Successful: Batch ${adjustmentForm.batchNo} quantity updated from ${adjustmentForm.currentQuantity} → ${newQty}`);

      // Close modal and refresh data
      setAdjustmentModal(false);
      fetchStocks();
      
      // Add this batch to the history set since we just created an adjustment
      setBatchesWithHistory(prev => new Set([...prev, adjustmentForm.batchId]));
      
    } catch (error) {
      toast.error("⚠ Error adjusting stock. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle adjustment form changes
  const handleAdjustmentFormChange = (field: keyof StockAdjustment, value: string) => {
    setAdjustmentForm(prev => ({ ...prev, [field]: value }));
  };

  // Effects
  useEffect(() => {
    fetchStocks();
  }, [currentPage, filters.search, filters.category, filters.expiryFilter]);

  useEffect(() => {
    applyFilters();
  }, [stocks, filters.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stocks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchStocks} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock List</h1>
          <p className="text-gray-600">Monitor and manage your inventory stocks</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <StocksPDFGenerator
            stocks={filteredStocks}
            getStockStatus={getStockStatus}
            fileName={`stocks-inventory-${new Date().toISOString().split('T')[0]}.pdf`}
          />
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter stocks by search, category, status, and expiry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by item name or batch..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="1">Medications</SelectItem>
                  <SelectItem value="2">Dental Supplies</SelectItem>
                  <SelectItem value="3">Office Supplies</SelectItem>
                  <SelectItem value="4">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expiry Filter */}
            <div>
              <Select
                value={filters.expiryFilter}
                onValueChange={(value) => handleFilterChange('expiryFilter', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="expiring-30">Expiring in 30 days</SelectItem>
                  <SelectItem value="expiring-60">Expiring in 60 days</SelectItem>
                  <SelectItem value="expiring-90">Expiring in 90 days</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stocks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Batches ({filteredStocks.length} items)</CardTitle>
          <CardDescription>
            Current inventory with batch tracking and expiry monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStocks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No stocks found matching your criteria</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Available Quantity</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStocks.map((batch) => {
                      const stockStatus = getStockStatus(batch);
                      
                      return (
                        <TableRow key={batch.batch_id}>
                          <TableCell className="font-mono text-sm">
                            {batch.batch_no}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{batch.item_name || 'N/A'}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium">{batch.qty_available}</div>
                          </TableCell>
                          <TableCell>
                            {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${stockStatus.color} flex items-center gap-1 w-fit`}>
                              {getStatusIcon(stockStatus.status)}
                              {stockStatus.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(batch.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAdjustStock(batch)}
                                disabled={stockStatus.status === 'out-of-stock'}
                                className={`${stockStatus.status === 'out-of-stock' ? 
                                  'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 
                                  'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}
                                title={stockStatus.status === 'out-of-stock' ? 'Cannot adjust out-of-stock items' : 
                                       'Adjust stock quantity'}
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                Adjust
                              </Button>
                              {batchesWithHistory.has(batch.batch_id) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewHistory(batch)}
                                  className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                >
                                  <Clock className="h-4 w-4 mr-1" />
                                  View History
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Modal */}
      <Dialog open={adjustmentModal} onOpenChange={setAdjustmentModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Adjust Stock
              {selectedBatch && getStockStatus(selectedBatch).status === 'expired' && (
                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">EXPIRED ITEM</span>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedBatch && getStockStatus(selectedBatch).status === 'expired' 
                ? 'This item has expired and will be automatically disposed of. The quantity will be set to 0.'
                : 'Update the quantity for this stock batch'
              }
            </DialogDescription>
          </DialogHeader>
          
          {/* Expired Item Warning Banner */}
          {/* {selectedBatch && getStockStatus(selectedBatch).status === 'expired' && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-orange-700">
                    <strong>Expired Item Disposal:</strong> This item has expired and must be disposed of. 
                    The adjustment type and quantity have been automatically set for disposal. You can modify the reason if needed.
                  </p>
                </div>
              </div>
            </div>
          )} */}
          
          {selectedBatch && (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 pr-2">
                {/* Item Information */}
                <div className="border-b pb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="font-medium">Item:</Label>
                      <p className="text-gray-700">{adjustmentForm.itemName}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Batch No:</Label>
                      <p className="text-gray-700 font-mono">{adjustmentForm.batchNo}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="font-medium">Expiry Date:</Label>
                      <p className={`${getStockStatus(selectedBatch).status === 'expired' ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                        {adjustmentForm.expiryDate 
                          ? new Date(adjustmentForm.expiryDate).toLocaleDateString()
                          : 'N/A'
                        }
                        {getStockStatus(selectedBatch).status === 'expired' && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">EXPIRED</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Adjustment Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="adjustmentType">Adjustment Type *</Label>
                    <Select
                      value={adjustmentForm.adjustmentType}
                      onValueChange={(value) => handleAdjustmentFormChange('adjustmentType', value)}
                      disabled={getStockStatus(selectedBatch).status === 'expired'}
                    >
                      <SelectTrigger className={getStockStatus(selectedBatch).status === 'expired' ? 'bg-gray-50' : ''}>
                        <SelectValue placeholder="Select adjustment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Disposal">Disposal</SelectItem>
                        <SelectItem value="Correction">Correction</SelectItem>
                        <SelectItem value="Return">Return</SelectItem>
                      </SelectContent>
                    </Select>
                    {getStockStatus(selectedBatch).status === 'expired' && (
                      <p className="text-xs text-orange-600 mt-1">Expired items must be disposed of</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="currentQty">Current Quantity</Label>
                    <Input
                      id="currentQty"
                      value={adjustmentForm.currentQuantity}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="newQty">New Quantity *</Label>
                    <Input
                      id="newQty"
                      type="number"
                      min="0"
                      placeholder={getStockStatus(selectedBatch).status === 'expired' ? 'Quantity set to 0 for expired items' : 'Enter the corrected quantity, e.g., 145'}
                      value={adjustmentForm.newQuantity}
                      onChange={(e) => handleAdjustmentFormChange('newQuantity', e.target.value)}
                      disabled={getStockStatus(selectedBatch).status === 'expired'}
                      className={getStockStatus(selectedBatch).status === 'expired' ? 'bg-gray-50' : ''}
                    />
                    {getStockStatus(selectedBatch).status === 'expired' && (
                      <p className="text-xs text-orange-600 mt-1">Expired items are automatically set to 0 quantity</p>
                    )}
                  </div>

                  

                  <div>
                    <Label htmlFor="reason">Reason *</Label>
                    <Textarea
                      id="reason"
                      placeholder={getStockStatus(selectedBatch).status === 'expired' ? 'Expired items - you can modify this reason if needed' : 'e.g. \'5 tablets damaged during unpacking\''}
                      value={adjustmentForm.reason}
                      onChange={(e) => handleAdjustmentFormChange('reason', e.target.value)}
                      rows={3}
                    />
                    {getStockStatus(selectedBatch).status === 'expired' && (
                      <p className="text-xs text-orange-600 mt-1">Default reason provided for expired items, but you can modify it if needed</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adjustedBy">Adjusted By</Label>
                      <Input
                        id="adjustedBy"
                        value={adjustmentForm.adjustedBy}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adjustedDate">Adjusted Date</Label>
                      <Input
                        id="adjustedDate"
                        value={adjustmentForm.adjustedDate}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions - Fixed at bottom */}
          {selectedBatch && (
            <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setAdjustmentModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={submitStockAdjustment}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Saving...' : 'Save Adjustment ✅'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment History Modal */}
      <Dialog open={historyModal} onOpenChange={setHistoryModal}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Adjustment History – {selectedBatch?.batch_no}
            </DialogTitle>
            <DialogDescription>
              View all past quantity adjustments for this batch
            </DialogDescription>
          </DialogHeader>
          
          {selectedBatch && (
            <div className="space-y-4">
              {/* Batch Information */}
              <div className="border-b pb-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">Item:</Label>
                    <p className="text-gray-700">{selectedBatch.item_name}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Batch No:</Label>
                    <p className="text-gray-700 font-mono">{selectedBatch.batch_no}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Current Quantity:</Label>
                    <p className="text-gray-700 font-semibold">{selectedBatch.qty_available}</p>
                  </div>
                </div>
              </div>

              {/* History Table */}
              <div className="space-y-2">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading history...</span>
                  </div>
                ) : adjustmentHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No adjustment history found for this batch</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date / Time</TableHead>
                          <TableHead className="text-right">Old Qty</TableHead>
                          <TableHead className="text-right">New Qty</TableHead>
                          <TableHead className="text-right">Change</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adjustmentHistory.map((adjustment) => {
                          const change = adjustment.new_qty - adjustment.old_qty;
                          const changeColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
                          const changeSign = change > 0 ? '+' : '';
                          
                          return (
                            <TableRow key={adjustment.adjustment_id}>
                              <TableCell className="font-mono text-sm">
                                {new Date(adjustment.adjusted_at).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {adjustment.old_qty}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {adjustment.new_qty}
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${changeColor}`}>
                                {changeSign}{change}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  adjustment.adjustment_type === 'Disposal' ? 'bg-red-100 text-red-800' :
                                  adjustment.adjustment_type === 'Return' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {adjustment.adjustment_type || 'Correction'}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div className="truncate" title={adjustment.reason || 'No reason provided'}>
                                  {adjustment.reason || 'No reason provided'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {adjustment.adjusted_by ? `User ${adjustment.adjusted_by}` : 'System'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-between items-center pt-4">
                <div className="flex gap-2">
                  <StocksAdjustmentHistoryPDFGenerator
                    selectedBatch={selectedBatch}
                    adjustmentHistory={adjustmentHistory}
                    fileName={`adjustment-history-${selectedBatch.batch_no}-${new Date().toISOString().split('T')[0]}.pdf`}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setHistoryModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}