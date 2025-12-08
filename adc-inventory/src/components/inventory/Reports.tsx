import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Download, Calendar, AlertTriangle, History } from 'lucide-react';
import { inventoryApi } from '@/lib/inventory-api';
import ReportsPDFGenerator from './ReportsPDFGenerator';

interface ExpiryItem {
  id: number;
  name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit: string;
  days_until_expiry: number;
}

interface LowStockItem {
  id: number;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  supplier_name: string;
}

interface PurchaseRecord {
  po_id: number;
  po_number: string;
  po_date: string;
  supplier_name: string;
  item_name: string;
  quantity_ordered: number;
  quantity_received: number | string;
  unit_cost: number | string;
  ordered_total: number | string;
  received_total: number | string;
  receiving_status: string;
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('expiry');
  const [dateRange, setDateRange] = useState('30');
  const [expiryData, setExpiryData] = useState<ExpiryItem[]>([]);
  const [lowStockData, setLowStockData] = useState<LowStockItem[]>([]);
  const [purchaseData, setPurchaseData] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [activeTab, dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'expiry':
          const expiryResponse = await inventoryApi.getExpiryReport(parseInt(dateRange));
          setExpiryData(expiryResponse.data);
          break;
        case 'low-stock':
          const lowStockResponse = await inventoryApi.getLowStockReport();
          setLowStockData(lowStockResponse.data);
          break;
        case 'purchase-history':
          const purchaseResponse = await inventoryApi.getPurchaseHistory(parseInt(dateRange));
          // API returns objects with fields like po_id, po_number, po_date, quantity_ordered, etc.
          // cast from unknown first to avoid strict type conversion warning
          setPurchaseData(purchaseResponse.data as unknown as PurchaseRecord[]);
          break;
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFilename = (reportType: string, format: string) => {
    const prefix = reportType.replace(/\s+/g, '-').toLowerCase();
    return `${prefix}-${dateRange}days.${format}`;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const generateCsv = (rows: any[]) => {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escapeCell = (val: any) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const csvRows = [headers.join(',')];
    for (const r of rows) {
      csvRows.push(headers.map(h => escapeCell(r[h])).join(','));
    }
    return csvRows.join('\n');
  };

  const getReportData = (reportType: string) => {
    switch (reportType) {
      case 'expiry':
        return expiryData;
      case 'low-stock':
        return lowStockData;
      case 'purchase-history':
        return purchaseData;
      default:
        return [];
    }
  };

  const handleExport = (reportType: string, format: 'csv' | 'excel') => {
    const data = getReportData(reportType);
    if (!data || data.length === 0) {
      // nothing to export
      console.warn('No data to export for', reportType);
      return;
    }

    if (format === 'csv') {
      const csv = generateCsv(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, generateFilename(reportType, 'csv'));
      return;
    }

    if (format === 'excel') {
      // Use xlsx library for proper Excel files
      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, reportType.replace(/\s+/g, ''));
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      downloadBlob(blob, generateFilename(reportType, 'xlsx'));
      return;
    }
  };

  const getExpiryBadgeVariant = (days: number) => {
    if (days <= 30) return 'destructive';
    if (days <= 90) return 'secondary';
    return 'default';
  };

  const formatCurrency = (amount: number | string) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : amount || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
    }).format(isNaN(n) ? 0 : n);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Monitor inventory status and purchase history
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expiry" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Expiry Report</span>
          </TabsTrigger>
          <TabsTrigger value="low-stock" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Low Stock Alert</span>
          </TabsTrigger>
          <TabsTrigger value="purchase-history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Purchase History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expiry" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold">Items Expiring Soon</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('expiry', 'csv')}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('expiry', 'excel')}
                  className="flex items-center space-x-2"
                >
                  <span>Excel</span>
                </Button>
                <ReportsPDFGenerator
                  reportType="expiry"
                  data={expiryData}
                  dateRange={dateRange}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading expiry report...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiryData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.batch_number}</TableCell>
                        <TableCell>{item.expiry_date}</TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>
                          <Badge variant={getExpiryBadgeVariant(item.days_until_expiry)}>
                            {item.days_until_expiry <= 0 ? 'Expired' :
                             item.days_until_expiry <= 30 ? 'Critical' :
                             item.days_until_expiry <= 90 ? 'Warning' : 'Safe'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold">Low Stock Items</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('low-stock', 'csv')}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('low-stock', 'excel')}
                  className="flex items-center space-x-2"
                >
                  <span>Excel</span>
                </Button>
                <ReportsPDFGenerator
                  reportType="low-stock"
                  data={lowStockData}
                  dateRange={dateRange}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading low stock report...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Minimum Stock</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.current_stock} {item.unit}</TableCell>
                        <TableCell>{item.minimum_stock} {item.unit}</TableCell>
                        <TableCell>{item.supplier_name}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Low Stock</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-history" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold">Purchase History</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('purchase-history', 'csv')}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('purchase-history', 'excel')}
                  className="flex items-center space-x-2"
                >
                  <span>Excel</span>
                </Button>
                <ReportsPDFGenerator
                  reportType="purchase-history"
                  data={purchaseData}
                  dateRange={dateRange}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading purchase history...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>PO Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty Ordered</TableHead>
                      <TableHead>Qty Received</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Ordered Total</TableHead>
                      <TableHead>Received Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseData.map((record, idx) => (
                      <TableRow key={`${record.po_number}-${idx}`}>
                        <TableCell className="font-medium">{record.po_number}</TableCell>
                        <TableCell>{record.po_date}</TableCell>
                        <TableCell>{record.supplier_name}</TableCell>
                        <TableCell>{record.item_name}</TableCell>
                        <TableCell>{record.quantity_ordered}</TableCell>
                        <TableCell>{typeof record.quantity_received === 'string' ? parseInt(record.quantity_received) : record.quantity_received}</TableCell>
                        <TableCell>{formatCurrency(record.unit_cost)}</TableCell>
                        <TableCell>{formatCurrency(record.ordered_total)}</TableCell>
                        <TableCell>{formatCurrency(record.received_total)}</TableCell>
                        <TableCell>
                          <Badge variant={record.receiving_status === 'Completed' ? 'secondary' : 'default'}>
                            {record.receiving_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
