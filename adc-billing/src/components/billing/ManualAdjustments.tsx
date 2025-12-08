import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { invoiceApi } from '@/lib/billing-api';
import { AdjustmentLog, ApplyAdjustmentRequest } from '@/types';
import { ArrowLeft, Minus, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function ManualAdjustments() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invoiceId = parseInt(id || '0');

  const [newAdjustment, setNewAdjustment] = useState({
    type: 'discount' as 'discount' | 'write-off' | 'refund',
    amountType: 'fixed' as 'fixed' | 'percentage',
    amount: '',
    note: ''
  });

  // Fetch invoice details
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceApi.getInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  // Update adjustment type to 'refund' when invoice is paid
  React.useEffect(() => {
    if (invoice?.data?.status === 'paid' && newAdjustment.type !== 'refund') {
      setNewAdjustment(prev => ({ ...prev, type: 'refund' }));
    }
  }, [invoice?.data?.status, newAdjustment.type]);

  // Fetch adjustment logs for this invoice
  const { data: adjustmentsData, isLoading: adjustmentsLoading } = useQuery({
    queryKey: ['invoice-adjustments', invoiceId],
    queryFn: () => invoiceApi.getAdjustmentLogs(invoiceId),
    enabled: !!invoiceId,
  });

  // Apply adjustment mutation
  const applyAdjustmentMutation = useMutation({
    mutationFn: async (data: ApplyAdjustmentRequest) => {
      let finalAmount = data.amount;

      // For percentage adjustments, calculate the actual amount
      if (newAdjustment.amountType === 'percentage' && invoice?.data) {
        const invoiceAmount = invoice.data.net_amount_due;
        finalAmount = (invoiceAmount * data.amount) / 100;
      }

      return await invoiceApi.applyAdjustment(invoiceId, {
        ...data,
        amount: finalAmount,
        note: newAdjustment.amountType === 'percentage'
          ? `${newAdjustment.amount}% ${newAdjustment.type} (${formatCurrency(finalAmount)}) - ${data.note}`
          : data.note
      });
    },
    onSuccess: () => {
      toast.success('Adjustment applied successfully');
      queryClient.invalidateQueries({ queryKey: ['invoice-adjustments', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      setNewAdjustment({ type: 'discount', amountType: 'fixed', amount: '', note: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to apply adjustment');
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setNewAdjustment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAdjustment.amount || parseFloat(newAdjustment.amount) <= 0) {
      toast.error('Please enter a valid adjustment amount');
      return;
    }

    // Validate percentage limits
    if (newAdjustment.amountType === 'percentage' && parseFloat(newAdjustment.amount) > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }

    if (!newAdjustment.note.trim()) {
      toast.error('Please provide a note explaining the adjustment');
      return;
    }

    // Validate adjustment amount doesn't exceed invoice amount for certain types
    if (invoice?.data) {
      const invoiceAmount = invoice.data.net_amount_due;
      let adjustmentAmount = parseFloat(newAdjustment.amount);

      // For percentage adjustments, calculate the actual amount
      if (newAdjustment.amountType === 'percentage') {
        adjustmentAmount = (invoiceAmount * adjustmentAmount) / 100;
      }

      if ((newAdjustment.type === 'discount' || newAdjustment.type === 'write-off') && adjustmentAmount > invoiceAmount) {
        toast.error('Adjustment amount cannot exceed the invoice amount');
        return;
      }
    }

    applyAdjustmentMutation.mutate({
      type: newAdjustment.type,
      amount: parseFloat(newAdjustment.amount),
      note: newAdjustment.note
    });
  };

  const formatCurrency = (amount: number) => {
    // Handle NaN, null, undefined, or invalid numbers
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      amount = 0;
    }
    
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAdjustmentTypeColor = (type: string) => {
    switch (type) {
      case 'discount':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'write-off':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'refund':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAdjustmentIcon = (type: string) => {
    switch (type) {
      case 'discount':
        return <Minus className="h-4 w-4" />;
      case 'write-off':
        return <AlertTriangle className="h-4 w-4" />;
      case 'refund':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  if (invoiceLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice?.data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/billing/invoices')}
        >
          Back to Invoices
        </Button>
      </div>
    );
  }

  const invoiceData = invoice.data;
  const adjustments = adjustmentsData?.data || [];
  
  // Safe number conversion helper
  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };
  
  // Calculate adjustment amounts from adjustments data (same logic as InvoiceDetail)
  const discountFromAdjustments = adjustments
    .filter((adj: any) => adj.type === 'discount')
    .reduce((sum: number, adj: any) => sum + Math.abs(safeNumber(adj.amount)), 0);
  
  const writeoffFromAdjustments = adjustments
    .filter((adj: any) => adj.type === 'write-off' || adj.reason?.toLowerCase().includes('write-off'))
    .reduce((sum: number, adj: any) => sum + Math.abs(safeNumber(adj.amount)), 0);
  
  const refundFromAdjustments = adjustments
    .filter((adj: any) => adj.type === 'refund' || adj.reason?.toLowerCase().includes('refund') || adj.reason?.toLowerCase().includes('return'))
    .reduce((sum: number, adj: any) => sum + Math.abs(safeNumber(adj.amount)), 0);
  
  // Calculate totals (use only adjustments data to avoid duplication)
  const totalDiscounts = discountFromAdjustments;
  const totalWriteoffs = writeoffFromAdjustments;
  const totalRefunds = refundFromAdjustments;
  const totalAdjustments = totalDiscounts + totalWriteoffs + totalRefunds;

  // Calculate final amount: original amount minus all adjustments
  const originalAmount = safeNumber(invoiceData.total_amount_estimated);
  const calculatedFinalAmount = originalAmount - totalAdjustments;
  const finalAmount = calculatedFinalAmount;

  // Calculate total payments made with safe number conversion
  const totalPayments = invoiceData.payments?.reduce((sum: number, payment: any) => {
    return sum + safeNumber(payment.amount_paid);
  }, 0) || 0;

  // Calculate outstanding balance
  const outstandingBalance = finalAmount - totalPayments;
  
  console.log('invoiceData:', invoiceData);
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/billing/invoices/${invoiceId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Manual Adjustments</h1>
          <p className="text-muted-foreground">
            Invoice #{invoiceData.invoice_id} - Patient ID: {invoiceData.patient_id}
          </p>
        </div>
      </div>

      {/* Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Adjustment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Main Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Original Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(invoiceData.total_amount_estimated)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Adjustments</p>
                <p className="text-lg font-semibold text-red-600">-{formatCurrency(totalAdjustments)}</p>
                <p className="text-xs text-muted-foreground">
                  {adjustments.length} adjustment{adjustments.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Final Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(finalAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(invoiceData.total_amount_estimated)} - {formatCurrency(totalAdjustments)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(outstandingBalance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(finalAmount)} - {formatCurrency(totalPayments)} paid
                </p>
              </div>
            </div>

            {/* Adjustment Breakdown */}
            {(totalDiscounts > 0 || totalWriteoffs > 0 || totalRefunds > 0) && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Adjustment Breakdown</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {totalDiscounts > 0 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <Minus className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Discounts</span>
                      </div>
                      <span className="text-sm font-semibold text-green-900">-{formatCurrency(totalDiscounts)}</span>
                    </div>
                  )}
                  {totalWriteoffs > 0 && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">Write-offs</span>
                      </div>
                      <span className="text-sm font-semibold text-orange-900">-{formatCurrency(totalWriteoffs)}</span>
                    </div>
                  )}
                  {totalRefunds > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Refunds</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-900">-{formatCurrency(totalRefunds)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Apply New Adjustment */}
      <Card>
        <CardHeader>
          <CardTitle>Apply New Adjustment</CardTitle>
          <CardDescription>
            Apply discounts, write-offs, or process refunds for this invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApplyAdjustment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Adjustment Type *</Label>
                <Select
                  value={newAdjustment.type}
                  onValueChange={(value: 'discount' | 'write-off' | 'refund') => handleInputChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceData.status === 'paid' ? (
                      <SelectItem value="refund">Refund</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="write-off">Write-off</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountType">Amount Type *</Label>
                <Select
                  value={newAdjustment.amountType}
                  onValueChange={(value: 'fixed' | 'percentage') => handleInputChange('amountType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount {newAdjustment.amountType === 'percentage' ? '(%)' : '(₱)'} *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step={newAdjustment.amountType === 'percentage' ? "0.1" : "1"}
                  min="0"
                  max={newAdjustment.amountType === 'percentage' ? "100" : undefined}
                  placeholder={newAdjustment.amountType === 'percentage' ? "0.0" : "0.00"}
                  value={newAdjustment.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
                {/* the amount input should not greater than net amount due */}
                <p className="text-xs text-muted-foreground">
                  {newAdjustment.amountType === 'percentage'
                    ? 'Enter a percentage value (max 100%)'
                    : `Enter an amount up to ${formatCurrency(invoiceData.net_amount_due)}`}
                </p>
                
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note/Reason *</Label>
              <Textarea
                id="note"
                placeholder="Explain the reason for this adjustment..."
                value={newAdjustment.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                rows={3}
                required
              />
            </div>

            {/* Adjustment Preview */}
            {newAdjustment.amount && parseFloat(newAdjustment.amount) > 0 && (
              <div className={`p-4 border rounded-lg ${
                newAdjustment.type === 'discount' ? 'bg-green-50 border-green-200' :
                newAdjustment.type === 'write-off' ? 'bg-orange-50 border-orange-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${
                    newAdjustment.type === 'discount' ? 'text-green-800' :
                    newAdjustment.type === 'write-off' ? 'text-orange-800' :
                    'text-blue-800'
                  }`}>
                    {newAdjustment.amountType === 'percentage'
                      ? `${newAdjustment.amount}% ${newAdjustment.type} will be applied`
                      : `Fixed ${newAdjustment.type} will be applied`}
                  </span>
                  <span className={`font-bold ${
                    newAdjustment.type === 'discount' ? 'text-green-900' :
                    newAdjustment.type === 'write-off' ? 'text-orange-900' :
                    'text-blue-900'
                  }`}>
                    -{(() => {
                      if (!invoice?.data) return formatCurrency(0);
                      const invoiceAmount = invoice.data.net_amount_due;
                      const inputAmount = parseFloat(newAdjustment.amount);
                      const actualAmount = newAdjustment.amountType === 'percentage'
                        ? (invoiceAmount * inputAmount) / 100
                        : inputAmount;
                      return formatCurrency(actualAmount);
                    })()}
                  </span>
                </div>
                {newAdjustment.amountType === 'percentage' && invoice?.data && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Based on invoice amount: {formatCurrency(invoice.data.net_amount_due)}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewAdjustment({ type: 'discount', amountType: 'fixed', amount: '', note: '' })}
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={applyAdjustmentMutation.isLoading || (() => {
                  if (!invoice?.data || !newAdjustment.amount) return false;
                  const invoiceAmount = invoice.data.net_amount_due;
                  const inputAmount = parseFloat(newAdjustment.amount);
                  if (isNaN(inputAmount) || inputAmount <= 0) return false;
                  const adjustmentAmount = newAdjustment.amountType === 'percentage'
                    ? (invoiceAmount * inputAmount) / 100
                    : inputAmount;
                  // Disable for discount and write-off if adjustment amount >= invoice amount
                  return (newAdjustment.type === 'discount' || newAdjustment.type === 'write-off') && adjustmentAmount > invoiceAmount;
                })()}
              >
                {applyAdjustmentMutation.isLoading ? 'Applying...' : 'Apply Adjustment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Adjustment History */}
      <Card>
        <CardHeader>
          <CardTitle>Adjustment History</CardTitle>
          <CardDescription>
            All adjustments applied to this invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          {adjustmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : adjustments.length > 0 ? (
            <div className="space-y-4">
              {adjustments.map((adjustment: AdjustmentLog) => (
                <div key={adjustment.adjustment_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      {getAdjustmentIcon(adjustment.type)}
                    </div>
                    <div>
                      <p className="font-medium">Adjustment #{adjustment.adjustment_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(adjustment.created_at)} • {adjustment.note}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium text-red-600">-{formatCurrency(adjustment.amount)}</p>
                    </div>
                    <Badge className={getAdjustmentTypeColor(adjustment.type)}>
                      {adjustment.type.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Minus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No adjustments applied yet</p>
              <p className="text-sm">Apply your first adjustment above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
