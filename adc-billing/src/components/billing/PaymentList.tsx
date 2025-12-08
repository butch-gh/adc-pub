import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Eye, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentApi, invoiceApi } from '@/lib/billing-api';
import { Payment } from '@/types';
import PaymentDetailsModal from './PaymentDetailsModal';

// Combined payment type for display
interface CombinedPayment {
  payment_id: number;
  invoice_id?: number;
  invoice_code?: string;
  installment_id?: number;
  amount_paid: number;
  received_amount: number;
  change_amount: number;
  method: string;
  payment_date: string;
  transaction_ref?: string;
  proof_of_payment?: string;
  notes?: string;
  payment_type?: string;
  patient_name?: string;
}

export function PaymentList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [selectedPaymentType, setSelectedPaymentType] = useState('all');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CombinedPayment | null>(null);

  // Fetch invoice data when payment is selected
  const { data: selectedInvoiceData } = useQuery({
    queryKey: ['invoice', selectedPayment?.invoice_id],
    queryFn: () => selectedPayment?.invoice_id ? invoiceApi.getInvoice(selectedPayment.invoice_id) : null,
    enabled: !!selectedPayment?.invoice_id && isViewModalOpen,
  });

  // Fetch invoice payments from API
  const { data: invoicePaymentResponse, isLoading: invoicePaymentsLoading, error: invoicePaymentsError } = useQuery({
    queryKey: ['invoice-payments'],
    queryFn: () => paymentApi.getAllPayments(),
  });

  // Fetch installment payments from API
  // const { data: installmentPaymentResponse, isLoading: installmentPaymentsLoading, error: installmentPaymentsError } = useQuery({
  //   queryKey: ['installment-payments'],
  //   queryFn: () => installmentApi.getAllInstallmentPayments(),
  // });

  // For now, we'll focus on invoice payments since we don't have a dedicated
  // endpoint to get all installment payments across all invoices.
  // TODO: Add endpoint to get all installment payments for better integration

  const invoicePayments = invoicePaymentResponse?.data || [];
  //const installmentPayments = installmentPaymentResponse?.data || [];
  
  // Combine payments into a unified format
  const combinedPayments: CombinedPayment[] = useMemo(() => {
    const payments: CombinedPayment[] = [];
    
    // Add invoice payments
    invoicePayments.forEach((payment: Payment) => {
      payments.push({
        payment_id: payment.payment_id,
        invoice_id: payment.invoice_id,
        invoice_code: payment.invoice_code, // Extended from API
        amount_paid: payment.amount_paid,
        received_amount: payment.received_amount,
        change_amount: payment.change_amount,
        method: payment.method,
        payment_date: payment.payment_date,
        transaction_ref: payment.transaction_ref,
        proof_of_payment: payment.proof_of_payment,
        payment_type: payment.payment_type,
        patient_name: (payment as any).patient_name // Extended from API
      });
    });
    
    // Add installment payments
    // installmentPayments.forEach((payment: InstallmentPayment) => {
    //   payments.push({
    //     payment_id: payment.payment_id,
    //     installment_id: payment.installment_id,
    //     amount_paid: payment.amount,
    //     invoice_code: payment.invoice_code, // Extended from API
    //     method: payment.method,
    //     payment_date: payment.payment_date,
    //     transaction_ref: payment.transaction_ref,
    //     proof_of_payment: payment.proof_of_payment,
    //     notes: payment.notes,
    //     payment_type: 'installment',
    //     patient_name: (payment as any).patient_name // Extended from API
    //   });
    // });
    
    // Sort by payment date (newest first)
    return payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [invoicePayments]);

  const isLoading = invoicePaymentsLoading;
  const error = invoicePaymentsError;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // Filtered payments based on search and filters
  const filteredPayments = useMemo(() => {
    return combinedPayments.filter((payment: CombinedPayment) => {
      // General search filter
      const matchesSearch = searchTerm === '' ||
        payment.transaction_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.payment_id.toString().includes(searchTerm) ||
        payment.patient_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Invoice ID filter
      const matchesInvoice = invoiceFilter === '' ||
        payment.invoice_code?.toString().includes(invoiceFilter);

      // Method filter
      const matchesMethod = selectedMethod === 'all' ||
        payment.method.toLowerCase().replace(' ', '-') === selectedMethod;

      // Payment type filter
      const matchesPaymentType = selectedPaymentType === 'all' ||
        payment.payment_type === selectedPaymentType;

      // For now, assume all payments are completed since we don't have status in our data
      const matchesStatus = selectedStatus === 'all' || selectedStatus === 'completed';

      // Date range filter
      let matchesDateRange = true;
      if (selectedDateRange !== 'all') {
        const paymentDate = new Date(payment.payment_date);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (selectedDateRange) {
          case 'today':
            matchesDateRange = paymentDate >= today;
            break;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            matchesDateRange = paymentDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            matchesDateRange = paymentDate >= monthAgo;
            break;
          case 'quarter':
            const quarterAgo = new Date(today);
            quarterAgo.setMonth(today.getMonth() - 3);
            matchesDateRange = paymentDate >= quarterAgo;
            break;
          case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            matchesDateRange = paymentDate >= yearAgo;
            break;
        }
      }

      return matchesSearch && matchesInvoice && matchesStatus && matchesMethod && matchesDateRange && matchesPaymentType;
    });
  }, [combinedPayments, searchTerm, invoiceFilter, selectedStatus, selectedMethod, selectedDateRange, selectedPaymentType]);

  // Handle clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setInvoiceFilter('');
    setSelectedStatus('all');
    setSelectedMethod('all');
    setSelectedDateRange('all');
    setSelectedPaymentType('all');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || invoiceFilter !== '' || selectedStatus !== 'all' || 
    selectedMethod !== 'all' || selectedDateRange !== 'all' || selectedPaymentType !== 'all';

  // Export functionality
  const handleExportReport = () => {
    const headers = [
      'Payment ID',
      'Invoice ID',
      'Invoice Code',      
      'Patient Name',
      'Amount Paid',
      'Payment Method',
      'Payment Date',
      'Transaction Reference',
      'Payment Type'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredPayments.map((payment: CombinedPayment) => [
        payment.payment_id,
        payment.invoice_id || '',
        payment.invoice_code || '',        
        payment.patient_name || '',
        payment.amount_paid,
        payment.method,
        payment.payment_date,
        payment.transaction_ref || '',
        payment.payment_type
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle view payment details
  const handleViewPayment = (payment: CombinedPayment) => {
    setSelectedPayment(payment);
    setIsViewModalOpen(true);
  };

  // Handle close view modal
  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedPayment(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground">
            Track and manage patient payments
          </p>
        </div>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="outline" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
          <Button onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {filteredPayments.length} of {combinedPayments.length} payments
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">General Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Patient, Transaction Ref..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice Code</label>
              <div className="relative">
                <Input
                  placeholder="Search by Invoice ID..."
                  value={invoiceFilter}
                  onChange={(e) => setInvoiceFilter(e.target.value)}
                />
                {invoiceFilter && (
                  <button
                    onClick={() => setInvoiceFilter('')}
                    className="absolute right-2 top-2 h-6 w-6 rounded-full hover:bg-gray-100 flex items-center justify-center"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="qr/online">QR/Online</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>                  
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Type</label>
              <Select value={selectedPaymentType} onValueChange={setSelectedPaymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Direct Payment">Direct Payments</SelectItem>
                  <SelectItem value="Installment">Installment Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            A list of all payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading payment records...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-destructive">Failed to load payments. Please try again.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {/* <th className="text-left py-3 px-4 font-medium">Payment ID</th> */}
                    <th className="text-left py-3 px-4 font-medium">Invoice Code</th>                    
                    <th className="text-left py-3 px-4 font-medium">Amount Paid</th>
                    <th className="text-left py-3 px-4 font-medium">Patient</th>
                    <th className="text-left py-3 px-4 font-medium">Method</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
              <tbody>
                {filteredPayments.map((payment: CombinedPayment) => (
                  <tr key={`${payment.payment_type}-${payment.payment_id}`} className="border-b hover:bg-muted/50">
                    {/* <td className="py-3 px-4">#{payment.payment_id}</td> */}
                    <td className="py-3 px-4">{payment.invoice_code}</td>                    
                    <td className="py-3 px-4 font-medium">{formatCurrency(payment.amount_paid)}</td>
                    <td className="py-3 px-4">{payment.patient_name}</td>
                    <td className="py-3 px-4">{payment.method}</td>
                    <td className="py-3 px-4">
                      <Badge variant={payment.payment_type === 'Installment' ? 'default' : 'secondary'}>
                        {payment.payment_type === 'Installment' ? 'Installment' : 'Direct Payment'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{getStatusBadge('completed')}</td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPayment(payment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPayments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No payments found
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filteredPayments.reduce((sum: number, p: CombinedPayment) => sum + p.amount_paid, 0))}</div>
            <p className="text-xs text-muted-foreground">Total amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredPayments.length}
            </div>
            <p className="text-xs text-muted-foreground">Total payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              0
            </div>
            <p className="text-xs text-muted-foreground">Pending payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              0
            </div>
            <p className="text-xs text-muted-foreground">Failed payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        isOpen={isViewModalOpen}
        payment={selectedPayment}
        invoice={selectedInvoiceData ? { data: selectedInvoiceData.data } : undefined}
        onClose={handleCloseViewModal}
      />

    </div>
  );
}
